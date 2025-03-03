
import React from 'react';
import { Player, Ball, Position } from '../../types/football';
import { handleBallPhysics as processPhysics } from './ballPhysics/physicsEngine';

// Handle collisions and physics for the ball - Entry point
export function handleBallPhysics(
  currentBall: Ball,
  newPosition: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
): Ball {
  return processPhysics(
    currentBall,
    newPosition,
    goalkeepers,
    fieldPlayers,
    onBallTouch,
    lastCollisionTimeRef,
    lastKickPositionRef
  );
}
