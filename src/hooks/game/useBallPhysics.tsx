import React from 'react';
import { Player, Ball, Position, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT, PLAYER_RADIUS } from '../../types/football';
import { handleFieldPlayerCollisions } from './collisionHandlers';
import { checkCollision, calculateNewVelocity } from '../../utils/gamePhysics';
import { handleTopBottomBoundaries, handleLeftRightBoundaries } from './boundaryCollisions';
import { applyVelocityAdjustments, constrainBallPosition } from './velocityUtils';

// Handle collisions and physics for the ball
export function handleBallPhysics(
  currentBall: Ball,
  newPosition: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>,
  eloFactors?: { red: number, blue: number }
): Ball {
  // Check for boundary collisions (top and bottom)
  let newVelocity = { ...currentBall.velocity };
  
  // Track consecutive bounces on same side
  const bounceDetectionRef = currentBall.bounceDetection || {
    consecutiveBounces: 0,
    lastBounceTime: 0,
    lastBounceSide: '',
    sideEffect: false
  };
  
  const currentTime = performance.now();
  const bounceCooldown = 1000; // 1 second between bounce counts
  
  // Handle boundary collisions using the dedicated functions
  newVelocity = handleTopBottomBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);
  newVelocity = handleLeftRightBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);

  // Ensure ball stays within the pitch boundaries
  newPosition = constrainBallPosition(newPosition, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT);

  // Handle player collisions
  newVelocity = handlePlayerCollisions(
    newPosition,
    newVelocity,
    currentBall.velocity,
    goalkeepers,
    fieldPlayers,
    onBallTouch,
    currentTime,
    lastCollisionTimeRef,
    lastKickPositionRef,
    eloFactors
  );

  // Apply velocity adjustments with potential ELO factors
  newVelocity = applyVelocityAdjustmentsWithElo(newVelocity, eloFactors);

  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}

function applyVelocityAdjustmentsWithElo(velocity: Position, eloFactors?: { red: number, blue: number }): Position {
  // First apply standard physics
  let adjustedVelocity = applyVelocityAdjustments(velocity);
  
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

function handlePlayerCollisions(
  newPosition: Position,
  newVelocity: Position,
  currentVelocity: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  currentTime: number,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>,
  eloFactors?: { red: number, blue: number }
): Position {
  // Get current time to prevent multiple collisions
  const collisionCooldown = 150; // ms
  const goalkeeperCollisionCooldown = 100; // shorter cooldown for goalkeepers

  // Enhanced goalkeeper collision detection with ELO factors
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

  // Then check field player collisions if no goalkeeper collision occurred
  if (currentTime - lastCollisionTimeRef.current > collisionCooldown) {
    newVelocity = handleFieldPlayerCollisions(
      newPosition,
      newVelocity,
      currentVelocity,
      fieldPlayers,
      onBallTouch,
      currentTime,
      lastCollisionTimeRef,
      lastKickPositionRef,
      eloFactors
    );
  }

  return newVelocity;
}

// Re-export constants for convenience
export { PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../types/football';
