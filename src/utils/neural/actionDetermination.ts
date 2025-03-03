
import { Player, Ball } from '../../types/football';
import { calculateDistance } from '../positionHelpers';
import { findBestPassTarget } from './passTargeting';

// Determine what action a player should take based on neural output and game state
export const determinePlayerAction = (
  player: Player,
  ball: Ball,
  currentPlayers: Player[],
  output: {
    moveX: number;
    moveY: number;
    shootBall: number;
    passBall: number;
    intercept: number;
  }
): { action: 'move' | 'shoot' | 'pass' | 'intercept', targetPlayer?: Player } => {
  // Calculate distance to ball
  const distanceToBall = calculateDistance(player.position, ball.position);
  
  // Default action
  let action: 'move' | 'shoot' | 'pass' | 'intercept' = 'move';
  let targetPlayer: Player | undefined = undefined;
  
  // Only consider passing when player is close to ball
  if (distanceToBall < 30 && output.passBall > 0.6) {
    action = 'pass';
    targetPlayer = findBestPassTarget(player, ball, currentPlayers);
  } else if (distanceToBall < 25 && output.shootBall > 0.7) {
    action = 'shoot';
  } else if (distanceToBall < 40 && output.intercept > 0.6) {
    action = 'intercept';
  }
  
  return { action, targetPlayer };
};
