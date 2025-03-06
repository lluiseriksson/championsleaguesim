import { NeuralNet, Player, TeamContext, Ball, Position } from '../types/football';
import { calculateDistance } from './neuralCore';
import { isPassingLaneOpen } from './movementConstraints';
import * as brain from 'brain.js';
import { createExperienceReplay } from './experienceReplay';

// Re-export all functions from their respective files
export { normalizeValue } from './neuralCore';
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

// Import createPlayerBrain from neuralNetwork.ts instead of declaring it here
export { createPlayerBrain } from './neuralNetwork';

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

// Improved: Determine if the player should request a pass
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

// Improved: Find optimal position to receive a pass
export const findOptimalPassReceivingPosition = (
  player: Player,
  ballPosition: Position,
  teammates: Position[],
  opponents: Position[],
  opponentGoal: Position
): Position => {
  console.log(`Finding optimal pass receiving position for ${player.team} ${player.role} #${player.id}`);
  
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
  const sampleRadius = 100; // Increased from 80
  const sampleCount = 12;   // Increased from 8
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
      { x: 0, y: 0 }, // Dummy value
      opponentGoal
    );
    
    if (quality > bestQuality) {
      bestQuality = quality;
      bestPosition = samplePosition;
    }
  }
  
  // Move toward better position (increased movement factor)
  return {
    x: player.position.x + (bestPosition.x - player.position.x) * 0.7,
    y: player.position.y + (bestPosition.y - player.position.y) * 0.7
  };
};

// Improved: Determine if this is a good shooting opportunity
export const isGoodShotOpportunity = (
  player: Player,
  ballPosition: Position,
  opponentGoal: Position,
  opponents: Position[]
): boolean => {
  // Must be close to ball
  const distanceToBall = calculateDistance(player.position, ballPosition);
  if (distanceToBall > 40) { // Changed from 30 to 40
    return false;
  }
  
  // Check distance to goal
  const distanceToGoal = calculateDistance(player.position, opponentGoal);
  if (distanceToGoal > 250) { // Changed from 200 to 250
    console.log(`${player.team} ${player.role} #${player.id} too far from goal: ${distanceToGoal}`);
    return false;
  }
  
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
  
  const shouldShoot = laneQuality > 0.5; // Changed from 0.6 to 0.5
  
  if (shouldShoot) {
    console.log(`${player.team} ${player.role} #${player.id} has good shot opportunity! Lane quality: ${laneQuality.toFixed(2)}`);
  }
  
  return shouldShoot;
};

// NEW: Log diagnostic info about passing
export const logPassingInfo = (
  passer: Player,
  receiver: Player,
  ballPosition: Position,
  passQuality: number
): void => {
  console.log(`PASS: ${passer.team} ${passer.role} #${passer.id} → ${receiver.team} ${receiver.role} #${receiver.id}`);
  console.log(`Pass distance: ${calculateDistance(passer.position, receiver.position).toFixed(1)}`);
  console.log(`Pass quality: ${passQuality.toFixed(2)}`);
  console.log(`Ball distance from passer: ${calculateDistance(passer.position, ballPosition).toFixed(1)}`);
  console.log(`Ball distance from receiver: ${calculateDistance(receiver.position, ballPosition).toFixed(1)}`);
};

// NEW: Calculate passing success probability
export const calculatePassingSuccess = (
  passer: Player,
  receiver: Player,
  ballPosition: Position,
  opponentPositions: Position[]
): number => {
  // Check if passer is close to ball
  const distanceToBall = calculateDistance(passer.position, ballPosition);
  if (distanceToBall > 30) {
    return 0;
  }
  
  // Base success rate depends on distance
  const passDistance = calculateDistance(passer.position, receiver.position);
  let successRate = Math.max(0, 1 - passDistance / 500);
  
  // Calculate if pass lane is open
  const dummyOpponents = opponentPositions.map((pos, index) => ({
    id: -index - 1, // Negative IDs to avoid conflicts
    position: pos,
    role: 'defender' as const,
    team: (passer.team === 'red' ? 'blue' : 'red') as 'red' | 'blue',
    brain: { net: null, lastOutput: { x: 0, y: 0 } },
    targetPosition: pos,
    radius: 12 // Default player radius
  }));
  
  const passQuality = isPassingLaneOpen(
    passer.position,
    receiver.position,
    dummyOpponents
  );
  
  // Combine factors
  successRate *= passQuality;
  
  // Adjust for player roles
  if (passer.role === 'midfielder') {
    successRate *= 1.2; // Midfielders are better at passing
  }
  
  // Apply team ELO bonus if available
  if (passer.teamElo) {
    const eloFactor = Math.min(1.5, Math.max(0.5, passer.teamElo / 2000));
    successRate *= eloFactor;
  }
  
  return Math.min(1, successRate);
};

// NEW: Find best passing target
export const findBestPassingTarget = (
  passer: Player,
  teammates: Player[],
  ballPosition: Position,
  opponentPositions: Position[],
  opponentGoal: Position
): { target: Player | null, quality: number } => {
  let bestTarget = null;
  let bestQuality = 0;
  
  if (teammates.length === 0) {
    return { target: null, quality: 0 };
  }
  
  for (const teammate of teammates) {
    if (teammate.id === passer.id) continue;
    
    // Calculate basic passing success
    const passSuccess = calculatePassingSuccess(
      passer,
      teammate,
      ballPosition,
      opponentPositions
    );
    
    // Evaluate strategic quality of the recipient's position
    const positionQuality = calculateReceivingPositionQuality(
      teammate.position,
      ballPosition,
      teammates.map(t => t.position),
      opponentPositions,
      { x: 0, y: 0 }, // Dummy value
      opponentGoal
    );
    
    // Prioritize forwards in advanced positions
    const roleFactor = teammate.role === 'forward' ? 1.2 : 
                      teammate.role === 'midfielder' ? 1.1 : 1.0;
    
    // Combine all factors
    const totalQuality = passSuccess * positionQuality * roleFactor;
    
    if (totalQuality > bestQuality) {
      bestQuality = totalQuality;
      bestTarget = teammate;
    }
  }
  
  if (bestTarget && bestQuality > 0) {
    console.log(`Best pass target: ${bestTarget.team} ${bestTarget.role} #${bestTarget.id}, quality: ${bestQuality.toFixed(2)}`);
  }
  
  return { target: bestTarget, quality: bestQuality };
};
