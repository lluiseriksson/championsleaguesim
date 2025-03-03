import { Position, PLAYER_RADIUS, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

const MAX_BALL_SPEED = 12; // Reduced from 15 for more realistic play
const MIN_BALL_SPEED = 1.5; // Reduced from 3.5 to allow more natural slowing

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
  
  // Apply minimum speed only if the ball is moving at all
  if (speed < MIN_BALL_SPEED && speed > 0.1) {
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  // Allow ball to stop completely if speed is very low
  if (speed <= 0.1) {
    return { x: 0, y: 0 };
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

export const addRandomEffect = (velocity: Position): Position => {
  // Add a small random component to the X velocity
  const randomX = (Math.random() - 0.5) * 2;
  // Add a larger random component to the Y velocity to push ball inward
  const randomY = (Math.random() * 2) - 1;
  
  return {
    x: velocity.x + randomX,
    y: velocity.y + randomY * 2 // Greater effect on Y to push ball away from boundaries
  };
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
    // Determine which goal the goalkeeper is defending
    const isLeftGoalkeeper = playerPosition.x < PITCH_WIDTH / 2;
    const centerY = PITCH_HEIGHT / 2;
    
    // Is the ball moving toward the goal?
    const ballMovingTowardsGoal = (isLeftGoalkeeper && currentVelocity.x < 0) || 
                               (!isLeftGoalkeeper && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Calculate horizontal deflection direction (away from the goal)
      const deflectionX = isLeftGoalkeeper ? 3.5 : -3.5; // Reduced from 4.5 for more realistic power
      
      // Calculate vertical deflection to push ball away from goal center
      const verticalOffset = ballPosition.y - centerY;
      const verticalFactor = Math.sign(verticalOffset) * (1.0 + Math.min(Math.abs(verticalOffset) / 120, 0.8));
      
      // More realistic base speed for goalkeeper saves
      const baseSpeed = 10; // Reduced from 14
      
      console.log(`Goalkeeper SAVE by ${isLeftGoalkeeper ? 'red' : 'blue'} team!`);
      
      return limitSpeed({
        x: deflectionX * baseSpeed,
        y: verticalFactor * baseSpeed * 0.8 // Reduced from 1.5
      });
    }
    
    // When not directly saving, still direct the ball towards the correct side of the field
    const teamDirection = isLeftGoalkeeper ? 1 : -1; 
    
    return limitSpeed({
      x: Math.abs(currentVelocity.x) * teamDirection * 1.3, // Reduced from 1.5
      y: currentVelocity.y
    });
  }

  // ENHANCED directional shooting for field players
  // Add team-specific logic to make the ball tend to go in the right direction
  const team = playerPosition.x < PITCH_WIDTH / 2 ? 'red' : 'blue';
  const directionalBias = team === 'red' ? 0.15 : -0.15; // Reduced from 0.2 for more natural play
  
  // For other players or when the ball isn't going toward goal
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Calculate reflection velocity using incident angle with directional bias
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );
  
  // More realistic base speed for all balls
  const adjustedSpeed = Math.max(5, speed * 1.1);  // Reduced from 7 and 1.3
  
  // Add directional bias to reflection angle
  const reflectionAngle = angle + (angle - incidentAngle) + directionalBias;
  
  // Add slight random variation to the reflection
  const randomVariation = (Math.random() - 0.5) * 0.15; // Reduced from 0.2
  
  // More realistic multiplier for soccer ball physics
  const speedMultiplier = isGoalkeeper ? 1.5 : 1.2; // Reduced from 2.0 and 1.5
  
  // Calculate new velocity with all factors combined
  let newVelocity = {
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * speedMultiplier,
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * speedMultiplier
  };
  
  // Add one final directional bias check for very dangerous own-goal situations
  const movingTowardsOwnGoal = (team === 'red' && newVelocity.x < 0) || 
                            (team === 'blue' && newVelocity.x > 0);
                           
  if (movingTowardsOwnGoal && Math.abs(newVelocity.x) > 2.5) { // Reduced from 3
    // Flip the x direction if headed strongly towards own goal
    newVelocity.x = -newVelocity.x * 0.8; // Added 0.8 factor to reduce reflection power
    console.log(`Emergency direction correction applied for ${team} team!`);
  }
  
  return limitSpeed(newVelocity);
};
