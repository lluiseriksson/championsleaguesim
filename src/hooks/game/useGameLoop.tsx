
import { useRef, useEffect, useCallback } from 'react';
import { Player, Ball, Score } from '../../types/football';

interface UseGameLoopProps {
  players: Player[];
  updatePlayerPositions: () => void;
  updateBallPosition: () => void;
  incrementSyncCounter: () => void;
  syncModels: () => void;
  checkLearningProgress: () => void;
  checkPerformance?: () => void;
  performHistoricalTraining?: () => void;
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
  performHistoricalTraining,
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
  const hasRenderedRef = useRef<boolean>(false);
  const updateIntervalRef = useRef<number>(0);
  const fpsLimitRef = useRef<number>(60);
  const errorCountRef = useRef<number>(0);
  
  // Anti-freeze protection system
  const lastSuccessfulUpdateRef = useRef<number>(Date.now());
  const errorRecoveryModeRef = useRef<boolean>(false);
  
  const gameLoop = useCallback((time: number) => {
    try {
      if (previousTimeRef.current === null) {
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      const deltaTime = time - previousTimeRef.current;
      
      // Only update if enough time has passed (fps limiting)
      // This helps prevent CPU overload
      if (deltaTime < 1000 / fpsLimitRef.current) {
        requestRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      previousTimeRef.current = time;
      frameCountRef.current += 1;
      
      // Check if we're in recovery mode due to previous errors
      if (errorRecoveryModeRef.current) {
        // In recovery mode, run only essential updates at a reduced rate
        if (frameCountRef.current % 10 === 0) {
          updateBallPosition();
          updatePlayerPositions();
        }
        
        // Exit recovery mode after 2 seconds of successful operation
        if (Date.now() - lastSuccessfulUpdateRef.current > 2000) {
          console.log('Exiting error recovery mode');
          errorRecoveryModeRef.current = false;
          errorCountRef.current = 0;
        }
      } else {
        // Normal operation - run all updates
        updatePlayerPositions();
        updateBallPosition();
        incrementSyncCounter();
        
        // Performance checks (less frequent)
        if (frameCountRef.current % 30 === 0 && checkPerformance) {
          checkPerformance();
        }
        
        // Adjust sync and learning intervals based on performance 
        const syncInterval = isLowPerformance ? 180 : 90;
        const learningInterval = isLowPerformance ? 360 : 240;
        
        // Only perform sync and learning on specific frames to improve performance
        if (frameCountRef.current % syncInterval === 0) {
          try {
            syncModels();
          } catch (error) {
            console.error("Error in syncModels:", error);
            errorCountRef.current++;
          }
        }
        
        if (frameCountRef.current % learningInterval === 0) {
          try {
            checkLearningProgress();
          } catch (error) {
            console.error("Error in checkLearningProgress:", error);
            errorCountRef.current++;
          }
        }
        
        // Run historical training if available at an even more reduced frequency
        if (performHistoricalTraining && frameCountRef.current % 300 === 0) {
          try {
            performHistoricalTraining();
          } catch (error) {
            console.error("Error in performHistoricalTraining:", error);
            errorCountRef.current++;
          }
        }
        
        // If we've accumulated too many errors, switch to recovery mode
        if (errorCountRef.current > 5) {
          console.warn('Too many errors, entering recovery mode');
          errorRecoveryModeRef.current = true;
          errorCountRef.current = 0;
        }
      }
      
      // Reset frame counter to prevent overflow
      if (frameCountRef.current >= 600) {
        frameCountRef.current = 0;
      }
      
      // Record successful update time
      lastSuccessfulUpdateRef.current = Date.now();
      
    } catch (error) {
      console.error("Critical error in game loop:", error);
      errorCountRef.current++;
      
      // Enter recovery mode after a critical error
      if (!errorRecoveryModeRef.current) {
        console.warn('Critical error, entering recovery mode');
        errorRecoveryModeRef.current = true;
      }
    }
    
    // Always request next frame, even after errors
    requestRef.current = requestAnimationFrame(gameLoop);
    
  }, [
    updatePlayerPositions, 
    updateBallPosition, 
    incrementSyncCounter, 
    syncModels, 
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining,
    isLowPerformance
  ]);
  
  useEffect(() => {
    console.log('Game loop started');
    
    // Anti-freeze monitoring system - if game loop stalls, this will recover it
    const monitoringInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastSuccessfulUpdateRef.current;
      if (timeSinceLastUpdate > 5000) {
        console.error('Game loop appears to be frozen, attempting recovery');
        
        // Force cancel any existing animation frame
        if (requestRef.current !== null) {
          cancelAnimationFrame(requestRef.current);
        }
        
        // Reset state and restart loop
        previousTimeRef.current = null;
        errorRecoveryModeRef.current = true;
        requestRef.current = requestAnimationFrame(gameLoop);
        
        // Reduce target FPS to lighten the load
        fpsLimitRef.current = Math.max(30, fpsLimitRef.current - 5);
      }
    }, 5000);
    
    // Start the game loop
    requestRef.current = requestAnimationFrame(gameLoop);
    console.log('Game loop initialized');
    
    return () => {
      console.log('Game loop cleanup');
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      clearInterval(monitoringInterval);
    };
  }, [gameLoop]);
  
  return { totalGoalsRef };
};
