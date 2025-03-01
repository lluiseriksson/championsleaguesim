
import * as brain from 'brain.js';
import { NeuralNet, Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';

export const createPlayerBrain = (): NeuralNet => {
  try {
    const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
      hiddenLayers: [12, 6], // Simplified layers for better stability
      activation: 'sigmoid', // Changed to sigmoid for more stability
      learningRate: 0.1,
    });

    // Create simple training data
    const trainingData = [];
    for (let i = 0; i < 20; i++) {
      // Create basic input with normalized values between 0-1
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
        isDefendingRequired: Math.random() > 0.5 ? 1 : 0
      };
      
      // Simple random output values
      const output: NeuralOutput = {
        moveX: 0.5 + (Math.random() - 0.5) * 0.4, // Centered around 0.5 with some variation
        moveY: 0.5 + (Math.random() - 0.5) * 0.4,
        shootBall: Math.random() > 0.8 ? 0.8 : 0.2, // Occasionally shoot
        passBall: Math.random() > 0.8 ? 0.8 : 0.2, // Occasionally pass
        intercept: Math.random() > 0.8 ? 0.8 : 0.2 // Occasionally intercept
      };

      trainingData.push({ input, output });
    }

    // Train with fewer iterations for stability
    net.train(trainingData, {
      iterations: 500,
      errorThresh: 0.05,
      log: false
    });

    // Verify the network is valid
    if (!isNetworkValid(net)) {
      console.warn("Network not valid after initial training, creating a simple fallback");
      return createFallbackBrain();
    }

    console.log("Created new neural network successfully");
    return {
      net,
      lastOutput: { x: 0, y: 0 },
      lastAction: 'move' // Changed from 'none' to 'move' to match the type definition
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
    isInShootingRange: 0, isInPassingRange: 0, isDefendingRequired: 0
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
    lastAction: 'move' // Changed from 'none' to 'move' to match the type definition
  };
};

export const createUntrained = (): NeuralNet => {
  return createFallbackBrain();
};
