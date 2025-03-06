import { NeuralNet, Player, TeamContext, Ball, Position } from '../types/football';
import { calculateDistance } from './neuralCore';
import { isPassingLaneOpen } from './movementConstraints';

// Re-export all functions from their respective files
export { createPlayerBrain, normalizeValue } from './neuralCore';
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
export {
  calculateFormationReward,
  calculateSpaceCreationReward,
  calculateBallMovementReward,
  calculatePassingReward,
  calculateTacticalReward
} from './experienceReplay';

// Utility function to determine if player movement is strategic
export const isStrategicMovement = (
  playerPosition: Position,
  ballPosition: Position,
  moveDirection: Position
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

// Calculate the quality of a position for receiving a pass or making a shot
export const calculateShotQuality = (
  playerPosition: Position,
  targetPosition: Position,
  teammatePositions: Position[],
  opponentPositions: Position[]
): number => {
  // Calculate angle and distance to target
  const distanceToTarget = calculateDistance(playerPosition, targetPosition);
  const angleToTarget = Math.atan2(
    targetPosition.y - playerPosition.y,
    targetPosition.x - playerPosition.x
  );
  
  // Initialize base quality score
  let qualityScore = 1.0;
  
  // Penalize shots that are too far
  const optimalShootingDistance = 150;
  const distanceScore = Math.max(0, 1 - Math.abs(distanceToTarget - optimalShootingDistance) / 200);
  qualityScore *= distanceScore;
  
  // Check for blocking players in the shot path
  for (const opponent of opponentPositions) {
    const distanceToOpponent = calculateDistance(playerPosition, opponent);
    const angleToOpponent = Math.atan2(
      opponent.y - playerPosition.y,
      opponent.x - playerPosition.x
    );
    
    // Calculate if opponent is in the shot path
    const angleDiff = Math.abs(angleToTarget - angleToOpponent);
    if (angleDiff < Math.PI / 4 && distanceToOpponent < distanceToTarget) {
      // Reduce quality score based on how directly the opponent blocks the shot
      qualityScore *= (angleDiff / (Math.PI / 4));
    }
  }
  
  return Math.max(0, Math.min(1, qualityScore));
};

// Calculate the quality of a position for receiving a pass
export const calculateReceivingPositionQuality = (
  playerPosition: Position,
  ballPosition: Position,
  teammatePositions: Position[],
  opponentPositions: Position[],
  ownGoal: Position,
  opponentGoal: Position
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

// NEW: Determine if the player should request a pass
export const shouldRequestPass = (
  player: Player,
  ballPosition: Position,
  teammates: Player[],
  opponents: Player[],
  opponentGoal: Position
): boolean => {
  // Don't request if already close to the ball
  const distanceToBall = calculateDistance(player.position, ballPosition);
  if (distanceToBall < 50) return false;
  
  // Find player with ball
  const ballCarrier = teammates.find(p => 
    calculateDistance(p.position, ballPosition) < 30
  );
  
  // Only request if teammate has the ball
  if (!ballCarrier) return false;
  
  // Forward in scoring position should request pass
  if (player.role === 'forward') {
    const distanceToGoal = calculateDistance(player.position, opponentGoal);
    const isInScoringPosition = distanceToGoal < 200;
    
    if (isInScoringPosition) {
      // Check if has open lane to ball carrier
      const passQuality = isPassingLaneOpen(
        player.position, 
        ballCarrier.position, 
        [...teammates, ...opponents]
      );
      
      // Request if lane is relatively clear
      return passQuality > 0.5;
    }
  }
  
  // Other players request pass based on space and position
  const isInSpace = opponents.every(
    opp => calculateDistance(player.position, opp.position) > 80
  );
  
  const isAdvancedPosition = 
    (player.team === 'red' && player.position.x > ballCarrier.position.x + 50) ||
    (player.team === 'blue' && player.position.x < ballCarrier.position.x - 50);
  
  return isInSpace && isAdvancedPosition;
};

// NEW: Find optimal position to receive a pass
export const findOptimalPassReceivingPosition = (
  player: Player,
  ballPosition: Position,
  teammates: Position[],
  opponents: Position[],
  opponentGoal: Position
): Position => {
  const currentQuality = calculateReceivingPositionQuality(
    player.position,
    ballPosition,
    teammates,
    opponents,
    { x: 0, y: 0 }, // Dummy value, not used in the function
    opponentGoal
  );
  
  // If already in a good position, don't move much
  if (currentQuality > 0.7) {
    return {
      x: player.position.x + (Math.random() * 40 - 20),
      y: player.position.y + (Math.random() * 40 - 20)
    };
  }
  
  // Sample potential positions around the player
  const sampleRadius = 80;
  const sampleCount = 8;
  let bestPosition = player.position;
  let bestQuality = currentQuality;
  
  for (let i = 0; i < sampleCount; i++) {
    const angle = (i / sampleCount) * 2 * Math.PI;
    const samplePosition = {
      x: player.position.x + Math.cos(angle) * sampleRadius,
      y: player.position.y + Math.sin(angle) * sampleRadius
    };
    
    const quality = calculateReceivingPositionQuality(
      samplePosition,
      ballPosition,
      teammates,
      opponents,
      { x: 0, y: 0 }, // Dummy value, not used in the function
      opponentGoal
    );
    
    if (quality > bestQuality) {
      bestQuality = quality;
      bestPosition = samplePosition;
    }
  }
  
  // Move toward better position
  return {
    x: player.position.x + (bestPosition.x - player.position.x) * 0.5,
    y: player.position.y + (bestPosition.y - player.position.y) * 0.5
  };
};

// NEW: Determine if this is a good shooting opportunity
export const isGoodShotOpportunity = (
  player: Player,
  ballPosition: Position,
  opponentGoal: Position,
  opponents: Position[]
): boolean => {
  // Must be close to ball
  const distanceToBall = calculateDistance(player.position, ballPosition);
  if (distanceToBall > 30) return false;
  
  // Check distance to goal
  const distanceToGoal = calculateDistance(player.position, opponentGoal);
  if (distanceToGoal > 200) return false;
  
  // Calculate shooting lane quality
  const shootingVector = {
    x: opponentGoal.x - player.position.x,
    y: opponentGoal.y - player.position.y
  };
  
  const shootingAngle = Math.atan2(shootingVector.y, shootingVector.x);
  let laneQuality = 1.0;
  
  // Check for opponents blocking shot
  for (const opponent of opponents) {
    const toOpponentVector = {
      x: opponent.x - player.position.x,
      y: opponent.y - player.position.y
    };
    
    const opponentDist = calculateDistance(player.position, opponent);
    if (opponentDist > distanceToGoal) continue;
    
    const opponentAngle = Math.atan2(toOpponentVector.y, toOpponentVector.x);
    const angleDiff = Math.abs(shootingAngle - opponentAngle);
    
    // If opponent blocks shooting lane
    if (angleDiff < Math.PI / 6 && opponentDist < distanceToGoal * 0.8) {
      laneQuality *= (angleDiff / (Math.PI / 6));
    }
  }
  
  return laneQuality > 0.6;
};
