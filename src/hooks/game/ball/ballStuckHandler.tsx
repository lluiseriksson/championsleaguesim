
import React from 'react';
import { Position } from '../../../types/football';

interface BallStuckHandlerProps {
  initialPosition?: Position | null;
}

export function useBallStuckHandler({ initialPosition = null }: BallStuckHandlerProps = {}) {
  // Track last position the ball was kicked from to prevent "stuck" situations
  const lastKickPositionRef = React.useRef<Position | null>(null);
  
  // Track time without movement to add a random kick if needed
  const noMovementTimeRef = React.useRef(0);
  const lastPositionRef = React.useRef<Position | null>(initialPosition);

  // Method to check if ball is stuck in same position
  const checkBallStuck = React.useCallback((currentPosition: Position) => {
    // Detect if ball is stuck in same position
    if (lastPositionRef.current) {
      const dx = currentPosition.x - lastPositionRef.current.x;
      const dy = currentPosition.y - lastPositionRef.current.y;
      const positionDelta = Math.sqrt(dx * dx + dy * dy);
      
      if (positionDelta < 0.1) {
        noMovementTimeRef.current += 1;
        
        // If ball hasn't moved for a while, should give it a random kick
        if (noMovementTimeRef.current > 20) {
          console.log("Ball stuck in place, giving it a random kick");
          noMovementTimeRef.current = 0;
          return true;
        }
      } else {
        // Reset counter if the ball is moving
        noMovementTimeRef.current = 0;
      }
    }
    
    // Update last position reference
    lastPositionRef.current = { ...currentPosition };
    return false;
  }, []);

  // Get a random velocity to unstick the ball
  const getRandomKickVelocity = React.useCallback(() => {
    return {
      x: (Math.random() * 6) - 3,
      y: (Math.random() * 6) - 3
    };
  }, []);

  return {
    lastKickPositionRef,
    checkBallStuck,
    getRandomKickVelocity
  };
}
