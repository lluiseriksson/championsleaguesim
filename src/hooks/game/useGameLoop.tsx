
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
  
  // For debugging
  const lastScoreRef = React.useRef({ red: 0, blue: 0 });
  const totalGoalsRef = React.useRef(0);
  
  // Track initialization state
  const [initialized, setInitialized] = React.useState(false);

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

  // Initialize and run the game loop
  React.useEffect(() => {
    // Don't start game loop if no players are available
    if (players.length === 0) {
      console.log("Game loop not started - waiting for players");
      return;
    }
    
    console.log(`Game loop started with ${players.length} players, ball velocity: ${ball.velocity.x.toFixed(2)},${ball.velocity.y.toFixed(2)}`);
    let frameId: number;
    let lastTime = performance.now();
    const TIME_STEP = 16; // 60 FPS target
    
    const gameLoop = () => {
      if (!isRunningRef.current) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= TIME_STEP) {
        // Update player positions
        updatePlayerPositions();

        // Update ball position and handle collisions
        updateBallPosition();

        // Increment sync counter
        incrementSyncCounter();
        
        lastTime = currentTime;
      }
      
      frameId = requestAnimationFrame(gameLoop);
    };

    // Start the game loop immediately if we have players
    if (!initialized) {
      // Mark initialization as complete
      setInitialized(true);
      
      // Sync models on startup only if not in tournament mode
      if (!tournamentMode) {
        syncModels();
      }
      
      // Check learning progress on mount only if not in tournament mode
      if (!tournamentMode) {
        setTimeout(() => {
          checkLearningProgress();
        }, 5000); // Check after 5 seconds to allow initial loading
      }
      
      // Force immediate update of player positions and ball position
      updatePlayerPositions();
      updateBallPosition();
      console.log("Initial positions updated on game start");
    }
    
    frameId = requestAnimationFrame(gameLoop);
    console.log("Game loop initialized with ball speed:", calculateBallSpeed(ball.velocity));

    // Debug timer to log ball state every 5 seconds (less frequent in tournament mode)
    const debugInterval = setInterval(() => {
      if (isRunningRef.current && !tournamentMode) {
        console.log("Ball state:", {
          position: ball.position,
          velocity: ball.velocity,
          speed: Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y)
        });
        console.log("Current score:", score);
        console.log(`Current player count: ${players.length}`);
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
    tournamentMode,
    initialized
  ]);
  
  // Helper function to calculate ball speed
  const calculateBallSpeed = (velocity: {x: number, y: number}): number => {
    return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  };

  return { totalGoalsRef };
};
