import * as brain from 'brain.js';
import { NeuralNet, Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createExperienceReplay } from './experienceReplay';
import { initializeSpecializedBrain } from './specializedNetworks';

export const createPlayerBrain = (): NeuralNet => {
  try {
    console.log("Creating new neural network...");
    
    const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
      hiddenLayers: [28, 24, 20, 16, 8],
      activation: 'leaky-relu',
      learningRate: 0.05,
      momentum: 0.1,
      binaryThresh: 0.5,
      errorThresh: 0.005
    });

    const trainingData = [];

    for (let i = 0; i < 20; i++) {
      const playerId = Math.random();
      const playerRoleEncoding = Math.random();
      const playerTeamId = Math.random() > 0.5 ? 1 : 0;
      const playerPositionalRole = Math.random();

      const input: NeuralInput = {
        ballX: Math.random(),
        ballY: Math.random(),
        playerX: Math.random(),
        playerY: Math.random(),
        ballVelocityX: (Math.random() * 2 - 1) / 20,
        ballVelocityY: (Math.random() * 2 - 1) / 20,
        distanceToGoal: Math.random(),
        angleToGoal: Math.random() * 2 - 1,
        nearestTeammateDistance: Math.random(),
        nearestTeammateAngle: Math.random() * 2 - 1,
        nearestOpponentDistance: Math.random(),
        nearestOpponentAngle: Math.random() * 2 - 1,
        isInShootingRange: Math.random() > 0.5 ? 1 : 0,
        isInPassingRange: Math.random() > 0.5 ? 1 : 0,
        isDefendingRequired: Math.random() > 0.5 ? 1 : 0,
        distanceToOwnGoal: Math.random(),
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: Math.random() > 0.8 ? 1 : 0,
        isDangerousPosition: Math.random() > 0.8 ? 1 : 0,
        isBetweenBallAndOwnGoal: Math.random() > 0.8 ? 1 : 0,
        teamElo: 0.5 + Math.random() * 0.3,
        eloAdvantage: Math.random() * 0.6 - 0.3,
        gameTime: Math.random(),
        scoreDifferential: Math.random() * 2 - 1,
        momentum: Math.random(),
        formationCompactness: Math.random(),
        formationWidth: Math.random(),
        recentSuccessRate: Math.random(),
        possessionDuration: Math.random(),
        distanceFromFormationCenter: Math.random(),
        isInFormationPosition: Math.random(),
        teammateDensity: Math.random(),
        opponentDensity: Math.random(),
        shootingAngle: Math.random(),
        shootingQuality: Math.random(),
        
        zoneControl: Math.random(),
        passingLanesQuality: Math.random(),
        spaceCreation: Math.random(),
        defensiveSupport: Math.random(),
        pressureIndex: Math.random(),
        tacticalRole: Math.random(),
        supportPositioning: Math.random(),
        pressingEfficiency: Math.random(),
        coverShadow: Math.random(),
        verticalSpacing: Math.random(),
        horizontalSpacing: Math.random(),
        territorialControl: Math.random(),
        counterAttackPotential: Math.random(),
        pressureResistance: Math.random(),
        recoveryPosition: Math.random(),
        transitionSpeed: Math.random(),
        
        playerId,
        playerRoleEncoding,
        playerTeamId,
        playerPositionalRole
      };

      const output: NeuralOutput = {
        moveX: 0.5 + (Math.random() - 0.5) * 0.4,
        moveY: 0.5 + (Math.random() - 0.5) * 0.4,
        shootBall: Math.random() > 0.8 ? 0.8 : 0.2,
        passBall: Math.random() > 0.8 ? 0.8 : 0.2,
        intercept: Math.random() > 0.8 ? 0.8 : 0.2
      };

      trainingData.push({ input, output });
    }

    for (let i = 0; i < 15; i++) {
      const playerId = Math.random();
      const playerRoleEncoding = 0.33;
      const playerTeamId = Math.random() > 0.5 ? 1 : 0;
      const playerPositionalRole = 0.2;

      const input: NeuralInput = {
        ballX: Math.random(),
        ballY: Math.random(),
        playerX: Math.random(),
        playerY: Math.random(),
        ballVelocityX: (Math.random() * 2 - 1) / 20,
        ballVelocityY: (Math.random() * 2 - 1) / 20,
        distanceToGoal: Math.random(),
        angleToGoal: Math.random() * 2 - 1,
        nearestTeammateDistance: Math.random(),
        nearestTeammateAngle: Math.random() * 2 - 1,
        nearestOpponentDistance: Math.random(),
        nearestOpponentAngle: Math.random() * 2 - 1,
        isInShootingRange: Math.random() > 0.5 ? 1 : 0,
        isInPassingRange: Math.random() > 0.5 ? 1 : 0,
        isDefendingRequired: Math.random() > 0.5 ? 1 : 0,
        distanceToOwnGoal: Math.random(),
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: Math.random() > 0.8 ? 1 : 0,
        isDangerousPosition: Math.random() > 0.8 ? 1 : 0,
        isBetweenBallAndOwnGoal: Math.random() > 0.8 ? 1 : 0,
        teamElo: 0.5 + Math.random() * 0.3,
        eloAdvantage: Math.random() * 0.6 - 0.3,
        gameTime: Math.random(),
        scoreDifferential: Math.random() * 2 - 1,
        momentum: Math.random(),
        formationCompactness: Math.random(),
        formationWidth: Math.random(),
        recentSuccessRate: Math.random(),
        possessionDuration: Math.random(),
        distanceFromFormationCenter: Math.random(),
        isInFormationPosition: Math.random(),
        teammateDensity: Math.random(),
        opponentDensity: Math.random(),
        shootingAngle: Math.random(),
        shootingQuality: Math.random(),
        
        zoneControl: Math.random(),
        passingLanesQuality: Math.random(),
        spaceCreation: Math.random(),
        defensiveSupport: Math.random(),
        pressureIndex: Math.random(),
        tacticalRole: Math.random(),
        supportPositioning: Math.random(),
        pressingEfficiency: Math.random(),
        coverShadow: Math.random(),
        verticalSpacing: Math.random(),
        horizontalSpacing: Math.random(),
        territorialControl: Math.random(),
        counterAttackPotential: Math.random(),
        pressureResistance: Math.random(),
        recoveryPosition: Math.random(),
        transitionSpeed: Math.random(),
        
        playerId,
        playerRoleEncoding,
        playerTeamId,
        playerPositionalRole
      };

      const output: NeuralOutput = {
        moveX: Math.random() > 0.5 ? 0.8 : 0.2,
        moveY: 0.5 + (Math.random() - 0.5) * 0.4,
        shootBall: 0,
        passBall: 0.8 + Math.random() * 0.2,
        intercept: Math.random() * 0.3
      };

      trainingData.push({ input, output });
    }

    for (let i = 0; i < 15; i++) {
      const playerId = Math.random();
      const playerRoleEncoding = 1.0;
      const playerTeamId = Math.random() > 0.5 ? 1 : 0;
      const playerPositionalRole = 0.8;

      const input: NeuralInput = {
        ballX: Math.random(),
        ballY: Math.random(),
        playerX: Math.random(),
        playerY: Math.random(),
        ballVelocityX: (Math.random() * 2 - 1) / 20,
        ballVelocityY: (Math.random() * 2 - 1) / 20,
        distanceToGoal: Math.random(),
        angleToGoal: Math.random() * 2 - 1,
        nearestTeammateDistance: Math.random(),
        nearestTeammateAngle: Math.random() * 2 - 1,
        nearestOpponentDistance: Math.random(),
        nearestOpponentAngle: Math.random() * 2 - 1,
        isInShootingRange: Math.random() > 0.5 ? 1 : 0,
        isInPassingRange: Math.random() > 0.5 ? 1 : 0,
        isDefendingRequired: Math.random() > 0.5 ? 1 : 0,
        distanceToOwnGoal: Math.random(),
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: Math.random() > 0.8 ? 1 : 0,
        isDangerousPosition: Math.random() > 0.8 ? 1 : 0,
        isBetweenBallAndOwnGoal: Math.random() > 0.8 ? 1 : 0,
        teamElo: 0.5 + Math.random() * 0.3,
        eloAdvantage: Math.random() * 0.6 - 0.3,
        gameTime: Math.random(),
        scoreDifferential: Math.random() * 2 - 1,
        momentum: Math.random(),
        formationCompactness: Math.random(),
        formationWidth: Math.random(),
        recentSuccessRate: Math.random(),
        possessionDuration: Math.random(),
        distanceFromFormationCenter: Math.random(),
        isInFormationPosition: Math.random(),
        teammateDensity: Math.random(),
        opponentDensity: Math.random(),
        shootingAngle: Math.random(),
        shootingQuality: Math.random(),
        
        zoneControl: Math.random(),
        passingLanesQuality: Math.random(),
        spaceCreation: Math.random(),
        defensiveSupport: Math.random(),
        pressureIndex: Math.random(),
        tacticalRole: Math.random(),
        supportPositioning: Math.random(),
        pressingEfficiency: Math.random(),
        coverShadow: Math.random(),
        verticalSpacing: Math.random(),
        horizontalSpacing: Math.random(),
        territorialControl: Math.random(),
        counterAttackPotential: Math.random(),
        pressureResistance: Math.random(),
        recoveryPosition: Math.random(),
        transitionSpeed: Math.random(),
        
        playerId,
        playerRoleEncoding,
        playerTeamId,
        playerPositionalRole
      };

      const output: NeuralOutput = {
        moveX: 0.8 + Math.random() * 0.2,
        moveY: 0.5 + (Math.random() - 0.5) * 0.2,
        shootBall: 0.8 + Math.random() * 0.2,
        passBall: Math.random() * 0.2,
        intercept: Math.random() * 0.1
      };

      trainingData.push({ input, output });
    }

    for (let i = 0; i < 15; i++) {
      const playerId = Math.random();
      const playerRoleEncoding = 0.66;
      const playerTeamId = Math.random() > 0.5 ? 1 : 0;
      const playerPositionalRole = 0.5;

      const input: NeuralInput = {
        ballX: Math.random(),
        ballY: Math.random(),
        playerX: Math.random(),
        playerY: Math.random(),
        ballVelocityX: (Math.random() * 2 - 1) / 20,
        ballVelocityY: (Math.random() * 2 - 1) / 20,
        distanceToGoal: Math.random(),
        angleToGoal: Math.random() * 2 - 1,
        nearestTeammateDistance: Math.random(),
        nearestTeammateAngle: Math.random() * 2 - 1,
        nearestOpponentDistance: Math.random(),
        nearestOpponentAngle: Math.random() * 2 - 1,
        isInShootingRange: Math.random() > 0.5 ? 1 : 0,
        isInPassingRange: Math.random() > 0.5 ? 1 : 0,
        isDefendingRequired: Math.random() > 0.5 ? 1 : 0,
        distanceToOwnGoal: Math.random(),
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: Math.random() > 0.8 ? 1 : 0,
        isDangerousPosition: Math.random() > 0.8 ? 1 : 0,
        isBetweenBallAndOwnGoal: Math.random() > 0.8 ? 1 : 0,
        teamElo: 0.5 + Math.random() * 0.3,
        eloAdvantage: Math.random() * 0.6 - 0.3,
        gameTime: Math.random(),
        scoreDifferential: Math.random() * 2 - 1,
        momentum: Math.random(),
        formationCompactness: Math.random(),
        formationWidth: Math.random(),
        recentSuccessRate: Math.random(),
        possessionDuration: Math.random(),
        distanceFromFormationCenter: Math.random(),
        isInFormationPosition: Math.random(),
        teammateDensity: Math.random(),
        opponentDensity: Math.random(),
        shootingAngle: Math.random(),
        shootingQuality: Math.random(),
        
        zoneControl: Math.random(),
        passingLanesQuality: Math.random(),
        spaceCreation: Math.random(),
        defensiveSupport: Math.random(),
        pressureIndex: Math.random(),
        tacticalRole: Math.random(),
        supportPositioning: Math.random(),
        pressingEfficiency: Math.random(),
        coverShadow: Math.random(),
        verticalSpacing: Math.random(),
        horizontalSpacing: Math.random(),
        territorialControl: Math.random(),
        counterAttackPotential: Math.random(),
        pressureResistance: Math.random(),
        recoveryPosition: Math.random(),
        transitionSpeed: Math.random(),
        
        playerId,
        playerRoleEncoding,
        playerTeamId,
        playerPositionalRole
      };

      const moveTowardGoal = Math.random() > 0.4;
      const output: NeuralOutput = {
        moveX: moveTowardGoal ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4,
        moveY: 0.5 + (Math.random() - 0.5) * 0.7,
        shootBall: 0,
        passBall: 0,
        intercept: 0
      };

      trainingData.push({ input, output });
    }

    console.log("Training neural network...");
    net.train(trainingData, {
      iterations: 2000,
      errorThresh: 0.005,
      logPeriod: 500,
      log: (stats) => {
        console.log(`Training progress: ${stats.iterations} iterations, error: ${stats.error}`);
      },
      learningRate: 0.05,
      momentum: 0.1,
      callback: (stats) => {
        if (stats.error < 0.01) return true;
      }
    });

    if (!isNetworkValid(net)) {
      console.warn("Network validation failed after training, creating fallback");
      return createFallbackBrain();
    }

    console.log("Neural network created and trained successfully");
    const experienceReplay = createExperienceReplay(100);
    
    return {
      net,
      lastOutput: { x: 0, y: 0 },
      lastAction: 'move',
      experienceReplay,
      learningStage: 0.1,
      lastReward: 0,
      cumulativeReward: 0,
      successRate: {
        shoot: 0.5,
        pass: 0.5,
        intercept: 0.5,
        overall: 0.5
      }
    };
  } catch (error) {
    console.error("Error creating neural network:", error);
    return createFallbackBrain();
  }
};

const createFallbackBrain = (): NeuralNet => {
  console.log("Creating fallback brain");
  const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
    hiddenLayers: [4],
    activation: 'sigmoid',
    learningRate: 0.1,
  });

  const input: NeuralInput = {
    ballX: 0.5, ballY: 0.5,
    playerX: 0.5, playerY: 0.5,
    ballVelocityX: 0, ballVelocityY: 0,
    distanceToGoal: 0.5, angleToGoal: 0,
    nearestTeammateDistance: 0.5, nearestTeammateAngle: 0,
    nearestOpponentDistance: 0.5, nearestOpponentAngle: 0,
    isInShootingRange: 0, isInPassingRange: 0, isDefendingRequired: 0,
    distanceToOwnGoal: 0.5, angleToOwnGoal: 0,
    isFacingOwnGoal: 0, isDangerousPosition: 0,
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
    transitionSpeed: 0.5,
    
    playerId: 0.5,
    playerRoleEncoding: 0.5,
    playerTeamId: 0.5,
    playerPositionalRole: 0.5
  };

  const output: NeuralOutput = {
    moveX: 0.5, moveY: 0.5, shootBall: 0.2, passBall: 0.2, intercept: 0.2
  };

  net.train([{ input, output }], {
    iterations: 100,
    errorThresh: 0.1
  });

  const experienceReplay = createExperienceReplay(50);

  return {
    net,
    lastOutput: { x: 0, y: 0 },
    lastAction: 'move',
    experienceReplay,
    learningStage: 0.1,
    lastReward: 0,
    cumulativeReward: 0,
    successRate: {
      shoot: 0.5,
      pass: 0.5,
      intercept: 0.5,
      overall: 0.5
    }
  };
};

export const createUntrained = (): NeuralNet => {
  return createFallbackBrain();
};

// Initialize a player brain with history (new function needed for PlayerMovement.tsx)
export const initializePlayerBrainWithHistory = (brain: NeuralNet): NeuralNet => {
  // If the brain already has history fields, return it as is
  if (brain.actionHistory) {
    return brain;
  }
  
  // Initialize history fields if not present
  return {
    ...brain,
    lastAction: brain.lastAction || 'move',
    actionHistory: brain.actionHistory || [],
    successRate: brain.successRate || {
      shoot: 0.5,
      pass: 0.5,
      intercept: 0.5,
      overall: 0.5
    }
  };
};
