import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±800 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -800), 800);
  
  // Reduce ELO influence by 40% to greatly favor deterministic behavior
  const speedMultiplier = 0.9 - Math.max(0, -eloDifference) * 0.0002;
  
  return speedMultiplier;
};

// Significantly reduce noise in positioning for more deterministic behavior
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.15; // Greatly reduced from 0.25 for much more deterministic behavior
  const eloBonus = playerElo ? Math.min(0.1, Math.max(0, (playerElo - 1500) / 5000)) : 0;
  const noiseLevel = baseNoise - eloBonus;
  
  // Generate random noise (reduced amplitude)
  const noise = (Math.random() * 2 - 1) * noiseLevel;
  
  return value + noise;
};

// Try to use neural network for goalkeeper with greatly reduced probability (only 20%)
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
    
    // Use the neural network output if available with severely reduced movement range
    if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
      // Greatly reduce movement multipliers for more constrained movement
      const moveX = (output.moveX * 2 - 1) * 1.2; // Significantly reduced from 1.8
      const moveY = (output.moveY * 2 - 1) * 1.3; // Significantly reduced from 2.0
      
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // Further reduce neural network usage probability to 20% (from 60%)
  if (player.brain && Math.random() > 0.8) {
    const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain);
    if (neuralMovement) {
      return {
        x: addPositioningNoise(neuralMovement.x, player.teamElo),
        y: addPositioningNoise(neuralMovement.y, player.teamElo)
      };
    }
  }
  
  // Greatly enhanced deterministic logic
  const isLeftSide = player.team === 'red';
  const goalLine = isLeftSide ? 25 : PITCH_WIDTH - 25; // Closer to goal line (from 30)
  
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
  
  // Calculate horizontal movement with severely reduced forward range
  let moveX = 0;
  
  // Significantly reduce goalkeeper aggressiveness by reducing forward range
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 120 && ballMovingTowardGoal) || // Reduced from 150
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 120 && ballMovingTowardGoal); // Reduced from 150
  
  if (shouldMoveForward) {
    // Severely reduce how far goalkeeper can move from goal line
    const maxAdvance = isLeftSide ? 80 : PITCH_WIDTH - 80; // Greatly reduced from 120
    
    // Add minimal randomness to max advance distance
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 20 - 10); // Reduced from ±20 to ±10
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 30, randomizedMaxAdvance)
      : Math.max(ball.position.x + 30, randomizedMaxAdvance);
    
    // Much more weight on deterministic movement for direct shots
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.95 + Math.random() * 0.1; // Minimal randomness, higher base
    
    // Moderately reduced speed multipliers
    const baseSpeedMultiplier = directShot ? 1.4 * randomFactor : 1.2 * randomFactor;
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with minimal random positioning
    const randomGoalLineOffset = (Math.random() * 14 - 7); // Reduced from ±15 to ±7
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Slightly increased return speed for better positioning
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.18, 1.4) * eloSpeedMultiplier;
  }
  
  // Calculate vertical movement with reduced range
  let moveY = 0;
  
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  const predictionError = Math.random() * 12 - 6; // Reduced from ±15 to ±6
  const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
  
  // Severely reduced goalkeeper vertical movement range
  const randomYOffset = (Math.random() * 20 - 10); // Reduced from ±20 to ±10
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 30 + randomYOffset, // Reduced range from 45 to 30
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 30 + randomYOffset, targetY)
  );
  
  const yDifference = limitedTargetY - player.position.y;
  
  // Slightly reduced vertical movement speed
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.09, 1.3) * eloSpeedMultiplier;
  
  // Strongly prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    const verticalPriorityMultiplier = 0.95 + Math.random() * 0.05; // Higher priority, less randomness
    moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
  }
  
  // Add minimal final noise with greatly reduced amplitude
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Minimal hesitation chance
  if (Math.random() < 0.02) { // 2% chance of goalkeeper hesitation (reduced from 5%)
    moveX *= 0.8;
    moveY *= 0.8;
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
