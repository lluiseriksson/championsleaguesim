
import { NeuralInput, NeuralOutput } from '../../types/football';

// Generate basic random training data
export const generateBasicTrainingData = (count: number) => {
  const trainingData = [];
  
  for (let i = 0; i < count; i++) {
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
  
  return trainingData;
};

// Generate training data for RED team shooting
export const generateRedTeamShootingData = (count: number) => {
  const trainingData = [];
  
  for (let i = 0; i < count; i++) {
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
      isBetweenBallAndOwnGoal: 0 // Not between ball and own goal
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
  
  return trainingData;
};

// Generate training data for BLUE team shooting
export const generateBlueTeamShootingData = (count: number) => {
  const trainingData = [];
  
  for (let i = 0; i < count; i++) {
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
      isBetweenBallAndOwnGoal: 0 // Not between ball and own goal
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
  
  return trainingData;
};

// Generate training data for own goal avoidance
export const generateOwnGoalAvoidanceData = (count: number) => {
  const trainingData = [];
  
  for (let i = 0; i < count; i++) {
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
  
  return trainingData;
};

// Create a comprehensive training dataset
export const createComprehensiveTrainingData = () => {
  const trainingData = [
    ...generateBasicTrainingData(15),
    ...generateRedTeamShootingData(15),
    ...generateBlueTeamShootingData(15),
    ...generateOwnGoalAvoidanceData(10)
  ];
  
  return trainingData;
};
