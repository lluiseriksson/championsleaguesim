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

// Decreased chance of using neural network for goalkeeper to enforce more predictable positioning
const useNeuralNetworkForGoalkeeper = (
  player: Player, 
  ball: Ball, 
  brain: NeuralNet,
  isWellPositioned: boolean
): { x: number, y: number } | null => {
  // Decreased usage of neural network for goalkeepers to ensure they stay in position
  const neuralNetworkChance = isWellPositioned ? 0.2 : 0.3; // Further decreased chances to use traditional positioning more

  if (Math.random() < neuralNetworkChance) { // 20% chance when well positioned, 30% otherwise
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
    
    // Use the neural network output with reduced influence to ensure goalkeepers stay in position
    if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
      // Significantly reduced neural network influence for goalkeepers to stay in position
      const positionInfluenceMultiplier = isWellPositioned ? 0.6 : 0.4; // Reduced from 1.8 to 0.6 and from 1.0 to 0.4
      const moveX = (output.moveX * 2 - 1) * positionInfluenceMultiplier; // Reduced influence
      const moveY = (output.moveY * 2 - 1) * (isWellPositioned ? 0.8 : 0.5); // Reduced from 2.0 to 0.8 and from 1.4 to 0.5
      
      console.log(`GK ${player.team}: USING NEURAL NETWORK - influence: ${positionInfluenceMultiplier.toFixed(1)}`);
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers with stricter position constraints
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
  
  // STRICT POSITIONING: If goalkeeper is too far from goal line, prioritize return
  // Significantly reduced threshold to enforce goalie staying near goal line
  if (distanceToGoalLine > 3) { // Reduced from 5 to 3 - stricter constraint
    const returnSpeed = Math.min(distanceToGoalLine * 0.5, 4.0) * 2.0; // Increased from 0.3 to 0.5 and from 1.6 to 2.0
    moveX = Math.sign(goalLine - player.position.x) * returnSpeed;
    console.log(`GK ${player.team}: URGENT RETURN TO GOAL LINE`);
    
    // If very far from goal line, this is the only movement we allow
    if (distanceToGoalLine > 10) {
      return { 
        x: moveX, 
        y: Math.sign(goalCenter - player.position.y) * Math.min(Math.abs(goalCenter - player.position.y) * 0.2, 1.5)
      };
    }
  }
  
  // Second, prioritize centering vertically
  // Reduced threshold for stricter positioning
  if (distanceToCenter > 3) { // Reduced from 5 to 3
    const centeringSpeed = Math.min(distanceToCenter * 0.3, 2.5) * 1.5; // Increased from 0.2 to 0.3
    moveY = Math.sign(goalCenter - player.position.y) * centeringSpeed;
    console.log(`GK ${player.team}: CENTERING VERTICALLY`);
  }
  
  // MUCH stricter definition of "near ideal position" to limit forward movement
  const isNearIdealPosition = distanceToGoalLine <= 4 && distanceToCenter <= 10; // Reduced from 8/20 to 4/10
  
  if (isNearIdealPosition) {
    // First try to use neural network with decreased influence
    if (player.brain) {
      const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain, true);
      if (neuralMovement) {
        // Add minimal randomness to neural network output with reduced boost
        return {
          x: addPositioningNoise(neuralMovement.x * 0.8, player.teamElo), // Reduced from 1.6 to 0.8
          y: addPositioningNoise(neuralMovement.y * 1.0, player.teamElo)  // Reduced from 1.6 to 1.0
        };
      }
    }
    
    // Calculate if ball is moving toward goal
    const ballMovingTowardGoal = 
      (isLeftSide && ball.velocity.x < -1) || 
      (!isLeftSide && ball.velocity.x > 1);
    
    // Calculate expected ball position based on trajectory
    const velocityMultiplier = 15;
    const expectedBallY = ball.position.y + (ball.velocity.y * velocityMultiplier);
    
    // Apply ELO-based speed multiplier
    const eloSpeedMultiplier = calculateGoalkeeperSpeedMultiplier(player.teamElo, opposingTeamElo);
    
    // DRASTICALLY REDUCED detection range for balls coming toward goal
    const ballIsVeryClose = isLeftSide 
      ? ball.position.x < 80 && distanceToBall < 80  // Reduced from 100 to 80
      : ball.position.x > PITCH_WIDTH - 80 && distanceToBall < 80; // Reduced from 100 to 80
      
    // Severely restrict forward movement
    if (ballIsVeryClose && ballMovingTowardGoal) {
      // REDUCED maximum forward movement to keep goalkeepers in position
      const maxAdvance = isLeftSide ? 40 : PITCH_WIDTH - 40; // Reduced from 65 to 40
      
      // Calculate target X position (much closer to goal line)
      const targetX = isLeftSide 
        ? Math.min(ball.position.x - 25, maxAdvance) // Increased from 15 to 25 (stay further back)
        : Math.max(ball.position.x + 25, maxAdvance);
      
      // Check if goalkeeper is already ahead of the target position
      const isAheadOfTarget = (isLeftSide && player.position.x > targetX) || 
                           (!isLeftSide && player.position.x < targetX);
      
      if (isAheadOfTarget) {
        // If ahead of target, move back to goal line quickly
        moveX = isLeftSide ? -3.5 : 3.5; // Increased from 2.5 to 3.5 for faster retreat
      } else {
        // REDUCED forward movement speed to prevent overcommitting
        moveX = Math.sign(targetX - player.position.x) * 0.6 * eloSpeedMultiplier; // Reduced from 1.1 to 0.6
      }
    }
    
    // Calculate vertical movement to track the ball or expected ball position
    const isBallMovingFast = Math.abs(ball.velocity.y) > 2.5;
    const predictionError = Math.random() * 4 - 2;
    const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
    
    // Only slight centering bias to allow goalkeepers to respond to shots
    const centeringBias = 0.02; // Reduced from 0.05/0.10 to 0.02
    
    // Adjust for balls near the goal sides
    const distanceFromGoalCenter = Math.abs(ball.position.y - goalCenter);
    const isBallNearGoalSide = distanceFromGoalCenter > GOAL_HEIGHT/3 && distanceFromGoalCenter < GOAL_HEIGHT*1.2;
    
    const ballSideBias = isBallNearGoalSide ? 0.01 : centeringBias; // Reduced from 0.02 to 0.01
    
    // Only allow more aggressive side movement when ball is extremely close to goal
    const isCloseToGoal = isLeftSide 
      ? ball.position.x < 80 // Reduced from 170 to 80
      : ball.position.x > PITCH_WIDTH - 80; // Reduced from 170 to 80
      
    const finalCenteringBias = isCloseToGoal && isBallNearGoalSide ? 0.0 : ballSideBias;
    
    // Apply the adjusted bias
    const centeredTargetY = targetY * (1 - finalCenteringBias) + goalCenter * finalCenteringBias;
    
    // REDUCED Y movement range to prevent goalkeepers straying too far
    const maxYDistance = GOAL_HEIGHT/2 + 30; // Reduced from 65 to 30
    const limitedTargetY = Math.max(
      PITCH_HEIGHT/2 - maxYDistance,
      Math.min(PITCH_HEIGHT/2 + maxYDistance, centeredTargetY)
    );
    
    const yDifference = limitedTargetY - player.position.y;
    
    // REDUCED vertical speed multiplier
    let verticalSpeedMultiplier = 1.4; // Reduced from 2.0 to 1.4
    
    // If ball is going directly to center, maintain positioning
    if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 1.2; // Reduced from 1.4 to 1.2
    } 
    // If ball is going to sides, still need reasonable response
    else if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 1.6; // Reduced from 2.3 to 1.6
      
      if (Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/2) {
        verticalSpeedMultiplier = 1.8; // Reduced from 2.6 to 1.8
      }
    }
    
    // Still need to adjust based on incoming ball speed
    const ballHorizontalVelocity = Math.abs(ball.velocity.x);
    if (ballHorizontalVelocity > 4 && ballMovingTowardGoal) {
      // If ball is coming fast and direct, maintain reactivity but don't overdo it
      verticalSpeedMultiplier *= 1.3; // Reduced from 1.9 to 1.3
    }
    
    // REDUCED vertical movement coefficient
    moveY = Math.sign(yDifference) * 
            Math.min(Math.abs(yDifference) * 0.18 * verticalSpeedMultiplier, 2.5) * // Reduced from 0.25 to 0.18 and 3.0 to 2.5
            eloSpeedMultiplier;
    
    // Increased bias toward center when goalkeeper is far from center
    if (Math.abs(player.position.y - goalCenter) > 30) { // Reduced from 40 to 30
      const centeringCorrection = Math.sign(goalCenter - player.position.y) * 0.4; // Increased from 0.2 to 0.4
      moveY = moveY * 0.6 + centeringCorrection; // Decreased from 0.8 to 0.6 (more center bias)
    }
    
    // Only slightly prioritize vertical movement for direct shots
    if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 120) { // Reduced from 150 to 120
      const isLateralShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3;
      const verticalPriorityMultiplier = isLateralShot ? 1.3 : (1.0 + Math.random() * 0.2); // Reduced from 1.7 to 1.3 and 1.2 to 1.0
      moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
    }
    
    // Log for lateral shots
    if (isBallNearGoalSide && ballMovingTowardGoal && isCloseToGoal) {
      console.log(`GK ${player.team}: LATERAL SHOT RESPONSE - moveY: ${moveY.toFixed(2)}, bias: ${finalCenteringBias.toFixed(2)}`);
    }
    
    // Reduce micro-movements to prevent unnecessary wandering
    if (Math.abs(moveX) < 0.2 && Math.abs(moveY) < 0.2) { // Reduced from 0.25 to 0.2
      // Try to use neural network again if we're idle
      if (player.brain) {
        const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain, true);
        if (neuralMovement) {
          // REDUCED random noise to neural output
          moveX = neuralMovement.x * 0.6 + (Math.random() - 0.5) * 0.2; // Reduced from 1.8 to 0.6
          moveY = neuralMovement.y * 0.8 + (Math.random() - 0.5) * 0.2; // Reduced from 1.8 to 0.8
          console.log(`GK ${player.team}: IDLE STATE NEURAL DECISION`);
        } else {
          // Minimal micro-movements
          moveX = (Math.random() - 0.5) * 0.4; // Reduced from 1.0 to 0.4
          moveY = (Math.random() - 0.5) * 0.5; // Reduced from 1.2 to 0.5
          console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT`);
        }
      } else {
        // No neural network, use minimal random micro-movements
        moveX = (Math.random() - 0.5) * 0.4; // Reduced from 1.0 to 0.4
        moveY = (Math.random() - 0.5) * 0.5; // Reduced from 1.2 to 0.5
        console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT (NO NEURAL)`);
      }
    }
    
    // Special case for when ball is heading straight at goalkeeper
    const ballHeadingDirectlyAtGoalkeeper = 
      Math.abs(ball.velocity.y) < 2 && 
      ((isLeftSide && ball.velocity.x < -3) || (!isLeftSide && ball.velocity.x > 3)) &&
      Math.abs(ball.position.y - player.position.y) < 30;
    
    if (ballHeadingDirectlyAtGoalkeeper) {
      // Minimal random vertical movement
      const randomYMove = (Math.random() - 0.5) * 0.8; // Reduced from 2.0 to 0.8
      moveY = moveY * 0.2 + randomYMove;
      console.log(`GK ${player.team}: BALL HEADING DIRECTLY AT GOALKEEPER`);
    }
  }
  
  // Minimal noise to movement
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // VERY STRICT CONSTRAINT: If goalkeeper is outside allowed zone, force immediate return
  // DRASTICALLY REDUCED allowed distance from goal line
  const maxDistanceFromGoalLine = 40; // Reduced from 85 to 40
  if (Math.abs(player.position.x - goalLine) > maxDistanceFromGoalLine) {
    // Override ALL movement to return to goal line urgently with maximum speed
    moveX = Math.sign(goalLine - player.position.x) * 4.5; // Increased from 3.5 to 4.5
    console.log(`GK ${player.team}: EMERGENCY RETURN TO GOAL LINE`);
    return { x: moveX, y: Math.sign(goalCenter - player.position.y) * 1.5 }; // Also force return to center
  }
  
  // Stronger center bias for idle goalkeepers
  const isIdle = Math.abs(moveX) < 0.3 && Math.abs(moveY) < 0.3;
  if (isIdle && Math.abs(player.position.y - goalCenter) > GOAL_HEIGHT/3) { // Reduced from GOAL_HEIGHT/2 to GOAL_HEIGHT/3
    moveY = Math.sign(goalCenter - player.position.y) * 0.8; // Increased from 0.6 to 0.8
    console.log(`GK ${player.team}: CENTER CORRECTION`);
  }
  
  // Minimal movement threshold to allow goalkeepers to be more static
  if (Math.abs(moveX) < 0.08 && Math.abs(moveY) < 0.08) { // Increased from 0.04 to 0.08
    // If movement is very small, add only a tiny random movement
    moveX = (Math.random() - 0.5) * 0.3; // Reduced from 0.9 to 0.3
    moveY = (Math.random() - 0.5) * 0.4; // Reduced from 1.0 to 0.4
    console.log(`GK ${player.team}: MINIMAL MOVEMENT`);
  }
  
  // Reduced amplification of small movements
  if (0.08 <= Math.abs(moveX) && Math.abs(moveX) < 0.15) {
    moveX *= 1.2; // Reduced from 1.8 to 1.2
  }
  
  if (0.08 <= Math.abs(moveY) && Math.abs(moveY) < 0.15) {
    moveY *= 1.2; // Reduced from 1.8 to 1.2
  }
  
  // Only boost response to very close and fast balls
  const ballTravelingFast = Math.abs(ball.velocity.x) > 8 || Math.abs(ball.velocity.y) > 8;
  if (ballTravelingFast && distanceToBall < 100) { // Reduced from 200 to 100
    // REDUCED response boost
    const responseBoost = 1.2; // Reduced from 1.5 to 1.2
    moveX *= responseBoost;
    moveY *= responseBoost;
    console.log(`GK ${player.team}: RESPONDING TO FAST BALL - boost: ${responseBoost.toFixed(1)}x`);
  }
  
  // FINAL SAFETY CHECK - ensure X movement is constrained to prevent goalkeepers from leaving goal area
  if (isLeftSide) {
    moveX = Math.min(moveX, 1.0); // Positive X movement (away from goal) is severely limited
    if (player.position.x > 60) { // If already too far out
      moveX = -2.0; // Force movement back to goal
    }
  } else {
    moveX = Math.max(moveX, -1.0); // Negative X movement (away from goal) is severely limited
    if (player.position.x < PITCH_WIDTH - 60) { // If already too far out
      moveX = 2.0; // Force movement back to goal
    }
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), distToCenter: ${distanceToCenter.toFixed(0)}, distToGoalLine: ${distanceToGoalLine.toFixed(0)}`);
  
  return { x: moveX, y: moveY };
};
