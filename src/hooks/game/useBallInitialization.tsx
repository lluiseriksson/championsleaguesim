
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
    return noMovementTimeRef.current > 20;
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
  
  // Increased random kick velocity by ~20% (from 6 to 7.2 max range)
  return {
    ...currentBall,
    position: currentBall.position,
    velocity: {
      x: (Math.random() * 7.2) - 3.6,
      y: (Math.random() * 7.2) - 3.6
    }
  };
};

// Create a strong initial kick for game start
export const applyInitialKick = (): Position => {
  // Create a stronger kick with preference for horizontal movement
  const horizontalStrength = (Math.random() * 10) + 5; // Between 5-15
  const verticalStrength = (Math.random() * 6) - 3;    // Between -3 and 3
  
  // Randomize horizontal direction
  const horizontalDirection = Math.random() > 0.5 ? 1 : -1;
  
  return {
    x: horizontalDirection * horizontalStrength,
    y: verticalStrength
  };
};

// Check current ball speed
export const calculateBallSpeed = (velocity: Position): number => {
  return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
};

