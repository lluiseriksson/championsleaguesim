
import React from 'react';
import { Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../../types/football';

interface BallGoalDetectionProps {
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  tournamentMode?: boolean;
}

export const useBallGoalDetection = ({ 
  checkGoal, 
  tournamentMode = false 
}: BallGoalDetectionProps) => {
  
  // Prevent immediate goals when game starts
  const gameStartTimeRef = React.useRef<number>(Date.now());
  const minPlayTimeBeforeGoal = 1500; // 1.5 seconds grace period
  
  // Add goal cooldown to prevent multiple goal detections
  const lastGoalTimeRef = React.useRef<number>(0);
  const goalCooldownPeriod = 3000; // 3 seconds cooldown between goals
  
  // Track last known goalkeeper touch to prevent goals right after goalkeeper touches
  const lastGoalkeeperTouchRef = React.useRef<{
    time: number;
    team: 'red' | 'blue' | null;
  }>({
    time: 0,
    team: null
  });
  const goalkeeperSaveCooldown = 1000; // 1 second cooldown after goalkeeper touch
  
  // Track if ball was close to goal for near miss detection
  const nearMissRef = React.useRef<{
    detected: boolean;
    team: 'red' | 'blue' | null;
    timestamp: number;
  }>({
    detected: false,
    team: null,
    timestamp: 0
  });
  
  // Calculate if a shot was a near miss
  const checkNearMiss = React.useCallback((position: Position, velocity: Position): boolean => {
    // Don't detect near misses too frequently
    const now = Date.now();
    if (now - nearMissRef.current.timestamp < 2000) {
      return false;
    }
    
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;
    
    // Check left goal (blue team scores)
    if (position.x <= 30 && position.x > 0 && 
        position.y >= goalTop - 20 && position.y <= goalBottom + 20) {
      // Close to left goal but not a goal, and moving left
      if (velocity.x < 0 && Math.abs(position.y - goalY) <= GOAL_HEIGHT) {
        nearMissRef.current = {
          detected: true,
          team: 'blue',
          timestamp: now
        };
        if (!tournamentMode) {
          console.log("NEAR MISS: Almost a goal for Blue team!");
        }
        return true;
      }
    }
    
    // Check right goal (red team scores)
    if (position.x >= PITCH_WIDTH - 30 && position.x < PITCH_WIDTH && 
        position.y >= goalTop - 20 && position.y <= goalBottom + 20) {
      // Close to right goal but not a goal, and moving right
      if (velocity.x > 0 && Math.abs(position.y - goalY) <= GOAL_HEIGHT) {
        nearMissRef.current = {
          detected: true,
          team: 'red',
          timestamp: now
        };
        if (!tournamentMode) {
          console.log("NEAR MISS: Almost a goal for Red team!");
        }
        return true;
      }
    }
    
    return false;
  }, [tournamentMode]);
  
  // Track when a goalkeeper touches the ball
  const trackGoalkeeperTouch = React.useCallback((team: 'red' | 'blue') => {
    lastGoalkeeperTouchRef.current = {
      time: Date.now(),
      team
    };
    if (!tournamentMode) {
      console.log(`Goalkeeper ${team} touched the ball - preventing goal detection for 1 second`);
    }
  }, [tournamentMode]);
  
  const handleGoalCheck = React.useCallback((
    currentBall: Ball, 
    newPosition: Position
  ): { goalScored: 'red' | 'blue' | null; updatedBall: Ball } => {
    const currentTime = Date.now();
    
    // Check if enough time has passed since game start
    const timeSinceStart = currentTime - gameStartTimeRef.current;
    const allowGoalDetection = timeSinceStart > minPlayTimeBeforeGoal;
    
    // Check if we're still in the goal cooldown period
    const timeSinceLastGoal = currentTime - lastGoalTimeRef.current;
    const isInGoalCooldown = timeSinceLastGoal < goalCooldownPeriod;
    
    // Check if we're in goalkeeper save cooldown
    const timeSinceGoalkeeperTouch = currentTime - lastGoalkeeperTouchRef.current.time;
    const isInGoalkeeperCooldown = timeSinceGoalkeeperTouch < goalkeeperSaveCooldown;
    
    // Log goalkeeper cooldown status if active
    if (isInGoalkeeperCooldown && !tournamentMode) {
      console.log(`Goal detection blocked - goalkeeper save cooldown (${timeSinceGoalkeeperTouch}ms / ${goalkeeperSaveCooldown}ms)`);
    }
    
    if (isInGoalCooldown) {
      if (!tournamentMode) {
        console.log(`Goal detection blocked - cooldown active (${timeSinceLastGoal}ms / ${goalCooldownPeriod}ms)`);
      }
      return { goalScored: null, updatedBall: currentBall };
    }
    
    // Don't register a goal during goalkeeper save cooldown
    if (isInGoalkeeperCooldown) {
      return { goalScored: null, updatedBall: currentBall };
    }
    
    // Check if a goal was scored
    let goalScored = null;
    
    if (allowGoalDetection) {
      // MEJORADO: Usar la posición actual y algunas posiciones anteriores para una detección más precisa
      goalScored = checkGoal(newPosition);
      
      // Si no se detectó gol, comprobar si las posiciones anteriores indicarían un gol 
      // (por si la pelota pasó rápidamente a través de la portería)
      if (!goalScored && currentBall.previousPosition) {
        const prevPosition = currentBall.previousPosition;
        
        // Comprobar si la trayectoria de la pelota atravesó la línea de gol
        if (newPosition.x < 0 && prevPosition.x > 0 && 
            Math.abs(newPosition.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2) {
          goalScored = 'blue';
          console.log("GOAL DETECTED retrospectively on left goal - trajectory analysis");
        }
        else if (newPosition.x > PITCH_WIDTH && prevPosition.x < PITCH_WIDTH && 
                Math.abs(newPosition.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2) {
          goalScored = 'red';
          console.log("GOAL DETECTED retrospectively on right goal - trajectory analysis");
        }
      }
    } else if (!tournamentMode) {
      // Still check goal for debugging but don't count it
      const wouldBeGoal = checkGoal(newPosition);
      if (wouldBeGoal) {
        console.log(`IGNORED early goal for ${wouldBeGoal} - game just started (${timeSinceStart}ms)`);
      }
    }
    
    if (goalScored) {
      // Log less in tournament mode to reduce memory usage
      if (!tournamentMode) {
        console.log(`Goal detected for team ${goalScored}`);
      }
      
      // Set the cooldown timestamp
      lastGoalTimeRef.current = currentTime;
      
      // Reset ball position to center with completely random direction
      // to prevent predictable patterns after goals
      const updatedBall = {
        ...currentBall,
        position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
        velocity: { 
          x: (Math.random() * 8) - 4, // Fully random direction
          y: (Math.random() * 8) - 4  // Fully random direction
        },
        bounceDetection: {
          consecutiveBounces: 0,
          lastBounceTime: 0,
          lastBounceSide: '',
          sideEffect: false
        }
      };
      
      // Reset the game start timer after a goal
      gameStartTimeRef.current = currentTime;
      
      return { goalScored, updatedBall };
    }
    
    // IMPROVED: If the ball is inside the goal but no goal was detected (possibly due to cooldown),
    // force it out to prevent it from getting stuck
    if (!goalScored) {
      const isInsideLeftGoal = newPosition.x < 5 && 
                              Math.abs(newPosition.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
      const isInsideRightGoal = newPosition.x > PITCH_WIDTH - 5 && 
                               Math.abs(newPosition.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
      
      if (isInsideLeftGoal || isInsideRightGoal) {
        // If ball is stuck in goal but we can't count it as a goal due to cooldowns,
        // force it out of the goal area with a bounce effect
        const updatedBall = {
          ...currentBall,
          position: { 
            // Move ball away from goal line
            x: isInsideLeftGoal ? 15 : PITCH_WIDTH - 15,
            y: newPosition.y
          },
          velocity: {
            // Add bounce velocity away from goal
            x: isInsideLeftGoal ? 3 : -3,
            y: currentBall.velocity ? currentBall.velocity.y * 0.8 : 0
          }
        };
        
        if (!tournamentMode) {
          console.log(`Ball was stuck in ${isInsideLeftGoal ? 'left' : 'right'} goal - forcing it out`);
        }
        
        return { goalScored: null, updatedBall };
      }
    }
    
    // If no goal, check for near miss if ball has velocity
    if (currentBall.velocity && 
        (Math.abs(currentBall.velocity.x) > 1 || Math.abs(currentBall.velocity.y) > 1)) {
      checkNearMiss(newPosition, currentBall.velocity);
    }
    
    return { goalScored: null, updatedBall: currentBall };
  }, [checkGoal, checkNearMiss, tournamentMode]);
  
  // Add a reset method for game start/restart
  const resetGameClock = React.useCallback(() => {
    gameStartTimeRef.current = Date.now();
    // Also reset the goal cooldown timer when game restarts
    lastGoalTimeRef.current = 0;
    // Reset goalkeeper touch tracking
    lastGoalkeeperTouchRef.current = {
      time: 0,
      team: null
    };
    
    if (!tournamentMode) {
      console.log("Goal detection grace period started");
    }
  }, [tournamentMode]);
  
  // Initialize timer on component mount
  React.useEffect(() => {
    resetGameClock();
  }, [resetGameClock]);
  
  return { 
    handleGoalCheck, 
    nearMissRef, 
    resetGameClock,
    trackGoalkeeperTouch 
  };
};
