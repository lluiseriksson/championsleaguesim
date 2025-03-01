
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

    // Create better initial training data with explicit own goal avoidance
    const trainingData = [];
    
    // Basic random scenarios
    for (let i = 0; i < 15; i++) {
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
        isDefendingRequired: Math.random() > 0.5 ? 1 : 0,
        distanceToOwnGoal: Math.random(),
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: Math.random() > 0.8 ? 1 : 0,
        isDangerousPosition: Math.random() > 0.8 ? 1 : 0,
        isBetweenBallAndOwnGoal: Math.random() > 0.8 ? 1 : 0
      };
      
      // Simple random output values
      const output: NeuralOutput = {
        moveX: 0.5 + (Math.random() - 0.5) * 0.4,
        moveY: 0.5 + (Math.random() - 0.5) * 0.4,
        shootBall: Math.random() > 0.8 ? 0.8 : 0.2,
        passBall: Math.random() > 0.8 ? 0.8 : 0.2,
        intercept: Math.random() > 0.8 ? 0.8 : 0.2
      };

      trainingData.push({ input, output });
    }
    
    // Now add EXPLICIT training examples to avoid own goals
    for (let i = 0; i < 10; i++) {
      // Create dangerous own goal scenarios
      const input: NeuralInput = {
        ballX: Math.random(),
        ballY: Math.random(),
        playerX: Math.random(),
        playerY: Math.random(),
        ballVelocityX: (Math.random() * 2 - 1) / 20,
        ballVelocityY: (Math.random() * 2 - 1) / 20,
        distanceToGoal: 0.7 + Math.random() * 0.3, // Far from opponent goal
        angleToGoal: Math.random() * 2 - 1,
        nearestTeammateDistance: Math.random() * 0.5, // Teammate nearby
        nearestTeammateAngle: Math.random() * 2 - 1,
        nearestOpponentDistance: 0.3 + Math.random() * 0.7, // Opponents far
        nearestOpponentAngle: Math.random() * 2 - 1,
        isInShootingRange: 0, // Not in shooting range
        isInPassingRange: 1, // In passing range
        isDefendingRequired: 1, // Defending required
        distanceToOwnGoal: Math.random() * 0.3, // Close to own goal
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: 1, // Facing own goal
        isDangerousPosition: 1, // In dangerous position
        isBetweenBallAndOwnGoal: 1 // Between ball and own goal
      };
      
      // Teach to NEVER shoot in these scenarios, prefer passing and moving away
      const output: NeuralOutput = {
        moveX: Math.random() > 0.5 ? 0.8 : 0.2, // Move away from own goal
        moveY: 0.5 + (Math.random() - 0.5) * 0.4,
        shootBall: 0, // Never shoot
        passBall: 0.8 + Math.random() * 0.2, // Prefer passing
        intercept: Math.random() * 0.3 // Sometimes intercept
      };

      trainingData.push({ input, output });
    }

    // Train with these scenarios
    net.train(trainingData, {
      iterations: 800, // Increased from 500
      errorThresh: 0.05,
      log: false
    });

    // Verify the network is valid
    if (!isNetworkValid(net)) {
      console.warn("Network not valid after initial training, creating a simple fallback");
      return createFallbackBrain();
    }

    console.log("Created new neural network successfully with own goal avoidance training");
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
    isBetweenBallAndOwnGoal: 0  // Add this missing field
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
