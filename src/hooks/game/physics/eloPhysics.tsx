import { Position } from '../../../types/football';

/**
 * Apply team ELO advantage factors to ball velocity
 */
export function applyVelocityAdjustmentsWithElo(
  velocity: Position, 
  eloFactors?: { red: number, blue: number }
): Position {
  // First apply standard physics
  let adjustedVelocity = {
    x: velocity.x * 0.998, 
    y: velocity.y * 0.998
  };
  
  // If no ELO factors, just return standard physics
  if (!eloFactors) {
    return adjustedVelocity;
  }
  
  // Otherwise calculate which team has current possession/advantage based on ball direction
  const movingTowardRed = adjustedVelocity.x < 0;
  const movingTowardBlue = adjustedVelocity.x > 0;
  
  if (movingTowardRed && eloFactors.blue > 1.2) {
    // Ball moving toward red goal and blue has advantage - enhance the ball speed
    const speedBoost = Math.min(1.15, 1 + (eloFactors.blue - 1) * 0.25);
    adjustedVelocity.x *= speedBoost;
    
    // Slightly reduce friction for advantaged team
    adjustedVelocity.x *= 1.03;
    adjustedVelocity.y *= 1.03;
  } 
  else if (movingTowardBlue && eloFactors.red > 1.2) {
    // Ball moving toward blue goal and red has advantage - enhance the ball speed
    const speedBoost = Math.min(1.15, 1 + (eloFactors.red - 1) * 0.25);
    adjustedVelocity.x *= speedBoost;
    
    // Slightly reduce friction for advantaged team
    adjustedVelocity.x *= 1.03;
    adjustedVelocity.y *= 1.03;
  }
  else if ((movingTowardRed && eloFactors.red > 1.2) || 
           (movingTowardBlue && eloFactors.blue > 1.2)) {
    // Ball moving toward defended goal and defenders have high ELO
    // Increase friction slightly to make it harder to score
    adjustedVelocity.x *= 0.98;
    adjustedVelocity.y *= 0.98;
  }
  
  return adjustedVelocity;
}
