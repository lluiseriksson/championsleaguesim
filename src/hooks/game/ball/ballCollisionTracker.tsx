
import React from 'react';
import { Player } from '../../../types/football';

export function useBallCollisionTracker() {
  // Track last collision time to prevent multiple collisions in a short time
  const lastCollisionTimeRef = React.useRef(0);
  
  // Track last team to touch the ball
  const lastTouchTeamRef = React.useRef<'red' | 'blue' | null>(null);

  // Update last touch team
  const updateLastTouchTeam = React.useCallback((player: Player) => {
    lastTouchTeamRef.current = player.team;
  }, []);

  return {
    lastCollisionTimeRef,
    lastTouchTeamRef,
    updateLastTouchTeam
  };
}
