import { Position, PLAYER_RADIUS, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

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
  
  // Special handling for goalkeeper - ENHANCED
  if (isGoalkeeper) {
    // Determine which goal the goalkeeper is defending
    const isLeftGoalkeeper = playerPosition.x < PITCH_WIDTH / 2;
    const centerY = PITCH_HEIGHT / 2;
    
    // Is the ball moving toward the goal?
    const ballMovingTowardsGoal = (isLeftGoalkeeper && currentVelocity.x < 0) || 
                                 (!isLeftGoalkeeper && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Calculate horizontal deflection direction (away from the goal)
      const deflectionX = isLeftGoalkeeper ? 3.5 : -3.5; // Increased power for better clearance
      
      // Calculate vertical deflection to push ball away from goal center for better clearances
      const verticalOffset = ballPosition.y - centerY;
      const verticalFactor = Math.sign(verticalOffset) * (1.0 + Math.min(Math.abs(verticalOffset) / 100, 1.0));
      
      // Higher base speed for goalkeeper saves
      const baseSpeed = 12; // Increased from 10
      
      console.log(`Goalkeeper SAVE by ${isLeftGoalkeeper ? 'red' : 'blue'} team!`);
      
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
  
  // Higher multiplier for goalkeeper collisions for stronger clearances
  const speedMultiplier = isGoalkeeper ? 2.0 : 1.5; // Increased goalkeeper multiplier
  
  return limitSpeed({
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * speedMultiplier,
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * speedMultiplier
  });
};
