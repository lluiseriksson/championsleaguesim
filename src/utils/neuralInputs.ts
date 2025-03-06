
import { Ball, Player, TeamContext, NeuralInput } from '../types/football';
import { calculateDistance, normalizeValue } from './neuralCore';

// Calculate inputs for the neural network
export const calculateNetworkInputs = (ball: Ball, player: Player, context: TeamContext): NeuralInput => {
  // Normalize values for the neural network (between 0 and 1)
  const normalizedBallX = normalizeValue(ball.position.x, 0, 800);
  const normalizedBallY = normalizeValue(ball.position.y, 0, 600);
  const normalizedPlayerX = normalizeValue(player.position.x, 0, 800);
  const normalizedPlayerY = normalizeValue(player.position.y, 0, 600);
  
  // Calculate distances and angles to OPPONENT goal - crucial for shooting direction
  const distanceToGoal = calculateDistance(player.position, context.opponentGoal);
  const normalizedDistanceToGoal = normalizeValue(distanceToGoal, 0, 1000);
  
  const angleToGoal = Math.atan2(
    context.opponentGoal.y - player.position.y,
    context.opponentGoal.x - player.position.x
  );
  const normalizedAngleToGoal = normalizeValue(angleToGoal, -Math.PI, Math.PI);
  
  // Calculate distance and angle to OWN goal to help avoid own goals
  const distanceToOwnGoal = calculateDistance(player.position, context.ownGoal);
  const normalizedDistanceToOwnGoal = normalizeValue(distanceToOwnGoal, 0, 1000);
  
  const angleToOwnGoal = Math.atan2(
    context.ownGoal.y - player.position.y,
    context.ownGoal.x - player.position.x
  );
  const normalizedAngleToOwnGoal = normalizeValue(angleToOwnGoal, -Math.PI, Math.PI);
  
  // ENHANCED: More precise detection of dangerous own goal situations
  // Check if player is between ball and own goal (extremely dangerous for own goals)
  const isBetweenBallAndOwnGoal = ((player.team === 'red' && 
                                   player.position.x < ball.position.x && 
                                   player.position.x > context.ownGoal.x) || 
                                  (player.team === 'blue' && 
                                   player.position.x > ball.position.x && 
                                   player.position.x < context.ownGoal.x)) ? 1 : 0;
  
  // Check if player is facing own goal (dangerous for own goals)
  // IMPROVED: More accurate check based on ball and player positions
  const isFacingOwnGoal = ((player.team === 'red' && 
                          ((ball.position.x < player.position.x) || 
                           (Math.abs(angleToOwnGoal) < Math.PI/4))) || 
                          (player.team === 'blue' && 
                          ((ball.position.x > player.position.x) || 
                           (Math.abs(angleToOwnGoal) < Math.PI/4)))) ? 1 : 0;
  
  // Find nearest teammate
  let nearestTeammateDistance = 1000;
  let nearestTeammateAngle = 0;
  
  if (context.teammates.length > 0) {
    for (const teammate of context.teammates) {
      const distance = calculateDistance(player.position, teammate);
      if (distance < nearestTeammateDistance) {
        nearestTeammateDistance = distance;
        nearestTeammateAngle = Math.atan2(
          teammate.y - player.position.y, 
          teammate.x - player.position.x
        );
      }
    }
  }
  
  const normalizedTeammateDistance = normalizeValue(nearestTeammateDistance, 0, 1000);
  const normalizedTeammateAngle = normalizeValue(nearestTeammateAngle, -Math.PI, Math.PI);
  
  // Find nearest opponent
  let nearestOpponentDistance = 1000;
  let nearestOpponentAngle = 0;
  
  if (context.opponents.length > 0) {
    for (const opponent of context.opponents) {
      const distance = calculateDistance(player.position, opponent);
      if (distance < nearestOpponentDistance) {
        nearestOpponentDistance = distance;
        nearestOpponentAngle = Math.atan2(
          opponent.y - player.position.y, 
          opponent.x - player.position.x
        );
      }
    }
  }
  
  const normalizedOpponentDistance = normalizeValue(nearestOpponentDistance, 0, 1000);
  const normalizedOpponentAngle = normalizeValue(nearestOpponentAngle, -Math.PI, Math.PI);
  
  // ENHANCED: Better flags for special situations and direction
  const distanceToBall = calculateDistance(player.position, ball.position);
  
  // Improve shooting range detection with directional component
  let isInShootingRange = 0;
  if (distanceToBall < 100 && distanceToGoal < 300) {
    // Add directional awareness: only consider in shooting range if player is on correct side
    if ((player.team === 'red' && player.position.x > 400) || 
        (player.team === 'blue' && player.position.x < 400)) {
      isInShootingRange = 1;
    } else {
      // Far from correct shooting position, reduce shooting probability
      isInShootingRange = 0.2;
    }
  }
  
  const isInPassingRange = distanceToBall < 80 && nearestTeammateDistance < 200 ? 1 : 0;
  
  // ENHANCED: Better detection of dangerous shooting positions
  const isDangerousPosition = (distanceToBall < 100 && distanceToOwnGoal < 200) || 
                             (isBetweenBallAndOwnGoal && distanceToBall < 120) ? 1 : 0;
  
  // Check if defense is required (opponent near our goal with the ball)
  const ballToOwnGoalDistance = calculateDistance(ball.position, context.ownGoal);
  const isDefendingRequired = ballToOwnGoalDistance < 300 ? 1 : 0;
  
  // Add team ELO as an input
  // Normalize team ELO to be between 0 and 1, assuming ELO ranges from 1000 to 3000
  const normalizedTeamElo = player.teamElo ? normalizeValue(player.teamElo, 1000, 3000) : 0.5;
  
  // Calculate ELO advantage compared to average opponent ELO (2000 as default)
  const averageElo = 2000; // Default average ELO if none provided
  const eloAdvantage = player.teamElo ? normalizeValue(player.teamElo - averageElo, -1000, 1000) : 0.5;
  
  return {
    ballX: normalizedBallX,
    ballY: normalizedBallY,
    playerX: normalizedPlayerX,
    playerY: normalizedPlayerY,
    ballVelocityX: normalizeValue(ball.velocity.x, -20, 20),
    ballVelocityY: normalizeValue(ball.velocity.y, -20, 20),
    distanceToGoal: normalizedDistanceToGoal,
    angleToGoal: normalizedAngleToGoal,
    nearestTeammateDistance: normalizedTeammateDistance,
    nearestTeammateAngle: normalizedTeammateAngle,
    nearestOpponentDistance: normalizedOpponentDistance,
    nearestOpponentAngle: normalizedOpponentAngle,
    isInShootingRange,
    isInPassingRange,
    isDefendingRequired,
    // Add new inputs for own goal prevention
    distanceToOwnGoal: normalizedDistanceToOwnGoal,
    angleToOwnGoal: normalizedAngleToOwnGoal,
    isFacingOwnGoal,
    isDangerousPosition,
    isBetweenBallAndOwnGoal,
    // Add team ELO inputs
    teamElo: normalizedTeamElo,
    eloAdvantage: eloAdvantage
  };
};
