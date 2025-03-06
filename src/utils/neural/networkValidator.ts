
import { NeuralNet, Player, Position, NeuralInput } from '../../types/football';
import { createPlayerBrain } from '../neuralCore';
import * as brain from 'brain.js';

export const validatePlayerBrain = (player: Player): Player => {
  if (!player.brain || !player.brain.net) {
    console.warn(`Creating new brain for ${player.team} ${player.role} #${player.id}`);
    return {
      ...player,
      brain: createPlayerBrain()
    };
  }

  try {
    const testInput = {
      ballX: 0.5,
      ballY: 0.5,
      playerX: 0.5,
      playerY: 0.5,
      distanceToGoal: 0.5,
      angleToGoal: 0.5,
      nearestTeammateDistance: 0.5,
      nearestTeammateAngle: 0.5,
      nearestOpponentDistance: 0.5,
      nearestOpponentAngle: 0.5,
      isInShootingRange: 0.5,
      isInPassingRange: 0.5,
      isDefendingRequired: 0.5,
      distanceToOwnGoal: 0.5,
      angleToOwnGoal: 0.5,
      isFacingOwnGoal: 0.5,
      isDangerousPosition: 0.5,
      isBetweenBallAndOwnGoal: 0.5,
      teamElo: 0.5,
      eloAdvantage: 0.5,
      gameTime: 0.5,
      scoreDifferential: 0.5,
      momentum: 0.5,
      formationCompactness: 0.5,
      formationWidth: 0.5,
      recentSuccessRate: 0.5,
      possessionDuration: 0.5,
      distanceFromFormationCenter: 0.5,
      isInFormationPosition: 0.5,
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
      ballVelocityX: 0.5,
      ballVelocityY: 0.5
    };
    
    if (!player.brain.net || typeof player.brain.net.run !== 'function') {
      throw new Error('Invalid network: missing or run function not available');
    }
    
    const output = player.brain.net.run(testInput);
    
    if (!output || typeof output.moveX !== 'number' || typeof output.moveY !== 'number') {
      throw new Error('Invalid network output structure');
    }
    
    return player;
  } catch (error) {
    console.warn(`Invalid network detected for ${player.team} ${player.role} #${player.id}, creating new one: ${error}`);
    return {
      ...player,
      brain: createPlayerBrain()
    };
  }
};

export const isNetworkValid = (net: brain.NeuralNetwork<any, any> | null): boolean => {
  if (!net) return false;
  
  try {
    if (typeof net.run !== 'function') {
      console.warn("Neural network is missing run function");
      return false;
    }
    
    const testInput = {
      ballX: 0.5,
      ballY: 0.5,
      playerX: 0.5,
      playerY: 0.5,
      distanceToGoal: 0.5,
      angleToGoal: 0.5,
      nearestTeammateDistance: 0.5,
      nearestTeammateAngle: 0.5,
      nearestOpponentDistance: 0.5,
      nearestOpponentAngle: 0.5,
      isInShootingRange: 0.5,
      isInPassingRange: 0.5,
      isDefendingRequired: 0.5,
      distanceToOwnGoal: 0.5,
      angleToOwnGoal: 0.5,
      isFacingOwnGoal: 0.5,
      isDangerousPosition: 0.5,
      isBetweenBallAndOwnGoal: 0.5,
      teamElo: 0.5,
      eloAdvantage: 0.5,
      gameTime: 0.5,
      scoreDifferential: 0.5,
      momentum: 0.5,
      formationCompactness: 0.5,
      formationWidth: 0.5,
      recentSuccessRate: 0.5,
      possessionDuration: 0.5,
      distanceFromFormationCenter: 0.5,
      isInFormationPosition: 0.5,
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
      ballVelocityX: 0.5,
      ballVelocityY: 0.5
    };
    
    const output = net.run(testInput);
    return output && typeof output.moveX === 'number' && typeof output.moveY === 'number';
  } catch (error) {
    console.warn("Neural network validation failed:", error);
    return false;
  }
};

export const enhanceTacticalNetworks = (player: Player): Player => {
  const validatedPlayer = validatePlayerBrain(player);
  
  if (player.role === 'defender' && validatedPlayer.brain && validatedPlayer.brain.net) {
    console.log(`Enhanced tactical networks for ${player.team} defender #${player.id}`);
  }
  
  return validatedPlayer;
};

export const createTacticalInput = (
  player: Player,
  normalizedBallX: number,
  normalizedBallY: number,
  hasTeamPossession: boolean,
  isDefensiveThird: boolean,
  isAttackingThird: boolean,
  teammateDensity: number,
  opponentDensity: number
): NeuralInput => {
  const input: NeuralInput = {
    ballX: normalizedBallX,
    ballY: normalizedBallY,
    playerX: player.position.x / 800,
    playerY: player.position.y / 600,
    ballVelocityX: 0,
    ballVelocityY: 0,
    distanceToGoal: 0.5,
    angleToGoal: 0,
    nearestTeammateDistance: 0.5,
    nearestTeammateAngle: 0,
    nearestOpponentDistance: 0.5,
    nearestOpponentAngle: 0,
    isInShootingRange: isAttackingThird ? 1 : 0,
    isInPassingRange: 1,
    isDefendingRequired: isDefensiveThird ? 1 : 0,
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
    possessionDuration: hasTeamPossession ? 0.5 : 0,
    distanceFromFormationCenter: 0.5,
    isInFormationPosition: 1,
    teammateDensity,
    opponentDensity,
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
    transitionSpeed: 0.5
  };
  
  if (player.role === 'defender') {
    input.zoneControl = 0.7;
    input.supportPositioning = 0.6;
    input.isBetweenBallAndOwnGoal = hasTeamPossession ? 0.3 : 0.8;
    input.counterAttackPotential = hasTeamPossession ? 0.6 : 0.2;
    input.pressingEfficiency = 0.7;
    input.coverShadow = 0.7;
    input.verticalSpacing = 0.6;
    input.horizontalSpacing = 0.7;
    
    // NEW: Dynamic defender behavior based on game situation
    if (hasTeamPossession) {
      input.recoveryPosition = 0.4; // Less defensive when team has possession
      input.pressureIndex = 0.3;    // Less pressing when team has possession
      input.transitionSpeed = 0.8;  // Faster transitions for counters
    } else if (isDefensiveThird) {
      input.recoveryPosition = 0.9; // Very defensive in own third
      input.pressureIndex = 0.8;    // High pressing when defending own third
      input.transitionSpeed = 0.5;  // Slower, more cautious transitions
    }
  } else if (player.role === 'forward') {
    // NEW: Enhanced forward behaviors
    input.spaceCreation = 0.8;              // Forwards prioritize finding space
    input.passingLanesQuality = 0.7;        // Better passing awareness
    input.shootingQuality = isAttackingThird ? 0.9 : 0.5; // Better shooting in attacking third
    input.counterAttackPotential = 0.8;     // High counter attack awareness
    input.pressureResistance = 0.7;         // Better under pressure
    
    if (isAttackingThird) {
      input.territorialControl = 0.7;       // Control space in attacking third
      input.supportPositioning = 0.8;       // Better positioning for receiving passes
    }
  }
  
  return input;
};

// NEW: Determine if a player should make a passing run
export const shouldMakePassingRun = (
  player: Player,
  ballPosition: Position,
  hasTeamPossession: boolean,
  isAttackingThird: boolean
): boolean => {
  // Only make runs in appropriate situations
  if (!hasTeamPossession) return false;
  
  if (player.role === 'forward') {
    // Forwards make runs more often
    return Math.random() > 0.6;
  } else if (player.role === 'midfielder' && isAttackingThird) {
    // Midfielders make runs in attacking third
    return Math.random() > 0.75;
  } else if (player.role === 'defender' && hasTeamPossession) {
    // Defenders occasionally make supporting runs when team has possession
    return Math.random() > 0.9;
  }
  
  return false;
};
