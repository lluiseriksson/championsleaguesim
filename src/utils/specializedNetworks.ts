
import * as brain from 'brain.js';
import { 
  NeuralNet, 
  NeuralInput, 
  NeuralOutput, 
  SpecializedNeuralNet,
  NetworkSpecialization,
  SituationContext,
  Position,
  PITCH_WIDTH,
  PITCH_HEIGHT
} from '../types/football';
import { createPlayerBrain } from './neuralNetwork';
import { isNetworkValid } from './neuralHelpers';

// Create a specialized neural network
export const createSpecializedNetwork = (
  type: NetworkSpecialization,
  hiddenLayers: number[] = [16, 12, 8]
): SpecializedNeuralNet => {
  console.log(`Creating specialized network for: ${type}`);
  
  // Configure network based on specialization
  const config: any = {
    hiddenLayers,
    activation: 'leaky-relu',
    learningRate: 0.05,
    momentum: 0.1
  };
  
  // Different configurations based on specialization
  switch (type) {
    case 'attacking':
      config.hiddenLayers = [20, 16, 12, 8];
      config.learningRate = 0.06;
      break;
    case 'defending':
      config.hiddenLayers = [16, 14, 10];
      config.learningRate = 0.04;
      break;
    case 'possession':
      config.hiddenLayers = [18, 14, 10, 6];
      config.momentum = 0.15;
      break;
    case 'transition':
      config.hiddenLayers = [16, 12, 8];
      config.learningRate = 0.07;
      break;
    case 'setpiece':
      config.hiddenLayers = [14, 10, 6];
      config.learningRate = 0.04;
      break;
    case 'selector':
      config.hiddenLayers = [12, 8, 6];
      config.activation = 'sigmoid';
      break;
    case 'meta':
      config.hiddenLayers = [24, 16, 8];
      config.learningRate = 0.03;
      config.momentum = 0.2;
      break;
    default: // general
      // Use default configuration
      break;
  }
  
  const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>(config);
  
  return {
    type,
    net,
    confidence: 0.5,
    performance: {
      overallSuccess: 0.5,
      situationSuccess: 0.5,
      usageCount: 0
    }
  };
};

// Initialize a brain with specialized networks
export const initializeSpecializedBrain = (): NeuralNet => {
  // Start with a standard neural network
  const brain = createPlayerBrain();
  
  // Add specialized networks
  const specializations: NetworkSpecialization[] = [
    'general',
    'attacking',
    'defending',
    'possession',
    'transition',
    'setpiece'
  ];
  
  // Create specialized networks
  const specializedNetworks = specializations.map(type => 
    createSpecializedNetwork(type)
  );
  
  // Create selector network (decides which specialized network to use)
  const selectorNetwork = createSpecializedNetwork('selector', [10, 8, 6]);
  
  // Create meta network (combines outputs from specialized networks)
  const metaNetwork = createSpecializedNetwork('meta', [24, 16, 8]);
  
  // Add these to the main brain
  return {
    ...brain,
    specializedNetworks,
    selectorNetwork,
    metaNetwork,
    currentSpecialization: 'general'
  };
};

// Determine the current situation based on player and game context
export const analyzeSituation = (
  playerPosition: Position,
  ballPosition: Position,
  ownGoal: Position,
  opponentGoal: Position,
  hasTeamPossession: boolean,
  teammateDensity: number = 0.5,
  opponentDensity: number = 0.5,
  recentActions: Array<{ action: string; success: boolean; }> = []
): SituationContext => {
  // Normalize positions
  const playerX = playerPosition.x / PITCH_WIDTH;
  
  // Determine thirds of the field
  const isDefensiveThird = playerX < 0.33;
  const isMiddleThird = playerX >= 0.33 && playerX <= 0.66;
  const isAttackingThird = playerX > 0.66;
  
  // Calculate distances
  const distanceToBall = Math.sqrt(
    Math.pow(playerPosition.x - ballPosition.x, 2) + 
    Math.pow(playerPosition.y - ballPosition.y, 2)
  ) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  
  const distanceToOwnGoal = Math.sqrt(
    Math.pow(playerPosition.x - ownGoal.x, 2) + 
    Math.pow(playerPosition.y - ownGoal.y, 2)
  ) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  
  const distanceToOpponentGoal = Math.sqrt(
    Math.pow(playerPosition.x - opponentGoal.x, 2) + 
    Math.pow(playerPosition.y - opponentGoal.y, 2)
  ) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT);
  
  // Determine if transitioning based on recent actions
  const isTransitioning = recentActions.length >= 2 && 
    recentActions.slice(-2).some(action => 
      action.action === 'intercept' || action.action === 'pass'
    );
  
  // Determine defensive pressure based on opponent density and distance to own goal
  const defensivePressure = (opponentDensity * 0.7) + 
    ((1 - distanceToOwnGoal) * 0.3);
  
  return {
    isDefensiveThird,
    isMiddleThird,
    isAttackingThird,
    hasTeamPossession,
    isSetPiece: false, // Would need additional game state info
    isTransitioning,
    distanceToBall,
    distanceToOwnGoal,
    distanceToOpponentGoal,
    defensivePressure
  };
};

// Select the most appropriate specialized network based on situation
export const selectSpecializedNetwork = (
  brain: NeuralNet,
  situationContext: SituationContext
): NetworkSpecialization => {
  if (!brain.specializedNetworks || brain.specializedNetworks.length === 0) {
    return 'general';
  }
  
  // If we have a selector network, use it
  if (brain.selectorNetwork && isNetworkValid(brain.selectorNetwork.net)) {
    try {
      // Map situation context to neural input
      const input: NeuralInput = {
        // Use standard fields with placeholder values
        ballX: 0.5,
        ballY: 0.5,
        playerX: 0.5,
        playerY: 0.5,
        ballVelocityX: 0,
        ballVelocityY: 0,
        distanceToGoal: situationContext.distanceToOpponentGoal,
        angleToGoal: 0,
        nearestTeammateDistance: 0.5,
        nearestTeammateAngle: 0,
        nearestOpponentDistance: 0.5,
        nearestOpponentAngle: 0,
        isInShootingRange: 0,
        isInPassingRange: 0,
        isDefendingRequired: situationContext.isDefensiveThird ? 1 : 0,
        distanceToOwnGoal: situationContext.distanceToOwnGoal,
        angleToOwnGoal: 0,
        isFacingOwnGoal: 0,
        isDangerousPosition: situationContext.defensivePressure > 0.7 ? 1 : 0,
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
        opponentDensity: 0.5
      };
      
      // Add situation specific data
      const situationData = {
        isDefensiveThird: situationContext.isDefensiveThird ? 1 : 0,
        isMiddleThird: situationContext.isMiddleThird ? 1 : 0,
        isAttackingThird: situationContext.isAttackingThird ? 1 : 0,
        hasTeamPossession: situationContext.hasTeamPossession ? 1 : 0,
        isTransitioning: situationContext.isTransitioning ? 1 : 0,
        defensivePressure: situationContext.defensivePressure
      };
      
      // Run selector network
      const output = brain.selectorNetwork.net.run({
        ...input,
        ...situationData
      } as any);
      
      // Convert output to network selection
      // Assuming outputs map to network types
      const networkChoices = [
        { type: 'general', weight: 0.2 },
        { type: 'attacking', weight: situationContext.isAttackingThird ? 0.8 : 0.1 },
        { type: 'defending', weight: situationContext.isDefensiveThird ? 0.8 : 0.1 },
        { type: 'possession', weight: situationContext.hasTeamPossession ? 0.7 : 0.1 },
        { type: 'transition', weight: situationContext.isTransitioning ? 0.8 : 0.1 },
        { type: 'setpiece', weight: situationContext.isSetPiece ? 0.9 : 0.05 }
      ];
      
      // Apply situational bias and find best network
      let bestType: NetworkSpecialization = 'general';
      let bestScore = -1;
      
      for (const choice of networkChoices) {
        const baseScore = output.moveX * choice.weight; // Simplified scoring
        const netPerformance = brain.specializedNetworks.find(n => n.type === choice.type)?.performance.situationSuccess || 0.5;
        const score = (baseScore * 0.7) + (netPerformance * 0.3);
        
        if (score > bestScore) {
          bestScore = score;
          bestType = choice.type as NetworkSpecialization;
        }
      }
      
      return bestType;
    } catch (error) {
      console.warn('Error using selector network:', error);
      // Fallback to rules-based selection
    }
  }
  
  // Rules-based fallback selection
  if (situationContext.isDefensiveThird && !situationContext.hasTeamPossession) {
    return 'defending';
  } else if (situationContext.isAttackingThird && situationContext.hasTeamPossession) {
    return 'attacking';
  } else if (situationContext.hasTeamPossession && situationContext.isMiddleThird) {
    return 'possession';
  } else if (situationContext.isTransitioning) {
    return 'transition';
  } else if (situationContext.isSetPiece) {
    return 'setpiece';
  }
  
  return 'general';
};

// Get a specific specialized network from the brain
export const getSpecializedNetwork = (
  brain: NeuralNet,
  type: NetworkSpecialization
): brain.NeuralNetwork<NeuralInput, NeuralOutput> => {
  if (!brain.specializedNetworks) {
    return brain.net;
  }
  
  const specialized = brain.specializedNetworks.find(n => n.type === type);
  return specialized && isNetworkValid(specialized.net) ? specialized.net : brain.net;
};

// Combine outputs from multiple specialized networks
export const combineSpecializedOutputs = (
  brain: NeuralNet,
  situationContext: SituationContext,
  inputs: NeuralInput
): NeuralOutput => {
  if (!brain.specializedNetworks || !brain.metaNetwork) {
    // If no specialized networks, use the main network
    return brain.net.run(inputs);
  }
  
  try {
    // Get outputs from all specialized networks
    const outputs = brain.specializedNetworks.map(network => ({
      type: network.type,
      output: network.net.run(inputs),
      confidence: calculateNetworkConfidence(network, situationContext)
    }));
    
    // If meta-network is available and valid, use it to combine outputs
    if (brain.metaNetwork && isNetworkValid(brain.metaNetwork.net)) {
      // Transform outputs to inputs for meta-network
      const metaInputs = {
        ...inputs,
        // Add situation context and network confidences as inputs
        isDefensiveThird: situationContext.isDefensiveThird ? 1 : 0,
        isAttackingThird: situationContext.isAttackingThird ? 1 : 0,
        hasTeamPossession: situationContext.hasTeamPossession ? 1 : 0,
        generalConfidence: outputs.find(o => o.type === 'general')?.confidence || 0.5,
        attackingConfidence: outputs.find(o => o.type === 'attacking')?.confidence || 0.5,
        defendingConfidence: outputs.find(o => o.type === 'defending')?.confidence || 0.5,
        possessionConfidence: outputs.find(o => o.type === 'possession')?.confidence || 0.5,
        transitionConfidence: outputs.find(o => o.type === 'transition')?.confidence || 0.5
      } as any;
      
      // Use meta-network to get final output
      return brain.metaNetwork.net.run(metaInputs);
    }
    
    // Fallback: weighted average based on network confidence
    const totalConfidence = outputs.reduce((sum, o) => sum + o.confidence, 0);
    
    // Initialize result with zeros
    const result: NeuralOutput = {
      moveX: 0,
      moveY: 0,
      shootBall: 0,
      passBall: 0,
      intercept: 0
    };
    
    // Calculate weighted average
    outputs.forEach(({ output, confidence }) => {
      const weight = confidence / totalConfidence;
      result.moveX += output.moveX * weight;
      result.moveY += output.moveY * weight;
      result.shootBall += output.shootBall * weight;
      result.passBall += output.passBall * weight;
      result.intercept += output.intercept * weight;
    });
    
    return result;
  } catch (error) {
    console.warn('Error combining specialized outputs:', error);
    // Fallback to main network
    return brain.net.run(inputs);
  }
};

// Calculate how confident a specialized network should be in the current situation
const calculateNetworkConfidence = (
  network: SpecializedNeuralNet, 
  situation: SituationContext
): number => {
  let baseConfidence = network.performance.situationSuccess;
  
  // Adjust confidence based on situation match
  switch (network.type) {
    case 'attacking':
      baseConfidence *= situation.isAttackingThird ? 1.5 : 0.5;
      baseConfidence *= situation.hasTeamPossession ? 1.3 : 0.7;
      break;
    case 'defending':
      baseConfidence *= situation.isDefensiveThird ? 1.5 : 0.5;
      baseConfidence *= !situation.hasTeamPossession ? 1.3 : 0.7;
      break;
    case 'possession':
      baseConfidence *= situation.hasTeamPossession ? 1.5 : 0.4;
      baseConfidence *= situation.isMiddleThird ? 1.2 : 0.8;
      break;
    case 'transition':
      baseConfidence *= situation.isTransitioning ? 1.6 : 0.5;
      break;
    case 'setpiece':
      baseConfidence *= situation.isSetPiece ? 2.0 : 0.3;
      break;
    // General is always moderately confident
    default:
      baseConfidence *= 0.8;
  }
  
  // Normalize to 0-1 range
  return Math.max(0.1, Math.min(1.0, baseConfidence));
};

// Update the specialized network system based on action results
export const updateSpecializedNetworks = (
  brain: NeuralNet,
  action: string,
  success: boolean,
  situationContext: SituationContext
): NeuralNet => {
  if (!brain.specializedNetworks) {
    return brain;
  }
  
  // Create a new copy of specialized networks to update
  const updatedNetworks = brain.specializedNetworks.map(network => {
    // Only update the network that was used or affected by this action
    if (network.type === brain.currentSpecialization) {
      const usageCount = network.performance.usageCount + 1;
      const overallSuccess = (
        (network.performance.overallSuccess * network.performance.usageCount) + 
        (success ? 1 : 0)
      ) / usageCount;
      
      return {
        ...network,
        performance: {
          overallSuccess,
          situationSuccess: overallSuccess, // Simplified; could be more nuanced
          usageCount
        }
      };
    }
    return network;
  });
  
  return {
    ...brain,
    specializedNetworks: updatedNetworks,
    lastSituationContext: situationContext
  };
};
