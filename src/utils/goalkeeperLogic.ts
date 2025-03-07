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
  // Define goal position constants
  const isLeftSide = player.team === 'red';
  const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
  const goalCenter = PITCH_HEIGHT / 2;
  
  // IMPORTANT: Always start by calculating movement to return to center first
  let moveX = 0;
  let moveY = 0;
  
  // Calculate current distance from optimal position (goal center)
  const distanceToGoalLine = Math.abs(player.position.x - goalLine);
  const distanceToCenter = Math.abs(player.position.y - goalCenter);
  
  // First, always prioritize returning to goal line if not there
  if (distanceToGoalLine > 3) {
    const returnSpeed = Math.min(distanceToGoalLine * 0.2, 2.5) * 1.2; // Increased speed to return to goal line
    moveX = Math.sign(goalLine - player.position.x) * returnSpeed;
    console.log(`GK ${player.team}: RETURNING TO GOAL LINE`);
  }
  
  // Second, always prioritize centering vertically if not centered
  if (distanceToCenter > 3) {
    const centeringSpeed = Math.min(distanceToCenter * 0.15, 1.8) * 1.1; // Increased centering speed
    moveY = Math.sign(goalCenter - player.position.y) * centeringSpeed;
    console.log(`GK ${player.team}: CENTERING VERTICALLY`);
  }
  
  // Once we're close to the ideal position (center of goal), then track the ball
  const isNearIdealPosition = distanceToGoalLine <= 3 && distanceToCenter <= 10;
  
  if (isNearIdealPosition) {
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
    
    // FIXED: Greatly reduce goalkeeper forward movement and ensure they return to goal line
    const ballIsVeryClose = isLeftSide 
      ? ball.position.x < 60 && distanceToBall < 60
      : ball.position.x > PITCH_WIDTH - 60 && distanceToBall < 60;
      
    // Only allow minimal forward movement when ball is extremely close
    if (ballIsVeryClose && ballMovingTowardGoal) {
      // Maximum forward movement is now very limited
      const maxAdvance = isLeftSide ? 40 : PITCH_WIDTH - 40;
      
      // Calculate target X position (much closer to goal line)
      const targetX = isLeftSide 
        ? Math.min(ball.position.x - 20, maxAdvance)
        : Math.max(ball.position.x + 20, maxAdvance);
      
      // Check if goalkeeper is already ahead of the target position
      const isAheadOfTarget = (isLeftSide && player.position.x > targetX) || 
                           (!isLeftSide && player.position.x < targetX);
      
      if (isAheadOfTarget) {
        // If ahead of target, move back to goal line quickly
        moveX = isLeftSide ? -1.5 : 1.5; // Increased return speed
      } else {
        // Move forward cautiously
        moveX = Math.sign(targetX - player.position.x) * 0.4 * eloSpeedMultiplier;
      }
    }
    
    // Calculate vertical movement to track the ball or expected ball position
    // If ball is moving fast, anticipate where it will go, with reduced error
    const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
    // Reduced prediction error for better positioning
    const predictionError = Math.random() * 10 - 5; // Reduced error range from ±10 to ±5
    const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
    
    // NEW: Position closer to goal center when ball is far away
    const centeringBias = isLeftSide 
      ? (ball.position.x > 300 ? 0.7 : 0.4) // Increased bias toward center 
      : (ball.position.x < PITCH_WIDTH - 300 ? 0.7 : 0.4);
    
    // NEW: More heavily bias toward goal center when ball is far
    const ballDistanceFromGoal = isLeftSide 
      ? Math.abs(ball.position.x - 0) 
      : Math.abs(ball.position.x - PITCH_WIDTH);
      
    const centeredTargetY = targetY * (1 - centeringBias) + goalCenter * centeringBias;
    
    // Further eliminated random Y offset entirely
    const limitedTargetY = Math.max(
      PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 10, // Reduced padding from 20 to 10
      Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 10, centeredTargetY) // Reduced padding from 20 to 10
    );
    
    // Calculate vertical movement with increased responsiveness for better positioning
    const yDifference = limitedTargetY - player.position.y;
    
    // FURTHER REDUCED: vertical movement speed for shots coming directly at goal
    let verticalSpeedMultiplier = 1.0;
    if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2) {
      // Reduce speed for direct shots
      verticalSpeedMultiplier = 0.7; // Increased from 0.6 for slightly better response
    }
    
    moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.1 * verticalSpeedMultiplier, 1.0) * eloSpeedMultiplier;
    
    // NEW: Additional centering correction - always have a slight bias toward goal center
    if (Math.abs(player.position.y - goalCenter) > 5) {
      const centeringCorrection = Math.sign(goalCenter - player.position.y) * 0.2;
      moveY = moveY * 0.8 + centeringCorrection;
    }
    
    // Prioritize vertical movement when ball is coming directly at goal
    if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
      // Balance horizontal and vertical movement
      const verticalPriorityMultiplier = 0.7 + Math.random() * 0.2;
      moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
    }
  }
  
  // Add minimal final noise to movement
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Decreased hesitation chance for more consistent movement
  if (Math.random() < 0.08) { // 8% chance of goalkeeper hesitation
    moveX *= 0.7; 
    moveY *= 0.7;
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  // FIXED: Force goalkeeper to return to goal line if too far away
  const maxDistanceFromGoalLine = 45;
  if (Math.abs(player.position.x - goalLine) > maxDistanceFromGoalLine) {
    // Override movement to return to goal line with urgency
    moveX = Math.sign(goalLine - player.position.x) * 2.5;
    console.log(`GK ${player.team}: EMERGENCY RETURN TO GOAL LINE`);
  }
  
  // NEW: Extra correction to stay near goal center vertically when idle
  const isIdle = Math.abs(moveX) < 0.2 && Math.abs(moveY) < 0.2;
  if (isIdle && Math.abs(player.position.y - goalCenter) > GOAL_HEIGHT/4) {
    moveY = Math.sign(goalCenter - player.position.y) * 0.5;
    console.log(`GK ${player.team}: CENTER CORRECTION`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), distToCenter: ${distanceToCenter.toFixed(0)}, distToGoalLine: ${distanceToGoalLine.toFixed(0)}`);
  
  return { x: moveX, y: moveY };
};
