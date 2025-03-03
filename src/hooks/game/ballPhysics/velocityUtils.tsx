
import { Position } from '../../../types/football';

// Apply a very mild deceleration to the ball - using billiard-style physics
export function applyBallDeceleration(velocity: Position): Position {
  // Very minimal friction for billiard-style rolling
  const frictionFactor = 0.998; // Reduced from 0.995 for better momentum conservation
  
  // Apply the friction
  const newVelocity = {
    x: velocity.x * frictionFactor,
    y: velocity.y * frictionFactor
  };
  
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
