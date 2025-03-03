import { Position } from '../../../types/football';

export function applyBallDeceleration(velocity: Position): Position {
  let newVelocity = { ...velocity };
  
  // Apply very mild deceleration - we want ball to keep moving
  newVelocity.x *= 0.998; // Reduced from 0.995
  newVelocity.y *= 0.998; // Reduced from 0.995
  
  // Never let the ball stop completely
  const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
  if (newSpeed < 3.5) {
    // Maintain direction but increase speed to minimum
    const factor = 3.5 / Math.max(0.01, newSpeed); // Prevent division by zero
    newVelocity.x *= factor;
    newVelocity.y *= factor;
  }
  
  return newVelocity;
}
