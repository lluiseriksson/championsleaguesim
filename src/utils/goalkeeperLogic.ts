import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 0.7 if ELOs are not available (reduced from 1.0)
  if (!playerElo || !opposingTeamElo) return 0.7;
  
  // Calculate ELO difference (capped at ±1000 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -1000), 1000);
  
  // For each ELO point difference, we adjust by 0.1% (0.001)
  // Even best team has reduced speed now (0.7 base), lower ELO teams get further reduced speed
  const speedMultiplier = 0.7 - Math.max(0, -eloDifference) * 0.001;
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.3; // Increased base noise level for all goalkeepers (from 0.2)
  const eloBonus = playerElo ? Math.min(0.1, Math.max(0, (playerElo - 1500) / 5000)) : 0; // Reduced ELO bonus from 0.15 to 0.1
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
      // Convert from 0-1 range to direction - further reduced by another 40%
      const moveX = (output.moveX * 2 - 1) * 0.9; // Reduced from 1.5 to 0.9
      const moveY = (output.moveY * 2 - 1) * 1.2; // Reduced from 2 to 1.2
      
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // First try to use neural network if available
  if (player.brain && Math.random() > 0.5) { // Reduced from 0.3 to 0.5 (more random behavior)
    const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain);
    if (neuralMovement) {
      // Add more randomness to neural network output
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
  
  // Calculate horizontal movement - be smarter about when to come out
  let moveX = 0;
  
  // Reduce goalkeeper aggressiveness - only move out on closer balls
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 120 && ballMovingTowardGoal) || // Reduced from 150 to 120
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 120 && ballMovingTowardGoal); // Reduced from 150 to 120
  
  if (shouldMoveForward) {
    // Move toward ball less aggressively - stay closer to goal line
    const maxAdvance = isLeftSide ? 100 : PITCH_WIDTH - 100; // Reduced from 120 to 100
    
    // Add randomness to max advance distance
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 30 - 15); // Reduced from 40-20 to 30-15
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 25, randomizedMaxAdvance) // Reduced aggressiveness
      : Math.max(ball.position.x + 25, randomizedMaxAdvance); // Reduced aggressiveness
    
    // Move faster when ball is coming directly at goal but add some randomness
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.7 + Math.random() * 0.3; // Reduced from 0.8-1.2 to 0.7-1.0
    
    // Further reduced by another 40%
    const baseSpeedMultiplier = directShot ? 0.9 * randomFactor : 0.6 * randomFactor; // Reduced from 1.5/1.0 to 0.9/0.6
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with random positioning
    const randomGoalLineOffset = (Math.random() * 25 - 12.5); // Increased randomness
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Further reduced by another 40%
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.06, 0.75) * eloSpeedMultiplier; // Reduced from 0.1/1.25 to 0.06/0.75
  }
  
  // Calculate vertical movement to track the ball or expected ball position
  let moveY = 0;
  
  // If ball is moving fast, anticipate where it will go, with more error
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  // Add a prediction error based on ELO - increased error
  const predictionError = Math.random() * 80 - 40; // Increased from ±30 to ±40 pixels of error
  const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
  
  // Limit target Y to reasonable goal area with more randomness
  const randomYOffset = (Math.random() * 40 - 20); // Increased from ±15 to ±20 pixels of randomness
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 35 + randomYOffset, // Increased randomness
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 35 + randomYOffset, targetY) // Increased randomness
  );
  
  // Calculate vertical movement with reduced responsiveness
  const yDifference = limitedTargetY - player.position.y;
  
  // Further reduced by another 40%
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.045, 0.9) * eloSpeedMultiplier; // Reduced from 0.075/1.5 to 0.045/0.9
  
  // Prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    // Add some randomness to the vertical movement priority - further reduced
    const verticalPriorityMultiplier = 0.4 + Math.random() * 0.15; // Reduced from 0.65-0.85 to 0.4-0.55
    moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
  }
  
  // Add final noise to movement - more noise
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Occasionally add random hesitation where keeper moves very little
  if (Math.random() < 0.15) { // 15% chance of goalkeeper hesitation
    moveX *= 0.3;
    moveY *= 0.3;
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
