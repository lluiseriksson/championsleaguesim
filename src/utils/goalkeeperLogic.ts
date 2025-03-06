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
      // Convert from 0-1 range to direction - increased movement multipliers for more freedom
      const moveX = (output.moveX * 2 - 1) * 2.2; // Increased from 1.8 to 2.2
      const moveY = (output.moveY * 2 - 1) * 2.5; // Increased from 2.0 to 2.5
      
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Function to constrain goalkeeper to their allowed area
const constrainGoalkeeper = (
  position: { x: number, y: number },
  team: string
): { x: number, y: number } => {
  const isLeftSide = team === 'red';
  
  // Set boundaries based on team
  const minX = isLeftSide ? 12 : PITCH_WIDTH - 120;
  const maxX = isLeftSide ? 120 : PITCH_WIDTH - 12;
  
  // Enforce goalkeeper position limits
  const constrainedX = Math.max(minX, Math.min(maxX, position.x));
  
  // Vertical limits
  const centerY = PITCH_HEIGHT / 2;
  const goalHeight = 200;
  const minY = Math.max(12, centerY - goalHeight);
  const maxY = Math.min(PITCH_HEIGHT - 12, centerY + goalHeight);
  
  // Enforce vertical position limits
  const constrainedY = Math.max(minY, Math.min(maxY, position.y));
  
  return {
    x: constrainedX,
    y: constrainedY
  };
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // First try to use neural network if available - increased probability to 80%
  if (player.brain && Math.random() > 0.2) { // More neural network usage (0.2 instead of 0.3)
    const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain);
    if (neuralMovement) {
      // Add randomness to neural network output and respect boundaries
      const rawX = addPositioningNoise(neuralMovement.x, player.teamElo);
      const rawY = addPositioningNoise(neuralMovement.y, player.teamElo);
      
      // Apply additional movement constraints to ensure goalkeepers stay in position
      const isLeftSide = player.team === 'red';
      const maxForwardX = isLeftSide ? 120 : PITCH_WIDTH - 240;
      const minBackwardX = isLeftSide ? 30 : PITCH_WIDTH - 40;
      
      // Limit horizontal movement based on team side
      const constrainedX = isLeftSide
        ? Math.min(Math.max(rawX, -2), 2) // More conservative for red team
        : Math.min(Math.max(rawX, -2), 2); // More conservative for blue team
      
      // Limit vertical movement
      const constrainedY = Math.min(Math.max(rawY, -2.5), 2.5);
      
      const newPosition = {
        x: player.position.x + constrainedX,
        y: player.position.y + constrainedY
      };
      
      // Apply position constraints
      const safePosition = constrainGoalkeeper(newPosition, player.team);
      
      return {
        x: constrainedX * (safePosition.x === newPosition.x ? 1 : 0.5),
        y: constrainedY * (safePosition.y === newPosition.y ? 1 : 0.5)
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
  
  // Calculate horizontal movement - with tighter constraints
  let moveX = 0;
  
  // More restricted goalkeeper movement range
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 150 && ballMovingTowardGoal) || // Reduced from 180 to 150
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 150 && ballMovingTowardGoal); // Reduced from 180 to 150
  
  if (shouldMoveForward) {
    // Allow goalkeeper to move further from goal line but more restricted
    const maxAdvance = isLeftSide ? 120 : PITCH_WIDTH - 120; // Reduced from 150 to 120
    
    // Add less randomness to max advance distance
    const randomizedMaxAdvance = maxAdvance + (Math.random() * 40 - 20); // Reduced from ±30 to ±20
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 25, randomizedMaxAdvance)
      : Math.max(ball.position.x + 25, randomizedMaxAdvance);
    
    // Move faster when ball is coming directly at goal but add more randomness
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const randomFactor = 0.8 + Math.random() * 0.6; // Reduced randomness from 0.8 to 0.6
    
    // Reduced speed multipliers
    const baseSpeedMultiplier = directShot ? 1.5 * randomFactor : 1.2 * randomFactor; // Reduced from 1.7/1.4 to 1.5/1.2
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with less random positioning
    const randomGoalLineOffset = (Math.random() * 30 - 15); // Reduced from ±22.5 to ±15
    const targetGoalLine = goalLine + randomGoalLineOffset;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Increased speed for returning to position to ensure keepers get back in position faster
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.15, 1.5) * eloSpeedMultiplier; // Adjusted from 0.12/1.4 to 0.15/1.5
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
  
  // Add final noise to movement with reduced randomness
  moveX = addPositioningNoise(moveX, player.teamElo) * 0.85; // Added 0.85 multiplier to reduce overall movement
  moveY = addPositioningNoise(moveY, player.teamElo) * 0.9; // Added 0.9 multiplier to reduce overall movement
  
  // Reduced hesitation chance and increased movement during hesitation
  if (Math.random() < 0.08) { // 8% chance of goalkeeper hesitation (reduced from 10%)
    moveX *= 0.6; // Increased from 0.5 to 0.6
    moveY *= 0.6; // Increased from 0.5 to 0.6
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  // Apply hard constraints to prevent goalkeepers from wandering too far
  if (isLeftSide) {
    if (player.position.x < 10) moveX = Math.max(0.5, moveX); // Force movement away from edge
    if (player.position.x > 120) moveX = Math.min(-0.5, moveX); // Force movement back to position
  } else {
    if (player.position.x > PITCH_WIDTH - 10) moveX = Math.min(-0.5, moveX); // Force movement away from edge
    if (player.position.x < PITCH_WIDTH - 120) moveX = Math.max(0.5, moveX); // Force movement back to position
  }
  
  // Apply vertical constraints
  if (player.position.y < 100) moveY = Math.max(0.3, moveY); // Force movement down if too high
  if (player.position.y > PITCH_HEIGHT - 100) moveY = Math.min(-0.3, moveY); // Force movement up if too low
  
  // Check if resulting position would be valid
  const newPosition = {
    x: player.position.x + moveX,
    y: player.position.y + moveY
  };
  
  // Apply position constraints
  const safePosition = constrainGoalkeeper(newPosition, player.team);
  
  // If the constrained position is different, adjust movement to respect boundaries
  if (safePosition.x !== newPosition.x) {
    moveX = safePosition.x - player.position.x;
  }
  
  if (safePosition.y !== newPosition.y) {
    moveY = safePosition.y - player.position.y;
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
