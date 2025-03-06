import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±800 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -800), 800);
  
  // Reduce ELO influence by 70% to greatly favor deterministic behavior
  const speedMultiplier = 0.95 - Math.max(0, -eloDifference) * 0.0001;
  
  return speedMultiplier;
};

// Eliminate noise in positioning for completely deterministic behavior
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Minimal noise only for elite goalkeepers (ELO > 2000)
  const isEliteGoalkeeper = playerElo && playerElo > 2000;
  
  if (isEliteGoalkeeper) {
    // Extremely minimal noise for elite goalkeepers only
    const noise = (Math.random() - 0.5) * 0.05;
    return value + noise;
  }
  
  // No noise for regular goalkeepers
  return value;
};

// Almost never use neural network for goalkeeper (only 5%)
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
  // Reduce neural network usage probability to 5% (from 20%)
  if (player.brain && Math.random() > 0.95) {
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
  const goalLine = isLeftSide ? 20 : PITCH_WIDTH - 20; // Closer to goal line (from 25)
  
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
  
  // Calculate horizontal movement with fixed forward range
  let moveX = 0;
  
  // Fixed goalkeeper aggressiveness with constant forward range
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 100 && ballMovingTowardGoal) || // Fixed value from 120
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 100 && ballMovingTowardGoal); // Fixed value from 120
  
  if (shouldMoveForward) {
    // Fixed distance for goalkeeper to move from goal line
    const maxAdvance = isLeftSide ? 70 : PITCH_WIDTH - 70; // Fixed value from 80
    
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 30, maxAdvance)
      : Math.max(ball.position.x + 30, maxAdvance);
    
    // Deterministic movement with fixed speeds
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    
    // Fixed speed multipliers
    const baseSpeedMultiplier = directShot ? 1.4 : 1.2;
    const adjustedSpeedMultiplier = baseSpeedMultiplier * eloSpeedMultiplier;
    
    moveX = Math.sign(targetX - player.position.x) * adjustedSpeedMultiplier;
  } else {
    // Return to goal line with no random positioning
    const targetGoalLine = goalLine;
    
    const distanceToGoalLine = Math.abs(player.position.x - targetGoalLine);
    
    // Fixed return speed
    moveX = Math.sign(targetGoalLine - player.position.x) * Math.min(distanceToGoalLine * 0.18, 1.4) * eloSpeedMultiplier;
  }
  
  // Calculate vertical movement with fixed range
  let moveY = 0;
  
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  const targetY = isBallMovingFast ? expectedBallY : ball.position.y;
  
  // Fixed goalkeeper vertical movement range
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 25,  // Fixed value from 30
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 25, targetY) // Fixed value from 30
  );
  
  const yDifference = limitedTargetY - player.position.y;
  
  // Fixed vertical movement speed
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.09, 1.3) * eloSpeedMultiplier;
  
  // Vertical movement priority for direct shots
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    moveY = moveY * eloSpeedMultiplier;
  }
  
  // No randomness for completely deterministic movement
  
  // Eliminate hesitation chance entirely
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}, ELO mult: ${eloSpeedMultiplier.toFixed(2)}`);
  
  return { x: moveX, y: moveY };
};
