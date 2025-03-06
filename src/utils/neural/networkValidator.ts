
import * as brain from 'brain.js';
import { NeuralNet, NeuralInput, NeuralOutput, Player } from '../../types/football';
import { isNetworkValid } from '../neuralHelpers';
import { createSpecializedNetwork } from '../specializedNetworks';

/**
 * Validates and ensures a player's neural network is functional.
 * If the main network is invalid, attempts to recover it from specialized networks
 * or creates a new one.
 */
export const validatePlayerBrain = (player: Player): Player => {
  if (!player.brain || !player.brain.net || !isNetworkValid(player.brain.net)) {
    console.warn(`Invalid brain detected for ${player.team} ${player.role} #${player.id}, attempting recovery`);
    
    // Try to recover from specialized networks
    if (player.brain?.specializedNetworks && player.brain.specializedNetworks.length > 0) {
      const validNetwork = player.brain.specializedNetworks.find(network => 
        network && network.net && isNetworkValid(network.net)
      );
      
      if (validNetwork) {
        console.log(`Recovered brain for ${player.team} ${player.role} using ${validNetwork.type} network`);
        return {
          ...player,
          brain: {
            ...player.brain,
            net: validNetwork.net,
            lastOutput: player.brain.lastOutput || { x: 0, y: 0 }
          }
        };
      }
    }
    
    // If no valid specialized network, create a new one for general purposes
    const generalNetwork = createSpecializedNetwork('general');
    
    if (isNetworkValid(generalNetwork.net)) {
      console.log(`Created new brain for ${player.team} ${player.role}`);
      return {
        ...player,
        brain: {
          ...player.brain,
          net: generalNetwork.net,
          lastOutput: player.brain.lastOutput || { x: 0, y: 0 },
          lastAction: 'move'
        }
      };
    }
  }
  
  return player;
};

/**
 * Enhances a player's brain with specialized tactical networks.
 * If specialized networks are missing, creates them.
 */
export const enhanceTacticalNetworks = (player: Player): Player => {
  if (!player.brain) return player;
  
  // Check if player already has specialized networks
  if (!player.brain.specializedNetworks || player.brain.specializedNetworks.length === 0) {
    console.log(`Adding specialized tactical networks to ${player.team} ${player.role} #${player.id}`);
    
    const specializations = ['general', 'attacking', 'defending', 'possession', 'transition'];
    const specializedNetworks = specializations.map(type => 
      createSpecializedNetwork(type as any)
    ).filter(network => isNetworkValid(network.net));
    
    return {
      ...player,
      brain: {
        ...player.brain,
        specializedNetworks,
        currentSpecialization: 'general'
      }
    };
  }
  
  // Ensure all specialized networks are valid, remove invalid ones
  const validNetworks = player.brain.specializedNetworks.filter(network => 
    network && network.net && isNetworkValid(network.net)
  );
  
  if (validNetworks.length < player.brain.specializedNetworks.length) {
    console.log(`Removed ${player.brain.specializedNetworks.length - validNetworks.length} invalid networks from ${player.team} ${player.role}`);
    
    // Add missing network types
    const existingTypes = validNetworks.map(n => n.type);
    const missingTypes = ['general', 'attacking', 'defending', 'possession', 'transition']
      .filter(type => !existingTypes.includes(type as any));
    
    if (missingTypes.length > 0) {
      const newNetworks = missingTypes.map(type => 
        createSpecializedNetwork(type as any)
      ).filter(network => isNetworkValid(network.net));
      
      validNetworks.push(...newNetworks);
    }
    
    return {
      ...player,
      brain: {
        ...player.brain,
        specializedNetworks: validNetworks
      }
    };
  }
  
  return player;
};

/**
 * Creates a baseline tactical input for the neural network.
 * This helps establish tactical context for decision-making.
 */
export const createTacticalInput = (
  player: Player,
  ballX: number,
  ballY: number,
  hasTeamPossession: boolean,
  isDefensiveThird: boolean,
  isAttackingThird: boolean,
  teammateDensity: number = 0.5,
  opponentDensity: number = 0.5
): NeuralInput => {
  // Base tactical values depending on player role
  const tacticalRoleValue = player.role === 'goalkeeper' ? 0.2 :
                            player.role === 'defender' ? 0.6 :
                            player.role === 'midfielder' ? 0.8 : 0.7;
  
  // Adjust values based on field position and game state
  const defensiveFocus = isDefensiveThird && !hasTeamPossession ? 0.8 : 0.4;
  const attackingFocus = isAttackingThird && hasTeamPossession ? 0.8 : 0.4;
  const possessionFocus = hasTeamPossession ? 0.7 : 0.3;
  
  return {
    ballX,
    ballY,
    playerX: player.position.x / 800,
    playerY: player.position.y / 600,
    ballVelocityX: 0,
    ballVelocityY: 0,
    distanceToGoal: isAttackingThird ? 0.3 : 0.7,
    angleToGoal: 0,
    nearestTeammateDistance: 0.5,
    nearestTeammateAngle: 0,
    nearestOpponentDistance: 0.5,
    nearestOpponentAngle: 0,
    isInShootingRange: isAttackingThird ? 1 : 0,
    isInPassingRange: 1,
    isDefendingRequired: isDefensiveThird ? 1 : 0,
    distanceToOwnGoal: isDefensiveThird ? 0.3 : 0.7,
    angleToOwnGoal: 0,
    isFacingOwnGoal: 0,
    isDangerousPosition: isDefensiveThird && opponentDensity > 0.7 ? 1 : 0,
    isBetweenBallAndOwnGoal: 0,
    teamElo: player.teamElo ? player.teamElo / 3000 : 0.5,
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
    shootingQuality: isAttackingThird ? 0.7 : 0.3,
    
    // Enhanced tactical metrics for better positional decision-making
    zoneControl: hasTeamPossession ? 0.7 : 0.3,
    passingLanesQuality: possessionFocus,
    spaceCreation: possessionFocus,
    defensiveSupport: defensiveFocus,
    pressureIndex: opponentDensity,
    tacticalRole: tacticalRoleValue,
    supportPositioning: 0.5,
    pressingEfficiency: defensiveFocus,
    coverShadow: defensiveFocus,
    verticalSpacing: 0.5,
    horizontalSpacing: 0.5,
    territorialControl: hasTeamPossession ? 0.7 : 0.3,
    counterAttackPotential: !isDefensiveThird && !hasTeamPossession ? 0.8 : 0.2,
    pressureResistance: possessionFocus,
    recoveryPosition: 0.5,
    transitionSpeed: 0.5
  };
};
