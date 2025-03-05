
import React from 'react';
import { Player, Position } from '../../types/football';

interface CollisionTrackingResult {
  lastCollisionTimeRef: React.MutableRefObject<number>;
  lastKickPositionRef: React.MutableRefObject<Position | null>;
  noMovementTimeRef: React.MutableRefObject<number>;
  lastPositionRef: React.MutableRefObject<Position | null>;
}

export const useBallCollisionTracking = (): CollisionTrackingResult => {
  // Track last collision time to prevent multiple collisions in a short time
  const lastCollisionTimeRef = React.useRef(0);
  
  // Track the last position the ball was kicked from to prevent "stuck" situations
  const lastKickPositionRef = React.useRef<Position | null>(null);
  
  // Track time without movement to add a random kick if needed
  const noMovementTimeRef = React.useRef(0);
  const lastPositionRef = React.useRef<Position | null>(null);
  
  return {
    lastCollisionTimeRef,
    lastKickPositionRef,
    noMovementTimeRef,
    lastPositionRef
  };
};
