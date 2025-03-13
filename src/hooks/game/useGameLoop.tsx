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
  gameEnded?: boolean;
  targetFPS?: number;
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
  gameEnded = false,
  targetFPS = 60
}: GameLoopProps) => {
  const [gameActive, setGameActive] = useState(true);
  const totalGoalsRef = useRef(0);
  const frameRateRef = useRef<number[]>([]);
  const lastFpsUpdateTime = useRef(0);
  const requestIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // Keep track of our game ending state to prevent unnecessary 
  // animation frames after the game has ended
  const gameEndedRef = useRef(gameEnded);

  // Keep track of whether we're mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Log game loop state transitions for debugging
  useEffect(() => {
    console.log(`useGameLoop - gameEnded changed to: ${gameEnded}`);
    gameEndedRef.current = gameEnded;
    
    if (gameEnded && requestIdRef.current) {
      console.log("Cancelling animation frame due to game ended");
      cancelAnimationFrame(requestIdRef.current);
      requestIdRef.current = null;
      setGameActive(false);
    }
  }, [gameEnded]);

  useEffect(() => {
    console.log(`GameLoop - Goals scored: ${totalGoalsRef.current}`);
  }, [totalGoalsRef.current]);

  // Initial setup and cleanup on mount/unmount
  useEffect(() => {
    console.log("Game loop initialized, setting gameActive true");
    isMountedRef.current = true;
    setGameActive(true);
    isInitializedRef.current = true;
    
    return () => {
      console.log("Game loop unmounting");
      setGameActive(false);
      isMountedRef.current = false;
      
      // Always ensure we clean up any animation frame on unmount
      if (requestIdRef.current) {
        console.log("Cancelling animation frame on unmount");
        cancelAnimationFrame(requestIdRef.current);
        requestIdRef.current = null;
      }
    };
  }, []);

  // The main game loop effect
  useEffect(() => {
    // If the game is ended, don't even start the loop
    if (gameEnded || !isInitializedRef.current) {
      console.log(`Game loop not starting - gameEnded: ${gameEnded}, initialized: ${isInitializedRef.current}`);
      return;
    }

    console.log(`Game loop starting - gameActive: ${gameActive}, gameEnded: ${gameEndedRef.current}`);
    
    if (!gameActive) {
      console.log('Game loop inactive - no animation frames will be requested');
      return;
    }

    let lastFrameTime = performance.now();
    let deltaTime = 0;
    let frameCount = 0;
    let accumulator = 0;
    const timeStep = 1000 / targetFPS; // Time step in ms for target frame rate
    
    // Function to check if the game should continue running
    const shouldContinue = () => {
      if (gameEndedRef.current) {
        console.log("Game ended, stopping loop");
        return false;
      }
      if (!isMountedRef.current) {
        console.log("Component unmounted, stopping loop");
        return false;
      }
      if (!gameActive) {
        console.log("Game inactive, stopping loop");
        return false;
      }
      return true;
    };

    const gameLoop = (currentTime: number) => {
      // Release reference to ensure we don't double-cancel the same frame
      requestIdRef.current = null;
      
      // Check if we should continue running the game
      if (!shouldContinue()) {
        console.log("Game loop terminated");
        return;
      }

      // Calculate frame delta time for consistent movement
      deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      // Track frame rate
      frameRateRef.current.push(1000 / deltaTime);
      if (frameRateRef.current.length > 60) {
        frameRateRef.current.shift();
      }
      
      // Log FPS every second
      if (currentTime - lastFpsUpdateTime.current > 1000) {
        const avgFps = frameRateRef.current.reduce((sum, fps) => sum + fps, 0) / frameRateRef.current.length;
        console.log(`Current FPS: ${avgFps.toFixed(1)}`);
        lastFpsUpdateTime.current = currentTime;
      }
      
      // Skip frames if delta time is too high (tab was inactive)
      if (deltaTime > 200) {
        console.log(`Large time jump detected: ${deltaTime.toFixed(1)}ms - skipping frame`);
        
        // Check again if we should continue
        if (shouldContinue()) {
          requestIdRef.current = requestAnimationFrame(gameLoop);
        }
        return;
      }

      // Accumulate time and update in fixed time steps
      accumulator += deltaTime;
      
      // Process updates at fixed intervals to normalize gameplay speed
      while (accumulator >= timeStep) {
        // Skip all updates if the game has ended
        if (gameEndedRef.current) {
          accumulator = 0;
          break;
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

        // Update game entities with fixed time step
        updatePlayerPositions();
        updateBallPosition();
        
        // Reduce from accumulator
        accumulator -= timeStep;
        
        // Increment frame counter
        frameCount++;
      }

      // Continue the game loop only if we should
      if (shouldContinue()) {
        requestIdRef.current = requestAnimationFrame(gameLoop);
      } else {
        console.log('Game loop terminating without requesting next frame');
      }
    };

    // Start the game loop
    console.log("Starting game loop animation frame");
    requestIdRef.current = requestAnimationFrame(gameLoop);

    // Clean up on effect cleanup
    return () => {
      console.log("Cleaning up game loop effect");
      if (requestIdRef.current) {
        console.log("Cancelling animation frame in effect cleanup");
        cancelAnimationFrame(requestIdRef.current);
        requestIdRef.current = null;
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
    gameEnded,
    targetFPS
  ]);

  return { totalGoalsRef };
};
