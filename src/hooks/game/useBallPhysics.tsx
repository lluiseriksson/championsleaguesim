import React from 'react';
import { Player, Ball, Position, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT, PLAYER_RADIUS } from '../../types/football';
import { checkCollision } from '../../utils/gamePhysics';
import { handleTopBottomBoundaries, handleLeftRightBoundaries } from './boundaryCollisions';
import { applyVelocityAdjustments, constrainBallPosition } from './velocityUtils';
import { applyVelocityAdjustmentsWithElo } from './physics/eloPhysics';
import { handleGoalkeeperCollisions } from './physics/goalkeeperCollisions';
import { handleEnhancedFieldPlayerCollisions } from './physics/fieldPlayerCollisions';

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
  
  // MEJORADO: No aplicar rebotes en las líneas de gol dentro del área de portería
  // Sólo rebotará en las líneas laterales si está fuera del área de portería
  const goalY = PITCH_HEIGHT / 2;
  const goalTop = goalY - 92; // GOAL_HEIGHT/2
  const goalBottom = goalY + 92; // GOAL_HEIGHT/2
  
  // Solo aplicar rebotes en líneas laterales si no está en el área de portería
  if (!(newPosition.y >= goalTop && newPosition.y <= goalBottom && 
       (newPosition.x <= BALL_RADIUS * 2 || newPosition.x >= PITCH_WIDTH - BALL_RADIUS * 2))) {
    newVelocity = handleLeftRightBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);
  }

  // IMPROVED: Ensure ball stays within the pitch boundaries with a stronger constraint
  // This helps prevent the ball from getting stuck inside goals - EXCEPTO en el área de portería
  if (!(newPosition.y >= goalTop && newPosition.y <= goalBottom)) {
    newPosition = constrainBallPosition(newPosition, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT);
  } else {
    // Para el área de portería, solo aplicar restricción vertical pero no horizontal
    if (newPosition.y < BALL_RADIUS) {
      newPosition.y = BALL_RADIUS;
    } else if (newPosition.y > PITCH_HEIGHT - BALL_RADIUS) {
      newPosition.y = PITCH_HEIGHT - BALL_RADIUS;
    }
  }

  // Handle player collisions, starting with goalkeepers
  const { velocity: goalkeeperVelocity, collisionOccurred: goalkeeperCollision, position: goalkeeperAdjustedPosition } = handleGoalkeeperCollisions(
    newPosition,
    newVelocity,
    currentBall.velocity,
    goalkeepers,
    onBallTouch,
    currentTime,
    lastCollisionTimeRef,
    lastKickPositionRef,
    eloFactors
  );
  
  // Update position and velocity from goalkeeper collision if it occurred
  if (goalkeeperCollision) {
    newVelocity = goalkeeperVelocity;
    newPosition = goalkeeperAdjustedPosition; // Use the adjusted position
  } 
  // Otherwise check field player collisions if no goalkeeper collision
  else if (currentTime - lastCollisionTimeRef.current > 150) { // 150ms cooldown
    const { velocity: fieldPlayerVelocity, collisionOccurred: fieldPlayerCollision } = handleEnhancedFieldPlayerCollisions(
      newPosition,
      newVelocity,
      currentBall.velocity,
      fieldPlayers,
      onBallTouch,
      currentTime,
      lastCollisionTimeRef,
      lastKickPositionRef,
      eloFactors
    );
    
    // Update velocity from field player collision if it occurred
    if (fieldPlayerCollision) {
      newVelocity = fieldPlayerVelocity;
    }
  }

  // Apply velocity adjustments with potential ELO factors
  newVelocity = applyVelocityAdjustmentsWithElo(newVelocity, eloFactors);

  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}

// Re-export constants for convenience
export { PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../types/football';
