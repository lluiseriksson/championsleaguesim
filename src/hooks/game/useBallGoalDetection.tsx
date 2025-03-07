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
  
  // NEW: Track if ball is already in goal (for stopping it inside the goal)
  const ballInGoalRef = React.useRef<{
    inGoal: boolean;
    team: 'red' | 'blue' | null;
    entryTime: number;
  }>({
    inGoal: false,
    team: null,
    entryTime: 0
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
  
  // Check if the ball is inside a goal but not counted yet
  const isInsideGoalArea = React.useCallback((position: Position): { inside: boolean, team: 'red' | 'blue' | null } => {
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;
    
    // Check if inside left goal (blue team goal)
    if (position.x <= 0 && 
        position.y >= goalTop && 
        position.y <= goalBottom) {
      return { inside: true, team: 'blue' };
    }
    
    // Check if inside right goal (red team goal)
    if (position.x >= PITCH_WIDTH && 
        position.y >= goalTop && 
        position.y <= goalBottom) {
      return { inside: true, team: 'red' };
    }
    
    return { inside: false, team: null };
  }, []);
  
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
      
      // NEW: If the ball is already in the goal during cooldown, keep it there with no velocity
      if (ballInGoalRef.current.inGoal) {
        // Keep the ball inside the goal with zero velocity
        return { 
          goalScored: null, 
          updatedBall: {
            ...currentBall,
            velocity: { x: 0, y: 0 } // Stop ball movement inside goal
          } 
        };
      }
      
      return { goalScored: null, updatedBall: currentBall };
    }
    
    // Don't register a goal during goalkeeper save cooldown
    if (isInGoalkeeperCooldown) {
      return { goalScored: null, updatedBall: currentBall };
    }
    
    // NEW: Check if the ball has just entered a goal
    const goalAreaCheck = isInsideGoalArea(newPosition);
    if (goalAreaCheck.inside && !ballInGoalRef.current.inGoal) {
      // Ball just entered the goal area
      ballInGoalRef.current = {
        inGoal: true,
        team: goalAreaCheck.team,
        entryTime: currentTime
      };
      
      if (!tournamentMode) {
        console.log(`Ball entered ${goalAreaCheck.team} goal area`);
      }
      
      // Stop the ball inside the goal
      const updatedBall = {
        ...currentBall,
        position: newPosition,
        velocity: { x: 0, y: 0 } // Stop the ball
      };
      
      return { goalScored: null, updatedBall };
    }
    
    // Check if a goal was scored
    let goalScored = null;
    
    if (allowGoalDetection) {
      // IMPROVED: Check for goal with current position
      goalScored = checkGoal(newPosition);
      
      // If no goal detected directly, check if ball is already in goal area
      if (!goalScored && ballInGoalRef.current.inGoal) {
        goalScored = ballInGoalRef.current.team;
        if (!tournamentMode) {
          console.log(`GOAL DETECTED from ball already in goal area: ${goalScored}`);
        }
      }
      
      // If still no goal detected, check with retrospective analysis
      if (!goalScored && currentBall.previousPosition) {
        const prevPosition = currentBall.previousPosition;
        
        // Check if the trajectory of the ball crossed the goal line
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
      
      // Keep the ball where it is with zero velocity for the goal celebration
      const updatedBall = {
        ...currentBall,
        velocity: { x: 0, y: 0 } // Stop ball movement for celebration
      };
      
      // Reset the game start timer after a goal
      gameStartTimeRef.current = currentTime;
      
      // Reset the ball in goal flag
      ballInGoalRef.current = {
        inGoal: false,
        team: null,
        entryTime: 0
      };
      
      return { goalScored, updatedBall };
    }
    
    // If the ball was in goal but no goal was scored (possibly due to cooldown),
    // keep it in the goal with zero velocity
    if (ballInGoalRef.current.inGoal) {
      return { 
        goalScored: null, 
        updatedBall: {
          ...currentBall,
          velocity: { x: 0, y: 0 } // Ensure ball stays still in goal
        }
      };
    }
    
    // IMPROVED: Check for ball stuck in goal but not counted as goal yet
    const isInsideLeftGoal = newPosition.x < 5 && 
                            Math.abs(newPosition.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const isInsideRightGoal = newPosition.x > PITCH_WIDTH - 5 && 
                             Math.abs(newPosition.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    
    if (isInsideLeftGoal || isInsideRightGoal) {
      // If ball is very close to or inside goal but not registered as a goal yet
      // (possibly due to cooldowns), treat it as "in goal" and stop it
      const scoringTeam = isInsideLeftGoal ? 'blue' : 'red';
      
      // Mark ball as in goal
      ballInGoalRef.current = {
        inGoal: true,
        team: scoringTeam,
        entryTime: currentTime
      };
      
      if (!tournamentMode) {
        console.log(`Ball stopped inside ${scoringTeam} goal area`);
      }
      
      // Stop the ball's movement and keep it at current position
      const updatedBall = {
        ...currentBall,
        velocity: { x: 0, y: 0 }
      };
      
      return { goalScored: null, updatedBall };
    }
    
    // Reset ball in goal flag if ball is outside goal areas
    if (ballInGoalRef.current.inGoal && !isInsideLeftGoal && !isInsideRightGoal &&
        !goalAreaCheck.inside) {
      ballInGoalRef.current = {
        inGoal: false,
        team: null,
        entryTime: 0
      };
    }
    
    // If no goal, check for near miss if ball has velocity
    if (currentBall.velocity && 
        (Math.abs(currentBall.velocity.x) > 1 || Math.abs(currentBall.velocity.y) > 1)) {
      checkNearMiss(newPosition, currentBall.velocity);
    }
    
    return { goalScored: null, updatedBall: currentBall };
  }, [checkGoal, checkNearMiss, tournamentMode, isInsideGoalArea]);
  
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
