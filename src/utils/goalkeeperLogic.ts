import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±800 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -800), 800);
  
  // Reduce ELO influence by 30% to favor deterministic behavior
  const speedMultiplier = 0.85 - Math.max(0, -eloDifference) * 0.0003;
  
  return speedMultiplier;
};

// Reduce noise in positioning for more deterministic behavior
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.25; // Reduced from 0.35 for more deterministic behavior
  const eloBonus = playerElo ? Math.min(0.1, Math.max(0, (playerElo - 1500) / 5000)) : 0;
  const noiseLevel = baseNoise - eloBonus;
  
  // Generate random noise
  const noise = (Math.random() * 2 - 1) * noiseLevel;
  
  return value + noise;
};

// Try to use neural network for goalkeeper with reduced probability
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
    
    // Use the neural network output if available with reduced movement range
    if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
      // Reduce movement multipliers for more constrained movement
      const moveX = (output.moveX * 2 - 1) * 1.8; // Reduced from 2.2
      const moveY = (output.moveY * 2 - 1) * 2.0; // Reduced from 2.5
      
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // Reduce neural network usage probability to 60% (from 80%)
  if (player.brain && Math.random() > 0.4) {
    const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain);
    if (neuralMovement) {
      return {
        x: addPositioningNoise(neuralMovement.x, player.teamElo),
        y: addPositioningNoise(neuralMovement.y, player.teamElo)
      };
    }
  }
  
  // Fallback to improved deterministic logic
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
  
  // Calculate horizontal movement with reduced forward range
  let moveX = 0;
  
  // Reduce goalkeeper aggressiveness by reducing forward range
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 150 && ballMovingTowardGoal) || // Reduced from 180
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 150 && ballMovingTowardGoal); // Reduced from 180
  
  if (shouldMoveForward) {
    // Reduce how far goalkeeper can move from goal line
    const maxAdvance = isLeftSide ? 120 : PITCH_WIDTH - 120; // Reduced from 150
    
    // Add smaller randomness to max advance distance
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 40 - 20); // Reduced from ±30 to ±20
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 25, randomizedMaxAdvance)
      : Math.max(ball.position.x + 25, randomizedMaxAdvance);
    
    // More weight on deterministic movement for direct shots
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.9 + Math.random() * 0.2; // Reduced randomness, increased base
    
    // Slightly reduced speed multipliers
    const baseSpeedMultiplier = directShot ? 1.5 * randomFactor : 1.3 * randomFactor;
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with less random positioning
    const randomGoalLineOffset = (Math.random() * 30 - 15); // Reduced from ±22.5 to ±15
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Slightly increased return speed for better positioning
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.15, 1.3) * eloSpeedMultiplier;
  }
  
  // Calculate vertical movement with reduced range
  let moveY = 0;
  
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  const predictionError = Math.random() * 30 - 15; // Reduced from ±20 to ±15
  const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
  
  // Reduced goalkeeper vertical movement range
  const randomYOffset = (Math.random() * 40 - 20); // Reduced from ±25 to ±20
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 45 + randomYOffset, // Reduced range from 60 to 45
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 45 + randomYOffset, targetY)
  );
  
  const yDifference = limitedTargetY - player.position.y;
  
  // Slightly reduced vertical movement speed
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.08, 1.4) * eloSpeedMultiplier;
  
  // Prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    const verticalPriorityMultiplier = 0.9 + Math.random() * 0.1;
    moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
  }
  
  // Add final noise with reduced amplitude
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Reduced hesitation chance
  if (Math.random() < 0.05) { // 5% chance of goalkeeper hesitation (reduced from 8%)
    moveX *= 0.7;
    moveY *= 0.7;
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
