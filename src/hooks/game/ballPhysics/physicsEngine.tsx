import React from 'react';
import { handleBoundaryBounce } from './bounceUtils';
import { handleGoalkeeperCollisions, handleFieldPlayerCollisions } from './collisionUtils';
import { applyBallDeceleration } from './velocityUtils';
import { Ball, Position, Player } from '../../../types/football';

// Main physics processor - Coordinates all physics calculations
export function handleBallPhysics(
  currentBall: Ball,
  newPosition: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
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
  
  // Handle boundary collisions - billiards style bouncing
  const boundaryResult = handleBoundaryBounce(newPosition, newVelocity, bounceDetectionRef);
  newPosition = boundaryResult.position;
  newVelocity = boundaryResult.velocity;
  
  // Get current time to prevent multiple collisions
  const currentTime = performance.now();
  const collisionCooldown = 150; // ms
  
  // Handle goalkeeper collisions with higher priority
  const goalkeeperResult = handleGoalkeeperCollisions(
    newPosition, 
    currentBall.velocity, 
    goalkeepers, 
    currentTime, 
    lastCollisionTimeRef, 
    lastKickPositionRef, 
    onBallTouch
  );
  
  newVelocity = goalkeeperResult.velocity;
  
  // Then check field player collisions if no goalkeeper collision occurred
  if (!goalkeeperResult.collisionOccurred && currentTime - lastCollisionTimeRef.current > collisionCooldown) {
    newVelocity = handleFieldPlayerCollisions(
      newPosition, 
      newVelocity, 
      currentBall.velocity, 
      fieldPlayers, 
      onBallTouch, 
      currentTime, 
      lastCollisionTimeRef, 
      lastKickPositionRef
    );
  }
  
  // Apply billiard-style deceleration - very minimal to maintain momentum
  newVelocity = applyBallDeceleration(newVelocity);
  
  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}
