import { NeuralNet, Player, Position, NeuralInput } from '../../types/football';
import { createPlayerBrain } from '../neuralNetwork';
import * as brain from 'brain.js';

export const validatePlayerBrain = (player: Player): Player => {
  if (!player.brain) {
    console.log(`Creating new brain for ${player.team} ${player.role} #${player.id}`);
    return {
      ...player,
      brain: createPlayerBrain()
    };
  }

  if (!player.brain.net) {
    console.log(`Creating network for existing brain ${player.team} ${player.role} #${player.id}`);
    const newBrain = createPlayerBrain();
    return {
      ...player,
      brain: {
        ...player.brain,
        net: newBrain.net,
        lastOutput: player.brain.lastOutput || { x: 0, y: 0 },
        lastAction: player.brain.lastAction || 'move'
      }
    };
  }

  try {
    const testInput = createBasicTestInput();
    
    if (!player.brain.net || typeof player.brain.net.run !== 'function') {
      console.log(`Invalid network detected for ${player.team} ${player.role} #${player.id}: missing run function, creating new one`);
      throw new Error('Invalid network: missing or run function not available');
    }
    
    const output = player.brain.net.run(testInput);
    
    if (!output || typeof output.moveX !== 'number' || typeof output.moveY !== 'number') {
      console.log(`Invalid network output for ${player.team} ${player.role} #${player.id}, creating new one`);
      throw new Error('Invalid network output structure');
    }
    
    return player;
  } catch (error) {
    console.warn(`Invalid network detected for ${player.team} ${player.role} #${player.id}, creating new one: ${error}`);
    
    const newBrain = createPlayerBrain();
    return {
      ...player,
      brain: {
        ...player.brain,
        net: newBrain.net,
        lastOutput: player.brain.lastOutput || newBrain.lastOutput,
        lastAction: player.brain.lastAction || newBrain.lastAction
      }
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
    
    const testInput = createBasicTestInput();
    const output = net.run(testInput);
    return output && typeof output.moveX === 'number' && typeof output.moveY === 'number';
  } catch (error) {
    console.warn("Neural network validation failed:", error);
    return false;
  }
};

const createBasicTestInput = (): NeuralInput => {
  return {
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
    possessionDuration: 0,
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
    transitionSpeed: 0.5
  };
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
    
    if (hasTeamPossession) {
      input.recoveryPosition = 0.4;
      input.pressureIndex = 0.3;
      input.transitionSpeed = 0.8;
    } else if (isDefensiveThird) {
      input.recoveryPosition = 0.9;
      input.pressureIndex = 0.8;
      input.transitionSpeed = 0.5;
    }
  } else if (player.role === 'forward') {
    input.spaceCreation = 0.8;
    input.passingLanesQuality = 0.7;
    input.shootingQuality = isAttackingThird ? 0.9 : 0.5;
    input.counterAttackPotential = 0.8;
    input.pressureResistance = 0.7;
    
    if (isAttackingThird) {
      input.territorialControl = 0.7;
      input.supportPositioning = 0.8;
    }
  }
  
  return input;
};

export const shouldMakePassingRun = (
  player: Player,
  ballPosition: Position,
  hasTeamPossession: boolean,
  isAttackingThird: boolean
): boolean => {
  if (!hasTeamPossession) return false;
  
  if (player.role === 'forward') {
    return Math.random() > 0.6;
  } else if (player.role === 'midfielder' && isAttackingThird) {
    return Math.random() > 0.75;
  } else if (player.role === 'defender' && hasTeamPossession) {
    return Math.random() > 0.9;
  }
  
  return false;
};
