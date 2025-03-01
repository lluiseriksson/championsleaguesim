import { Position, PLAYER_RADIUS, BALL_RADIUS } from '../types/football';

const MAX_BALL_SPEED = 15;
const MIN_BALL_SPEED = 1.5; // Increased from 0.8 to 1.5 for faster minimum speed

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
  
  // Apply minimum speed if the ball is moving slowly
  if (speed < MIN_BALL_SPEED && speed > 0.1) {
    // Only apply minimum speed if the ball is actually moving
    // but not so slow that it should stop
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  // If ball speed is extremely low, it should completely stop
  if (speed <= 0.1) {
    return {
      x: 0,
      y: 0
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
      const deflectionX = playerPosition.x < 400 ? 1.5 : -1.5;
      
      // Calculate vertical component based on impact point
      const verticalFactor = dy / (PLAYER_RADIUS + BALL_RADIUS);
      
      // Higher base speed for goalkeeper deflections
      const baseSpeed = 8;
      
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
  
  // Higher base speed for slow-moving balls
  const adjustedSpeed = speed < 3 ? 6 : speed * 1.2;
  
  const reflectionAngle = angle + (angle - incidentAngle);
  
  // Add slight random variation to the reflection
  const randomVariation = (Math.random() - 0.5) * 0.3;
  
  // Higher multiplier for goalkeeper collisions
  const speedMultiplier = isGoalkeeper ? 1.5 : 1.2;
  
  return limitSpeed({
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * speedMultiplier,
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * speedMultiplier
  });
};
