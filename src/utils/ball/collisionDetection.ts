
import { Position } from '../../types/football';
import { GOAL_POST_BOUNCE } from './ballConstants';

// Simplified goal post collision check
export const checkGoalPostCollision = (position: Position, ballRadius: number): false | 'horizontal' | 'vertical' => {
  // Goal dimensions (simplified)
  const leftGoalX = 0;
  const rightGoalX = 800;
  const goalTop = 220;
  const goalBottom = 380;
  
  // Check left goal post
  if (position.x - ballRadius < leftGoalX + 20 && 
      (position.y < goalTop || position.y > goalBottom)) {
    if (position.y > goalTop - ballRadius && position.y < goalTop + ballRadius) {
      return 'vertical'; // Top post
    }
    if (position.y > goalBottom - ballRadius && position.y < goalBottom + ballRadius) {
      return 'vertical'; // Bottom post
    }
    return 'horizontal'; // Side post
  }
  
  // Check right goal post
  if (position.x + ballRadius > rightGoalX - 20 && 
      (position.y < goalTop || position.y > goalBottom)) {
    if (position.y > goalTop - ballRadius && position.y < goalTop + ballRadius) {
      return 'vertical'; // Top post
    }
    if (position.y > goalBottom - ballRadius && position.y < goalBottom + ballRadius) {
      return 'vertical'; // Bottom post
    }
    return 'horizontal'; // Side post
  }
  
  return false;
};

// Handle wall collision and update position and velocity
export const handleWallCollisions = (
  position: Position, 
  velocity: Position, 
  ballRadius: number, 
  bounceDetection: NonNullable<Ball['bounceDetection']>,
  bounceHandler: (bounceDetection: NonNullable<Ball['bounceDetection']>, side: string) => void
) => {
  let updatedPosition = { ...position };
  let updatedVelocity = { ...velocity };
  
  // Handle pitch boundary collisions
  if (position.x - ballRadius < 0) {
    updatedPosition.x = ballRadius;
    updatedVelocity.x = Math.abs(velocity.x) * BOUNCE_FACTOR;
    bounceHandler(bounceDetection, 'left');
  } else if (position.x + ballRadius > 800) {
    updatedPosition.x = 800 - ballRadius;
    updatedVelocity.x = -Math.abs(velocity.x) * BOUNCE_FACTOR;
    bounceHandler(bounceDetection, 'right');
  }
  
  if (position.y - ballRadius < 0) {
    updatedPosition.y = ballRadius;
    updatedVelocity.y = Math.abs(velocity.y) * BOUNCE_FACTOR;
    bounceHandler(bounceDetection, 'top');
  } else if (position.y + ballRadius > 600) {
    updatedPosition.y = 600 - ballRadius;
    updatedVelocity.y = -Math.abs(velocity.y) * BOUNCE_FACTOR;
    bounceHandler(bounceDetection, 'bottom');
  }
  
  return { updatedPosition, updatedVelocity };
};

// Handle goal post collisions
export const handleGoalPostCollision = (
  position: Position, 
  velocity: Position,
  ballRadius: number
) => {
  const goalPostBounce = checkGoalPostCollision(position, ballRadius);
  if (!goalPostBounce) {
    return velocity;
  }
  
  let updatedVelocity = { ...velocity };
  
  if (goalPostBounce === 'vertical') {
    updatedVelocity.y = -updatedVelocity.y * GOAL_POST_BOUNCE;
  } else {
    updatedVelocity.x = -updatedVelocity.x * GOAL_POST_BOUNCE;
  }
  
  return updatedVelocity;
};
