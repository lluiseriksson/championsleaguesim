
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
  isLowPerformance = false
}: UseGameLoopProps) => {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const totalGoalsRef = useRef<number>(0);
  
  const frameCountRef = useRef<number>(0);
  const lastPerformanceCheckRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(true);
  const executingFrameRef = useRef<boolean>(false);
  
  // Setup our independent watchdog to detect stalled game loops
  const handleWatchdogTimeout = useCallback(() => {
    console.warn("Game loop watchdog triggered - attempting recovery");
    
    // If we're currently in a frame execution that's not finishing, reset
    if (executingFrameRef.current) {
      console.warn("Frame execution appears stuck - forcing reset");
      executingFrameRef.current = false;
    }
    
    // Reset animation frame if active
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
    }
    
    // Reset time references
    previousTimeRef.current = null;
    
    // Restart the game loop
    if (isActiveRef.current) {
      console.log("Restarting game loop after watchdog recovery");
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  }, []);
  
  const { petWatchdog } = useWatchdog({
    timeout: 5000,  // 5 seconds without a frame is definitely frozen
    onTimeout: handleWatchdogTimeout,
    description: 'Game Loop',
    enabled: true
  });
  
  const gameLoop = useCallback((time: number) => {
    if (!isActiveRef.current) return;
    
    // Mark that we're executing a frame and pet the watchdog
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
      // Mark that we've finished this frame
      executingFrameRef.current = false;
      
      // Request next frame if we're still active
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
  
  // Handle visibility change to prevent performance issues when tab is inactive
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
