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
  newVelocity = handleLeftRightBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);

  // IMPROVED: Ensure ball stays within the pitch boundaries with a stronger constraint
  // This helps prevent the ball from getting stuck inside goals
  newPosition = constrainBallPosition(newPosition, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT);

  // Check if ball is too close to goal line and force it away if needed
  const goalY = PITCH_HEIGHT / 2;
  const goalTop = goalY - 92; // GOAL_HEIGHT/2
  const goalBottom = goalY + 92; // GOAL_HEIGHT/2
  
  // If ball is inside goal area but very close to goal line, push it out slightly
  if (newPosition.x < BALL_RADIUS * 1.5 && newPosition.y >= goalTop && newPosition.y <= goalBottom) {
    // Ball too close to left goal line - push it rightward
    newPosition.x = BALL_RADIUS * 1.5;
    if (newVelocity.x < 0) {
      // Reverse direction if moving toward goal
      newVelocity.x = Math.abs(newVelocity.x) * 0.5;
    }
  } else if (newPosition.x > PITCH_WIDTH - BALL_RADIUS * 1.5 && newPosition.y >= goalTop && newPosition.y <= goalBottom) {
    // Ball too close to right goal line - push it leftward
    newPosition.x = PITCH_WIDTH - BALL_RADIUS * 1.5;
    if (newVelocity.x > 0) {
      // Reverse direction if moving toward goal
      newVelocity.x = -Math.abs(newVelocity.x) * 0.5;
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
