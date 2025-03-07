import { Position } from '../../../types/football';

// Minimum ball speed constant
const MIN_BALL_SPEED = 8.4;

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
    return enforceMinimumSpeed(adjustedVelocity);
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
    // Even with increased friction, ensure minimum speed
    adjustedVelocity.x *= 0.98;
    adjustedVelocity.y *= 0.98;
  }
  
  return enforceMinimumSpeed(adjustedVelocity);
}

// Helper function to enforce minimum ball speed
function enforceMinimumSpeed(velocity: Position): Position {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  
  // If the ball is moving (not completely stopped) but slower than minimum,
  // boost it while maintaining direction
  if (speed < MIN_BALL_SPEED && speed > 0.1) {
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  return velocity;
}
