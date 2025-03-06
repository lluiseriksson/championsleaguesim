
import { Ball, Player, TeamContext, NeuralInput, Position, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { calculateDistance, normalizeValue } from './neuralCore';
import { calculateShotQuality } from './playerBrain';

const calculateZoneControl = (player: Player, teammates: Position[], opponents: Position[]): number => {
  const zoneRadius = 150;
  let teammateControl = 0;
  let opponentControl = 0;

  teammates.forEach(pos => {
    const dist = calculateDistance(player.position, pos);
    if (dist < zoneRadius) {
      teammateControl += 1 - (dist / zoneRadius);
    }
  });

  opponents.forEach(pos => {
    const dist = calculateDistance(player.position, pos);
    if (dist < zoneRadius) {
      opponentControl += 1 - (dist / zoneRadius);
    }
  });

  return Math.max(0, Math.min(1, (teammateControl - opponentControl + 1) / 2));
};

const evaluatePassingLanes = (player: Player, teammates: Position[], opponents: Position[]): number => {
  let totalQuality = 0;
  let laneCount = 0;

  teammates.forEach(teammate => {
    let laneQuality = 1;
    const passingVector = {
      x: teammate.x - player.position.x,
      y: teammate.y - player.position.y
    };
    const passingDistance = calculateDistance(player.position, teammate);

    opponents.forEach(opponent => {
      const opponentDist = calculateDistance(player.position, opponent);
      if (opponentDist < passingDistance) {
        const interference = calculatePassingInterference(
          player.position,
          teammate,
          opponent
        );
        laneQuality *= (1 - interference);
      }
    });

    if (laneQuality > 0.2) { // Only count viable passing lanes
      totalQuality += laneQuality;
      laneCount++;
    }
  });

  return laneCount > 0 ? totalQuality / laneCount : 0;
};

const calculatePassingInterference = (from: Position, to: Position, obstacle: Position): number => {
  const passingDist = calculateDistance(from, to);
  const obstacleDist = calculateDistance(from, obstacle);
  const toObstacleDist = calculateDistance(to, obstacle);
  
  if (obstacleDist > passingDist) return 0;
  
  const interference = 1 - (Math.min(obstacleDist, toObstacleDist) / passingDist);
  return Math.max(0, Math.min(1, interference));
};

const calculateTacticalRole = (player: Player, ball: Ball, context: TeamContext): number => {
  const rolePositions = {
    defender: player.team === 'red' ? 0.2 : 0.8,
    midfielder: 0.5,
    forward: player.team === 'red' ? 0.8 : 0.2
  };

  const idealX = rolePositions[player.role] * PITCH_WIDTH;
  const positionDeviation = Math.abs(player.position.x - idealX) / PITCH_WIDTH;
  
  return Math.max(0, 1 - positionDeviation);
};

export const calculateNetworkInputs = (ball: Ball, player: Player, context: TeamContext): NeuralInput => {
  const normalizedBall = { 
    x: normalizeValue(ball.position.x, 0, 800),
    y: normalizeValue(ball.position.y, 0, 600)
  };
  const normalizedPlayer = {
    x: normalizeValue(player.position.x, 0, 800),
    y: normalizeValue(player.position.y, 0, 600)
  };

  // Calculate distances and angles
  const distanceToBall = calculateDistance(player.position, ball.position);
  const distanceToGoal = calculateDistance(player.position, context.opponentGoal);
  const distanceToOwnGoal = calculateDistance(player.position, context.ownGoal);
  
  // Calculate normalized versions for the output
  const normalizedDistanceToGoal = normalizeValue(distanceToGoal, 0, 1000);
  const normalizedDistanceToOwnGoal = normalizeValue(distanceToOwnGoal, 0, 1000);
  
  // Calculate angles
  const angleToGoal = Math.atan2(
    context.opponentGoal.y - player.position.y,
    context.opponentGoal.x - player.position.x
  );
  const angleToOwnGoal = Math.atan2(
    context.ownGoal.y - player.position.y,
    context.ownGoal.x - player.position.x
  );
  const normalizedAngleToGoal = normalizeValue(angleToGoal, -Math.PI, Math.PI);
  const normalizedAngleToOwnGoal = normalizeValue(angleToOwnGoal, -Math.PI, Math.PI);
  
  // Calculate if player is facing own goal
  const playerDirectionX = Math.cos(angleToOwnGoal);
  const isFacingOwnGoal = playerDirectionX < 0 ? 1 : 0;
  
  // Calculate if player is between ball and own goal
  const ballToOwnGoalDistance = calculateDistance(ball.position, context.ownGoal);
  const isBetweenBallAndOwnGoal = (distanceToOwnGoal < ballToOwnGoalDistance) ? 1 : 0;
  
  // Calculate nearest teammate
  let nearestTeammateDistance = 1000;
  let nearestTeammateAngle = 0;
  if (context.teammates.length > 0) {
    context.teammates.forEach(teammate => {
      const dist = calculateDistance(player.position, teammate);
      if (dist < nearestTeammateDistance) {
        nearestTeammateDistance = dist;
        nearestTeammateAngle = Math.atan2(
          teammate.y - player.position.y,
          teammate.x - player.position.x
        );
      }
    });
  }
  
  // Calculate nearest opponent
  let nearestOpponentDistance = 1000;
  let nearestOpponentAngle = 0;
  if (context.opponents.length > 0) {
    context.opponents.forEach(opponent => {
      const dist = calculateDistance(player.position, opponent);
      if (dist < nearestOpponentDistance) {
        nearestOpponentDistance = dist;
        nearestOpponentAngle = Math.atan2(
          opponent.y - player.position.y,
          opponent.x - player.position.x
        );
      }
    });
  }
  
  const normalizedTeammateDistance = normalizeValue(nearestTeammateDistance, 0, 400);
  const normalizedTeammateAngle = normalizeValue(nearestTeammateAngle, -Math.PI, Math.PI);
  const normalizedOpponentDistance = normalizeValue(nearestOpponentDistance, 0, 400);
  const normalizedOpponentAngle = normalizeValue(nearestOpponentAngle, -Math.PI, Math.PI);
  
  // Calculate densities
  const teammateDensity = calculatePlayerDensity(player.position, context.teammates, 150);
  const opponentDensity = calculatePlayerDensity(player.position, context.opponents, 150);

  // Calculate tactical metrics
  const zoneControl = calculateZoneControl(player, context.teammates, context.opponents);
  const passingLanesQuality = evaluatePassingLanes(player, context.teammates, context.opponents);
  const tacticalRole = calculateTacticalRole(player, ball, context);
  const verticalSpacing = calculateVerticalSpacing(player, context.teammates);
  const horizontalSpacing = calculateHorizontalSpacing(player, context.teammates);
  const pressureIndex = calculatePressureIndex(player, context.opponents);
  const supportPositioning = calculateSupportPositioning(player, context.teammates, ball);
  
  // Determine shooting range - using let instead of const since we modify it
  let isInShootingRange = 0;
  if (distanceToBall < 100 && distanceToGoal < 300) {
    if ((player.team === 'red' && player.position.x > 400) || 
        (player.team === 'blue' && player.position.x < 400)) {
      isInShootingRange = 1;
    } else {
      isInShootingRange = 0.2;
    }
  }

  // Calculate passing quality
  const passingLaneQuality = passingLanesQuality;
  const isInPassingRange = distanceToBall < 80 && 
                        nearestTeammateDistance < 200 && 
                        passingLaneQuality > 0.5 ? 1 : 0;

  // Determine dangerous position
  const isDangerousPosition = (distanceToBall < 100 && distanceToOwnGoal < 200) || 
                           (isBetweenBallAndOwnGoal && distanceToBall < 120) ? 1 : 0;

  // Determine if defending is required
  const isDefendingRequired = ballToOwnGoalDistance < 300 ? 1 : 0;

  // ELO calculations
  const normalizedTeamElo = player.teamElo ? normalizeValue(player.teamElo, 1000, 3000) : 0.5;
  const averageElo = 2000;
  const eloAdvantage = player.teamElo ? normalizeValue(player.teamElo - averageElo, -1000, 1000) : 0.5;

  // Game context factors
  const gameTime = context.gameTime || 0.5;
  const scoreDifferential = context.scoreDiff || 0;
  const momentum = player.brain.successRate?.overall || 0.5;

  // Formation metrics
  const formationCompactness = context.formationCompactness || 0.5;
  const formationWidth = context.formationWidth || 0.5;
  const distanceFromFormationCenter = context.distanceFromCenter || 0.5;
  const isInFormationPosition = context.isInPosition ? 1 : 0;

  // Calculate best shooting angle and quality
  let bestShootingAngle = 0;
  let bestShootingQuality = 0;

  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const targetPosition = {
      x: player.position.x + Math.cos(angle) * 100,
      y: player.position.y + Math.sin(angle) * 100
    };

    const shotQuality = calculateShotQuality(
      player.position,
      targetPosition,
      context.teammates,
      context.opponents
    );

    if (shotQuality > bestShootingQuality) {
      bestShootingQuality = shotQuality;
      bestShootingAngle = angle;
    }
  }

  // Return the comprehensive neural input object
  return {
    ballX: normalizedBall.x,
    ballY: normalizedBall.y,
    playerX: normalizedPlayer.x,
    playerY: normalizedPlayer.y,
    ballVelocityX: normalizeValue(ball.velocity.x, -20, 20),
    ballVelocityY: normalizeValue(ball.velocity.y, -20, 20),
    distanceToGoal: normalizedDistanceToGoal,
    angleToGoal: normalizedAngleToGoal,
    nearestTeammateDistance: normalizedTeammateDistance,
    nearestTeammateAngle: normalizedTeammateAngle,
    nearestOpponentDistance: normalizedOpponentDistance,
    nearestOpponentAngle: normalizedOpponentAngle,
    isInShootingRange,
    isInPassingRange,
    isDefendingRequired,
    distanceToOwnGoal: normalizedDistanceToOwnGoal,
    angleToOwnGoal: normalizedAngleToOwnGoal,
    isFacingOwnGoal,
    isDangerousPosition,
    isBetweenBallAndOwnGoal,
    teamElo: normalizedTeamElo,
    eloAdvantage,
    gameTime,
    scoreDifferential,
    momentum,
    formationCompactness,
    formationWidth,
    recentSuccessRate: momentum,
    possessionDuration: context.possessionDuration || 0,
    distanceFromFormationCenter,
    isInFormationPosition,
    teammateDensity,
    opponentDensity,
    shootingAngle: normalizeValue(bestShootingAngle, 0, Math.PI * 2),
    shootingQuality: bestShootingQuality,
    zoneControl,
    passingLanesQuality,
    spaceCreation: Math.max(0, 1 - (teammateDensity + opponentDensity) / 2),
    defensiveSupport: calculateDefensiveSupport(player, context),
    pressureIndex,
    tacticalRole,
    supportPositioning,
    pressingEfficiency: calculatePressingEfficiency(player, ball, context),
    coverShadow: calculateCoverShadow(player, context),
    verticalSpacing,
    horizontalSpacing,
    territorialControl: zoneControl * (1 - pressureIndex),
    counterAttackPotential: calculateCounterAttackPotential(player, ball, context),
    pressureResistance: 1 - pressureIndex,
    recoveryPosition: calculateRecoveryPosition(player, ball, context),
    transitionSpeed: calculateTransitionSpeed(player, ball)
  };
};

// Helper function to calculate player density in an area
const calculatePlayerDensity = (position: Position, players: Position[], radius: number): number => {
  if (!players.length) return 0;
  const count = players.filter(p => calculateDistance(position, p) < radius).length;
  return Math.min(1, count / 5); // Normalize to 0-1, max density of 5 players
};

const calculateVerticalSpacing = (player: Player, teammates: Position[]): number => {
  if (!teammates.length) return 1;
  const yPositions = teammates.map(t => t.y).concat(player.position.y);
  const spread = Math.max(...yPositions) - Math.min(...yPositions);
  return Math.min(1, spread / 600);
};

const calculateHorizontalSpacing = (player: Player, teammates: Position[]): number => {
  if (!teammates.length) return 1;
  const xPositions = teammates.map(t => t.x).concat(player.position.x);
  const spread = Math.max(...xPositions) - Math.min(...xPositions);
  return Math.min(1, spread / 800);
};

const calculatePressureIndex = (player: Player, opponents: Position[]): number => {
  if (!opponents.length) return 0;
  const pressureRadius = 200;
  return Math.min(1, opponents
    .map(opp => Math.max(0, 1 - calculateDistance(player.position, opp) / pressureRadius))
    .reduce((sum, pressure) => sum + pressure, 0));
};

const calculateDefensiveSupport = (player: Player, context: TeamContext): number => {
  const defenseRadius = 150;
  return Math.min(1, context.teammates
    .map(pos => Math.max(0, 1 - calculateDistance(player.position, pos) / defenseRadius))
    .reduce((sum, support) => sum + support, 0) / 3);
};

const calculateSupportPositioning = (player: Player, teammates: Position[], ball: Ball): number => {
  const supportRadius = 200;
  const ballDist = calculateDistance(player.position, ball.position);
  const teammateSupport = teammates
    .map(pos => Math.max(0, 1 - calculateDistance(player.position, pos) / supportRadius))
    .reduce((sum, support) => sum + support, 0);
  return Math.min(1, (teammateSupport + (1 - Math.min(1, ballDist / 400))) / 3);
};

const calculatePressingEfficiency = (player: Player, ball: Ball, context: TeamContext): number => {
  const pressureRadius = 150;
  const ballDist = calculateDistance(player.position, ball.position);
  return Math.max(0, 1 - Math.min(1, ballDist / pressureRadius));
};

const calculateCoverShadow = (player: Player, context: TeamContext): number => {
  const shadowRadius = 100;
  return Math.min(1, context.opponents
    .map(pos => Math.max(0, 1 - calculateDistance(player.position, pos) / shadowRadius))
    .reduce((sum, shadow) => sum + shadow, 0) / 2);
};

const calculateCounterAttackPotential = (player: Player, ball: Ball, context: TeamContext): number => {
  const ballDist = calculateDistance(player.position, ball.position);
  const goalDist = calculateDistance(player.position, context.opponentGoal);
  return Math.max(0, 1 - ((ballDist / 400 + goalDist / 800) / 2));
};

const calculateRecoveryPosition = (player: Player, ball: Ball, context: TeamContext): number => {
  const distToOwnGoal = calculateDistance(player.position, context.ownGoal);
  const distToBall = calculateDistance(player.position, ball.position);
  return Math.max(0, 1 - ((distToOwnGoal / 800 + distToBall / 400) / 2));
};

const calculateTransitionSpeed = (player: Player, ball: Ball): number => {
  const ballDist = calculateDistance(player.position, ball.position);
  return Math.max(0, 1 - ballDist / 400);
};
