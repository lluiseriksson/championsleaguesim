import { Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT, SituationContext } from '../types/football';
import * as brain from 'brain.js';
import { calculateShotQuality } from './playerBrain';
import { calculateDistance, normalizeValue } from './neuralCore';

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

// Enhanced createNeuralInput function with more context
export const createNeuralInput = (
  ball: { position: Position, velocity: Position },
  player: Position,
  context: TeamContext,
  teamElo: number = 2000,
  gameContext: {
    gameTime?: number,
    scoreDifferential?: number,
    possession?: { team: string, duration: number },
    teamFormation?: Position[],
    actionHistory?: Array<{ action: string, success: boolean, timestamp: number }>
  } = {}
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

  // Calculate formation metrics
  const formationMetrics = calculateFormationMetrics(player, teammates);
  
  // Calculate recent performance metrics
  const performanceMetrics = calculatePerformanceMetrics(gameContext.actionHistory || []);

  // Calculate best shooting opportunity
  let bestShootingAngle = 0;
  let bestShootingQuality = 0;
  
  // Check shooting opportunities in 8 directions
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const targetPosition = {
      x: player.x + Math.cos(angle) * 100,
      y: player.y + Math.sin(angle) * 100
    };
    
    const shotQuality = calculateShotQuality(
      player,
      targetPosition,
      context.teammates || [],
      context.opponents || []
    );
    
    if (shotQuality > bestShootingQuality) {
      bestShootingQuality = shotQuality;
      bestShootingAngle = angle;
    }
  }

  // Calculate additional tactical metrics
  const teammateDensity = calculateDensity(player, teammates, 150);
  const opponentDensity = calculateDensity(player, opponents, 150);
  
  // Calculate zone control and passing lanes if teammates and opponents are available
  let zoneControl = 0.5;
  let passingLanesQuality = 0.5;
  let spaceCreation = 0.5;
  
  if (teammates.length > 0 && opponents.length > 0) {
    // These calculations would typically be more complex in a real implementation
    zoneControl = calculateZoneControl(player, teammates, opponents);
    passingLanesQuality = calculatePassingLanes(player, teammates, opponents);
    spaceCreation = Math.max(0, 1 - (teammateDensity + opponentDensity) / 2);
  }

  // Return the neural input object with normalized values and tactical metrics
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
    eloAdvantage: eloAdvantage,
    
    // Game context features
    gameTime: gameContext.gameTime || 0.5,
    scoreDifferential: gameContext.scoreDifferential || 0,
    momentum: performanceMetrics.momentum,
    formationCompactness: formationMetrics.compactness,
    formationWidth: formationMetrics.width,
    recentSuccessRate: performanceMetrics.successRate,
    possessionDuration: gameContext.possession ? 
      Math.min(1, gameContext.possession.duration / 600) : 0, // Normalize to 0-1 (max 10 seconds)
    distanceFromFormationCenter: formationMetrics.distanceFromCenter,
    isInFormationPosition: formationMetrics.isInPosition,
    teammateDensity,
    opponentDensity,
    shootingAngle: bestShootingAngle / (Math.PI * 2), // Normalize to 0-1
    shootingQuality: bestShootingQuality,
    
    // New tactical metrics
    zoneControl,
    passingLanesQuality,
    spaceCreation,
    defensiveSupport: calculateDefensiveSupport(player, teammates),
    pressureIndex: calculatePressureIndex(player, opponents),
    tacticalRole: 0.5, // Default value, would be more complex in real implementation
    supportPositioning: calculateSupportPositioning(player, teammates),
    pressingEfficiency: calculatePressingEfficiency(player, normalizedBall),
    coverShadow: calculateCoverShadow(player, opponents),
    verticalSpacing: calculateVerticalSpacing(teammates),
    horizontalSpacing: calculateHorizontalSpacing(teammates),
    territorialControl: zoneControl * (1 - calculatePressureIndex(player, opponents)),
    counterAttackPotential: 0.5, // Default value, would be more complex in real implementation
    pressureResistance: 1 - calculatePressureIndex(player, opponents),
    recoveryPosition: 0.5, // Default value, would be more complex in real implementation
    transitionSpeed: 0.5 // Default value, would be more complex in real implementation
  };
};

// Simple helper implementations for tactical metrics
const calculateZoneControl = (player: Position, teammates: Position[], opponents: Position[]): number => {
  // Simple implementation - would be more sophisticated in a real system
  const radius = 150;
  let teammateCount = 0;
  let opponentCount = 0;
  
  teammates.forEach(pos => {
    if (calculateDistance(player, pos) < radius) teammateCount++;
  });
  
  opponents.forEach(pos => {
    if (calculateDistance(player, pos) < radius) opponentCount++;
  });
  
  return Math.max(0, Math.min(1, (teammateCount - opponentCount + 3) / 6));
};

const calculatePassingLanes = (player: Position, teammates: Position[], opponents: Position[]): number => {
  // Simple implementation for passing lanes quality
  const lanes = teammates.map(teammate => {
    let quality = 1;
    const dist = calculateDistance(player, teammate);
    if (dist > 300) quality *= 0.5; // Long passes are harder
    
    // Check if opponents block the passing lane
    opponents.forEach(opp => {
      if (isInPassingLane(player, teammate, opp, 30)) {
        quality *= 0.7; // Reduce quality if opponent blocks lane
      }
    });
    
    return quality;
  });
  
  return lanes.length > 0 ? lanes.reduce((sum, q) => sum + q, 0) / lanes.length : 0;
};

const isInPassingLane = (from: Position, to: Position, pos: Position, tolerance: number): boolean => {
  // Check if pos is in the passing lane between from and to
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist === 0) return false;
  
  // Project pos onto the line from->to
  const t = ((pos.x - from.x) * dx + (pos.y - from.y) * dy) / (dist * dist);
  
  if (t < 0 || t > 1) return false;
  
  // Calculate perpendicular distance
  const px = from.x + t * dx;
  const py = from.y + t * dy;
  const perpDist = Math.sqrt(Math.pow(pos.x - px, 2) + Math.pow(pos.y - py, 2));
  
  return perpDist < tolerance;
};

const calculateDefensiveSupport = (player: Position, teammates: Position[]): number => {
  // Simple calculation of defensive support from teammates
  const supportRadius = 200;
  let supportScore = 0;
  
  teammates.forEach(pos => {
    const dist = calculateDistance(player, pos);
    if (dist < supportRadius) {
      supportScore += 1 - (dist / supportRadius);
    }
  });
  
  return Math.min(1, supportScore / 3); // Max support from 3 teammates
};

const calculatePressureIndex = (player: Position, opponents: Position[]): number => {
  // Calculate pressure from opponents
  const pressureRadius = 150;
  let pressureScore = 0;
  
  opponents.forEach(pos => {
    const dist = calculateDistance(player, pos);
    if (dist < pressureRadius) {
      pressureScore += 1 - (dist / pressureRadius);
    }
  });
  
  return Math.min(1, pressureScore / 2); // Max pressure from 2 opponents
};

const calculateSupportPositioning = (player: Position, teammates: Position[]): number => {
  // Simple implementation for support positioning quality
  return teammates.length > 0 ? 
    1 - Math.min(1, teammates.reduce((min, t) => 
      Math.min(min, calculateDistance(player, t)), 1000) / 300) : 0;
};

const calculatePressingEfficiency = (player: Position, ball: { x: number, y: number }): number => {
  // Simple implementation based on distance to ball
  const dist = calculateDistance(player, ball);
  return Math.max(0, 1 - Math.min(1, dist / 200));
};

const calculateCoverShadow = (player: Position, opponents: Position[]): number => {
  // Simple implementation for cover shadow quality
  const shadowAngle = Math.PI / 3; // 60 degrees shadow cone
  let coverScore = 0;
  
  opponents.forEach(opp => {
    const dist = calculateDistance(player, opp);
    if (dist < 150) coverScore += 0.5 * (1 - dist / 150);
  });
  
  return Math.min(1, coverScore);
};

const calculateVerticalSpacing = (positions: Position[]): number => {
  if (positions.length < 2) return 1;
  const yPositions = positions.map(p => p.y);
  const spread = Math.max(...yPositions) - Math.min(...yPositions);
  return Math.min(1, spread / PITCH_HEIGHT);
};

const calculateHorizontalSpacing = (positions: Position[]): number => {
  if (positions.length < 2) return 1;
  const xPositions = positions.map(p => p.x);
  const spread = Math.max(...xPositions) - Math.min(...xPositions);
  return Math.min(1, spread / PITCH_WIDTH);
};

// Calculate team formation metrics
const calculateFormationMetrics = (playerPos: Position, teammates: Position[]) => {
  if (!teammates.length) {
    return {
      compactness: 0.5,
      width: 0.5,
      distanceFromCenter: 0.5,
      isInPosition: 1
    };
  }

  // Calculate the team's formation center
  const allPositions = [playerPos, ...teammates];
  const center = {
    x: allPositions.reduce((sum, pos) => sum + pos.x, 0) / allPositions.length,
    y: allPositions.reduce((sum, pos) => sum + pos.y, 0) / allPositions.length
  };

  // Calculate distances from center
  const distances = allPositions.map(pos => 
    Math.sqrt(Math.pow(pos.x - center.x, 2) + Math.pow(pos.y - center.y, 2))
  );
  
  // Find the min and max x positions to determine width
  const xPositions = allPositions.map(pos => pos.x);
  const minX = Math.min(...xPositions);
  const maxX = Math.max(...xPositions);
  const width = (maxX - minX) / PITCH_WIDTH;
  
  // Player distance from formation center
  const playerDistance = Math.sqrt(
    Math.pow(playerPos.x - center.x, 2) + Math.pow(playerPos.y - center.y, 2)
  );
  
  return {
    compactness: 1 - Math.min(1, Math.max(0, (Math.max(...distances) / (PITCH_WIDTH/2)))),
    width: Math.min(1, width),
    distanceFromCenter: Math.min(1, playerDistance / (PITCH_WIDTH/3)),
    isInPosition: playerDistance < 100 ? 1 : Math.max(0, 1 - (playerDistance - 100) / 200)
  };
};

// Calculate density of entities around a position
const calculateDensity = (pos: Position, entities: Position[], radius: number): number => {
  if (!entities.length) return 0;
  
  const count = entities.filter(entity => 
    Math.sqrt(Math.pow(entity.x - pos.x, 2) + Math.pow(entity.y - pos.y, 2)) < radius
  ).length;
  
  return Math.min(1, count / 5); // Normalize to 0-1, max of 5 entities counts as 1.0
};

// Calculate performance metrics from action history
const calculatePerformanceMetrics = (actionHistory: Array<{ 
  action: string, 
  success: boolean, 
  timestamp: number 
}>) => {
  if (!actionHistory.length) {
    return {
      successRate: 0.5,
      momentum: 0.5
    };
  }
  
  // Only consider recent actions (last 10)
  const recentActions = actionHistory.slice(-10);
  
  // Calculate success rate
  const successCount = recentActions.filter(a => a.success).length;
  const successRate = successCount / recentActions.length;
  
  // Calculate momentum (more recent actions have higher weight)
  let momentumScore = 0;
  let weightSum = 0;
  
  recentActions.forEach((action, index) => {
    const weight = index + 1; // More recent actions have higher index
    momentumScore += action.success ? weight : -weight;
    weightSum += weight;
  });
  
  // Normalize momentum to 0-1 range
  const normalizedMomentum = 0.5 + (momentumScore / (2 * weightSum));
  
  return {
    successRate,
    momentum: Math.max(0, Math.min(1, normalizedMomentum))
  };
};

// Create a situation context from neural input and team context
export const createSituationContext = (
  input: NeuralInput, 
  teamContext: TeamContext,
  playerPosition: Position,
  ballPosition: Position
): SituationContext => {
  // Determine field position by thirds
  const playerX = input.playerX;
  const isDefensiveThird = playerX < 0.33;
  const isMiddleThird = playerX >= 0.33 && playerX <= 0.66;
  const isAttackingThird = playerX > 0.66;
  
  // Determine possession
  const hasTeamPossession = input.isInShootingRange > 0.5 || input.isInPassingRange > 0.5;
  
  // Calculate distances
  const distanceToBall = Math.sqrt(
    Math.pow(playerPosition.x - ballPosition.x, 2) + 
    Math.pow(playerPosition.y - ballPosition.y, 2)
  ) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  
  // Create situation context
  return {
    isDefensiveThird,
    isMiddleThird,
    isAttackingThird,
    hasTeamPossession,
    isSetPiece: false, // Would need additional game state
    isTransitioning: input.ballVelocityX > 0.3 || input.ballVelocityY > 0.3,
    distanceToBall,
    distanceToOwnGoal: input.distanceToOwnGoal,
    distanceToOpponentGoal: input.distanceToGoal,
    defensivePressure: input.opponentDensity * (1 - input.distanceToOwnGoal)
  };
};

// Improve neural network validation with more robust error handling
export const isNetworkValid = (net: brain.NeuralNetwork<NeuralInput, NeuralOutput>): boolean => {
  if (!net || typeof net.run !== 'function') {
    console.warn("Neural network is missing or run function is not available");
    return false;
  }
  
  try {
    console.log("Validating neural network...");
    
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
      eloAdvantage: 0,
      // New contextual features with default values
      gameTime: 0.5,
      scoreDifferential: 0,
      momentum: 0.5,
      formationCompactness: 0.5,
      formationWidth: 0.5,
      recentSuccessRate: 0.5,
      possessionDuration: 0,
      distanceFromFormationCenter: 0.5,
      isInFormationPosition: 1,
      teammateDensity: 0.5,
      opponentDensity: 0.5,
      shootingAngle: 0.5,
      shootingQuality: 0.5
    };

    // Run the network with test input and check if output is valid
    const output = net.run(testInput);
    
    if (!output) {
      console.warn("Network returned null or undefined output");
      return false;
    }
    
    // Validate output structure and values
    const requiredOutputs = ['moveX', 'moveY', 'shootBall', 'passBall', 'intercept'];
    const hasAllOutputs = requiredOutputs.every(key => 
      typeof output[key as keyof typeof output] === 'number' &&
      !isNaN(output[key as keyof typeof output]) &&
      isFinite(output[key as keyof typeof output])
    );
    
    if (!hasAllOutputs) {
      console.warn("Network output missing required properties or has invalid values");
      return false;
    }
    
    console.log("Neural network validation successful");
    return true;
  } catch (error) {
    console.warn("Error validating network:", error);
    return false;
  }
};
