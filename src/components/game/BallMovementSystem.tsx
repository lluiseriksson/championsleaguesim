
import React from 'react';
import { Player, Ball, Position } from '../../types/football';
import { useBallMovement } from '../../hooks/game/useBallMovement';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
}

// Re-export the hook as useBallMovementSystem for backwards compatibility
export const useBallMovementSystem = useBallMovement;

// This empty component is kept for backwards compatibility
const BallMovementSystem: React.FC<BallMovementSystemProps> = (props) => {
  return null;
};

export default BallMovementSystem;
