
import React from 'react';
import { Player, Ball, Position } from '../../types/football';
import { useBallMovement } from '../../hooks/game/useBallMovement';
import { calculateEloRadiusAdjustment } from '../../utils/neural/neuralTypes';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
  tournamentMode?: boolean;
}

// Custom hook to apply ELO-based radius adjustments 
export const useAdjustedPlayerRadius = (player: Player, allPlayers: Player[]): number => {
  // Get ELO ratings for both teams
  const redTeamPlayer = allPlayers.find(p => p.team === 'red' && p.teamElo !== undefined);
  const blueTeamPlayer = allPlayers.find(p => p.team === 'blue' && p.teamElo !== undefined);
  
  // Default radius if no ELO info available
  if (!redTeamPlayer?.teamElo || !blueTeamPlayer?.teamElo) {
    return player.radius;
  }

  const redTeamElo = redTeamPlayer.teamElo;
  const blueTeamElo = blueTeamPlayer.teamElo;
  
  // Calculate ELO-based radius adjustment
  const radiusAdjustment = calculateEloRadiusAdjustment(
    player.team === 'red' ? redTeamElo : blueTeamElo,
    player.team === 'red' ? blueTeamElo : redTeamElo
  );
  
  // Apply adjustment to player's radius
  return Math.max(player.radius + radiusAdjustment, player.radius * 0.75); // Don't reduce below 75% of base radius
};

// Re-export the hook as useBallMovementSystem for backwards compatibility
export const useBallMovementSystem = (props: BallMovementSystemProps) => {
  // Create a wrapped version of the original hook that applies radius adjustments
  const originalHook = useBallMovement({
    ...props,
    players: props.players.map(player => {
      // Apply radius adjustment based on ELO differences
      const adjustedRadius = useAdjustedPlayerRadius(player, props.players);
      return {
        ...player,
        // Temporarily override radius for collision detection
        radius: adjustedRadius
      };
    })
  });
  
  return originalHook;
};

// This empty component is kept for backwards compatibility
const BallMovementSystem: React.FC<BallMovementSystemProps> = (props) => {
  return null;
};

export default BallMovementSystem;
