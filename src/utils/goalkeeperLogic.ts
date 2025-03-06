
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±1000 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -1000), 1000);
  
  // For each ELO point difference, we adjust by 0.1% (0.001)
  // Best team (highest ELO) has multiplier 1.0, lower ELO teams get reduced speed
  const speedMultiplier = 1.0 - Math.max(0, -eloDifference) * 0.001;
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.2; // Base noise level for all goalkeepers
  const eloBonus = playerElo ? Math.min(0.15, Math.max(0, (playerElo - 1500) / 5000)) : 0;
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
      // Convert from 0-1 range to direction
      const moveX = (output.moveX * 2 - 1) * 1.5; // Reduced by 50% from 3 to 1.5
      const moveY = (output.moveY * 2 - 1) * 2; // Reduced by 50% from 4 to 2
      
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
  if (player.brain && Math.random() > 0.3) { // 70% chance to use neural network if available
    const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain);
    if (neuralMovement) {
      // Add some randomness to neural network output
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
  
  // More aggressive coming out when ball is close and moving toward goal
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 150 && ballMovingTowardGoal) || 
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 150 && ballMovingTowardGoal);
  
  if (shouldMoveForward) {
    // Move toward ball more aggressively, but not too far from goal line
    const maxAdvance = isLeftSide ? 120 : PITCH_WIDTH - 120;
    
    // Add randomness to max advance distance
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 40 - 20);
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 20, randomizedMaxAdvance)
      : Math.max(ball.position.x + 20, randomizedMaxAdvance);
    
    // Move faster when ball is coming directly at goal but add some randomness
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 randomness
    
    // Reduced base speed multiplier by 50%
    const baseSpeedMultiplier = directShot ? 1.5 * randomFactor : 1.0 * randomFactor; // Reduced from 3.0/2.0 to 1.5/1.0
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with random positioning
    const randomGoalLineOffset = (Math.random() * 20 - 10); // random offset from perfect goal line
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Reduced base speed by 50%
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.1, 1.25) * eloSpeedMultiplier; // Changed from 0.2/2.5 to 0.1/1.25
  }
  
  // Calculate vertical movement to track the ball or expected ball position
  let moveY = 0;
  
  // If ball is moving fast, anticipate where it will go, with some error
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  // Add a prediction error based on ELO
  const predictionError = Math.random() * 60 - 30; // ±30 pixels of error
  const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
  
  // Limit target Y to reasonable goal area with some randomness
  const randomYOffset = (Math.random() * 30 - 15); // ±15 pixels of randomness
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 30 + randomYOffset,
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 30 + randomYOffset, targetY)
  );
  
  // Calculate vertical movement with higher responsiveness, adjusted by ELO
  const yDifference = limitedTargetY - player.position.y;
  
  // Reduced base vertical speed by 50%
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.075, 1.5) * eloSpeedMultiplier; // Changed from 0.15/3.0 to 0.075/1.5
  
  // Prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    // Add some randomness to the vertical movement priority (reduced by 50%)
    const verticalPriorityMultiplier = 0.65 + Math.random() * 0.2; // Changed from 1.3-1.7 to 0.65-0.85
    moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
  }
  
  // Add final noise to movement
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
