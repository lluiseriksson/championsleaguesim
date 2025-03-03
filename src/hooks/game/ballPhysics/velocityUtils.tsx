import { Position } from '../../../types/football';

export function applyBallDeceleration(velocity: Position): Position {
  let newVelocity = { ...velocity };
  
  // Apply VERY mild deceleration like in billiards
  // Billiard balls have very little friction/air resistance
  newVelocity.x *= 0.9975; // Almost no deceleration - billiard physics
  newVelocity.y *= 0.9975; // Almost no deceleration - billiard physics
  
  // Billiard-style behavior: stronger minimum speed to keep ball moving
  const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
  if (newSpeed < 5.0) {
    // Maintain direction but increase speed to minimum
    const factor = 5.0 / Math.max(0.01, newSpeed); // Prevent division by zero
    newVelocity.x *= factor;
    newVelocity.y *= factor;
  }
  
  return newVelocity;
}
