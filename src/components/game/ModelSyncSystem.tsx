
import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../../types/football';
import { 
  saveModel, 
  recordTrainingEffectiveness, 
  isNeuralTrainingEffective 
} from '../../utils/neuralModelService';
import { createExperienceReplay } from '../../utils/experienceReplay';
import { toast } from 'sonner';
import { validatePlayerBrain } from '../../utils/neural/networkValidator';
import { trainFromPreviousGames } from '../../utils/neural/historicalTraining';

// Reduce sync frequency in tournament mode to prevent memory issues
const DEFAULT_SYNC_INTERVAL = 1800; // 30 seconds at 60fps
const TOURNAMENT_SYNC_INTERVAL = 14400; // 240 seconds at 60fps (doubled from previous)

// Reduce learning check frequency in tournament mode
const LEARNING_CHECK_INTERVAL = 3600; // 60 seconds at 60fps
const TOURNAMENT_LEARNING_CHECK_INTERVAL = 7200; // 120 seconds at 60fps

const EFFECTIVENESS_CHECK_INTERVAL = 7200; // 120 seconds at 60fps
const PERFORMANCE_CHECK_INTERVAL = 300; // 5 seconds at 60fps
const HISTORICAL_TRAINING_INTERVAL = 10800; // 180 seconds at 60fps (doubled from previous)

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournamentMode?: boolean;
  matchResult?: { winner: string | null, score: { red: number, blue: number } } | null;
}

export const useModelSyncSystem = ({ 
  players, 
  setPlayers,
  tournamentMode = false,
  matchResult = null
}: ModelSyncSystemProps) => {
  const syncCounter = useRef(0);
  const learningCheckCounter = useRef(0);
  const performanceCheckCounter = useRef(0);
  const historicalTrainingCounter = useRef(0);
  const effectivenessCheckCounter = useRef(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const lastFrameTimeRef = useRef(Date.now());
  const frameTimesRef = useRef<number[]>([]);
  const [hasPerformedHistoricalTraining, setHasPerformedHistoricalTraining] = useState(false);
  const [trainingEffectiveness, setTrainingEffectiveness] = useState<{
    redTeam: { isEffective: boolean, ratio: number } | null,
    blueTeam: { isEffective: boolean, ratio: number } | null
  }>({ redTeam: null, blueTeam: null });
  
  // Crash recovery mechanism - detect if we've experienced a crash
  const recoveryAttemptRef = useRef(0);
  
  // Find the team with higher ELO rating
  const redTeamElo = players.find(p => p.team === 'red')?.teamElo || 1500;
  const blueTeamElo = players.find(p => p.team === 'blue')?.teamElo || 1500;
  
  // Determine which team should learn based on ELO, not color
  const higherEloTeam = redTeamElo > blueTeamElo ? 'red' : 'blue';
  const lowerEloTeam = redTeamElo > blueTeamElo ? 'blue' : 'red';
  
  // Only higher ELO team should learn
  const higherEloTeamShouldLearn = true;  // Higher ELO team always learns
  const lowerEloTeamShouldLearn = false;  // Lower ELO team never learns
  
  // Memory cleanup function to prevent leaks
  const cleanupMemory = React.useCallback(() => {
    if (frameTimesRef.current.length > 10) {
      frameTimesRef.current = frameTimesRef.current.slice(-10);
    }
    
    // Reset counters if they get too large to prevent integer overflow
    if (syncCounter.current > 100000) syncCounter.current = 0;
    if (learningCheckCounter.current > 100000) learningCheckCounter.current = 0;
    if (performanceCheckCounter.current > 100000) performanceCheckCounter.current = 0;
    if (historicalTrainingCounter.current > 100000) historicalTrainingCounter.current = 0;
    if (effectivenessCheckCounter.current > 100000) effectivenessCheckCounter.current = 0;
    
  }, []);
  
  // Perform regular memory cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupMemory();
    }, 60000); // Once per minute
    
    return () => clearInterval(cleanupInterval);
  }, [cleanupMemory]);
  
  console.log(`Team ELO comparison - Red Team: ${redTeamElo}, Blue Team: ${blueTeamElo}`);
  console.log(`Learning configuration - Higher ELO team (${higherEloTeam}): ${higherEloTeamShouldLearn ? 'YES' : 'NO'}, Lower ELO team (${lowerEloTeam}): ${lowerEloTeamShouldLearn ? 'YES' : 'NO'}`);
  
  // NEW: Track match results for training effectiveness
  useEffect(() => {
    if (matchResult && matchResult.winner) {
      // Determine which team was learning
      const trainingTeam = higherEloTeam;
      const nonTrainingTeam = lowerEloTeam;
      
      // Record the outcome for effectiveness tracking
      recordTrainingEffectiveness(
        trainingTeam,
        nonTrainingTeam,
        matchResult.winner
      ).then(success => {
        if (success) {
          console.log(`Recorded match result for training effectiveness: ${trainingTeam} (training) vs ${nonTrainingTeam}, winner: ${matchResult.winner}`);
        }
      });
    }
  }, [matchResult, higherEloTeam, lowerEloTeam]);
  
  const incrementSyncCounter = () => {
    syncCounter.current += 1;
    learningCheckCounter.current += 1;
    performanceCheckCounter.current += 1;
    historicalTrainingCounter.current += 1;
    effectivenessCheckCounter.current += 1;
    
    const now = Date.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 10) {
      frameTimesRef.current.shift();
    }
  };
  
  // NEW: Check training effectiveness periodically
  const checkTrainingEffectiveness = React.useCallback(async () => {
    if (effectivenessCheckCounter.current < EFFECTIVENESS_CHECK_INTERVAL) {
      return;
    }
    
    // Skip in tournament mode to reduce API calls
    if (tournamentMode && Math.random() > 0.2) {
      effectivenessCheckCounter.current = 0;
      return;
    }
    
    effectivenessCheckCounter.current = 0;
    
    try {
      // Check effectiveness for both teams
      const redTeamEffectiveness = await isNeuralTrainingEffective('red');
      const blueTeamEffectiveness = await isNeuralTrainingEffective('blue');
      
      setTrainingEffectiveness({
        redTeam: { 
          isEffective: redTeamEffectiveness.isEffective,
          ratio: redTeamEffectiveness.ratio
        },
        blueTeam: { 
          isEffective: blueTeamEffectiveness.isEffective,
          ratio: blueTeamEffectiveness.ratio
        }
      });
      
      // Log effectiveness results
      console.log('Training effectiveness check:');
      console.log(`Red team: ${redTeamEffectiveness.isEffective ? 'EFFECTIVE' : 'NOT EFFECTIVE'} (ratio: ${redTeamEffectiveness.ratio.toFixed(2)}, confidence: ${(redTeamEffectiveness.confidence * 100).toFixed(0)}%)`);
      console.log(`Blue team: ${blueTeamEffectiveness.isEffective ? 'EFFECTIVE' : 'NOT EFFECTIVE'} (ratio: ${blueTeamEffectiveness.ratio.toFixed(2)}, confidence: ${(blueTeamEffectiveness.confidence * 100).toFixed(0)}%)`);
      
      // Show toast notification for ineffective training with sufficient confidence
      if (!tournamentMode) {
        if (!redTeamEffectiveness.isEffective && redTeamEffectiveness.confidence > 0.5) {
          toast.warning('Red team training not effective', {
            description: `Win ratio: ${redTeamEffectiveness.ratio.toFixed(2)} (below threshold)`,
            duration: 4000,
          });
        }
        
        if (!blueTeamEffectiveness.isEffective && blueTeamEffectiveness.confidence > 0.5) {
          toast.warning('Blue team training not effective', {
            description: `Win ratio: ${blueTeamEffectiveness.ratio.toFixed(2)} (below threshold)`,
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error('Error checking training effectiveness:', error);
    }
  }, [tournamentMode]);
  
  const checkPerformance = React.useCallback(() => {
    if (performanceCheckCounter.current >= PERFORMANCE_CHECK_INTERVAL) {
      performanceCheckCounter.current = 0;
      
      if (frameTimesRef.current.length > 5) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = 1000 / avgFrameTime;
        
        // Stricter low performance detection in tournament mode to conserve resources
        const fpsThreshold = tournamentMode ? 50 : 45;
        const recoveryThreshold = tournamentMode ? 58 : 55;
        
        if (fps < fpsThreshold && !isLowPerformance) {
          console.log(`Low performance detected (${fps.toFixed(1)} FPS), reducing neural activity`);
          setIsLowPerformance(true);
        } else if (fps >= recoveryThreshold && isLowPerformance) {
          console.log(`Performance recovered (${fps.toFixed(1)} FPS), resuming normal neural activity`);
          setIsLowPerformance(false);
        }
      }
    }
  }, [isLowPerformance, tournamentMode]);
  
  const syncModels = React.useCallback(async () => {
    if (tournamentMode) {
      const syncInterval = TOURNAMENT_SYNC_INTERVAL;
      
      if (syncCounter.current >= syncInterval && Math.random() < 0.1) {
        console.log('Performing rare tournament mode sync');
        syncCounter.current = 0;
      }
      return;
    }
    
    if (isLowPerformance && Math.random() > 0.3) {
      return;
    }
    
    const syncInterval = tournamentMode ? TOURNAMENT_SYNC_INTERVAL : DEFAULT_SYNC_INTERVAL;
    
    if (syncCounter.current >= syncInterval) {
      const currentTime = Date.now();
      const timeSinceLastSync = currentTime - lastSyncTime;
      
      if (timeSinceLastSync >= 5000) {
        console.log('Synchronizing neural models...');
        
        // In tournament mode, sync even fewer players
        const syncProbability = tournamentMode ? 0.1 : 0.33;
        const syncGroup = syncCounter.current % 3;
        
        const playersToSync = players.filter((p, index) => {
          if (tournamentMode && Math.random() > syncProbability) return false;
          if (!tournamentMode && index % 3 !== syncGroup) return false;
          if (p.role === 'goalkeeper') return false;
          // Use team's ELO status to determine learning, not color
          if (p.team === higherEloTeam && !higherEloTeamShouldLearn) return false;
          if (p.team === lowerEloTeam && !lowerEloTeamShouldLearn) return false;
          
          // Check if team's training is effective
          const teamEffectiveness = p.team === 'red' ? 
            trainingEffectiveness.redTeam : 
            trainingEffectiveness.blueTeam;
            
          // If we have effectiveness data and training is not effective, reduce sync probability
          if (teamEffectiveness && !teamEffectiveness.isEffective) {
            // With poor effectiveness, only sync 30% of the time
            if (Math.random() > 0.3) {
              return false;
            }
          }
          
          return true;
        });
        
        // In tournament mode, limit the max number of players to sync
        const maxSyncPlayers = tournamentMode ? 2 : playersToSync.length;
        const limitedPlayersToSync = playersToSync.slice(0, maxSyncPlayers);
        
        console.log(`Syncing ${limitedPlayersToSync.length} players (higher ELO team ${higherEloTeam}: ${higherEloTeamShouldLearn}, lower ELO team ${lowerEloTeam}: ${lowerEloTeamShouldLearn})`);
        
        let syncCount = 0;
        let validationCount = 0;
        
        for (const player of limitedPlayersToSync) {
          try {
            const validatedPlayer = validatePlayerBrain(player);
            
            if (validatedPlayer !== player) {
              validationCount++;
              setPlayers(currentPlayers => 
                currentPlayers.map(p => p.id === player.id ? validatedPlayer : p)
              );
            }
            
            if (!tournamentMode && validatedPlayer.brain?.net && validatedPlayer.role !== 'goalkeeper') {
              if (await saveModel(validatedPlayer)) {
                syncCount++;
              }
            }
          } catch (error) {
            console.error(`Error syncing model for ${player.team} ${player.role}:`, error);
          }
        }
        
        if ((syncCount > 0 || validationCount > 0) && !tournamentMode) {
          const message = validationCount > 0 
            ? `Synced ${syncCount} neural models and fixed ${validationCount} invalid networks`
            : `Synced ${syncCount} neural models`;
            
          toast.success(message, {
            duration: 2000,
            position: 'bottom-right'
          });
        }
        
        setLastSyncTime(currentTime);
      }
      
      syncCounter.current = 0;
    }
  }, [players, setPlayers, tournamentMode, lastSyncTime, isLowPerformance, higherEloTeam, lowerEloTeam, higherEloTeamShouldLearn, lowerEloTeamShouldLearn, trainingEffectiveness]);
  
  const checkLearningProgress = React.useCallback(() => {
    const interval = tournamentMode ? TOURNAMENT_LEARNING_CHECK_INTERVAL : LEARNING_CHECK_INTERVAL;
    
    if (isLowPerformance && Math.random() > 0.2) {
      return;
    }
    
    if (learningCheckCounter.current >= interval) {
      console.log('Checking neural network learning progress...');
      
      // In tournament mode, check fewer players
      const checkProbability = tournamentMode ? 0.5 : 1.0;
      
      let enhancedPlayers = 0;
      
      setPlayers(currentPlayers => 
        currentPlayers.map(player => {
          // Skip checks randomly in tournament mode
          if (tournamentMode && Math.random() > checkProbability) return player;
          
          // Use team's ELO status to determine learning, not color
          if (player.team === higherEloTeam && !higherEloTeamShouldLearn) return player;
          if (player.team === lowerEloTeam && !lowerEloTeamShouldLearn) return player;
          
          if (player.role === 'goalkeeper') {
            return player;
          }
          
          if (player.brain?.experienceReplay?.capacity > 0) {
            return player;
          }
          
          enhancedPlayers++;
          
          return {
            ...player,
            brain: {
              ...player.brain,
              experienceReplay: player.brain?.experienceReplay || createExperienceReplay(100),
              learningStage: player.brain?.learningStage || 0.1,
              lastReward: player.brain?.lastReward || 0,
              cumulativeReward: player.brain?.cumulativeReward || 0
            }
          };
        })
      );
      
      if (enhancedPlayers > 0 && !tournamentMode) {
        toast.info(`Enhanced learning for ${enhancedPlayers} players`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      learningCheckCounter.current = 0;
    }
  }, [setPlayers, tournamentMode, isLowPerformance, higherEloTeam, lowerEloTeam, higherEloTeamShouldLearn, lowerEloTeamShouldLearn]);
  
  const performHistoricalTraining = React.useCallback(async () => {
    // Dramatically reduce historical training in tournament mode to prevent memory issues
    if (tournamentMode || (isLowPerformance && Math.random() > 0.1)) {
      return;
    }

    const trainingInterval = tournamentMode ? HISTORICAL_TRAINING_INTERVAL * 2 : HISTORICAL_TRAINING_INTERVAL;

    if (historicalTrainingCounter.current >= trainingInterval && !hasPerformedHistoricalTraining) {
      console.log('Starting training from historical game data...');
      
      try {
        let trainedPlayers = 0;
        
        // Limit the number of players to train in tournament mode
        const maxPlayersToTrain = tournamentMode ? 1 : 3;
        
        const playersToTrain = players.filter(p => 
          p.role !== 'goalkeeper' && 
          ((p.team === higherEloTeam && higherEloTeamShouldLearn) || (p.team === lowerEloTeam && lowerEloTeamShouldLearn)) &&
          ['forward', 'midfielder'].includes(p.role) && 
          Math.random() < (tournamentMode ? 0.3 : 0.7)
        ).slice(0, maxPlayersToTrain);
        
        if (playersToTrain.length > 0) {
          const updatedPlayers = await trainFromPreviousGames(playersToTrain);
          
          if (updatedPlayers && updatedPlayers.length > 0) {
            trainedPlayers = updatedPlayers.length;
            
            setPlayers(currentPlayers => 
              currentPlayers.map(p => {
                const updatedPlayer = updatedPlayers.find(up => up.id === p.id);
                return updatedPlayer || p;
              })
            );
            
            toast.success(`Trained ${trainedPlayers} players from historical game data`, {
              duration: 3000,
              position: 'bottom-right'
            });
          }
        }
      } catch (error) {
        console.error('Error during historical training:', error);
        toast.error('Error training from historical data', {
          description: 'Unable to complete historical training',
          duration: 3000,
        });
      }
      
      setHasPerformedHistoricalTraining(true);
      historicalTrainingCounter.current = 0;
    }
  }, [players, setPlayers, tournamentMode, isLowPerformance, hasPerformedHistoricalTraining, higherEloTeam, lowerEloTeam, higherEloTeamShouldLearn, lowerEloTeamShouldLearn]);
  
  return { 
    syncModels, 
    incrementSyncCounter, 
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining,
    checkTrainingEffectiveness,
    trainingEffectiveness,
    isLowPerformance
  };
};
