
import React from 'react';
import { Ball, Position } from '../../types/football';

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
    // Reduced threshold from 20 to 10 to detect stuck balls faster
    return noMovementTimeRef.current > 10;
  } else {
    // Reset counter if the ball is moving
    noMovementTimeRef.current = 0;
    return false;
  }
};

// Apply a random kick to the ball
export const applyRandomKick = (currentBall: Ball, tournamentMode: boolean): Ball => {
  // Log less in tournament mode to reduce memory usage
  if (!tournamentMode) {
    console.log("Ball stuck in place or zero velocity, giving it a random kick");
  }
  
  // Increased random kick velocity by ~40% for more dynamic movement
  return {
    ...currentBall,
    position: currentBall.position,
    velocity: {
      x: (Math.random() * 10) - 5,
      y: (Math.random() * 10) - 5
    }
  };
};

// Check current ball speed
export const calculateBallSpeed = (velocity: Position): number => {
  return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
};
