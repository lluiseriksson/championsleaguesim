import React, { useState, useRef } from 'react';
import { Player } from '../../types/football';
import { saveModel } from '../../utils/neural/modelPersistence';
import { createExperienceReplay } from '../../utils/experienceReplay';
import { toast } from 'sonner';
import { validatePlayerBrain } from '../../utils/neural/networkValidator';
import { calculatePlayerAdvantage } from '../../utils/eloAdvantageSystem';

const DEFAULT_SYNC_INTERVAL = 1800; // 30 seconds at 60fps (was 600)
const TOURNAMENT_SYNC_INTERVAL = 7200; // 120 seconds at 60fps (doubled from 3600)

const LEARNING_CHECK_INTERVAL = 3600; // 60 seconds at 60fps

const PERFORMANCE_CHECK_INTERVAL = 300; // 5 seconds at 60fps

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournamentMode?: boolean;
  teamAdvantageFactors?: { red: number, blue: number };
}

export const useModelSyncSystem = ({ 
  players, 
  setPlayers,
  tournamentMode = false,
  teamAdvantageFactors = { red: 1.0, blue: 1.0 }
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
      
      // Log the ELO difference for transparency
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
          
          // Get team advantage factor from the standardized system
          const teamAdvantage = player.team === 'red' ? 
            teamAdvantageFactors.red : 
            teamAdvantageFactors.blue;
          
          // Calculate player-specific advantage
          const playerAdvantage = calculatePlayerAdvantage(player, teamAdvantage);
          
          console.log(`${player.team} ${player.role} advantage: ${playerAdvantage.toFixed(2)}`);
          
          if (player.brain?.experienceReplay?.capacity > 0) {
            // Calculate reward multiplier based on player advantage
            const rewardMultiplier = Math.max(0.5, playerAdvantage);
            
            // Boost learning stage based on advantage
            const learningStageBoost = Math.min(1, (player.brain.learningStage || 0.1) * playerAdvantage);
            
            // Apply advantage-based bonus to rewards
            const lastRewardWithBonus = (player.brain.lastReward || 0) * rewardMultiplier;
            
            // Apply cumulative reward bonus for higher ELO
            const cumulativeRewardBonus = playerAdvantage > 1.5 ? 1.5 : 
                                        playerAdvantage > 1.0 ? 1.2 : 1.0;
            
            const enhancedCumulativeReward = (player.brain.cumulativeReward || 0) * 
                                           rewardMultiplier * 
                                           cumulativeRewardBonus;
            
            // High advantage teams can get occasional memory boosts
            let experienceReplayCapacity = player.brain.experienceReplay.capacity;
            
            if (playerAdvantage > 1.7 && Math.random() < 0.3) {
              // Boost capacity for high advantage teams occasionally
              experienceReplayCapacity = Math.min(200, experienceReplayCapacity + 10);
              console.log(`${player.team} high-advantage player got memory capacity boost: ${experienceReplayCapacity}`);
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
                // ELO-based learning optimization
                learningRate: Math.min(0.3, 0.05 + (playerAdvantage - 1) * 0.1),
                momentumFactor: Math.min(0.3, 0.1 + (rewardMultiplier - 1) * 0.1)
              }
            };
          }
          
          enhancedPlayers++;
          
          // Base capacity on advantage
          const baseCapacity = playerAdvantage > 1.5 ? 150 : 
                             playerAdvantage > 1.0 ? 120 : 100;
          
          // Create new brain with advantage-optimized parameters
          return {
            ...player,
            brain: {
              ...player.brain,
              experienceReplay: player.brain?.experienceReplay || createExperienceReplay(baseCapacity),
              learningStage: player.brain?.learningStage || 
                            (playerAdvantage > 1.5 ? 0.2 : 0.1),
              lastReward: player.brain?.lastReward || 0,
              cumulativeReward: player.brain?.cumulativeReward || 0,
              // Advantage-based starting parameters
              learningRate: playerAdvantage > 1.5 ? 0.15 : 0.1,
              momentumFactor: playerAdvantage > 1.5 ? 0.2 : 0.1
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
  }, [setPlayers, tournamentMode, isLowPerformance, teamAdvantageFactors]);
  
  return { 
    syncModels, 
    incrementSyncCounter, 
    checkLearningProgress,
    checkPerformance,
    isLowPerformance
  };
};
