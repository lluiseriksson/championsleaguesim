
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±1000 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -1000), 1000);
  
  // For each ELO point difference, we adjust by 0.1% (0.001)
  // Increase base speed to 70% - more dynamic and reactive behavior
  const speedMultiplier = 0.7 - Math.max(0, -eloDifference) * 0.0005;
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.35; // Increased noise for more unpredictable positioning
  const eloBonus = playerElo ? Math.min(0.15, Math.max(0, (playerElo - 1500) / 5000)) : 0; // Increased ceiling of noise reduction
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
      // Convert from 0-1 range to direction, but constrain to small adjustments (20 unit radius)
      // This allows the neural network to make small positioning adjustments but not run away
      const moveX = (output.moveX * 2 - 1) * 0.8; // Reduced multiplier for micro-adjustments
      const moveY = (output.moveY * 2 - 1) * 1.0; // Slightly more freedom vertically
      
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // First try to use neural network much more frequently (80% chance)
  if (player.brain && Math.random() > 0.2) { 
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
    (isLeftSide && ball.position.x < 180 && ballMovingTowardGoal) || // Increased from 150 to 180
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 180 && ballMovingTowardGoal); // Increased from 150 to 180
  
  if (shouldMoveForward) {
    // Allow goalkeeper to move further from goal line
    const maxAdvance = isLeftSide ? 150 : PITCH_WIDTH - 150; // Increased from 120 to 150
    
    // Add randomness to max advance distance - increased range
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 60 - 30); // Increased from ±20 to ±30
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 25, randomizedMaxAdvance)
      : Math.max(ball.position.x + 25, randomizedMaxAdvance);
    
    // Move faster when ball is coming directly at goal but add more randomness
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.8 + Math.random() * 0.8; // Increased randomness from 0.6 to 0.8
    
    // Increased speed multipliers
    const baseSpeedMultiplier = directShot ? 1.7 * randomFactor : 1.4 * randomFactor; // Increased from 1.5/1.2 to 1.7/1.4
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with more random positioning
    const randomGoalLineOffset = (Math.random() * 45 - 22.5); // Increased from ±17.5 to ±22.5
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Increased speed for returning to position
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.12, 1.4) * eloSpeedMultiplier; // Increased from 0.1/1.2 to 0.12/1.4
  }
  
  // Calculate vertical movement to track the ball or expected ball position
  let moveY = 0;
  
  // If ball is moving fast, anticipate where it will go, with more error
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  // Add a prediction error based on ELO - reduced for better positioning but still dynamic
  const predictionError = Math.random() * 40 - 20; // Changed from ±25 to ±20 for a balance of accuracy and error
  const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
  
  // Expanded goalkeeper vertical movement range
  const randomYOffset = (Math.random() * 50 - 25); // Increased from ±20 to ±25 pixels of randomness
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 60 + randomYOffset, // Increased range from 45 to 60
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 60 + randomYOffset, targetY) // Increased range from 45 to 60
  );
  
  // Calculate vertical movement with increased responsiveness
  const yDifference = limitedTargetY - player.position.y;
  
  // Increased vertical movement speed
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.09, 1.6) * eloSpeedMultiplier; // Increased from 0.08/1.4 to 0.09/1.6
  
  // Prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    // Less vertical priority reduction to allow more balanced x-y movement
    const verticalPriorityMultiplier = 0.8 + Math.random() * 0.2; // Increased from 0.7-0.9 to 0.8-1.0
    moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
  }
  
  // Add final noise to movement
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Reduced hesitation chance and increased movement during hesitation
  if (Math.random() < 0.08) { // 8% chance of goalkeeper hesitation (reduced from 10%)
    moveX *= 0.6; // Increased from 0.5 to 0.6
    moveY *= 0.6; // Increased from 0.5 to 0.6
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
