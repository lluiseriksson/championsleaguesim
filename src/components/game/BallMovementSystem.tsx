
import React from 'react';
import { Player, Ball, Position } from '../../types/football';
import { useBallMovement } from '../../hooks/game/useBallMovement';
import { calculateEloRadiusAdjustment, calculateEloGoalkeeperReachAdjustment, logEloAdjustmentDetails } from '../../utils/neural/neuralTypes';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
  tournamentMode?: boolean;
  gameEnded?: boolean;
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
  // Don't let the radius go below 40% of base for significant penalties
  const adjustedRadius = Math.max(player.radius + radiusAdjustment, player.radius * 0.4);
  
  // Log significant adjustments
  if (Math.abs(adjustedRadius - player.radius) > 5) {
    logEloAdjustmentDetails(
      "player collision radius",
      player.team,
      player.team === 'red' ? redTeamElo : blueTeamElo,
      player.team === 'red' ? blueTeamElo : redTeamElo,
      radiusAdjustment
    );
  }
  
  return adjustedRadius;
};

// Custom hook to calculate goalkeeper reach adjustment based on ELO and shot angle - FIXED
export const useGoalkeeperReachAdjustment = (
  player: Player, 
  allPlayers: Player[], 
  isAngledShot: boolean = false
): number => {
  // Only apply to goalkeepers
  if (player.role !== 'goalkeeper') return 0;
  
  // Get ELO ratings for both teams
  const redTeamPlayer = allPlayers.find(p => p.team === 'red' && p.teamElo !== undefined);
  const blueTeamPlayer = allPlayers.find(p => p.team === 'blue' && p.teamElo !== undefined);
  
  // Default to no adjustment if ELO info is unavailable
  if (!redTeamPlayer?.teamElo || !blueTeamPlayer?.teamElo) return 0;

  const redTeamElo = redTeamPlayer.teamElo;
  const blueTeamElo = blueTeamPlayer.teamElo;
  
  // Apply reach adjustment
  const reachAdjustment = calculateEloGoalkeeperReachAdjustment(
    player.team === 'red' ? redTeamElo : blueTeamElo,
    player.team === 'red' ? blueTeamElo : redTeamElo,
    isAngledShot
  );
  
  // Log significant adjustments
  if (Math.abs(reachAdjustment) > 5) {
    logEloAdjustmentDetails(
      `goalkeeper ${isAngledShot ? 'angled' : 'straight'} shot reach`,
      player.team,
      player.team === 'red' ? redTeamElo : blueTeamElo,
      player.team === 'red' ? blueTeamElo : redTeamElo,
      reachAdjustment
    );
  }
  
  return reachAdjustment;
};

// Re-export the hook as useBallMovementSystem for backwards compatibility
export const useBallMovementSystem = (props: BallMovementSystemProps) => {
  // Create a wrapped version of the original hook that applies radius adjustments
  const originalHook = useBallMovement({
    ...props,
    players: props.players.map(player => {
      // Apply radius adjustment based on ELO differences
      const adjustedRadius = useAdjustedPlayerRadius(player, props.players);
      
      // Log significant adjustments
      if (Math.abs(adjustedRadius - player.radius) > 5) {
        console.log(
          `Player ${player.team} ${player.role} radius adjusted: ` +
          `${player.radius.toFixed(1)} → ${adjustedRadius.toFixed(1)} units`
        );
      }
      
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
