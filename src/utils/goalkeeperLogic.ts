import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±1000 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -1000), 1000);
  
  // For each ELO point difference, we adjust by 0.1% (0.001)
  // Reduce multiplier to make movements more predictable
  const speedMultiplier = 0.65 - Math.max(0, -eloDifference) * 0.0004;
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  // Significantly reduced noise for more predictable positioning
  const baseNoise = 0.15; // Decreased from 0.35
  const eloBonus = playerElo ? Math.min(0.10, Math.max(0, (playerElo - 1500) / 5000)) : 0;
  const noiseLevel = baseNoise - eloBonus;
  
  // Generate random noise
  const noise = (Math.random() * 2 - 1) * noiseLevel;
  
  return value + noise;
};

// Try to use neural network for goalkeeper with drastically reduced chance (20% -> 5%)
const useNeuralNetworkForGoalkeeper = (
  player: Player, 
  ball: Ball, 
  brain: NeuralNet
): { x: number, y: number } | null => {
  // Drastically reduce the chance of using neural network for goalkeepers
  if (Math.random() < 0.95) { // 95% chance to skip neural network entirely
    return null;
  }
  
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
    
    // Use the neural network output if available, but with severely limited influence
    if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
      // Convert from 0-1 range to direction, but constrain to tiny adjustments (5 unit radius)
      // This allows the neural network to make extremely small positioning adjustments only
      const moveX = (output.moveX * 2 - 1) * 0.2; // Severely reduced from 0.8
      const moveY = (output.moveY * 2 - 1) * 0.4; // Severely reduced from 1.0
      
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // First try to use neural network but with severely reduced frequency (5% chance)
  if (player.brain) {
    const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain);
    if (neuralMovement) {
      // Add minimal randomness to neural network output
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
  
  // Calculate horizontal movement - RESTRICT movement freedom
  let moveX = 0;
  
  // FURTHER REDUCED: Reduce the range goalkeeper will move forward from goal
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 80 && ballMovingTowardGoal) || // Reduced from 120 to 80
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 80 && ballMovingTowardGoal); // Reduced from 120 to 80
  
  if (shouldMoveForward) {
    // FURTHER REDUCED: Maximum distance from goal line keeper will advance
    const maxAdvance = isLeftSide ? 60 : PITCH_WIDTH - 60; // Reduced from 80 to 60
    
    // Add minimal randomness to max advance distance - reduced range
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 10 - 5); // Reduced from ±15 to ±5
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 25, randomizedMaxAdvance)
      : Math.max(ball.position.x + 25, randomizedMaxAdvance);
    
    // Move faster when ball is coming directly at goal but add minimal randomness
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.9 + Math.random() * 0.2; // Reduced randomness from 0.4 to 0.2
    
    // Further reduced speed multipliers for more predictable positioning
    const baseSpeedMultiplier = directShot ? 0.5 * randomFactor : 0.6 * randomFactor; // Reduced from 0.6/0.8
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with minimal random positioning
    const randomGoalLineOffset = (Math.random() * 6 - 3); // Reduced from ±10 to ±3
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Increase speed for returning to position to ensure goalkeepers stay on their line
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.15, 1.8) * eloSpeedMultiplier;
  }
  
  // Calculate vertical movement to track the ball or expected ball position
  let moveY = 0;
  
  // If ball is moving fast, anticipate where it will go, with reduced error
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  // Reduced prediction error for better positioning
  const predictionError = Math.random() * 20 - 10; // Changed from ±20 to ±10
  const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
  
  // Further eliminated random Y offset entirely
  const randomYOffset = 0; 
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 10, // Reduced padding from 20 to 10
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 10, targetY) // Reduced padding from 20 to 10
  );
  
  // Calculate vertical movement with increased responsiveness for better positioning
  const yDifference = limitedTargetY - player.position.y;
  
  // FURTHER REDUCED: vertical movement speed for shots coming directly at goal
  let verticalSpeedMultiplier = 1.0;
  if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2) {
    // Reduce speed for direct shots
    verticalSpeedMultiplier = 0.7; // Increased from 0.6 for slightly better response
  }
  
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.1 * verticalSpeedMultiplier, 1.0) * eloSpeedMultiplier; // Reduced max speed from 1.2 to 1.0
  
  // Prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    // Balance horizontal and vertical movement
    const verticalPriorityMultiplier = 0.7 + Math.random() * 0.2; // Adjusted from 0.6-0.8 to 0.7-0.9
    moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
  }
  
  // Add minimal final noise to movement
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Decreased hesitation chance for more consistent movement
  if (Math.random() < 0.08) { // 8% chance of goalkeeper hesitation (decreased from 12%)
    moveX *= 0.7; // Increased from 0.5 to 0.7 for less dramatic hesitation
    moveY *= 0.7; // Increased from 0.5 to 0.7
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
