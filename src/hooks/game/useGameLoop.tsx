import { useRef, useEffect, useCallback } from 'react';
import { Player, Ball, Score } from '../../types/football';
import useWatchdog from './useWatchdog';

interface UseGameLoopProps {
  players: Player[];
  updatePlayerPositions: () => void;
  updateBallPosition: () => void;
  incrementSyncCounter: () => void;
  syncModels: () => void;
  checkLearningProgress: () => void;
  checkPerformance?: () => void;
  ball: Ball;
  score: Score;
  tournamentMode?: boolean;
  isLowPerformance?: boolean;
  eloAdvantageMultiplier?: number;
}

export const useGameLoop = ({
  players,
  updatePlayerPositions,
  updateBallPosition,
  incrementSyncCounter,
  syncModels,
  checkLearningProgress,
  checkPerformance,
  ball,
  score,
  tournamentMode = false,
  isLowPerformance = false,
  eloAdvantageMultiplier = 1.0
}: UseGameLoopProps) => {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const totalGoalsRef = useRef<number>(0);
  
  const frameCountRef = useRef<number>(0);
  const lastPerformanceCheckRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(true);
  const executingFrameRef = useRef<boolean>(false);
  
  const handleWatchdogTimeout = useCallback(() => {
    console.warn("Game loop watchdog triggered - attempting recovery");
    
    if (executingFrameRef.current) {
      console.warn("Frame execution appears stuck - forcing reset");
      executingFrameRef.current = false;
    }
    
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
    }
    
    previousTimeRef.current = null;
    
    if (isActiveRef.current) {
      console.log("Restarting game loop after watchdog recovery");
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, []);
  
  const { petWatchdog } = useWatchdog({
    timeout: 5000,
    onTimeout: handleWatchdogTimeout,
    description: 'Game Loop',
    enabled: true
  });
  
  const gameLoop = useCallback((time: number) => {
    if (!isActiveRef.current) return;
    
    executingFrameRef.current = true;
    petWatchdog();
    
    if (previousTimeRef.current === null) {
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(gameLoop);
      executingFrameRef.current = false;
      return;
    }
    
    const deltaTime = time - previousTimeRef.current;
    previousTimeRef.current = time;
    
    frameCountRef.current += 1;
    
    try {
      updatePlayerPositions();
      updateBallPosition();
      incrementSyncCounter();
      
      if (frameCountRef.current % 30 === 0 && checkPerformance) {
        checkPerformance();
      }
      
      const syncInterval = isLowPerformance ? 120 : 60;
      const learningInterval = isLowPerformance ? 300 : 180;
      
      if (frameCountRef.current % syncInterval === 0) {
        try {
          syncModels();
        } catch (error) {
          console.error("Error in syncModels:", error);
        }
      }
      
      if (frameCountRef.current % learningInterval === 0) {
        try {
          checkLearningProgress();
        } catch (error) {
          console.error("Error in checkLearningProgress:", error);
        }
      }
      
      if (frameCountRef.current >= 600) {
        frameCountRef.current = 0;
      }
    } catch (error) {
      console.error("Error in game loop:", error);
    } finally {
      executingFrameRef.current = false;
      
      if (isActiveRef.current) {
        requestRef.current = requestAnimationFrame(gameLoop);
      }
    }
  }, [
    updatePlayerPositions, 
    updateBallPosition, 
    incrementSyncCounter, 
    syncModels, 
    checkLearningProgress,
    checkPerformance,
    isLowPerformance,
    petWatchdog
  ]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Game loop paused - tab hidden');
        isActiveRef.current = false;
        
        if (requestRef.current !== null) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
      } else {
        console.log('Game loop resumed - tab visible');
        isActiveRef.current = true;
        previousTimeRef.current = null;
        executingFrameRef.current = false;
        requestRef.current = requestAnimationFrame(gameLoop);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameLoop]);
  
  useEffect(() => {
    console.log('Game loop started');
    isActiveRef.current = true;
    executingFrameRef.current = false;
    requestRef.current = requestAnimationFrame(gameLoop);
    console.log('Game loop initialized');
    
    return () => {
      console.log('Game loop cleanup');
      isActiveRef.current = false;
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoop]);
  
  return { totalGoalsRef };
};
