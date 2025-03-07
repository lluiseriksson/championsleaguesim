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

export const createSpecializedNetwork = (
  type: NetworkSpecialization,
  hiddenLayers: number[] = [16, 12, 8]
): SpecializedNeuralNet => {
  console.log(`Creating specialized network for: ${type}`);
  
  const config: any = {
    hiddenLayers,
    activation: 'leaky-relu',
    learningRate: 0.05,
    momentum: 0.1,
    errorThresh: 0.01
  };
  
  switch (type) {
    case 'attacking':
      config.hiddenLayers = [24, 20, 16, 10];
      config.learningRate = 0.06;
      config.momentum = 0.12;
      break;
    case 'defending':
      config.hiddenLayers = [20, 16, 12];
      config.learningRate = 0.04;
      config.momentum = 0.08;
      break;
    case 'possession':
      config.hiddenLayers = [22, 18, 14, 10];
      config.momentum = 0.15;
      config.learningRate = 0.05;
      break;
    case 'transition':
      config.hiddenLayers = [20, 16, 12];
      config.learningRate = 0.07;
      config.activation = 'relu';
      break;
    case 'setpiece':
      config.hiddenLayers = [18, 14, 10];
      config.learningRate = 0.04;
      config.momentum = 0.1;
      break;
    case 'selector':
      config.hiddenLayers = [16, 12, 8];
      config.activation = 'sigmoid';
      config.learningRate = 0.03;
      break;
    case 'meta':
      config.hiddenLayers = [28, 20, 12];
      config.learningRate = 0.03;
      config.momentum = 0.2;
      config.activation = 'leaky-relu';
      break;
    default:
      config.hiddenLayers = [20, 16, 12, 8];
      break;
  }
  
  const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>(config);
  
  const defaultInputs: NeuralInput[] = [];
  const defaultOutputs: NeuralOutput[] = [];
  
  for (let i = 0; i < 5; i++) {
    const input: NeuralInput = {
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
      playerId: Math.random(),
      playerRoleEncoding: Math.random(),
      playerTeamId: Math.random() > 0.5 ? 1 : 0,
      playerPositionalRole: Math.random()
    };
    
    const output: NeuralOutput = {
      moveX: 0.5,
      moveY: 0.5,
      shootBall: 0,
      passBall: 0,
      intercept: 0
    };
    
    switch (type) {
      case 'attacking':
        output.moveX = 0.7;
        output.shootBall = 0.3;
        break;
      case 'defending':
        output.moveX = 0.3;
        output.intercept = 0.3;
        break;
      case 'possession':
        output.passBall = 0.3;
        break;
      case 'transition':
        output.moveX = Math.random() > 0.5 ? 0.7 : 0.3;
        output.moveY = Math.random() > 0.5 ? 0.7 : 0.3;
        break;
      case 'selector':
        output.moveX = 0.5;
        output.moveY = 0.5;
        break;
    }
    
    defaultInputs.push(input);
    defaultOutputs.push(output);
  }
  
  try {
    net.train(defaultInputs.map((input, i) => ({
      input,
      output: defaultOutputs[i]
    })), {
      iterations: 100,
      errorThresh: 0.01,
      log: false
    });
    
    console.log(`Successfully initialized ${type} specialized network`);
  } catch (error) {
    console.error(`Error initializing ${type} specialized network:`, error);
  }
  
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

export const initializeSpecializedBrain = (): NeuralNet => {
  const brain = createPlayerBrain();
  
  const specializations: NetworkSpecialization[] = [
    'general',
    'attacking',
    'defending',
    'possession',
    'transition',
    'setpiece'
  ];
  
  const specializedNetworks = specializations.map(type => 
    createSpecializedNetwork(type)
  );
  
  const selectorNetwork = createSpecializedNetwork('selector', [16, 12, 8]);
  const metaNetwork = createSpecializedNetwork('meta', [28, 20, 12]);
  
  const validatedNetworks = specializedNetworks.filter(network => 
    isNetworkValid(network.net)
  );
  
  if (validatedNetworks.length < specializedNetworks.length) {
    console.warn(`Only ${validatedNetworks.length} of ${specializedNetworks.length} specialized networks were valid`);
  }
  
  return {
    ...brain,
    specializedNetworks: validatedNetworks,
    selectorNetwork: isNetworkValid(selectorNetwork.net) ? selectorNetwork : undefined,
    metaNetwork: isNetworkValid(metaNetwork.net) ? metaNetwork : undefined,
    currentSpecialization: 'general'
  };
};

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
  const playerX = playerPosition.x / PITCH_WIDTH;
  
  const isDefensiveThird = playerX < 0.33;
  const isMiddleThird = playerX >= 0.33 && playerX <= 0.66;
  const isAttackingThird = playerX > 0.66;
  
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
  
  const isTransitioning = recentActions.length >= 2 && 
    recentActions.slice(-2).some(action => 
      action.action === 'intercept' || action.action === 'pass'
    );
  
  const defensivePressure = (opponentDensity * 0.7) + 
    ((1 - distanceToOwnGoal) * 0.3);
  
  return {
    isDefensiveThird,
    isMiddleThird,
    isAttackingThird,
    hasTeamPossession,
    isSetPiece: false,
    isTransitioning,
    distanceToBall,
    distanceToOwnGoal,
    distanceToOpponentGoal,
    defensivePressure
  };
};

export const selectSpecializedNetwork = (
  brain: NeuralNet,
  situationContext: SituationContext
): NetworkSpecialization => {
  if (!brain.specializedNetworks || brain.specializedNetworks.length === 0) {
    return 'general';
  }
  
  if (brain.selectorNetwork && isNetworkValid(brain.selectorNetwork.net)) {
    try {
      const input: NeuralInput = {
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
        opponentDensity: 0.5,
        shootingAngle: 0.5,
        shootingQuality: situationContext.isAttackingThird ? 0.7 : 0.3,
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

      const situationData = {
        isDefensiveThird: situationContext.isDefensiveThird ? 1 : 0,
        isMiddleThird: situationContext.isMiddleThird ? 1 : 0,
        isAttackingThird: situationContext.isAttackingThird ? 1 : 0,
        hasTeamPossession: situationContext.hasTeamPossession ? 1 : 0,
        isTransitioning: situationContext.isTransitioning ? 1 : 0,
        defensivePressure: situationContext.defensivePressure
      };
      
      const output = brain.selectorNetwork.net.run({
        ...input,
        ...situationData
      } as any);
      
      const networkChoices = [
        { type: 'general', weight: 0.2 },
        { type: 'attacking', weight: (situationContext.isAttackingThird ? 0.6 : 0.1) + (situationContext.hasTeamPossession ? 0.2 : 0) },
        { type: 'defending', weight: (situationContext.isDefensiveThird ? 0.6 : 0.1) + (!situationContext.hasTeamPossession ? 0.2 : 0) + (situationContext.defensivePressure * 0.2) },
        { type: 'possession', weight: (situationContext.hasTeamPossession ? 0.5 : 0.1) + (situationContext.isMiddleThird ? 0.2 : 0) },
        { type: 'transition', weight: (situationContext.isTransitioning ? 0.7 : 0.1) + (Math.abs(0.5 - situationContext.distanceToBall) * 0.2) },
        { type: 'setpiece', weight: situationContext.isSetPiece ? 0.9 : 0.05 }
      ];
      
      let bestType: NetworkSpecialization = 'general';
      let bestScore = -1;
      
      for (const choice of networkChoices) {
        const network = brain.specializedNetworks.find(n => n.type === choice.type);
        
        if (!network || !isNetworkValid(network.net)) {
          continue;
        }
        
        const baseScore = output.moveX * choice.weight;
        const netPerformance = network.performance.situationSuccess || 0.5;
        
        const score = (baseScore * 0.5) + (choice.weight * 0.3) + (netPerformance * 0.2);
        
        if (score > bestScore) {
          bestScore = score;
          bestType = choice.type as NetworkSpecialization;
        }
      }
      
      console.log(`Selected ${bestType} network (score: ${bestScore.toFixed(2)}) for situation: ${
        situationContext.isDefensiveThird ? 'defensive' : 
        situationContext.isAttackingThird ? 'attacking' : 'midfield'
      } third, ${situationContext.hasTeamPossession ? 'has' : 'no'} possession`);
      
      return bestType;
    } catch (error) {
      console.warn('Error using selector network:', error);
    }
  }
  
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

export const getSpecializedNetwork = (
  brain: NeuralNet,
  type: NetworkSpecialization
): brain.NeuralNetwork<NeuralInput, NeuralOutput> => {
  if (!brain.specializedNetworks) {
    return brain.net;
  }
  
  const specialized = brain.specializedNetworks.find(n => n.type === type);
  
  if (specialized && isNetworkValid(specialized.net)) {
    return specialized.net;
  }
  
  console.warn(`Specialized network ${type} is invalid, using general network instead`);
  return brain.net;
};

export const combineSpecializedOutputs = (
  brain: NeuralNet,
  situationContext: SituationContext,
  inputs: NeuralInput
): NeuralOutput => {
  if (!brain.specializedNetworks || !brain.metaNetwork) {
    return brain.net.run(inputs);
  }
  
  try {
    const outputs = brain.specializedNetworks.map(network => ({
      type: network.type,
      output: network.net.run(inputs),
      confidence: calculateNetworkConfidence(network, situationContext)
    }));
    
    if (brain.metaNetwork && isNetworkValid(brain.metaNetwork.net)) {
      const metaInputs = {
        ...inputs,
        isDefensiveThird: situationContext.isDefensiveThird ? 1 : 0,
        isAttackingThird: situationContext.isAttackingThird ? 1 : 0,
        hasTeamPossession: situationContext.hasTeamPossession ? 1 : 0,
        generalConfidence: outputs.find(o => o.type === 'general')?.confidence || 0.5,
        attackingConfidence: outputs.find(o => o.type === 'attacking')?.confidence || 0.5,
        defendingConfidence: outputs.find(o => o.type === 'defending')?.confidence || 0.5,
        possessionConfidence: outputs.find(o => o.type === 'possession')?.confidence || 0.5,
        transitionConfidence: outputs.find(o => o.type === 'transition')?.confidence || 0.5
      } as any;
      
      return brain.metaNetwork.net.run(metaInputs);
    }
    
    const totalConfidence = outputs.reduce((sum, o) => sum + o.confidence, 0);
    
    const result: NeuralOutput = {
      moveX: 0,
      moveY: 0,
      shootBall: 0,
      passBall: 0,
      intercept: 0
    };
    
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
    return brain.net.run(inputs);
  }
};

const calculateNetworkConfidence = (
  network: SpecializedNeuralNet, 
  situation: SituationContext
): number => {
  let baseConfidence = network.performance.situationSuccess;
  
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
    default:
      baseConfidence *= 0.8;
  }
  
  return Math.max(0.1, Math.min(1.0, baseConfidence));
};

export const updateSpecializedNetworks = (
  brain: NeuralNet,
  action: string,
  success: boolean,
  situationContext: SituationContext
): NeuralNet => {
  if (!brain.specializedNetworks) {
    return brain;
  }
  
  const updatedNetworks = brain.specializedNetworks.map(network => {
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
          situationSuccess: overallSuccess,
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
