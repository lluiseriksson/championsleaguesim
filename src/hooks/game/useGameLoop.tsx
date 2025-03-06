import React from 'react';
import { Player, Ball, Score } from '../../types/football';

interface GameLoopProps {
  players: Player[];
  updatePlayerPositions: () => void;
  updateBallPosition: () => void;
  incrementSyncCounter: () => void;
  syncModels: () => void;
  checkLearningProgress: () => void;
  ball: Ball;
  score: Score;
  tournamentMode?: boolean;
}

export const useGameLoop = ({
  players,
  updatePlayerPositions,
  updateBallPosition,
  incrementSyncCounter,
  syncModels,
  checkLearningProgress,
  ball,
  score,
  tournamentMode = false
}: GameLoopProps) => {
  // Track if game is running
  const isRunningRef = React.useRef(true);
  // Track if neural networks are initialized
  const neuralNetworksInitializedRef = React.useRef(false);
  // Track performance issues
  const performanceIssueRef = React.useRef(false);
  // Track frames
  const frameCountRef = React.useRef(0);
  // Last frame time for fps calculation
  const lastFrameTimeRef = React.useRef(performance.now());
  // Track frame times for fps calculation
  const frameTimesRef = React.useRef<number[]>([]);
  
  // For debugging
  const lastScoreRef = React.useRef({ red: 0, blue: 0 });
  const totalGoalsRef = React.useRef(0);

  // Check for score changes to track goals
  React.useEffect(() => {
    const newTotalGoals = score.red + score.blue;
    const prevTotalGoals = lastScoreRef.current.red + lastScoreRef.current.blue;
    
    if (newTotalGoals > prevTotalGoals) {
      // Update total goals reference with actual score data
      totalGoalsRef.current = newTotalGoals;
    }
    
    lastScoreRef.current = { ...score };
  }, [score]);

  // Check if all players have initialized neural networks
  React.useEffect(() => {
    if (players.length > 0 && !neuralNetworksInitializedRef.current) {
      // We'll consider networks initialized when at least 70% of players have valid networks
      // This is a compromise to prevent waiting too long but also ensure enough players are ready
      const validNetworksCount = players.filter(player => 
        player.brain && player.brain.net && typeof player.brain.net.run === 'function'
      ).length;
      
      const initializationPercentage = (validNetworksCount / players.length) * 100;
      
      if (initializationPercentage >= 70) {
        console.log(`Neural networks initialization threshold reached (${validNetworksCount}/${players.length} - ${initializationPercentage.toFixed(1)}%)`);
        neuralNetworksInitializedRef.current = true;
      }
    }
  }, [players]);

  // Function to calculate current FPS
  const calculateFPS = () => {
    const now = performance.now();
    const frameDuration = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    
    // Keep last 30 frame times
    frameTimesRef.current.push(frameDuration);
    if (frameTimesRef.current.length > 30) {
      frameTimesRef.current.shift();
    }
    
    // Calculate average frame time
    const avgFrameTime = frameTimesRef.current.reduce((sum, time) => sum + time, 0) / 
                          frameTimesRef.current.length;
    
    // Convert to FPS
    return Math.round(1000 / avgFrameTime);
  };
  
  // Function to check for performance issues
  const checkPerformance = () => {
    const fps = calculateFPS();
    
    if (fps < 45) { // Performance threshold
      // Only log once when we detect an issue
      if (!performanceIssueRef.current) {
        console.log(`Performance issue detected: ${fps} FPS - reducing neural network usage`);
        performanceIssueRef.current = true;
      }
    } else if (performanceIssueRef.current && fps > 55) {
      // Performance has recovered
      console.log(`Performance has recovered: ${fps} FPS - resuming normal operation`);
      performanceIssueRef.current = false;
    }
    
    return performanceIssueRef.current;
  };

  // Initialize and run the game loop
  React.useEffect(() => {
    console.log("Game loop started");
    let frameId: number;
    let lastTime = performance.now();
    const TIME_STEP = 16; // 60 FPS target
    let initialDelayCompleted = false;
    
    const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= TIME_STEP) {
        frameCountRef.current++;
        
        // Wait briefly before starting player movement to ensure initialization
        if (!initialDelayCompleted && frameCountRef.current >= 15) {
          initialDelayCompleted = true;
          console.log("Initial delay completed, starting player updates");
        }
        
        // Check performance every 60 frames (approximately once per second)
        const hasPerformanceIssue = frameCountRef.current % 60 === 0 ? 
          checkPerformance() : performanceIssueRef.current;
        
        if (initialDelayCompleted) {
          // Only update player positions at full rate during good performance,
          // otherwise throttle updates to every other frame
          if (!hasPerformanceIssue || frameCountRef.current % 2 === 0) {
            updatePlayerPositions();
          }
          
          // Always update ball position for smooth movement
          if (neuralNetworksInitializedRef.current || frameCountRef.current > 300) {
            updateBallPosition();
          }
          
          // Increment sync counter at full rate during good performance,
          // otherwise throttle to reduce load
          if (!hasPerformanceIssue || frameCountRef.current % 3 === 0) {
            incrementSyncCounter();
          }
        }
        
        lastTime = currentTime;
      }
      
      frameId = requestAnimationFrame(gameLoop);
    };

    // Start the game loop immediately
    frameId = requestAnimationFrame(gameLoop);
    
    // Sync models on startup only if not in tournament mode
    if (!tournamentMode) {
      setTimeout(() => {
        syncModels();
      }, 5000); // Delay initial sync to allow game to stabilize
    }
    
    // Check learning progress on mount only if not in tournament mode
    if (!tournamentMode) {
      setTimeout(() => {
        checkLearningProgress();
      }, 7000); // Further delayed to reduce initial load
    }
    
    console.log("Game loop initialized");

    // Debug timer to log ball state every 5 seconds (less frequent in tournament mode)
    const debugInterval = setInterval(() => {
      if (isRunningRef.current && !tournamentMode && !performanceIssueRef.current) {
        console.log("Ball state:", {
          position: ball.position,
          velocity: ball.velocity,
          speed: Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y)
        });
        console.log("Current score:", score);
        console.log("Neural networks initialized:", neuralNetworksInitializedRef.current);
        
        // Log performance metrics
        const fps = calculateFPS();
        console.log(`Current performance: ${fps} FPS`);
      }
    }, tournamentMode ? 30000 : 10000); // Reduced frequency

    // Setup periodic learning progress check (disabled in tournament mode)
    const learningCheckInterval = setInterval(() => {
      if (isRunningRef.current && !tournamentMode && !performanceIssueRef.current) {
        checkLearningProgress();
      }
    }, 180000); // Reduced frequency to every 3 minutes

    return () => {
      console.log("Game loop cleanup");
      cancelAnimationFrame(frameId);
      clearInterval(debugInterval);
      clearInterval(learningCheckInterval);
      isRunningRef.current = false;
    };
  }, [
    players, 
    updatePlayerPositions, 
    updateBallPosition, 
    incrementSyncCounter, 
    syncModels, 
    checkLearningProgress, 
    ball, 
    score, 
    tournamentMode
  ]);

  return { totalGoalsRef };
};
