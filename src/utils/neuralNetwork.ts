
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
        isBetweenBallAndOwnGoal: Math.random() > 0.8 ? 1 : 0,
        teamElo: 0.5 + Math.random() * 0.3, // Random ELO, skewed toward higher values
        eloAdvantage: Math.random() * 0.6 - 0.3, // Random advantage between -0.3 and 0.3
        
        // Add the new contextual features with random values
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
        opponentDensity: Math.random()
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
    
    // ENHANCED: Add training examples for RED TEAM shooting in CORRECT direction
    for (let i = 0; i < 15; i++) {
      const input: NeuralInput = {
        ballX: 0.6 + Math.random() * 0.3, // Ball on right side of field
        ballY: Math.random(),
        playerX: 0.6 + Math.random() * 0.3, // Player on right side
        playerY: Math.random(),
        ballVelocityX: Math.random() * 0.05, // Slight rightward velocity
        ballVelocityY: (Math.random() * 2 - 1) / 20,
        distanceToGoal: 0.1 + Math.random() * 0.3, // Close to goal
        angleToGoal: Math.random() * 0.5, // Facing goal
        nearestTeammateDistance: 0.3 + Math.random() * 0.7,
        nearestTeammateAngle: Math.random() * 2 - 1,
        nearestOpponentDistance: 0.3 + Math.random() * 0.7,
        nearestOpponentAngle: Math.random() * 2 - 1,
        isInShootingRange: 1, // In shooting range
        isInPassingRange: 0, // Not in passing range
        isDefendingRequired: 0, // Not defending
        distanceToOwnGoal: 0.7 + Math.random() * 0.3, // Far from own goal
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: 0, // Not facing own goal
        isDangerousPosition: 0, // Not dangerous
        isBetweenBallAndOwnGoal: 0, // Not between ball and own goal
        teamElo: 0.6 + Math.random() * 0.3, // Higher ELO for better shooting
        eloAdvantage: 0.1 + Math.random() * 0.3, // Positive advantage
        
        // Add contextual features for shooting scenario
        gameTime: 0.5 + Math.random() * 0.5, // Second half of the game
        scoreDifferential: -0.2 + Math.random() * 0.4, // Slightly behind or tied
        momentum: 0.6 + Math.random() * 0.4, // Good momentum
        formationCompactness: 0.3 + Math.random() * 0.4, // Medium to spread out formation
        formationWidth: 0.6 + Math.random() * 0.4, // Wider formation
        recentSuccessRate: 0.6 + Math.random() * 0.4, // Good success rate
        possessionDuration: 0.3 + Math.random() * 0.7, // Varied possession time
        distanceFromFormationCenter: 0.6 + Math.random() * 0.4, // Forward positioned
        isInFormationPosition: 0.7 + Math.random() * 0.3, // Mostly in position
        teammateDensity: 0.3 + Math.random() * 0.4, // Medium teammate density
        opponentDensity: 0.2 + Math.random() * 0.3 // Lower opponent density
      };
      
      // Output: shoot RIGHT (for red team)
      const output: NeuralOutput = {
        moveX: 0.8 + Math.random() * 0.2, // Move right
        moveY: 0.5 + (Math.random() - 0.5) * 0.2,
        shootBall: 0.8 + Math.random() * 0.2, // High shoot probability
        passBall: Math.random() * 0.2, // Low pass probability
        intercept: Math.random() * 0.1 // Very low intercept
      };

      trainingData.push({ input, output });
    }
    
    // ENHANCED: Add training examples for BLUE TEAM shooting in CORRECT direction
    for (let i = 0; i < 15; i++) {
      const input: NeuralInput = {
        ballX: Math.random() * 0.3, // Ball on left side of field
        ballY: Math.random(),
        playerX: Math.random() * 0.3, // Player on left side
        playerY: Math.random(),
        ballVelocityX: -Math.random() * 0.05, // Slight leftward velocity
        ballVelocityY: (Math.random() * 2 - 1) / 20,
        distanceToGoal: 0.1 + Math.random() * 0.3, // Close to goal
        angleToGoal: Math.random() * 0.5, // Facing goal
        nearestTeammateDistance: 0.3 + Math.random() * 0.7,
        nearestTeammateAngle: Math.random() * 2 - 1,
        nearestOpponentDistance: 0.3 + Math.random() * 0.7,
        nearestOpponentAngle: Math.random() * 2 - 1,
        isInShootingRange: 1, // In shooting range
        isInPassingRange: 0, // Not in passing range
        isDefendingRequired: 0, // Not defending
        distanceToOwnGoal: 0.7 + Math.random() * 0.3, // Far from own goal
        angleToOwnGoal: Math.random() * 2 - 1,
        isFacingOwnGoal: 0, // Not facing own goal
        isDangerousPosition: 0, // Not dangerous
        isBetweenBallAndOwnGoal: 0, // Not between ball and own goal
        teamElo: 0.6 + Math.random() * 0.3, // Higher ELO for better shooting
        eloAdvantage: 0.1 + Math.random() * 0.3, // Positive advantage
        
        // Add contextual features for shooting scenario
        gameTime: 0.5 + Math.random() * 0.5, // Second half of the game
        scoreDifferential: -0.2 + Math.random() * 0.4, // Slightly behind or tied
        momentum: 0.6 + Math.random() * 0.4, // Good momentum
        formationCompactness: 0.3 + Math.random() * 0.4, // Medium to spread out formation
        formationWidth: 0.6 + Math.random() * 0.4, // Wider formation
        recentSuccessRate: 0.6 + Math.random() * 0.4, // Good success rate
        possessionDuration: 0.3 + Math.random() * 0.7, // Varied possession time
        distanceFromFormationCenter: 0.6 + Math.random() * 0.4, // Forward positioned
        isInFormationPosition: 0.7 + Math.random() * 0.3, // Mostly in position
        teammateDensity: 0.3 + Math.random() * 0.4, // Medium teammate density
        opponentDensity: 0.2 + Math.random() * 0.3 // Lower opponent density
      };
      
      // Output: shoot LEFT (for blue team)
      const output: NeuralOutput = {
        moveX: Math.random() * 0.2, // Move left
        moveY: 0.5 + (Math.random() - 0.5) * 0.2,
        shootBall: 0.8 + Math.random() * 0.2, // High shoot probability
        passBall: Math.random() * 0.2, // Low pass probability
        intercept: Math.random() * 0.1 // Very low intercept
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
        isBetweenBallAndOwnGoal: 1, // Between ball and own goal
        teamElo: Math.random() * 0.8, // Random ELO
        eloAdvantage: -0.2 - Math.random() * 0.3, // Negative advantage (under pressure)
        
        // Add contextual features for dangerous defensive scenario
        gameTime: Math.random(), // Any game time
        scoreDifferential: 0.1 + Math.random() * 0.5, // Slightly ahead (more cautious)
        momentum: 0.2 + Math.random() * 0.3, // Low momentum
        formationCompactness: 0.7 + Math.random() * 0.3, // Compact formation (defensive)
        formationWidth: 0.3 + Math.random() * 0.3, // Narrow formation (defensive)
        recentSuccessRate: 0.2 + Math.random() * 0.3, // Lower success rate
        possessionDuration: 0, // No possession
        distanceFromFormationCenter: 0.1 + Math.random() * 0.3, // Close to formation center
        isInFormationPosition: 0.7 + Math.random() * 0.3, // Mostly in position
        teammateDensity: 0.6 + Math.random() * 0.4, // Higher teammate density
        opponentDensity: 0.6 + Math.random() * 0.4 // Higher opponent density
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
    isBetweenBallAndOwnGoal: 0,
    teamElo: 0.5, // Default middle ELO
    eloAdvantage: 0, // No advantage
    
    // Add the new contextual features with neutral default values
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
    opponentDensity: 0.5
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
