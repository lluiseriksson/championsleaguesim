
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
  
  const gameLoop = useCallback((time: number) => {
    if (previousTimeRef.current === null) {
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    const deltaTime = time - previousTimeRef.current;
    previousTimeRef.current = time;
    
    frameCountRef.current += 1;
    
    // Primary game logic updates
    updatePlayerPositions();
    updateBallPosition();
    incrementSyncCounter();
    
    // Performance checks (less frequent)
    if (frameCountRef.current % 30 === 0 && checkPerformance) {
      checkPerformance();
    }
    
    // Adjust sync and learning intervals based on performance 
    const syncInterval = isLowPerformance ? 120 : 60;
    const learningInterval = isLowPerformance ? 300 : 180;
    
    // Only perform sync and learning on specific frames to improve performance
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
    
    // Run historical training if available
    if (performHistoricalTraining && frameCountRef.current % 180 === 0) {
      try {
        performHistoricalTraining();
      } catch (error) {
        console.error("Error in performHistoricalTraining:", error);
      }
    }
    
    // Reset frame counter to prevent overflow
    if (frameCountRef.current >= 600) {
      frameCountRef.current = 0;
    }
    
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
    requestRef.current = requestAnimationFrame(gameLoop);
    console.log('Game loop initialized');
    
    return () => {
      console.log('Game loop cleanup');
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoop]);
  
  return { totalGoalsRef };
};
