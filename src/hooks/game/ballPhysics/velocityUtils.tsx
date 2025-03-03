import { Position } from '../../../types/football';

// Apply a more realistic deceleration to the ball - using soccer-like physics
export function applyBallDeceleration(velocity: Position): Position {
  // More realistic friction for soccer ball on grass
  const frictionFactor = 0.99; // Increased from 0.998 for more natural slowdown
  
  // Apply the friction
  const newVelocity = {
    x: velocity.x * frictionFactor,
    y: velocity.y * frictionFactor
  };
  
  // Allow the ball to slow down more naturally, but prevent complete stopping
  const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
  if (newSpeed < 0.5) { // Lower minimum speed to allow more natural play
    // If almost stopped, let it stop completely
    if (newSpeed < 0.1) {
      return { x: 0, y: 0 };
    }
    
    // Otherwise maintain a minimal momentum
    const factor = 0.5 / Math.max(0.01, newSpeed); // Prevent division by zero
    newVelocity.x *= factor;
    newVelocity.y *= factor;
  }
  
  return newVelocity;
}
