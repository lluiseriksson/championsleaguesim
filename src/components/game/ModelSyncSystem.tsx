import React, { useState, useRef } from 'react';
import { Player } from '../../types/football';
import { saveModel } from '../../utils/neural/modelPersistence';
import { createExperienceReplay } from '../../utils/experienceReplay';
import { toast } from 'sonner';
import { validatePlayerBrain } from '../../utils/neural/networkValidator';

const DEFAULT_SYNC_INTERVAL = 1800; // 30 seconds at 60fps (was 600)
const TOURNAMENT_SYNC_INTERVAL = 3600; // 60 seconds at 60fps (was 1200)

const LEARNING_CHECK_INTERVAL = 3600; // 60 seconds at 60fps (was 1800)

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
            
            if (validatedPlayer.brain?.net && validatedPlayer.role !== 'goalkeeper') {
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
