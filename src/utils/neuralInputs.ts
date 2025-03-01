
import { Ball, Player, TeamContext, NeuralInput } from '../types/football';
import { calculateDistance, normalizeValue } from './neuralCore';

// Calculate inputs for the neural network
export const calculateNetworkInputs = (ball: Ball, player: Player, context: TeamContext): NeuralInput => {
  // Normalize values for the neural network (between 0 and 1)
  const normalizedBallX = normalizeValue(ball.position.x, 0, 800);
  const normalizedBallY = normalizeValue(ball.position.y, 0, 600);
  const normalizedPlayerX = normalizeValue(player.position.x, 0, 800);
  const normalizedPlayerY = normalizeValue(player.position.y, 0, 600);
  
  // Calculate distances and angles to OPPONENT goal
  const distanceToGoal = calculateDistance(player.position, context.opponentGoal);
  const normalizedDistanceToGoal = normalizeValue(distanceToGoal, 0, 1000);
  
  const angleToGoal = Math.atan2(
    context.opponentGoal.y - player.position.y,
    context.opponentGoal.x - player.position.x
  );
  const normalizedAngleToGoal = normalizeValue(angleToGoal, -Math.PI, Math.PI);
  
  // NEW: Calculate distance and angle to OWN goal to help avoid own goals
  const distanceToOwnGoal = calculateDistance(player.position, context.ownGoal);
  const normalizedDistanceToOwnGoal = normalizeValue(distanceToOwnGoal, 0, 1000);
  
  const angleToOwnGoal = Math.atan2(
    context.ownGoal.y - player.position.y,
    context.ownGoal.x - player.position.x
  );
  const normalizedAngleToOwnGoal = normalizeValue(angleToOwnGoal, -Math.PI, Math.PI);
  
  // Check if player is facing own goal (dangerous for own goals)
  const isFacingOwnGoal = ((player.team === 'red' && normalizedPlayerX < normalizedBallX) ||
                           (player.team === 'blue' && normalizedPlayerX > normalizedBallX)) ? 1 : 0;
  
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
  
  // Enhanced flags for special situations to help reduce own goals
  const distanceToBall = calculateDistance(player.position, ball.position);
  const isInShootingRange = distanceToBall < 100 && distanceToGoal < 300 ? 1 : 0;
  const isInPassingRange = distanceToBall < 80 && nearestTeammateDistance < 200 ? 1 : 0;
  
  // NEW: Flag for dangerous shooting position (likely to cause an own goal)
  const isDangerousPosition = distanceToBall < 100 && distanceToOwnGoal < 200 ? 1 : 0;
  
  // Check if defense is required (opponent near our goal with the ball)
  const ballToOwnGoalDistance = calculateDistance(ball.position, context.ownGoal);
  const isDefendingRequired = ballToOwnGoalDistance < 300 ? 1 : 0;
  
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
    isDangerousPosition
  };
};
