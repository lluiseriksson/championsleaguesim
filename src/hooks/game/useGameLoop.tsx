import { useState, useEffect, useRef } from 'react';
import { Player, Ball, Score } from '../../types/football';

interface GameLoopProps {
  players: Player[];
  updatePlayerPositions: () => void;
  updateBallPosition: () => void;
  incrementSyncCounter: () => void;
  syncModels: () => void;
  checkLearningProgress: () => void;
  checkPerformance: () => void;
  performHistoricalTraining: () => void;
  checkTrainingEffectiveness?: () => void; // NEW: Add optional training effectiveness check
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
  checkTrainingEffectiveness,
  ball,
  score,
  tournamentMode,
  isLowPerformance
}: GameLoopProps) => {
  const [gameActive, setGameActive] = useState(true);
  const totalGoalsRef = useRef(0);

  useEffect(() => {
    console.log(`GameLoop - Goals scored: ${totalGoalsRef.current}`);
  }, [totalGoalsRef.current]);

  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
    };
  }, []);

  useEffect(() => {
    if (!gameActive) return;

    let animationFrameId: number;
    let lastFrameTime = performance.now();
    let deltaTime = 0;
    let frameCount = 0;

    const gameLoop = (currentTime: number) => {
      // Calculate frame delta time for consistent movement
      deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      // Skip frames if delta time is too high (tab was inactive)
      if (deltaTime > 100) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // Cap delta time to prevent physics issues on slow devices
      deltaTime = Math.min(deltaTime, 33);
      
      // Do not update more than 12 times in slow mode
      if (isLowPerformance && frameCount % 3 !== 0) {
        frameCount++;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // Update counter for managing model synchronization
      incrementSyncCounter();
      
      // Periodically check if we need to sync models
      syncModels();
      
      // Periodically check learning progress
      checkLearningProgress();
      
      // Periodically check performance
      checkPerformance();
      
      // Periodically check training effectiveness
      if (checkTrainingEffectiveness && frameCount % 60 === 0) {
        checkTrainingEffectiveness();
      }
      
      // Periodically run historical training
      if (frameCount % 600 === 0) {
        performHistoricalTraining();
      }

      // Update game entities
      updatePlayerPositions();
      updateBallPosition();

      // Increment frame counter
      frameCount++;

      // Continue the game loop
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Start the game loop
    animationFrameId = requestAnimationFrame(gameLoop);

    // Clean up on unmount
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    gameActive,
    players,
    updateBallPosition,
    updatePlayerPositions,
    incrementSyncCounter,
    syncModels,
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining,
    checkTrainingEffectiveness, // NEW: Add checkTrainingEffectiveness to dependencies
    isLowPerformance
  ]);

  return { totalGoalsRef };
};
