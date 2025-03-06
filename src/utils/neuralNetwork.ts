
import * as brain from 'brain.js';
import { NeuralNet, Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createExperienceReplay } from './experienceReplay';
import { initializeSpecializedBrain } from './specializedNetworks';

export const createPlayerBrain = (): NeuralNet => {
  try {
    console.log("Creating new neural network...");
    
    const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
      hiddenLayers: [24, 20, 16, 8],
      activation: 'leaky-relu',
      learningRate: 0.05,
      momentum: 0.1,
      binaryThresh: 0.5,
      errorThresh: 0.005
    });

    // Create a simple initial training set
    const trainingData: {input: NeuralInput, output: NeuralOutput}[] = [
      {
        input: {
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
          teamElo: 0.5, eloAdvantage: 0,
          gameTime: 0.5, scoreDifferential: 0,
          momentum: 0.5, formationCompactness: 0.5,
          formationWidth: 0.5, recentSuccessRate: 0.5,
          possessionDuration: 0, distanceFromFormationCenter: 0.5,
          isInFormationPosition: 1, teammateDensity: 0.5,
          opponentDensity: 0.5, shootingAngle: 0.5,
          shootingQuality: 0.5, zoneControl: 0.5,
          passingLanesQuality: 0.5, spaceCreation: 0.5,
          defensiveSupport: 0.5, pressureIndex: 0.5,
          tacticalRole: 0.5, supportPositioning: 0.5,
          pressingEfficiency: 0.5, coverShadow: 0.5,
          verticalSpacing: 0.5, horizontalSpacing: 0.5,
          territorialControl: 0.5, counterAttackPotential: 0.5,
          pressureResistance: 0.5, recoveryPosition: 0.5,
          transitionSpeed: 0.5
        },
        output: {
          moveX: 0.5, moveY: 0.5, shootBall: 0.1, passBall: 0.1, intercept: 0.1
        }
      }
    ];

    // Train with minimal data just to initialize the network
    net.train(trainingData, {
      iterations: 100,
      errorThresh: 0.01,
    });

    console.log("Neural network created and trained successfully");
    
    return {
      net,
      lastOutput: { x: 0, y: 0 },
      lastAction: 'move',
      actionHistory: [],
      experienceReplay: createExperienceReplay(100),
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

  const trainingData: {input: NeuralInput, output: NeuralOutput}[] = [{
    input: {
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
      
      // Add tactical metrics with default values
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
    },
    output: {
      moveX: 0.5, moveY: 0.5, shootBall: 0.2, passBall: 0.2, intercept: 0.2
    }
  }];

  net.train(trainingData, {
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
