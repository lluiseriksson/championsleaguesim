
import React from 'react';
import { Player, Ball, Position } from '../../types/football';
import { useBallMovementCore } from './ball/ballMovementCore';

interface BallMovementProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch 
}: BallMovementProps) => {
  // Memoize player categorization
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  // Use the core ball movement logic
  const { updateBallPosition } = useBallMovementCore({
    ball,
    setBall,
    players,
    goalkeepers,
    fieldPlayers,
    checkGoal,
    onBallTouch
  });

  return { updateBallPosition };
};
