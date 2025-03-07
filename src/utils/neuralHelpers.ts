
import { Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT, SituationContext } from '../types/football';
import * as brain from 'brain.js';
import { calculateShotQuality } from './playerBrain';
import { SharedNetworkParams, encodePlayerRole, encodeTeamIdentity, normalizePlayerId } from './neural/neuralTypes';

// Helper to determine if a neural network is valid and can be used
export const isNetworkValid = (network: brain.NeuralNetwork<NeuralInput, NeuralOutput>): boolean => {
  if (!network) return false;
  
  try {
    // Try to run the network with some basic input
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
      eloAdvantage: 0,
      gameTime: 0.5,
      scoreDifferential: 0,
      momentum: 0.5,
      formationCompactness: 0.5,
      formationWidth: 0.5,
      recentSuccessRate: 0.5,
      possessionDuration: 0.5,
      distanceFromFormationCenter: 0.5,
      isInFormationPosition: 1,
      teammateDensity: 0.5,
      opponentDensity: 0.5,
      shootingAngle: 0.5,
      shootingQuality: 0.5,
      
      zoneControl: 0.5,
      passingLanesQuality: 0.5,
      spaceCreation: 0.5,
      defensiveSupport: 0.5,
      pressureIndex: 0.5,
      tacticalRole: 0.5,
      supportPositioning: 0.5,
      pressingEfficiency: 0.5,
      coverShadow: 0.5,
      verticalSpacing: 0.5,
      horizontalSpacing: 0.5,
      territorialControl: 0.5,
      counterAttackPotential: 0.5,
      pressureResistance: 0.5,
      recoveryPosition: 0.5,
      transitionSpeed: 0.5,
      
      playerId: 0.5,
      playerRoleEncoding: 0.5,
      playerTeamId: 0.5,
      playerPositionalRole: 0.5
    };
    
    const output = network.run(testInput);
    
    // Check if output has expected properties
    return (
      typeof output.moveX === 'number' &&
      typeof output.moveY === 'number' &&
      typeof output.shootBall === 'number' &&
      typeof output.passBall === 'number' &&
      typeof output.intercept === 'number' &&
      !isNaN(output.moveX) &&
      !isNaN(output.moveY) &&
      !isNaN(output.shootBall) &&
      !isNaN(output.passBall) &&
      !isNaN(output.intercept)
    );
  } catch (error) {
    console.warn("Network validation failed:", error);
    return false;
  }
};

// Check if the player is in shooting range
export const isInShootingRange = (playerPos: Position, goalPos: Position): boolean => {
  const dx = goalPos.x - playerPos.x;
  const dy = goalPos.y - playerPos.y;
  const distanceSquared = dx * dx + dy * dy;
  
  // Consider it shooting range if within 200 pixels (can be adjusted)
  return distanceSquared < 200 * 200;
};

// Calculate distance between two positions
export const calculateDistance = (pos1: Position, pos2: Position): number => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Add the missing calculateAngleAndDistance function
export const calculateAngleAndDistance = (fromPos: Position, toPos: Position): { angle: number, distance: number } => {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) / Math.PI; // Normalized to -1 to 1
  return { angle, distance };
};

// Add the missing normalizePosition function
export const normalizePosition = (position: Position, team: string): Position => {
  // Normalize position based on team perspective (red plays left to right, blue right to left)
  if (team === 'blue') {
    return {
      x: PITCH_WIDTH - position.x,
      y: PITCH_HEIGHT - position.y
    };
  }
  return position;
};

// Add the missing getNearestEntity function
export const getNearestEntity = (position: Position, entities: Position[]): { entity: Position, distance: number } | null => {
  if (!entities || entities.length === 0) return null;
  
  let nearest = entities[0];
  let minDistance = calculateDistance(position, nearest);
  
  for (let i = 1; i < entities.length; i++) {
    const distance = calculateDistance(position, entities[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = entities[i];
    }
  }
  
  return { entity: nearest, distance: minDistance };
};

// Calculate angle between two positions (-1 to 1, where 0 is straight ahead)
export const calculateAngle = (fromPos: Position, toPos: Position): number => {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const angle = Math.atan2(dy, dx) / Math.PI; // Normalized to -1 to 1
  return angle;
};

// Calculate if player is between ball and own goal
export const isBetweenBallAndGoal = (
  playerPos: Position,
  ballPos: Position,
  goalPos: Position
): boolean => {
  // Vector from ball to goal
  const ballToGoalX = goalPos.x - ballPos.x;
  const ballToGoalY = goalPos.y - ballPos.y;
  
  // Vector from ball to player
  const ballToPlayerX = playerPos.x - ballPos.x;
  const ballToPlayerY = playerPos.y - ballPos.y;
  
  // Calculate dot product
  const dotProduct = ballToGoalX * ballToPlayerX + ballToGoalY * ballToPlayerY;
  
  // Calculate magnitudes
  const ballToGoalMagnitude = Math.sqrt(ballToGoalX * ballToGoalX + ballToGoalY * ballToGoalY);
  const ballToPlayerMagnitude = Math.sqrt(ballToPlayerX * ballToPlayerX + ballToPlayerY * ballToPlayerY);
  
  // Calculate cosine of angle between vectors
  const cosAngle = dotProduct / (ballToGoalMagnitude * ballToPlayerMagnitude);
  
  // Player is between if cosine is close to 1 (small angle) and player is closer to goal than ball
  const playerToGoalDistance = calculateDistance(playerPos, goalPos);
  const ballToGoalDistance = calculateDistance(ballPos, goalPos);
  
  return cosAngle > 0.7 && playerToGoalDistance < ballToGoalDistance;
};

// Calculate pressure index based on nearest opponents
export const calculatePressureIndex = (
  playerPos: Position,
  opponents: Position[]
): number => {
  if (!opponents || opponents.length === 0) return 0;
  
  // Find distances to all opponents
  const distances = opponents.map(opp => calculateDistance(playerPos, opp));
  
  // Sort distances
  distances.sort((a, b) => a - b);
  
  // Take the closest 3 opponents or however many are available
  const nearestCount = Math.min(3, distances.length);
  let pressureSum = 0;
  
  for (let i = 0; i < nearestCount; i++) {
    // Convert distance to pressure (closer = more pressure)
    // 150 pixels is considered high pressure, 0 pressure beyond 400 pixels
    const distanceFactor = Math.max(0, Math.min(1, (400 - distances[i]) / 250));
    
    // Weight closer opponents more heavily
    const weight = nearestCount - i;
    pressureSum += distanceFactor * weight;
  }
  
  // Normalize to 0-1 range
  const maxPossibleSum = (nearestCount * (nearestCount + 1)) / 2; // Sum of weights
  return Math.min(1, pressureSum / maxPossibleSum);
};

// Create neural input from game state
export const createNeuralInput = (
  ballPos: Position,
  ballVelocity: Position,
  player: any,
  gameContext: any,
  teammates: Position[],
  opponents: Position[]
): NeuralInput => {
  // Normalize positions to 0-1 range
  const ballX = ballPos.x / PITCH_WIDTH;
  const ballY = ballPos.y / PITCH_HEIGHT;
  const playerX = player.position.x / PITCH_WIDTH;
  const playerY = player.position.y / PITCH_HEIGHT;
  
  // Calculate distances and angles
  const opponentGoal = player.team === 'red' ? { x: PITCH_WIDTH, y: PITCH_HEIGHT / 2 } : { x: 0, y: PITCH_HEIGHT / 2 };
  const ownGoal = player.team === 'red' ? { x: 0, y: PITCH_HEIGHT / 2 } : { x: PITCH_WIDTH, y: PITCH_HEIGHT / 2 };
  
  const distanceToGoal = calculateDistance(player.position, opponentGoal) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  const angleToGoal = calculateAngle(player.position, opponentGoal);
  
  const distanceToOwnGoal = calculateDistance(player.position, ownGoal) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  const angleToOwnGoal = calculateAngle(player.position, ownGoal);
  
  // Find nearest teammate
  let nearestTeammateDistance = 1;
  let nearestTeammateAngle = 0;
  
  if (teammates && teammates.length > 0) {
    let closestDist = Number.MAX_VALUE;
    
    for (const mate of teammates) {
      const dist = calculateDistance(player.position, mate);
      if (dist < closestDist && dist > 0) { // Avoid self
        closestDist = dist;
        nearestTeammateAngle = calculateAngle(player.position, mate);
      }
    }
    
    nearestTeammateDistance = Math.min(1, closestDist / 300); // Normalize to 0-1
  }
  
  // Find nearest opponent
  let nearestOpponentDistance = 1;
  let nearestOpponentAngle = 0;
  
  if (opponents && opponents.length > 0) {
    let closestDist = Number.MAX_VALUE;
    
    for (const opp of opponents) {
      const dist = calculateDistance(player.position, opp);
      if (dist < closestDist) {
        closestDist = dist;
        nearestOpponentAngle = calculateAngle(player.position, opp);
      }
    }
    
    nearestOpponentDistance = Math.min(1, closestDist / 300); // Normalize to 0-1
  }
  
  return {
    ballX,
    ballY,
    playerX,
    playerY,
    ballVelocityX: ballVelocity.x / 20, // Normalize velocity
    ballVelocityY: ballVelocity.y / 20,
    distanceToGoal,
    angleToGoal,
    nearestTeammateDistance,
    nearestTeammateAngle,
    nearestOpponentDistance,
    nearestOpponentAngle,
    isInShootingRange: isInShootingRange(player.position, opponentGoal) ? 1 : 0,
    isInPassingRange: nearestTeammateDistance < 0.5 ? 1 : 0,
    isDefendingRequired: calculateDistance(ballPos, ownGoal) < PITCH_WIDTH / 3 ? 1 : 0,
    distanceToOwnGoal,
    angleToOwnGoal,
    isFacingOwnGoal: Math.abs(angleToOwnGoal) < 0.3 ? 1 : 0,
    isDangerousPosition: distanceToOwnGoal < 0.3 ? 1 : 0,
    isBetweenBallAndOwnGoal: isBetweenBallAndGoal(player.position, ballPos, ownGoal) ? 1 : 0,
    teamElo: gameContext.teamElo || 0.5,
    eloAdvantage: gameContext.eloAdvantage || 0,
    gameTime: gameContext.gameTime || 0.5,
    scoreDifferential: gameContext.scoreDifferential || 0,
    momentum: gameContext.momentum || 0.5,
    formationCompactness: gameContext.formationCompactness || 0.5,
    formationWidth: gameContext.formationWidth || 0.5,
    recentSuccessRate: gameContext.recentSuccessRate || 0.5,
    possessionDuration: gameContext.possessionDuration || 0,
    distanceFromFormationCenter: gameContext.distanceFromCenter || 0.5,
    isInFormationPosition: gameContext.isInPosition ? 1 : 0,
    teammateDensity: gameContext.teammateDensity || 0.5,
    opponentDensity: gameContext.opponentDensity || 0.5,
    shootingAngle: calculateShotQuality(player.position, opponentGoal, teammates, opponents),
    shootingQuality: calculateShotQuality(player.position, opponentGoal, teammates, opponents),
    
    // Add tactical metrics
    zoneControl: gameContext.zoneControl || 0.5,
    passingLanesQuality: gameContext.passingLanesQuality || 0.5,
    spaceCreation: gameContext.spaceCreation || 0.5,
    defensiveSupport: gameContext.defensiveSupport || 0.5,
    pressureIndex: calculatePressureIndex(player.position, opponents),
    tacticalRole: gameContext.tacticalRole || 0.5,
    supportPositioning: gameContext.supportPositioning || 0.5,
    pressingEfficiency: gameContext.pressingEfficiency || 0.5,
    coverShadow: gameContext.coverShadow || 0.5,
    verticalSpacing: gameContext.verticalSpacing || 0.5,
    horizontalSpacing: gameContext.horizontalSpacing || 0.5,
    territorialControl: gameContext.territorialControl || 0.5,
    counterAttackPotential: gameContext.counterAttackPotential || 0.5,
    pressureResistance: 1 - calculatePressureIndex(player.position, opponents),
    recoveryPosition: gameContext.recoveryPosition || 0.5,
    transitionSpeed: gameContext.transitionSpeed || 0.5,
    
    // Add the required player identity parameters
    playerId: gameContext.playerId !== undefined ? gameContext.playerId / 100 : 0.5,
    playerRoleEncoding: gameContext.playerRoleEncoding !== undefined ? 
      gameContext.playerRoleEncoding : encodePlayerRole(player.role),
    playerTeamId: gameContext.playerTeamId !== undefined ? 
      gameContext.playerTeamId : encodeTeamIdentity(player.team),
    playerPositionalRole: gameContext.playerPositionalRole || 0.5
  };
};

// Create a SituationContext from the current game state
export const createSituationContext = (
  input: NeuralInput,
  context: TeamContext,
  playerPosition: Position,
  ballPosition: Position
): SituationContext => {
  const distanceToBall = calculateDistance(playerPosition, ballPosition) / 
    Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  
  const distanceToOwnGoal = calculateDistance(playerPosition, context.ownGoal) / 
    Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  
  const distanceToOpponentGoal = calculateDistance(playerPosition, context.opponentGoal) / 
    Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  
  // Determine which third of the pitch the player is in
  const normalizedX = playerPosition.x / PITCH_WIDTH;
  const isInDefensiveThird = (input.playerTeamId < 0.5) ? normalizedX < 0.33 : normalizedX > 0.67;
  const isInMiddleThird = normalizedX >= 0.33 && normalizedX <= 0.67;
  const isInAttackingThird = (input.playerTeamId < 0.5) ? normalizedX > 0.67 : normalizedX < 0.33;
  
  return {
    isDefensiveThird: isInDefensiveThird,
    isMiddleThird: isInMiddleThird,
    isAttackingThird: isInAttackingThird,
    hasTeamPossession: false, // This would need to be determined elsewhere
    isSetPiece: false, // This would need to be determined elsewhere
    isTransitioning: false, // This would need to be determined elsewhere
    distanceToBall,
    distanceToOwnGoal,
    distanceToOpponentGoal,
    defensivePressure: calculatePressureIndex(playerPosition, context.opponents)
  };
};
