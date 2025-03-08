
import React from 'react';
import { Ball, Position, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';

// Helper to check if the ball is stuck in the same position
export const checkBallStuckInPlace = (
  currentPosition: Position,
  lastPosition: Position | null,
  noMovementTimeRef: React.MutableRefObject<number>
): boolean => {
  if (!lastPosition) return false;
  
  const dx = currentPosition.x - lastPosition.x;
  const dy = currentPosition.y - lastPosition.y;
  const positionDelta = Math.sqrt(dx * dx + dy * dy);
  
  if (positionDelta < 0.1) {
    noMovementTimeRef.current += 1;
    return noMovementTimeRef.current > 20;
  } else {
    // Reset counter if the ball is moving
    noMovementTimeRef.current = 0;
    return false;
  }
};

// Helper to check if a velocity vector would direct the ball toward a goal
const isPointingTowardGoal = (position: Position, velocity: Position): boolean => {
  // Goal positions
  const leftGoalX = 0;
  const rightGoalX = PITCH_WIDTH;
  const goalY = PITCH_HEIGHT / 2;
  
  // Check if direction points toward left goal
  if (velocity.x < 0) {
    const angleToLeftGoal = Math.atan2(goalY - position.y, leftGoalX - position.x);
    const kickAngle = Math.atan2(velocity.y, velocity.x);
    const angleDifference = Math.abs(angleToLeftGoal - kickAngle);
    
    if (angleDifference < Math.PI / 8) { // Within ~22.5 degrees
      return true;
    }
  }
  
  // Check if direction points toward right goal
  if (velocity.x > 0) {
    const angleToRightGoal = Math.atan2(goalY - position.y, rightGoalX - position.x);
    const kickAngle = Math.atan2(velocity.y, velocity.x);
    const angleDifference = Math.abs(angleToRightGoal - kickAngle);
    
    if (angleDifference < Math.PI / 8) { // Within ~22.5 degrees
      return true;
    }
  }
  
  return false;
};

// Apply a random kick to the ball while avoiding direct goal paths
export const applyRandomKick = (currentBall: Ball, tournamentMode: boolean): Ball => {
  // Log less in tournament mode to reduce memory usage
  if (!tournamentMode) {
    console.log("Ball stuck in place or zero velocity, giving it a random kick");
  }
  
  // Generate a random velocity
  let newVelocity = {
    x: (Math.random() * 7.2) - 3.6,
    y: (Math.random() * 7.2) - 3.6
  };
  
  // Check if this velocity would direct the ball toward a goal
  // If so, try up to 5 times to generate a velocity that doesn't
  let attempts = 0;
  while (isPointingTowardGoal(currentBall.position, newVelocity) && attempts < 5) {
    // Adjust the random velocity to avoid goals
    newVelocity = {
      x: (Math.random() * 7.2) - 3.6,
      y: (Math.random() * 7.2) - 3.6
    };
    attempts++;
  }
  
  // If we couldn't find a non-goal direction after 5 attempts,
  // force the ball to move more horizontally than vertically
  if (isPointingTowardGoal(currentBall.position, newVelocity)) {
    // Make y velocity smaller and ensure x velocity is toward center
    newVelocity.y = (Math.random() * 3) - 1.5; // Reduced y velocity range
    
    // Direct toward center of pitch horizontally
    const moveTowardCenter = currentBall.position.x < PITCH_WIDTH / 2 ? 1 : -1;
    newVelocity.x = Math.abs(newVelocity.x) * moveTowardCenter;
  }
  
  return {
    ...currentBall,
    position: currentBall.position,
    velocity: newVelocity
  };
};

// Check current ball speed
export const calculateBallSpeed = (velocity: Position): number => {
  return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
};
