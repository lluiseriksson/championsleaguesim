import { Position } from '../../types/football';

const MIN_BALL_SPEED = 3.5;

// Apply subtle deceleration and minimum velocity
export function applyVelocityAdjustments(velocity: Position): Position {
  // Apply very mild deceleration - we want ball to keep moving
  let adjustedVelocity = {
    x: velocity.x * 0.998, // Reduced from 0.995
    y: velocity.y * 0.998  // Reduced from 0.995
  };
  
  // Never let the ball stop completely
  const newSpeed = Math.sqrt(adjustedVelocity.x * adjustedVelocity.x + adjustedVelocity.y * adjustedVelocity.y);
  if (newSpeed < MIN_BALL_SPEED && newSpeed > 0) {
    // Maintain direction but increase speed to minimum
    const factor = MIN_BALL_SPEED / Math.max(0.01, newSpeed); // Prevent division by zero
    adjustedVelocity.x *= factor;
    adjustedVelocity.y *= factor;
  }
  
  return adjustedVelocity;
}

// Ensure ball stays within the pitch boundaries
export function constrainBallPosition(position: Position, ballRadius: number, pitchWidth: number, pitchHeight: number): Position {
  return {
    x: Math.max(ballRadius, Math.min(pitchWidth - ballRadius, position.x)),
    y: Math.max(ballRadius, Math.min(pitchHeight - ballRadius, position.y))
  };
}
