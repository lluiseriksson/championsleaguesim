
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { applyPositionRestrictions } from './positionHelpers';

// Process player movement using neural network
export const getNeuralMovement = (
  player: Player,
  ball: Ball,
  currentPlayers: Player[],
  positionRestricted: boolean
): { position: { x: number; y: number }, output: { x: number; y: number } } => {
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
    isDefendingRequired: 0
  };

  const output = player.brain.net.run(input);
  const moveX = (output.moveX || 0.5) * 2 - 1;
  const moveY = (output.moveY || 0.5) * 2 - 1;
  
  // Increased all distances by 50% from base values
  let maxDistance = 75; // 50 * 1.5 = 75
  const distanceToBall = Math.sqrt(
    Math.pow(ball.position.x - player.position.x, 2) +
    Math.pow(ball.position.y - player.position.y, 2)
  );

  switch (player.role) {
    case 'defender':
      maxDistance = distanceToBall < 150 ? 144 : 90; // 96 * 1.5 = 144, 60 * 1.5 = 90
      break;
    case 'midfielder':
      maxDistance = distanceToBall < 200 ? 180 : 120; // 120 * 1.5 = 180, 80 * 1.5 = 120
      break;
    case 'forward':
      maxDistance = distanceToBall < 250 ? 300 : 180; // 200 * 1.5 = 300, 120 * 1.5 = 180
      break;
  }

  let newPosition = {
    x: player.position.x + moveX * 2,
    y: player.position.y + moveY * 2,
  };

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

  return {
    position: newPosition,
    output: { x: moveX, y: moveY }
  };
};
