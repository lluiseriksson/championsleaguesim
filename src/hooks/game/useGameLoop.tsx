
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
      const allInitialized = players.every(player => 
        player.brain && player.brain.net && typeof player.brain.net.run === 'function'
      );
      
      if (allInitialized) {
        console.log("All neural networks initialized and ready");
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
          // Update player positions first so they're ready when ball moves
          updatePlayerPositions();
          
          // Only update ball after a brief delay to ensure players are positioned
          if (frameCounter >= 30 || neuralNetworksInitializedRef.current) {
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
