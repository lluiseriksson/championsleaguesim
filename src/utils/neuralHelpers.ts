
import { Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import * as brain from 'brain.js';

// Normalize a position to a value between 0 and 1
export const normalizePosition = (pos: Position): Position => ({
  x: pos.x / PITCH_WIDTH,
  y: pos.y / PITCH_HEIGHT
});

// Calculate angle and distance between two positions (normalized)
export const calculateAngleAndDistance = (from: Position, to: Position) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    angle: Math.atan2(dy, dx) / Math.PI, // Normalize angle to -1 to 1
    distance: Math.sqrt(dx * dx + dy * dy) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT) // Normalize distance
  };
};

// Find the nearest entity (teammate or opponent) from a list
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

// Create neural network input data from game state
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
  
  // Calculate strategic flags
  const isInShootingRange = goalAngle.distance < 0.3 ? 1 : 0;
  const isInPassingRange = nearestTeammate.distance < 0.2 ? 1 : 0;
  const isDefendingRequired = nearestOpponent.distance < 0.15 ? 1 : 0;

  // Return the neural input object
  return {
    ballX: normalizedBall.x,
    ballY: normalizedBall.y,
    playerX: normalizedPlayer.x,
    playerY: normalizedPlayer.y,
    ballVelocityX: ball.velocity.x / 20, // Normalize velocity
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

// Validate if a neural network is properly functioning
export const isNetworkValid = (net: brain.NeuralNetwork<NeuralInput, NeuralOutput>): boolean => {
  try {
    // Create a test input with default values
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

    // Run the network with test input and check if output is valid
    const output = net.run(testInput);
    return Object.values(output).every(value => !isNaN(value) && isFinite(value));
  } catch (error) {
    console.warn("Error validating network:", error);
    return false;
  }
};
