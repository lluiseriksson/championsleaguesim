
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
  if (!entities || entities.length === 0) {
    return { distance: 1, angle: 0 }; // Default values if no entities
  }
  
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
  context: TeamContext,
  teamElo: number = 2000 // Default ELO if none provided
): NeuralInput => {
  const normalizedBall = normalizePosition(ball.position);
  const normalizedPlayer = normalizePosition(player);
  const goalAngle = calculateAngleAndDistance(player, context.opponentGoal);
  
  // Handle potential empty arrays
  const teammates = Array.isArray(context.teammates) ? context.teammates : [];
  const opponents = Array.isArray(context.opponents) ? context.opponents : [];
  
  const nearestTeammate = getNearestEntity(player, teammates);
  const nearestOpponent = getNearestEntity(player, opponents);
  
  // Calculate strategic flags with safe values
  const isInShootingRange = goalAngle.distance < 0.3 ? 1 : 0;
  const isInPassingRange = nearestTeammate.distance < 0.2 ? 1 : 0;
  const isDefendingRequired = nearestOpponent.distance < 0.15 ? 1 : 0;

  // Add ELO related properties
  const normalizedTeamElo = teamElo ? teamElo / 3000 : 0.5; // Normalize to 0-1 range assuming max ELO 3000
  const averageElo = 2000;
  const eloAdvantage = (teamElo - averageElo) / 1000; // Normalize to roughly -1 to 1 range

  // Return the neural input object with normalized values
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
    isDefendingRequired,
    distanceToOwnGoal: 0.5, // Default values that will be overridden when used properly
    angleToOwnGoal: 0,
    isFacingOwnGoal: 0,
    isDangerousPosition: 0,
    isBetweenBallAndOwnGoal: 0,
    teamElo: normalizedTeamElo,
    eloAdvantage: eloAdvantage
  };
};

// Improve neural network validation with more robust error handling
export const isNetworkValid = (net: brain.NeuralNetwork<NeuralInput, NeuralOutput>): boolean => {
  if (!net || typeof net.run !== 'function') {
    console.warn("Neural network is missing or run function is not available");
    return false;
  }
  
  try {
    // Create a simple test input with default values
    const testInput: NeuralInput = {
      ballX: 0.5,
      ballY: 0.5,
      playerX: 0.5,
      playerY: 0.5,
      ballVelocityX: 0,
      ballVelocityY: 0,
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
      isBetweenBallAndOwnGoal: 0,
      teamElo: 0.5,
      eloAdvantage: 0
    };

    // Run the network with test input and check if output is valid
    const output = net.run(testInput);
    
    if (!output) {
      console.warn("Network returned null or undefined output");
      return false;
    }
    
    // Check that all values are valid numbers
    return Object.values(output).every(value => 
      value !== undefined && 
      value !== null && 
      !isNaN(value) && 
      isFinite(value)
    );
  } catch (error) {
    console.warn("Error validating network:", error);
    return false;
  }
};
