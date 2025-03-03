import { Position } from '../../../types/football';

export function applyBallDeceleration(velocity: Position): Position {
  let newVelocity = { ...velocity };
  
  // Apply VERY mild deceleration like in classic behavior
  // This was a key to maintaining ball movement in the original game
  newVelocity.x *= 0.999; // Nearly no deceleration - classic behavior
  newVelocity.y *= 0.999; // Nearly no deceleration - classic behavior
  
  // Classic behavior: stronger minimum speed to keep ball moving
  const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
  if (newSpeed < 4.0) {
    // Maintain direction but increase speed to minimum
    const factor = 4.0 / Math.max(0.01, newSpeed); // Prevent division by zero
    newVelocity.x *= factor;
    newVelocity.y *= factor;
  }
  
  return newVelocity;
}
