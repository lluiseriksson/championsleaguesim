import { Position, PLAYER_RADIUS, BALL_RADIUS } from '../types/football';

const MAX_BALL_SPEED = 15;
const MIN_BALL_SPEED = 3.5; // Significantly increased minimum speed

const limitSpeed = (velocity: Position): Position => {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  
  // Apply maximum speed limit
  if (speed > MAX_BALL_SPEED) {
    const factor = MAX_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  // ALWAYS apply minimum speed unless the ball should be completely stopped
  // (which should only happen at game reset/initialization)
  if (speed < MIN_BALL_SPEED && speed > 0) {
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  return velocity;
};

export const checkCollision = (ballPos: Position, playerPos: Position): boolean => {
  const dx = ballPos.x - playerPos.x;
  const dy = ballPos.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = PLAYER_RADIUS + BALL_RADIUS;
  
  // Add a small buffer to prevent the ball from getting stuck
  return distance <= minDistance + 0.5;
};

export const calculateNewVelocity = (
  ballPosition: Position,
  playerPosition: Position,
  currentVelocity: Position,
  isGoalkeeper: boolean = false
): Position => {
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // Calculate incident angle
  const incidentAngle = Math.atan2(currentVelocity.y, currentVelocity.x);
  
  // Special handling for goalkeeper
  if (isGoalkeeper) {
    const ballMovingTowardsGoal = (playerPosition.x < 400 && currentVelocity.x < 0) || 
                                 (playerPosition.x > 400 && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Calculate deflection direction (away from the goal)
      const deflectionX = playerPosition.x < 400 ? 2.5 : -2.5; // Increased power
      
      // Calculate vertical component based on impact point
      const verticalFactor = dy / (PLAYER_RADIUS + BALL_RADIUS);
      
      // Higher base speed for goalkeeper deflections
      const baseSpeed = 10; // Increased from 8
      
      return limitSpeed({
        x: deflectionX * baseSpeed,
        y: verticalFactor * baseSpeed * 1.5
      });
    }
  }

  // For other players or when the ball isn't going toward goal
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Calculate reflection velocity using incident angle
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );
  
  // Higher base speed for all balls - never let it get too slow
  const adjustedSpeed = Math.max(7, speed * 1.3);  // Ensure speed is at least 7
  
  const reflectionAngle = angle + (angle - incidentAngle);
  
  // Add slight random variation to the reflection
  const randomVariation = (Math.random() - 0.5) * 0.3;
  
  // Higher multiplier for goalkeeper collisions
  const speedMultiplier = isGoalkeeper ? 1.8 : 1.5; // Increased both multipliers
  
  return limitSpeed({
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * speedMultiplier,
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * speedMultiplier
  });
};
