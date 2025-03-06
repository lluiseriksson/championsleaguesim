
import { NeuralNet, Player, TeamContext, Ball } from '../types/football';

// Re-export all functions from their respective files
export { createPlayerBrain, normalizeValue, calculateDistance } from './neuralCore';
export { moveGoalkeeper } from './goalkeeperLogic';
export { calculateNetworkInputs } from './neuralInputs';
export { updatePlayerBrain } from './brainTraining';
export { 
  normalizePosition, 
  calculateAngleAndDistance, 
  getNearestEntity, 
  createNeuralInput, 
  isNetworkValid 
} from './neuralHelpers';

// Utility function to determine if player movement is strategic
export const isStrategicMovement = (
  playerPosition: { x: number, y: number },
  ballPosition: { x: number, y: number },
  moveDirection: { x: number, y: number }
): boolean => {
  // Calculate vector from player to ball
  const toBallVector = {
    x: ballPosition.x - playerPosition.x,
    y: ballPosition.y - playerPosition.y
  };
  
  // Calculate dot product to see if vectors are pointing in similar direction
  const dotProduct = moveDirection.x * toBallVector.x + moveDirection.y * toBallVector.y;
  
  // Normalize vectors to get cosine of angle between them
  const playerToBallLength = Math.sqrt(toBallVector.x * toBallVector.x + toBallVector.y * toBallVector.y);
  const moveDirLength = Math.sqrt(moveDirection.x * moveDirection.x + moveDirection.y * moveDirection.y);
  
  if (playerToBallLength === 0 || moveDirLength === 0) return false;
  
  const cosAngle = dotProduct / (playerToBallLength * moveDirLength);
  
  // If angle is more than ~45 degrees, consider it strategic movement (not directly to ball)
  return cosAngle < 0.7;
};

// Calculate the quality of a position for receiving a pass
export const calculateReceivingPositionQuality = (
  playerPosition: { x: number, y: number },
  ballPosition: { x: number, y: number },
  teammatePositions: { x: number, y: number }[],
  opponentPositions: { x: number, y: number }[],
  ownGoal: { x: number, y: number },
  opponentGoal: { x: number, y: number }
): number => {
  // Distance from ball - moderate distance is good for receiving passes
  const distanceToBall = calculateDistance(playerPosition, ballPosition);
  const optimalPassingDistance = 150;
  const distanceScore = Math.max(0, 1 - Math.abs(distanceToBall - optimalPassingDistance) / 200);
  
  // Space around player - more space is better for receiving
  let spaceScore = 1.0;
  for (const teammate of teammatePositions) {
    const distance = calculateDistance(playerPosition, teammate);
    if (distance < 100) {
      // Reduce space score for nearby teammates
      spaceScore -= (1 - distance / 100) * 0.2;
    }
  }
  
  for (const opponent of opponentPositions) {
    const distance = calculateDistance(playerPosition, opponent);
    if (distance < 80) {
      // Reduce space score more for nearby opponents
      spaceScore -= (1 - distance / 80) * 0.3;
    }
  }
  
  // Positions closer to opponent goal generally better for attacking
  const distanceToGoal = calculateDistance(playerPosition, opponentGoal);
  const maxPitchLength = 800;
  const goalProximityScore = Math.max(0, 1 - distanceToGoal / maxPitchLength);
  
  // Calculate final score - weighted combination of factors
  return 0.4 * distanceScore + 0.4 * spaceScore + 0.2 * goalProximityScore;
};
