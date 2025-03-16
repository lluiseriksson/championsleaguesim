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
  // CRITICAL FIX: Always initialize gameActive to true regardless of gameEnded
  const [gameActive, setGameActive] = useState(true);
  const totalGoalsRef = useRef(0);
  const frameRateRef = useRef<number[]>([]);
  const lastFpsUpdateTime = useRef(0);
  const requestIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const frameCountRef = useRef(0);

  // CRITICAL FIX: Initialize but ignore gameEndedRef in most cases
  const gameEndedRef = useRef(false);

  // Keep track of whether we're mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Memory management - track when we last cleaned up arrays
  const lastMemoryCleanupRef = useRef(Date.now());

  // CRITICAL FIX: Only update ref value but do not cancel animation frame
  useEffect(() => {
    console.log(`useGameLoop - gameEnded changed to: ${gameEnded}`);
    gameEndedRef.current = gameEnded;
  }, [gameEnded]);

  // Memory cleanup function - called periodically
  const performMemoryCleanup = () => {
    // Clear frame rate history
    if (frameRateRef.current.length > 30) {
      frameRateRef.current = frameRateRef.current.slice(-30);
    }
    
    // Reset any accumulated counters if they're too large
    if (frameCountRef.current > 100000) {
      frameCountRef.current = 0;
    }

    // Update last cleanup time
    lastMemoryCleanupRef.current = Date.now();
  };

  // Initial setup and cleanup on mount/unmount
  useEffect(() => {
    console.log("Game loop initialized, setting gameActive true");
    isMountedRef.current = true;
    setGameActive(true); // Always start active
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
      
      // Final memory cleanup
      performMemoryCleanup();
    };
  }, []);

  // The main game loop effect
  useEffect(() => {
    // CRITICAL FIX: Always run the game loop regardless of gameEnded state
    console.log(`Game loop starting - gameActive: ${gameActive}`);
    
    if (!gameActive) {
      console.log('Game loop inactive - no animation frames will be requested');
      return;
    }

    let lastFrameTime = performance.now();
    let deltaTime = 0;
    let accumulator = 0;
    const timeStep = 1000 / targetFPS; // Time step in ms for target frame rate
    
    // Function to check if the game should continue running
    const shouldContinue = () => {
      if (!isMountedRef.current) {
        console.log("Component unmounted, stopping loop");
        return false;
      }
      if (!gameActive) {
        console.log("Game inactive, stopping loop");
        return false;
      }
      // CRITICAL FIX: Don't check gameEndedRef here so the game always runs
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
      deltaTime = Math.min(currentTime - lastFrameTime, 100); // Cap delta time to prevent huge jumps
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

      // Periodically clean up memory (every 30 seconds)
      if (currentTime - lastMemoryCleanupRef.current > 30000) {
        performMemoryCleanup();
      }

      // Accumulate time and update in fixed time steps
      accumulator += deltaTime;
      
      // Process updates at fixed intervals to normalize gameplay speed
      let updatesThisFrame = 0;
      const MAX_UPDATES_PER_FRAME = 5; // Prevent spiral of death
      
      while (accumulator >= timeStep && updatesThisFrame < MAX_UPDATES_PER_FRAME) {
        // CRITICAL FIX: Remove the check for gameEndedRef here to ensure updates happen
        
        // Update counter for managing model synchronization
        incrementSyncCounter();
        
        // Periodically check if we need to sync models - reduce frequency in tournament
        if (frameCountRef.current % (tournamentMode ? 120 : 60) === 0) {
          syncModels();
        }
        
        // Periodically check learning progress - reduce frequency in tournament
        if (frameCountRef.current % (tournamentMode ? 240 : 120) === 0) {
          checkLearningProgress();
        }
        
        // Periodically check performance
        if (frameCountRef.current % 180 === 0) {
          checkPerformance();
        }
        
        // Periodically check training effectiveness
        if (checkTrainingEffectiveness && frameCountRef.current % 600 === 0) {
          checkTrainingEffectiveness();
        }
        
        // Periodically run historical training with reduced frequency
        if (frameCountRef.current % 1200 === 0) {
          performHistoricalTraining();
        }

        // CRITICAL FIX: Always update positions regardless of game state
        updatePlayerPositions();
        updateBallPosition();
        
        // Reduce from accumulator
        accumulator -= timeStep;
        
        // Increment frame counter
        frameCountRef.current++;
        updatesThisFrame++;
      }
      
      // If we still have too much accumulated time, dump some to prevent lag spiral
      if (accumulator > timeStep * 5) {
        console.log(`Dumping excess time accumulation: ${accumulator.toFixed(2)}ms`);
        accumulator = timeStep * 2;
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
    targetFPS,
    tournamentMode
    // CRITICAL FIX: Remove gameEnded from dependencies so animation frame isn't restarted when it changes
  ]);

  return { totalGoalsRef };
};
