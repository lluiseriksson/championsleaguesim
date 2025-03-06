
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

  // Initialize and run the game loop
  React.useEffect(() => {
    console.log("Game loop started");
    let frameId: number;
    let lastTime = performance.now();
    const TIME_STEP = 16; // 60 FPS target
    let initialDelayCompleted = false;
    let frameCounter = 0;
    
    const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= TIME_STEP) {
        frameCounter++;
        
        // Wait briefly before starting player movement to ensure initialization
        if (!initialDelayCompleted && frameCounter >= 15) {
          initialDelayCompleted = true;
          console.log("Initial delay completed, starting player updates");
        }
        
        if (initialDelayCompleted) {
          // Always update player positions since we want positioning to happen
          // even if the ball is not moving yet
          updatePlayerPositions();
          
          // Only update ball if neural networks are sufficiently initialized
          // or if we've been waiting too long (safety fallback)
          if (neuralNetworksInitializedRef.current || frameCounter > 300) {
            updateBallPosition();
          }
          
          // Increment sync counter
          incrementSyncCounter();
        }
        
        lastTime = currentTime;
      }
      
      frameId = requestAnimationFrame(gameLoop);
    };

    // Start the game loop immediately
    frameId = requestAnimationFrame(gameLoop);
    
    // Sync models on startup only if not in tournament mode
    if (!tournamentMode) {
      syncModels();
    }
    
    // Check learning progress on mount only if not in tournament mode
    if (!tournamentMode) {
      setTimeout(() => {
        checkLearningProgress();
      }, 2000); // Reduced from 5000ms to 2000ms to check earlier
    }
    
    console.log("Game loop initialized");

    // Debug timer to log ball state every 5 seconds (less frequent in tournament mode)
    const debugInterval = setInterval(() => {
      if (isRunningRef.current && !tournamentMode) {
        console.log("Ball state:", {
          position: ball.position,
          velocity: ball.velocity,
          speed: Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y)
        });
        console.log("Current score:", score);
        console.log("Neural networks initialized:", neuralNetworksInitializedRef.current);
      }
    }, tournamentMode ? 15000 : 5000);

    // Setup periodic learning progress check (disabled in tournament mode)
    const learningCheckInterval = setInterval(() => {
      if (isRunningRef.current && !tournamentMode) {
        checkLearningProgress();
      }
    }, 120000); // Check every 2 minutes

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
