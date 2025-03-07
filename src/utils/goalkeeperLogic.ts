import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±1000 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -1000), 1000);
  
  // For each ELO point difference, we adjust by 0.1% (0.001)
  // Increase base multiplier to make movements more noticeable
  const speedMultiplier = 0.95 - Math.max(0, -eloDifference) * 0.0004; // Increased from 0.90 to 0.95
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.25; // Increased from 0.20 to 0.25
  const eloBonus = playerElo ? Math.min(0.10, Math.max(0, (playerElo - 1500) / 5000)) : 0;
  const noiseLevel = baseNoise - eloBonus;
  
  // Generate random noise
  const noise = (Math.random() * 2 - 1) * noiseLevel;
  
  return value + noise;
};

// Increased chance of using neural network for goalkeeper from 35% to 50% when well positioned
const useNeuralNetworkForGoalkeeper = (
  player: Player, 
  ball: Ball, 
  brain: NeuralNet,
  isWellPositioned: boolean
): { x: number, y: number } | null => {
  // Use neural network more often when goalkeeper is well positioned
  // Otherwise keep original 5% chance
  const neuralNetworkChance = isWellPositioned ? 0.5 : 0.8; // Increased neural network usage (from 0.65/0.90)
  
  if (Math.random() < neuralNetworkChance) { // 50% chance when well positioned, 20% otherwise
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
    
    // Use the neural network output with enhanced influence when well positioned
    if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
      // Increase neural network influence when goalkeeper is well-positioned
      const positionInfluenceMultiplier = isWellPositioned ? 1.0 : 0.4; // Increased from 0.9 to 1.0 and from 0.3 to 0.4
      const moveX = (output.moveX * 2 - 1) * positionInfluenceMultiplier; // Increased influence
      const moveY = (output.moveY * 2 - 1) * (isWellPositioned ? 1.2 : 0.6); // Increased from 1.0 to 1.2 and from 0.5 to 0.6
      
      console.log(`GK ${player.team}: USING NEURAL NETWORK - influence: ${positionInfluenceMultiplier.toFixed(1)}`);
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
  
  // Calculate distance to ball - defined at the top level of the function so it's available everywhere
  const dx = ball.position.x - player.position.x;
  const dy = ball.position.y - player.position.y;
  const distanceToBall = Math.sqrt(dx * dx + dy * dy);
  
  // IMPORTANT: Always start by calculating movement to return to center first
  let moveX = 0;
  let moveY = 0;
  
  // Calculate current distance from optimal position (goal center)
  const distanceToGoalLine = Math.abs(player.position.x - goalLine);
  const distanceToCenter = Math.abs(player.position.y - goalCenter);
  
  // First, always prioritize returning to goal line if not there
  // MODIFIED: Reduced priority of returning to goal line by increasing threshold
  if (distanceToGoalLine > 5) { // Increased from 3 to 5
    const returnSpeed = Math.min(distanceToGoalLine * 0.3, 3.5) * 1.6; // Kept the same
    moveX = Math.sign(goalLine - player.position.x) * returnSpeed;
    console.log(`GK ${player.team}: RETURNING TO GOAL LINE`);
  }
  
  // Second, always prioritize centering vertically if not centered
  // MODIFIED: Reduced priority of centering by increasing threshold
  if (distanceToCenter > 5) { // Increased from 3 to 5
    const centeringSpeed = Math.min(distanceToCenter * 0.2, 2.2) * 1.5; // Kept the same
    moveY = Math.sign(goalCenter - player.position.y) * centeringSpeed;
    console.log(`GK ${player.team}: CENTERING VERTICALLY`);
  }
  
  // Once we're close to the ideal position (center of goal), then track the ball
  // MODIFIED: Increased thresholds to allow more movement around the ideal position
  const isNearIdealPosition = distanceToGoalLine <= 8 && distanceToCenter <= 20; // Increased from 5 to 8 and from 15 to 20
  
  if (isNearIdealPosition) {
    // First try to use neural network with increased frequency when well positioned
    if (player.brain) {
      const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain, true);
      if (neuralMovement) {
        // Add minimal randomness to neural network output
        return {
          x: addPositioningNoise(neuralMovement.x * 1.2, player.teamElo), // Boosted by 20%
          y: addPositioningNoise(neuralMovement.y * 1.2, player.teamElo)  // Boosted by 20%
        };
      }
    }
    
    // Calculate if ball is moving toward goal
    const ballMovingTowardGoal = 
      (isLeftSide && ball.velocity.x < -1) || 
      (!isLeftSide && ball.velocity.x > 1);
    
    // Calculate expected ball position based on trajectory
    // ENHANCED: Use more velocity for prediction to react earlier
    const velocityMultiplier = 15; // Kept the same
    const expectedBallY = ball.position.y + (ball.velocity.y * velocityMultiplier);
    
    // Apply ELO-based speed multiplier
    const eloSpeedMultiplier = calculateGoalkeeperSpeedMultiplier(player.teamElo, opposingTeamElo);
    
    // ENHANCED: Significantly increase the detection range for balls coming toward goal
    const ballIsVeryClose = isLeftSide 
      ? ball.position.x < 100 && distanceToBall < 100  // Kept the same
      : ball.position.x > PITCH_WIDTH - 100 && distanceToBall < 100;
      
    // Only allow minimal forward movement when ball is extremely close
    if (ballIsVeryClose && ballMovingTowardGoal) {
      // MODIFIED: Increased maximum forward movement for more aggressive play
      const maxAdvance = isLeftSide ? 65 : PITCH_WIDTH - 65; // Increased from 60 to 65
      
      // Calculate target X position (much closer to goal line)
      const targetX = isLeftSide 
        ? Math.min(ball.position.x - 15, maxAdvance) // Kept the same
        : Math.max(ball.position.x + 15, maxAdvance);
      
      // Check if goalkeeper is already ahead of the target position
      const isAheadOfTarget = (isLeftSide && player.position.x > targetX) || 
                           (!isLeftSide && player.position.x < targetX);
      
      if (isAheadOfTarget) {
        // If ahead of target, move back to goal line quickly
        moveX = isLeftSide ? -2.5 : 2.5; // Kept the same
      } else {
        // MODIFIED: Increased forward movement speed
        moveX = Math.sign(targetX - player.position.x) * 1.1 * eloSpeedMultiplier; // Increased from 0.9 to 1.1
      }
    }
    
    // Calculate vertical movement to track the ball or expected ball position
    // If ball is moving fast, anticipate where it will go, with reduced error
    const isBallMovingFast = Math.abs(ball.velocity.y) > 2.5; // Kept the same
    // MODIFIED: Reduced prediction error for better positioning
    const predictionError = Math.random() * 4 - 2; // Reduced error range from ±3 to ±2
    const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
    
    // MODIFIED: Further reduced centering bias for better lateral responsiveness
    const centeringBias = isLeftSide 
      ? (ball.position.x > 300 ? 0.10 : 0.05) // Reduced from 0.15 to 0.10 and from 0.08 to 0.05
      : (ball.position.x < PITCH_WIDTH - 300 ? 0.10 : 0.05);
    
    // Adjust for balls near the goal sides
    const distanceFromGoalCenter = Math.abs(ball.position.y - goalCenter);
    const isBallNearGoalSide = distanceFromGoalCenter > GOAL_HEIGHT/3 && distanceFromGoalCenter < GOAL_HEIGHT*1.2;
    
    // MODIFIED: Further reduced centering bias for lateral balls
    const ballSideBias = isBallNearGoalSide ? 0.02 : centeringBias; // Reduced from 0.05 to 0.02
    
    // More aggressive toward sides when ball is near goal and on sides
    const isCloseToGoal = isLeftSide 
      ? ball.position.x < 170 // Kept the same
      : ball.position.x > PITCH_WIDTH - 170;
      
    const finalCenteringBias = isCloseToGoal && isBallNearGoalSide ? 0.0 : ballSideBias; // Reduced from 0.01 to 0.0
    
    // Apply the adjusted bias
    const centeredTargetY = targetY * (1 - finalCenteringBias) + goalCenter * finalCenteringBias;
    
    // MODIFIED: Increased Y movement range to cover sides better
    const maxYDistance = GOAL_HEIGHT/2 + 65; // Increased from 50 to 65
    const limitedTargetY = Math.max(
      PITCH_HEIGHT/2 - maxYDistance,
      Math.min(PITCH_HEIGHT/2 + maxYDistance, centeredTargetY)
    );
    
    // ENHANCED: Increased reaction speed for lateral shots
    const yDifference = limitedTargetY - player.position.y;
    
    // MODIFIED: Increased vertical speed multiplier for quicker side-to-side movement
    let verticalSpeedMultiplier = 2.0; // Increased from 1.7 to 2.0
    
    // If ball is going directly to center, reduce speed to avoid errors
    if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 1.4; // Increased from 1.2 to 1.4
    } 
    // If ball is going to sides, increase speed
    else if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 2.3; // Increased from 2.0 to 2.3
      
      // Extra boost for balls very close to sides
      if (Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/2) {
        verticalSpeedMultiplier = 2.6; // Increased from 2.3 to 2.6
      }
    }
    
    // ENHANCED: Increased adjustment factor based on ball horizontal velocity
    const ballHorizontalVelocity = Math.abs(ball.velocity.x);
    if (ballHorizontalVelocity > 4 && ballMovingTowardGoal) { // Kept the same
      // If ball is coming fast and direct, increase reactivity even more
      verticalSpeedMultiplier *= 1.9; // Increased from 1.7 to 1.9
    }
    
    // MODIFIED: Increased vertical movement speed coefficient
    moveY = Math.sign(yDifference) * 
            Math.min(Math.abs(yDifference) * 0.25 * verticalSpeedMultiplier, 3.0) * // Increased from 0.22 to 0.25 and from 2.5 to 3.0
            eloSpeedMultiplier;
    
    // MODIFIED: Reduced smoothed bias toward center when goalkeeper is far
    if (Math.abs(player.position.y - goalCenter) > 40) { // Increased from 35 to 40
      const centeringCorrection = Math.sign(goalCenter - player.position.y) * 0.2; // Reduced from 0.3 to 0.2
      moveY = moveY * 0.8 + centeringCorrection; // Increased from 0.6 to 0.8 (less prioritization of lateral movement)
    }
    
    // Prioritize vertical movement when ball is coming directly to goal
    if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 150) { // Kept the same
      // ENHANCED: Increased priority for lateral shots
      const isLateralShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3;
      const verticalPriorityMultiplier = isLateralShot ? 1.7 : (1.2 + Math.random() * 0.2); // Increased from 1.5 to 1.7 and from 1.0 to 1.2
      moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
    }
    
    // Log for lateral shots
    if (isBallNearGoalSide && ballMovingTowardGoal && isCloseToGoal) {
      console.log(`GK ${player.team}: LATERAL SHOT RESPONSE - moveY: ${moveY.toFixed(2)}, bias: ${finalCenteringBias.toFixed(2)}`);
    }
    
    // MODIFIED: Decreased threshold for micro-movements to create more movement
    if (Math.abs(moveX) < 0.25 && Math.abs(moveY) < 0.25) { // Decreased from 0.3 to 0.25
      // Try to use neural network again if we're idle
      if (player.brain) {
        const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain, true);
        if (neuralMovement) {
          // ENHANCED: Increase random noise to neural output
          moveX = neuralMovement.x * 1.5 + (Math.random() - 0.5) * 0.4; // Increased from 1.3 to 1.5 and from 0.3 to 0.4
          moveY = neuralMovement.y * 1.5 + (Math.random() - 0.5) * 0.4; // Increased from 1.3 to 1.5 and from 0.3 to 0.4
          console.log(`GK ${player.team}: IDLE STATE NEURAL DECISION`);
        } else {
          // Fall back to micro-movements with larger values
          moveX = (Math.random() - 0.5) * 1.0; // Increased from 0.8 to 1.0
          moveY = (Math.random() - 0.5) * 1.2; // Increased from 1.0 to 1.2
          console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT`);
        }
      } else {
        // No neural network, use random micro-movements
        moveX = (Math.random() - 0.5) * 1.0; // Increased from 0.8 to 1.0
        moveY = (Math.random() - 0.5) * 1.2; // Increased from 1.0 to 1.2
        console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT (NO NEURAL)`);
      }
    }
    
    // ENHANCED: Special case for when ball is heading straight at goalkeeper
    const ballHeadingDirectlyAtGoalkeeper = 
      Math.abs(ball.velocity.y) < 2 && 
      ((isLeftSide && ball.velocity.x < -3) || (!isLeftSide && ball.velocity.x > 3)) &&
      Math.abs(ball.position.y - player.position.y) < 30;
    
    if (ballHeadingDirectlyAtGoalkeeper) {
      // Add small random vertical movement to avoid predictability
      // MODIFIED: Increased randomness for direct shots
      const randomYMove = (Math.random() - 0.5) * 2.0; // Increased from 1.5 to 2.0
      moveY = moveY * 0.2 + randomYMove; // Decreased from 0.3 to 0.2 (more random movement)
      console.log(`GK ${player.team}: BALL HEADING DIRECTLY AT GOALKEEPER`);
    }
  }
  
  // Add final minimal noise to movement - slightly increased
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // MODIFIED: Reduced hesitation probability even further
  if (Math.random() < 0.01) { // Reduced from 0.02 to 0.01 (1% chance of hesitation)
    moveX *= 0.95; // Increased from 0.9 to 0.95 to make hesitation even less severe
    moveY *= 0.95; // Increased from 0.9 to 0.95
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  // MODIFIED: Increased allowable distance from goal line
  const maxDistanceFromGoalLine = 75; // Increased from 65 to 75
  if (Math.abs(player.position.x - goalLine) > maxDistanceFromGoalLine) {
    // Override movement to return to goal line urgently
    moveX = Math.sign(goalLine - player.position.x) * 3.5; // Kept the same
    console.log(`GK ${player.team}: EMERGENCY RETURN TO GOAL LINE`);
  }
  
  // MODIFIED: Reduced correction to stay near goal center when idle
  const isIdle = Math.abs(moveX) < 0.3 && Math.abs(moveY) < 0.3; // Kept the same
  if (isIdle && Math.abs(player.position.y - goalCenter) > GOAL_HEIGHT/3) { // Increased from GOAL_HEIGHT/4
    moveY = Math.sign(goalCenter - player.position.y) * 0.6; // Reduced from 0.8 to 0.6
    console.log(`GK ${player.team}: CENTER CORRECTION`);
  }
  
  // MODIFIED: Further reduced minimum movement threshold to avoid looking static
  if (Math.abs(moveX) < 0.04 && Math.abs(moveY) < 0.04) { // Reduced from 0.06 to 0.04
    // If movement is very small, add a small random movement
    moveX = (Math.random() - 0.5) * 0.9; // Increased from 0.7 to 0.9
    moveY = (Math.random() - 0.5) * 1.0; // Increased from 0.8 to 1.0
    console.log(`GK ${player.team}: FORCING MINIMUM MOVEMENT`);
  }
  
  // MODIFIED: Amplify small movements even more for better visibility
  if (0.04 <= Math.abs(moveX) && Math.abs(moveX) < 0.15) {
    moveX *= 1.8; // Increased from 1.6 to 1.8
    console.log(`GK ${player.team}: BOOSTING SMALL X MOVEMENT`);
  }
  
  if (0.04 <= Math.abs(moveY) && Math.abs(moveY) < 0.15) {
    moveY *= 1.8; // Increased from 1.6 to 1.8
    console.log(`GK ${player.team}: BOOSTING SMALL Y MOVEMENT`);
  }
  
  // ENHANCED: Add special ball velocity response when ball is traveling fast
  const ballTravelingFast = Math.abs(ball.velocity.x) > 8 || Math.abs(ball.velocity.y) > 8;
  if (ballTravelingFast && distanceToBall < 200) {
    // MODIFIED: Increase movements to respond to fast ball
    const responseBoost = 1.5; // Increased from 1.3 to 1.5 (50% boost)
    moveX *= responseBoost;
    moveY *= responseBoost;
    console.log(`GK ${player.team}: RESPONDING TO FAST BALL - boost: ${responseBoost.toFixed(1)}x`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), distToCenter: ${distanceToCenter.toFixed(0)}, distToGoalLine: ${distanceToGoalLine.toFixed(0)}`);
  
  return { x: moveX, y: moveY };
};
