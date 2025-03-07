
import React, { useState, useRef } from 'react';
import { Player } from '../../types/football';
import { saveModel } from '../../utils/neural/modelPersistence';
import { createExperienceReplay } from '../../utils/experienceReplay';
import { toast } from 'sonner';
import { validatePlayerBrain } from '../../utils/neural/networkValidator';

const DEFAULT_SYNC_INTERVAL = 1800; // 30 seconds at 60fps (was 600)
const TOURNAMENT_SYNC_INTERVAL = 7200; // 120 seconds at 60fps (doubled from 3600)

const LEARNING_CHECK_INTERVAL = 3600; // 60 seconds at 60fps

const PERFORMANCE_CHECK_INTERVAL = 300; // 5 seconds at 60fps

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournamentMode?: boolean;
  eloAdvantageMultiplier?: number;
}

export const useModelSyncSystem = ({ 
  players, 
  setPlayers,
  tournamentMode = false,
  eloAdvantageMultiplier = 1.0
}: ModelSyncSystemProps) => {
  const syncCounter = useRef(0);
  const learningCheckCounter = useRef(0);
  const performanceCheckCounter = useRef(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const lastFrameTimeRef = useRef(Date.now());
  const frameTimesRef = useRef<number[]>([]);
  
  // Track team ELOs to apply advantages to learning
  const teamElosRef = useRef<{ red: number; blue: number }>({ red: 2000, blue: 2000 });
  
  // Update team ELOs when players change
  React.useEffect(() => {
    if (players.length > 0) {
      const redPlayers = players.filter(p => p.team === 'red');
      const bluePlayers = players.filter(p => p.team === 'blue');
      
      const redElo = redPlayers.length > 0 && redPlayers[0].teamElo ? redPlayers[0].teamElo : 2000;
      const blueElo = bluePlayers.length > 0 && bluePlayers[0].teamElo ? bluePlayers[0].teamElo : 2000;
      
      teamElosRef.current = { red: redElo, blue: blueElo };
      
      // DRASTIC IMPROVEMENT: Log the ELO difference for transparency
      const eloDifference = Math.abs(redElo - blueElo);
      console.log(`Team ELOs - Red: ${redElo}, Blue: ${blueElo}, Difference: ${eloDifference}`);
      if (eloDifference > 200) {
        console.log(`SIGNIFICANT ELO ADVANTAGE DETECTED: ${eloDifference} points`);
      }
    }
  }, [players]);
  
  const incrementSyncCounter = () => {
    syncCounter.current += 1;
    learningCheckCounter.current += 1;
    performanceCheckCounter.current += 1;
    
    const now = Date.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 10) {
      frameTimesRef.current.shift();
    }
  };
  
  const checkPerformance = React.useCallback(() => {
    if (performanceCheckCounter.current >= PERFORMANCE_CHECK_INTERVAL) {
      performanceCheckCounter.current = 0;
      
      if (frameTimesRef.current.length > 5) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = 1000 / avgFrameTime;
        
        if (fps < 45 && !isLowPerformance) {
          console.log('Low performance detected, reducing neural activity');
          setIsLowPerformance(true);
        } else if (fps >= 55 && isLowPerformance) {
          console.log('Performance recovered, resuming normal neural activity');
          setIsLowPerformance(false);
        }
      }
    }
  }, [isLowPerformance]);
  
  const syncModels = React.useCallback(async () => {
    // In tournament mode, completely skip most model syncs to prevent crashes
    if (tournamentMode) {
      // Only sync if it's a particularly good time and we're due
      if (syncCounter.current >= TOURNAMENT_SYNC_INTERVAL && Math.random() < 0.2) {
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
        
        const syncGroup = syncCounter.current % 3;
        const playersToSync = players.filter((_, index) => index % 3 === syncGroup);
        
        let syncCount = 0;
        let validationCount = 0;
        
        for (const player of playersToSync) {
          try {
            const validatedPlayer = validatePlayerBrain(player);
            
            if (validatedPlayer !== player) {
              validationCount++;
              setPlayers(currentPlayers => 
                currentPlayers.map(p => p.id === player.id ? validatedPlayer : p)
              );
            }
            
            // Skip actually saving in tournament mode to prevent database issues
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
  }, [players, setPlayers, tournamentMode, lastSyncTime, isLowPerformance]);
  
  const checkLearningProgress = React.useCallback(() => {
    if (isLowPerformance && Math.random() > 0.2) {
      return;
    }
    
    if (learningCheckCounter.current >= LEARNING_CHECK_INTERVAL) {
      console.log('Checking neural network learning progress...');
      
      let enhancedPlayers = 0;
      
      setPlayers(currentPlayers => 
        currentPlayers.map(player => {
          if (player.role === 'goalkeeper') {
            return player;
          }
          
          // DRASTIC IMPROVEMENT: Apply much stronger ELO-based learning advantage
          // Apply massive learning boost to higher ELO teams
          const opponentTeamElo = player.team === 'red' ? teamElosRef.current.blue : teamElosRef.current.red;
          const playerTeamElo = player.team === 'red' ? teamElosRef.current.red : teamElosRef.current.blue;
          
          // Calculate ELO difference and normalize to a factor
          const eloDifference = playerTeamElo - opponentTeamElo;
          
          // DRASTIC IMPROVEMENT: Much stronger learning rate adjustment based on ELO
          // Higher ELO teams now learn MUCH faster than before
          const learningAdvantage = eloDifference > 0 ? 
            Math.min(3.0, 1 + ((eloDifference) / 500)) : // Halved from 1000 to 500 - stronger effect
            Math.max(0.5, 1 + ((eloDifference) / 800)); // Disadvantage for lower ELO teams
          
          console.log(`${player.team} player learning advantage: ${learningAdvantage.toFixed(2)} (ELO diff: ${eloDifference})`);
          
          if (player.brain?.experienceReplay?.capacity > 0) {
            // DRASTIC IMPROVEMENT: Enhanced brain learning parameters
            
            // Calculate reward multiplier based on ELO advantage
            const rewardMultiplier = Math.max(0.5, learningAdvantage);
            
            // Boost learning stage (neural network learning rate) based on ELO
            const learningStageBoost = Math.min(1, (player.brain.learningStage || 0.1) * learningAdvantage);
            
            // DRASTIC IMPROVEMENT: Apply high-ELO bonus to rewards
            // Higher ELO teams get larger rewards for the same actions
            const lastRewardWithBonus = (player.brain.lastReward || 0) * rewardMultiplier;
            
            // Apply cumulative reward bonus with stronger effect for higher ELO
            const cumulativeRewardBonus = playerTeamElo > 2200 ? 1.5 : 
                                        playerTeamElo > 2000 ? 1.2 : 1.0;
            
            const enhancedCumulativeReward = (player.brain.cumulativeReward || 0) * 
                                           rewardMultiplier * 
                                           cumulativeRewardBonus;
            
            // DRASTIC IMPROVEMENT: High ELO teams can get occasional memory boosts
            // (larger experience replay buffer to remember more training examples)
            let experienceReplayCapacity = player.brain.experienceReplay.capacity;
            
            if (playerTeamElo > 2200 && Math.random() < 0.3) {
              // Boost capacity for high ELO teams occasionally
              experienceReplayCapacity = Math.min(200, experienceReplayCapacity + 10);
              console.log(`${player.team} high-ELO player got memory capacity boost: ${experienceReplayCapacity}`);
            }
            
            // Construct the enhanced brain with all improvements
            return {
              ...player,
              brain: {
                ...player.brain,
                learningStage: learningStageBoost,
                lastReward: lastRewardWithBonus,
                cumulativeReward: enhancedCumulativeReward,
                experienceReplay: {
                  ...player.brain.experienceReplay,
                  capacity: experienceReplayCapacity
                },
                // DRASTIC IMPROVEMENT: ELO-based learning optimization
                learningRate: Math.min(0.3, 0.05 + (learningAdvantage - 1) * 0.1),
                momentumFactor: Math.min(0.3, 0.1 + (rewardMultiplier - 1) * 0.1)
              }
            };
          }
          
          enhancedPlayers++;
          
          // Create new brain with ELO-optimized parameters
          return {
            ...player,
            brain: {
              ...player.brain,
              experienceReplay: player.brain?.experienceReplay || createExperienceReplay(
                // DRASTIC IMPROVEMENT: Starting capacity based on ELO
                playerTeamElo > 2200 ? 150 : 
                playerTeamElo > 2000 ? 120 : 100
              ),
              learningStage: player.brain?.learningStage || 
                            (playerTeamElo > 2200 ? 0.2 : 0.1), // Higher starting point for high ELO
              lastReward: player.brain?.lastReward || 0,
              cumulativeReward: player.brain?.cumulativeReward || 0,
              // DRASTIC IMPROVEMENT: ELO-based starting parameters
              learningRate: playerTeamElo > 2200 ? 0.15 : 0.1,
              momentumFactor: playerTeamElo > 2200 ? 0.2 : 0.1
            }
          };
        })
      );
      
      if (enhancedPlayers > 0 && !tournamentMode) {
        toast.info(`Enhanced learning for ${enhancedPlayers} players with ELO advantages`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      learningCheckCounter.current = 0;
    }
  }, [setPlayers, tournamentMode, isLowPerformance]);
  
  return { 
    syncModels, 
    incrementSyncCounter, 
    checkLearningProgress,
    checkPerformance,
    isLowPerformance
  };
};
