
import * as brain from 'brain.js';
import { NeuralNet, NeuralInput, NeuralOutput } from '../types/football';
import { isNetworkValid } from './neuralHelpers';
import { createComprehensiveTrainingData } from './neural/trainingData';

export const createPlayerBrain = (): NeuralNet => {
  try {
    const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
      hiddenLayers: [12, 6], // Simplified layers for better stability
      activation: 'sigmoid', // Changed to sigmoid for more stability
      learningRate: 0.1,
    });

    // Get training data from our specialized generator
    const trainingData = createComprehensiveTrainingData();

    // Train with these scenarios
    net.train(trainingData, {
      iterations: 1000, // Increased from 800
      errorThresh: 0.05,
      log: false
    });

    // Verify the network is valid
    if (!isNetworkValid(net)) {
      console.warn("Network not valid after initial training, creating a simple fallback");
      return createFallbackBrain();
    }

    console.log("Created new neural network successfully with directional shooting training");
    return {
      net,
      lastOutput: { x: 0, y: 0 },
      lastAction: 'move'
    };
  } catch (error) {
    console.error("Error creating neural network:", error);
    return createFallbackBrain();
  }
};

// Create a very simple fallback brain when normal creation fails
const createFallbackBrain = (): NeuralNet => {
  console.log("Creating fallback brain");
  const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
    hiddenLayers: [4],
    activation: 'sigmoid',
    learningRate: 0.1,
  });

  // Create a minimal training set
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
    isBetweenBallAndOwnGoal: 0
  };
  
  const output: NeuralOutput = {
    moveX: 0.5, moveY: 0.5, shootBall: 0.2, passBall: 0.2, intercept: 0.2
  };

  net.train([{ input, output }], {
    iterations: 100,
    errorThresh: 0.1
  });

  return {
    net,
    lastOutput: { x: 0, y: 0 },
    lastAction: 'move'
  };
};

export const createUntrained = (): NeuralNet => {
  return createFallbackBrain();
};
