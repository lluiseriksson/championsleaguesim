
import { Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import * as brain from 'brain.js';

export const normalizePosition = (pos: Position): Position => ({
  x: pos.x / PITCH_WIDTH,
  y: pos.y / PITCH_HEIGHT
});

export const calculateAngleAndDistance = (from: Position, to: Position) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    angle: Math.atan2(dy, dx) / Math.PI,
    distance: Math.sqrt(dx * dx + dy * dy) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT)
  };
};

export const getNearestEntity = (position: Position, entities: Position[]) => {
  let nearest = { distance: Infinity, angle: 0 };
  
  entities.forEach(entity => {
    const result = calculateAngleAndDistance(position, entity);
    if (result.distance < nearest.distance) {
      nearest = result;
    }
  });
  
  return nearest;
};

export const createNeuralInput = (
  ball: { position: Position, velocity: Position },
  player: Position,
  context: TeamContext
): NeuralInput => {
  const normalizedBall = normalizePosition(ball.position);
  const normalizedPlayer = normalizePosition(player);
  const goalAngle = calculateAngleAndDistance(player, context.opponentGoal);
  const nearestTeammate = getNearestEntity(player, context.teammates);
  const nearestOpponent = getNearestEntity(player, context.opponents);
  
  const isInShootingRange = goalAngle.distance < 0.3 ? 1 : 0;
  const isInPassingRange = nearestTeammate.distance < 0.2 ? 1 : 0;
  const isDefendingRequired = nearestOpponent.distance < 0.15 ? 1 : 0;

  return {
    ballX: normalizedBall.x,
    ballY: normalizedBall.y,
    playerX: normalizedPlayer.x,
    playerY: normalizedPlayer.y,
    ballVelocityX: ball.velocity.x / 20,
    ballVelocityY: ball.velocity.y / 20,
    distanceToGoal: goalAngle.distance,
    angleToGoal: goalAngle.angle,
    nearestTeammateDistance: nearestTeammate.distance,
    nearestTeammateAngle: nearestTeammate.angle,
    nearestOpponentDistance: nearestOpponent.distance,
    nearestOpponentAngle: nearestOpponent.angle,
    isInShootingRange,
    isInPassingRange,
    isDefendingRequired
  };
};

export const isNetworkValid = (net: brain.NeuralNetwork<NeuralInput, NeuralOutput>): boolean => {
  try {
    const testInput = createNeuralInput(
      { 
        position: { x: PITCH_WIDTH/2, y: PITCH_HEIGHT/2 }, 
        velocity: { x: 0, y: 0 } 
      },
      { x: PITCH_WIDTH/2, y: PITCH_HEIGHT/2 },
      {
        teammates: [{ x: PITCH_WIDTH/2, y: PITCH_HEIGHT/2 }],
        opponents: [{ x: PITCH_WIDTH/2, y: PITCH_HEIGHT/2 }],
        ownGoal: { x: 0, y: PITCH_HEIGHT/2 },
        opponentGoal: { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 }
      }
    );

    const output = net.run(testInput);
    return Object.values(output).every(value => !isNaN(value) && isFinite(value));
  } catch (error) {
    console.warn("Error validando la red:", error);
    return false;
  }
};
