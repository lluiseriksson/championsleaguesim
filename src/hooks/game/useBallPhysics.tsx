import React from 'react';
import { Player, Ball, Position, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT, PLAYER_RADIUS } from '../../types/football';
import { checkCollision } from '../../utils/gamePhysics';
import { handleTopBottomBoundaries, handleLeftRightBoundaries } from './boundaryCollisions';
import { applyVelocityAdjustments, constrainBallPosition } from './velocityUtils';
import { applyVelocityAdjustmentsWithElo } from './physics/eloPhysics';
import { handleGoalkeeperCollisions } from './physics/goalkeeperCollisions';
import { handleEnhancedFieldPlayerCollisions } from './physics/fieldPlayerCollisions';

// Helper function to check if ball is in goal area
const isInGoalArea = (position: Position): boolean => {
  const goalY = PITCH_HEIGHT / 2;
  const goalTop = goalY - 92; // GOAL_HEIGHT/2
  const goalBottom = goalY + 92; // GOAL_HEIGHT/2
  
  // Check if in left goal area
  const inLeftGoal = position.x <= BALL_RADIUS * 2 && 
                    position.y >= goalTop && 
                    position.y <= goalBottom;
  
  // Check if in right goal area
  const inRightGoal = position.x >= PITCH_WIDTH - BALL_RADIUS * 2 && 
                     position.y >= goalTop && 
                     position.y <= goalBottom;
  
  return inLeftGoal || inRightGoal;
};

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
  
  // NEW: Check if the ball is in a goal area - if so, don't apply boundary collisions
  const ballInGoalArea = isInGoalArea(newPosition);
  
  // Only handle top/bottom boundaries if not in goal area OR if in goal area but hitting top/bottom
  if (!ballInGoalArea || (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS)) {
    newVelocity = handleTopBottomBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);
  }
  
  // IMPROVED: Only handle left/right boundaries if not in goal area
  if (!ballInGoalArea) {
    // Only apply side bounces if not in the goal area
    newVelocity = handleLeftRightBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);
  } else {
    // If in goal area, reduce velocity significantly to help ball stop in goal
    newVelocity.x *= 0.1;
    newVelocity.y *= 0.5;
    
    // If very close to goal line, stop completely to ensure ball stays in goal
    if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
      newVelocity.x = 0;
      newVelocity.y = 0;
    }
  }

  // IMPROVED: Only constrain ball within pitch if not in goal area
  if (!ballInGoalArea) {
    newPosition = constrainBallPosition(newPosition, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT);
  } else {
    // For the goal area, only apply vertical constraint but not horizontal
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
  // Only if not in goal area - preserve slow/stopped motion in goal
  if (!ballInGoalArea) {
    newVelocity = applyVelocityAdjustmentsWithElo(newVelocity, eloFactors);
  }

  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}

// Re-export constants for convenience
export { PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../types/football';
