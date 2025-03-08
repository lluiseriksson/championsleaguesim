
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
  checkTrainingEffectiveness?: () => void;
  ball: Ball;
  score: Score;
  tournamentMode?: boolean;
  isLowPerformance?: boolean;
  gameEnded?: boolean; // NEW: Add gameEnded flag to stop the game loop
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
  isLowPerformance,
  gameEnded = false // NEW: Default to false
}: GameLoopProps) => {
  const [gameActive, setGameActive] = useState(true);
  const totalGoalsRef = useRef(0);

  useEffect(() => {
    console.log(`GameLoop - Goals scored: ${totalGoalsRef.current}`);
  }, [totalGoalsRef.current]);

  // NEW: Update gameActive when gameEnded changes
  useEffect(() => {
    if (gameEnded) {
      console.log('Game ended, stopping game loop');
      setGameActive(false);
    }
  }, [gameEnded]);

  useEffect(() => {
    setGameActive(true);
    return () => {
      setGameActive(false);
    };
  }, []);

  useEffect(() => {
    if (!gameActive) {
      console.log('Game loop inactive - no animation frames will be requested');
      return;
    }

    let animationFrameId: number;
    let lastFrameTime = performance.now();
    let deltaTime = 0;
    let frameCount = 0;

    const gameLoop = (currentTime: number) => {
      // Check if game is still active before continuing
      if (!gameActive) {
        console.log('Game loop terminated during frame');
        return;
      }

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

      // Continue the game loop if still active
      if (gameActive && !gameEnded) {
        animationFrameId = requestAnimationFrame(gameLoop);
      } else {
        console.log('Game loop terminating - gameActive:', gameActive, 'gameEnded:', gameEnded);
      }
    };

    // Start the game loop
    animationFrameId = requestAnimationFrame(gameLoop);

    // Clean up on unmount
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        console.log('Cleaning up game loop animation frame');
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
    checkTrainingEffectiveness,
    isLowPerformance,
    gameEnded // NEW: Add gameEnded to dependencies
  ]);

  return { totalGoalsRef };
};
