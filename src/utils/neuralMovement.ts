
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { applyPositionRestrictions } from './positionHelpers';
import { calculateDistance } from './positionHelpers';
import { determinePlayerAction } from './neural/actionDetermination';

// Process player movement using neural network
export const getNeuralMovement = (
  player: Player,
  ball: Ball,
  currentPlayers: Player[],
  positionRestricted: boolean
): { position: { x: number; y: number }, output: { x: number; y: number }, action?: 'move' | 'shoot' | 'pass' | 'intercept', targetPlayer?: Player } => {
  // Using neural network for movement
  const input = {
    ballX: ball.position.x / PITCH_WIDTH,
    ballY: ball.position.y / PITCH_HEIGHT,
    playerX: player.position.x / PITCH_WIDTH,
    playerY: player.position.y / PITCH_HEIGHT,
    ballVelocityX: ball.velocity.x / 20,
    ballVelocityY: ball.velocity.y / 20,
    distanceToGoal: 0.5,
    angleToGoal: 0,
    nearestTeammateDistance: 0.5,
    nearestTeammateAngle: 0,
    nearestOpponentDistance: 0.5,
    nearestOpponentAngle: 0,
    isInShootingRange: 0,
    isInPassingRange: 0,
    isDefendingRequired: 0,
    distanceToOwnGoal: 0.5,
    angleToOwnGoal: 0,
    isFacingOwnGoal: 0,
    isDangerousPosition: 0,
    isBetweenBallAndOwnGoal: 0
  };

  const output = player.brain.net.run(input);
  const moveX = (output.moveX || 0.5) * 2 - 1;
  const moveY = (output.moveY || 0.5) * 2 - 1;
  
  // Calculate maximum distance based on role and distance to ball
  let maxDistance = calculateMaxMovementDistance(player, ball);

  // Calculate new position
  let newPosition = {
    x: player.position.x + moveX * 2,
    y: player.position.y + moveY * 2,
  };

  // Apply restrictions based on role, offside, etc.
  newPosition = applyPositionRestrictions(
    newPosition, 
    player, 
    player.targetPosition, 
    maxDistance, 
    positionRestricted, 
    currentPlayers
  );

  // Ensure players stay within the pitch boundaries
  newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
  newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));

  // Determine action based on neural network output
  const { action, targetPlayer } = determinePlayerAction(player, ball, currentPlayers, output);

  return {
    position: newPosition,
    output: { x: moveX, y: moveY },
    action,
    targetPlayer
  };
};

// Helper function to calculate max movement distance based on player role and ball distance
const calculateMaxMovementDistance = (player: Player, ball: Ball): number => {
  const distanceToBall = calculateDistance(player.position, ball.position);
  
  switch (player.role) {
    case 'defender':
      return distanceToBall < 150 ? 144 : 90; // 96 * 1.5 = 144, 60 * 1.5 = 90
    case 'midfielder':
      return distanceToBall < 200 ? 180 : 120; // 120 * 1.5 = 180, 80 * 1.5 = 120
    case 'forward':
      return distanceToBall < 250 ? 300 : 180; // 200 * 1.5 = 300, 120 * 1.5 = 180
    default:
      return 75; // Default: 50 * 1.5 = 75
  }
};
