import { NeuralNet, Player } from '../../types/football';
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
    // Test if network can actually run
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
      transitionSpeed: 0.5
    };
    
    const output = player.brain.net.run(testInput);
    
    // Verify output structure
    if (!output || typeof output.moveX !== 'number' || typeof output.moveY !== 'number') {
      throw new Error('Invalid network output structure');
    }
    
    return player;
  } catch (error) {
    console.warn(`Invalid network detected for ${player.team} ${player.role} #${player.id}, creating new one`);
    return {
      ...player,
      brain: createPlayerBrain()
    };
  }
};

export const isNetworkValid = (net: brain.NeuralNetwork<any, any> | null): boolean => {
  if (!net) return false;
  
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
      transitionSpeed: 0.5
    };
    
    const output = net.run(testInput);
    return output && typeof output.moveX === 'number' && typeof output.moveY === 'number';
  } catch (error) {
    return false;
  }
};
