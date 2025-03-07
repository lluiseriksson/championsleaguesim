import React from 'react';
import { Player, Position } from '../../../types/football';
import { checkCollision, calculateNewVelocity } from '../../../utils/gamePhysics';

/**
 * Handle goalkeeper collisions with the ball
 */
export function handleGoalkeeperCollisions(
  newPosition: Position,
  newVelocity: Position,
  currentVelocity: Position,
  goalkeepers: Player[],
  onBallTouch: (player: Player) => void,
  currentTime: number,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>,
  eloFactors?: { red: number, blue: number }
): {
  velocity: Position;
  collisionOccurred: boolean;
  position: Position; // Add position to the return type to allow position corrections
} {
  // Get current time to prevent multiple collisions
  const goalkeeperCollisionCooldown = 100; // shorter cooldown for goalkeepers
  let collisionOccurred = false;
  let modifiedPosition = { ...newPosition }; // Initialize with the input position
  
  if (currentTime - lastCollisionTimeRef.current > goalkeeperCollisionCooldown) {
    for (const goalkeeper of goalkeepers) {
      const eloFactor = eloFactors && goalkeeper.team ? eloFactors[goalkeeper.team] : 1.0;
      
      // Calculate goalkeeper reach multiplier based on ELO
      // Higher ELO goalkeepers have even larger collision radius than field players (up to 50% larger)
      const radiusMultiplier = eloFactor > 1.0 ? 
                             Math.min(1.5, eloFactor * 1.25) : // Upper limit of 1.5x for high ELO
                             Math.max(0.7, eloFactor * 0.85);  // Lower limit of 0.7x for low ELO
      
      // Enhanced collision detection with ELO-based radius
      const collision = checkCollision(
        newPosition, 
        goalkeeper.position, 
        true, // This is a goalkeeper
        radiusMultiplier // Apply the ELO-based radius multiplier
      );
      
      if (collision) {
        onBallTouch(goalkeeper);
        lastCollisionTimeRef.current = currentTime;
        lastKickPositionRef.current = { ...newPosition };
        collisionOccurred = true;
        
        // Apply ELO advantage to goalkeeper collision
        newVelocity = calculateNewVelocity(
          newPosition,
          goalkeeper.position,
          currentVelocity,
          true
        );
        
        // DRASTIC IMPROVEMENT: Much stronger goalkeeper effectiveness for high ELO teams
        // Base deflection enhancement on ELO factor
        const deflectionBoost = Math.min(1.8, eloFactor * 1.5); // Up from 1.3 max
        newVelocity.x *= deflectionBoost;
        newVelocity.y *= deflectionBoost;
        
        // IMPORTANT: Move the ball slightly away from the goal line when goalkeeper saves it
        // This prevents the ball from registering as a goal
        const isLeftGoalkeeper = goalkeeper.team === 'red';
        if (isLeftGoalkeeper) {
          // For left side goalkeeper, move ball slightly right if it's too close to left edge
          if (modifiedPosition.x < 40) {
            modifiedPosition.x = Math.max(modifiedPosition.x, 45);
          }
        } else {
          // For right side goalkeeper, move ball slightly left if it's too close to right edge
          const rightEdge = 800; // PITCH_WIDTH
          if (modifiedPosition.x > rightEdge - 40) {
            modifiedPosition.x = Math.min(modifiedPosition.x, rightEdge - 45);
          }
        }
        
        // DRASTIC IMPROVEMENT: High ELO goalkeepers clear ball toward opponents' half
        if (eloFactor > 1.3 && Math.random() < 0.6) {
          // Determine which direction to clear (away from own goal)
          const clearToRight = goalkeeper.team === 'red';
          
          const clearingAngleY = (Math.random() * 0.8 - 0.4) * Math.PI; // -0.4π to 0.4π
          const clearingPower = 12 + Math.random() * 6; // 12-18 power
          
          if (clearToRight) {
            newVelocity.x = Math.abs(clearingPower * Math.cos(clearingAngleY));
          } else {
            newVelocity.x = -Math.abs(clearingPower * Math.cos(clearingAngleY));
          }
          newVelocity.y = clearingPower * Math.sin(clearingAngleY);
          
          console.log(`High ELO goalkeeper (${goalkeeper.team}) made a strategic clearance!`);
        }
        
        // DRASTIC IMPROVEMENT: Low ELO goalkeepers sometimes fumble the ball
        if (eloFactor < 0.85 && Math.random() < 0.3) {
          // Weak, unpredictable clearance
          const fumbleAngle = Math.random() * Math.PI * 2;
          const fumblePower = 3 + Math.random() * 4; // 3-7 power
          
          newVelocity.x = fumblePower * Math.cos(fumbleAngle);
          newVelocity.y = fumblePower * Math.sin(fumbleAngle);
          
          console.log(`Low ELO goalkeeper (${goalkeeper.team}) fumbled the ball!`);
        }
        
        console.log(`Goalkeeper collision detected with ELO factor: ${eloFactor.toFixed(2)}, radius multiplier: ${radiusMultiplier.toFixed(2)}`);
        break;
      }
    }
  }

  return {
    velocity: newVelocity,
    collisionOccurred,
    position: modifiedPosition // Return the potentially adjusted position
  };
}
