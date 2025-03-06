import React, { useState, useRef } from 'react';
import { Player } from '../../types/football';
import { saveModel } from '../../utils/neural/modelPersistence';
import { createExperienceReplay } from '../../utils/experienceReplay';
import { toast } from 'sonner';
import { validatePlayerBrain } from '../../utils/neural/networkValidator';

// Reduced frequency of model synchronization to reduce browser load
const DEFAULT_SYNC_INTERVAL = 1800; // 30 seconds at 60fps (was 600)
const TOURNAMENT_SYNC_INTERVAL = 3600; // 60 seconds at 60fps (was 1200)

// Reduced frequency of learning checks
const LEARNING_CHECK_INTERVAL = 3600; // 60 seconds at 60fps (was 1800)

// Add performance monitoring
const PERFORMANCE_CHECK_INTERVAL = 300; // 5 seconds at 60fps

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournamentMode?: boolean;
}

export const useModelSyncSystem = ({ 
  players, 
  setPlayers,
  tournamentMode = false
}: ModelSyncSystemProps) => {
  const syncCounter = useRef(0);
  const learningCheckCounter = useRef(0);
  const performanceCheckCounter = useRef(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const lastFrameTimeRef = useRef(Date.now());
  const frameTimesRef = useRef<number[]>([]);
  
  // Increment frame counter for model synchronization
  const incrementSyncCounter = () => {
    syncCounter.current += 1;
    learningCheckCounter.current += 1;
    performanceCheckCounter.current += 1;
    
    // Performance monitoring
    const now = Date.now();
    const frameTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    // Keep last 10 frame times
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 10) {
      frameTimesRef.current.shift();
    }
  };
  
  // Check game performance
  const checkPerformance = React.useCallback(() => {
    if (performanceCheckCounter.current >= PERFORMANCE_CHECK_INTERVAL) {
      performanceCheckCounter.current = 0;
      
      if (frameTimesRef.current.length > 5) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = 1000 / avgFrameTime;
        
        // If FPS is below 50, reduce neural network activity
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
    // Skip sync in low performance mode
    if (isLowPerformance && Math.random() > 0.3) {
      return;
    }
    
    const syncInterval = tournamentMode ? TOURNAMENT_SYNC_INTERVAL : DEFAULT_SYNC_INTERVAL;
    
    if (syncCounter.current >= syncInterval) {
      const currentTime = Date.now();
      const timeSinceLastSync = currentTime - lastSyncTime;
      
      if (timeSinceLastSync >= 5000) {
        console.log('Synchronizing neural models...');
        
        // Sync only a subset of players each time (1/3 of players)
        const syncGroup = syncCounter.current % 3;
        const playersToSync = players.filter((_, index) => index % 3 === syncGroup);
        
        let syncCount = 0;
        for (const player of playersToSync) {
          try {
            // Validate the player brain before syncing
            const validatedPlayer = validatePlayerBrain(player);
            
            // Only update player if validation changed something
            if (validatedPlayer !== player) {
              setPlayers(currentPlayers => 
                currentPlayers.map(p => p.id === player.id ? validatedPlayer : p)
              );
            }
            
            // Only sync if validation was successful and it's not a goalkeeper (as they use simpler logic)
            if (validatedPlayer.brain?.net && validatedPlayer.role !== 'goalkeeper') {
              if (await saveModel(validatedPlayer)) {
                syncCount++;
              }
            }
          } catch (error) {
            console.error(`Error syncing model for ${player.team} ${player.role}:`, error);
          }
        }
        
        if (syncCount > 0 && !tournamentMode) {
          toast.success(`Synced ${syncCount} neural models`, {
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
    // Skip learning checks in low performance mode
    if (isLowPerformance && Math.random() > 0.2) {
      return;
    }
    
    if (learningCheckCounter.current >= LEARNING_CHECK_INTERVAL) {
      console.log('Checking neural network learning progress...');
      
      let enhancedPlayers = 0;
      
      setPlayers(currentPlayers => 
        currentPlayers.map(player => {
          // Skip goalkeepers as they use simpler logic
          if (player.role === 'goalkeeper') {
            return player;
          }
          
          // Skip if player already has experience replay
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
  }, [setPlayers, tournamentMode, isLowPerformance]);
  
  return { 
    syncModels, 
    incrementSyncCounter, 
    checkLearningProgress,
    checkPerformance,
    isLowPerformance
  };
};
