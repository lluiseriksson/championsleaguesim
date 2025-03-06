import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±1000 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -1000), 1000);
  
  // For each ELO point difference, we adjust by 0.1% (0.001)
  // Base speed is now 60% of original (1.0 to 0.6) - increased from 0.5
  const speedMultiplier = 0.6 - Math.max(0, -eloDifference) * 0.0005;
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.3; // Increased noise level from 0.25 to 0.3 for all goalkeepers
  const eloBonus = playerElo ? Math.min(0.1, Math.max(0, (playerElo - 1500) / 5000)) : 0;
  const noiseLevel = baseNoise - eloBonus;
  
  // Generate random noise
  const noise = (Math.random() * 2 - 1) * noiseLevel;
  
  return value + noise;
};

// Try to use neural network for goalkeeper if available
const useNeuralNetworkForGoalkeeper = (
  player: Player, 
  ball: Ball, 
  brain: NeuralNet
): { x: number, y: number } | null => {
  if (!isNetworkValid(brain.net)) {
    return null;
  }

  try {
    // Simple input for goalkeeper
    const input = {
      ballX: ball.position.x / PITCH_WIDTH,
      ballY: ball.position.y / PITCH_HEIGHT,
      playerX: player.position.x / PITCH_WIDTH,
      playerY: player.position.y / PITCH_HEIGHT,
      ballVelocityX: ball.velocity.x / 20,
      ballVelocityY: ball.velocity.y / 20,
      distanceToGoal: 0.5, // Not important for goalkeeper
      angleToGoal: 0,
      nearestTeammateDistance: 0.5,
      nearestTeammateAngle: 0,
      nearestOpponentDistance: 0.5,
      nearestOpponentAngle: 0,
      isInShootingRange: 0,
      isInPassingRange: 0,
      isDefendingRequired: 1, // Always 1 for goalkeepers
      teamElo: player.teamElo ? player.teamElo / 3000 : 0.5,
      eloAdvantage: 0.5,
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

    // Get network output
    const output = brain.net.run(input);
    
    // Use the neural network output if available
    if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
      // Convert from 0-1 range to direction - increased movement multipliers
      const moveX = (output.moveX * 2 - 1) * 1.8; // Increased from 1.0 to 1.8
      const moveY = (output.moveY * 2 - 1) * 2.0; // Increased from 1.5 to 2.0
      
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // First try to use neural network if available - increased probability
  if (player.brain && Math.random() > 0.3) { // More neural network usage (0.3 instead of 0.4)
    const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain);
    if (neuralMovement) {
      // Add randomness to neural network output
      return {
        x: addPositioningNoise(neuralMovement.x, player.teamElo),
        y: addPositioningNoise(neuralMovement.y, player.teamElo)
      };
    }
  }
  
  // Fallback to improved deterministic logic
  // Determine which side the goalkeeper is defending
  const isLeftSide = player.team === 'red';
  const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
  
  // Calculate distance to ball
  const dx = ball.position.x - player.position.x;
  const dy = ball.position.y - player.position.y;
  const distanceToBall = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate if ball is moving toward goal
  const ballMovingTowardGoal = 
    (isLeftSide && ball.velocity.x < -1) || 
    (!isLeftSide && ball.velocity.x > 1);
  
  // Calculate expected ball position based on trajectory
  const expectedBallY = ball.position.y + (ball.velocity.y * 10);
  
  // Apply ELO-based speed multiplier
  const eloSpeedMultiplier = calculateGoalkeeperSpeedMultiplier(player.teamElo, opposingTeamElo);
  
  // Calculate horizontal movement - allow more movement freedom
  let moveX = 0;
  
  // Increase goalkeeper aggressiveness by extending the forward range
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 150 && ballMovingTowardGoal) || // Increased from 120 to 150
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 150 && ballMovingTowardGoal); // Increased from 120 to 150
  
  if (shouldMoveForward) {
    // Allow goalkeeper to move further from goal line
    const maxAdvance = isLeftSide ? 120 : PITCH_WIDTH - 120; // Increased from 100 to 120
    
    // Add randomness to max advance distance - increased range
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 40 - 20); // Increased from ±15 to ±20
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 25, randomizedMaxAdvance)
      : Math.max(ball.position.x + 25, randomizedMaxAdvance);
    
    // Move faster when ball is coming directly at goal but add more randomness
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.8 + Math.random() * 0.6; // Increased randomness from 0.4 to 0.6
    
    // Increased speed multipliers
    const baseSpeedMultiplier = directShot ? 1.5 * randomFactor : 1.2 * randomFactor; // Increased from 1.2/0.9 to 1.5/1.2
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with more random positioning
    const randomGoalLineOffset = (Math.random() * 35 - 17.5); // Increased from ±12.5 to ±17.5
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Increased speed for returning to position
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.1, 1.2) * eloSpeedMultiplier; // Increased from 0.08/1.0 to 0.1/1.2
  }
  
  // Calculate vertical movement to track the ball or expected ball position
  let moveY = 0;
  
  // If ball is moving fast, anticipate where it will go, with more error
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  // Add a prediction error based on ELO - reduced for better positioning
  const predictionError = Math.random() * 50 - 25; // Reduced from ±30 to ±25 pixels of error
  const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
  
  // Expanded goalkeeper vertical movement range
  const randomYOffset = (Math.random() * 40 - 20); // Increased from ±15 to ±20 pixels of randomness
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 45 + randomYOffset, // Increased range from 35 to 45
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 45 + randomYOffset, targetY) // Increased range from 35 to 45
  );
  
  // Calculate vertical movement with increased responsiveness
  const yDifference = limitedTargetY - player.position.y;
  
  // Increased vertical movement speed
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.08, 1.4) * eloSpeedMultiplier; // Increased from 0.06/1.2 to 0.08/1.4
  
  // Prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    // Less vertical priority reduction to allow more balanced x-y movement
    const verticalPriorityMultiplier = 0.7 + Math.random() * 0.2; // Increased from 0.6-0.8 to 0.7-0.9
    moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
  }
  
  // Add final noise to movement
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Reduced hesitation chance and increased movement during hesitation
  if (Math.random() < 0.1) { // 10% chance of goalkeeper hesitation (reduced from 12%)
    moveX *= 0.5; // Increased from 0.4 to 0.5
    moveY *= 0.5; // Increased from 0.4 to 0.5
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
