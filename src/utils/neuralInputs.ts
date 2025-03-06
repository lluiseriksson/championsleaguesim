
import { Ball, Player, TeamContext, NeuralInput } from '../types/football';
import { calculateDistance, normalizeValue } from './neuralCore';

export const calculateNetworkInputs = (ball: Ball, player: Player, context: TeamContext): NeuralInput => {
  // Basic normalization of positions
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
  
  // Calculate distance and angle to OWN goal 
  const distanceToOwnGoal = calculateDistance(player.position, context.ownGoal);
  const normalizedDistanceToOwnGoal = normalizeValue(distanceToOwnGoal, 0, 1000);
  
  const angleToOwnGoal = Math.atan2(
    context.ownGoal.y - player.position.y,
    context.ownGoal.x - player.position.x
  );
  const normalizedAngleToOwnGoal = normalizeValue(angleToOwnGoal, -Math.PI, Math.PI);
  
  // Detection of dangerous own goal situations
  const isBetweenBallAndOwnGoal = ((player.team === 'red' && 
                                   player.position.x < ball.position.x && 
                                   player.position.x > context.ownGoal.x) || 
                                  (player.team === 'blue' && 
                                   player.position.x > ball.position.x && 
                                   player.position.x < context.ownGoal.x)) ? 1 : 0;
  
  // Check if player is facing own goal
  const isFacingOwnGoal = ((player.team === 'red' && 
                          ((ball.position.x < player.position.x) || 
                           (Math.abs(angleToOwnGoal) < Math.PI/4))) || 
                          (player.team === 'blue' && 
                          ((ball.position.x > player.position.x) || 
                           (Math.abs(angleToOwnGoal) < Math.PI/4)))) ? 1 : 0;
  
  // Find nearest teammate and calculate space quality
  let nearestTeammateDistance = 1000;
  let nearestTeammateAngle = 0;
  let totalTeammateProximity = 0;
  let totalOpenPositionScore = 0;
  
  if (context.teammates.length > 0) {
    for (const teammate of context.teammates) {
      const distance = calculateDistance(player.position, teammate);
      totalTeammateProximity += 1 / (distance + 10); // Avoid division by zero
      
      if (distance < nearestTeammateDistance) {
        nearestTeammateDistance = distance;
        nearestTeammateAngle = Math.atan2(
          teammate.y - player.position.y, 
          teammate.x - player.position.x
        );
      }
      
      // Calculate open space around player
      const spaceVector = {
        x: player.position.x - teammate.x,
        y: player.position.y - teammate.y
      };
      
      // Higher score for positions farther from teammates
      const spaceScore = Math.min(1, distance / 200);
      totalOpenPositionScore += spaceScore;
    }
    
    // Normalize the openness score based on number of teammates
    totalOpenPositionScore = totalOpenPositionScore / context.teammates.length;
  }
  
  const normalizedTeammateDistance = normalizeValue(nearestTeammateDistance, 0, 1000);
  const normalizedTeammateAngle = normalizeValue(nearestTeammateAngle, -Math.PI, Math.PI);
  
  // Find nearest opponent and calculate pressure
  let nearestOpponentDistance = 1000;
  let nearestOpponentAngle = 0;
  let totalOpponentProximity = 0;
  
  if (context.opponents.length > 0) {
    for (const opponent of context.opponents) {
      const distance = calculateDistance(player.position, opponent);
      totalOpponentProximity += 1 / (distance + 10); // Avoid division by zero
      
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
  
  // Calculate space quality - combination of teammate and opponent proximity
  const teammateDensity = normalizeValue(totalTeammateProximity, 0, 0.1);
  const opponentDensity = normalizeValue(totalOpponentProximity, 0, 0.1);
  
  // Space quality is higher when there are fewer players around
  const spaceQuality = 1 - ((teammateDensity + opponentDensity) / 2);
  
  // Analyze the passing lane quality
  let passingLaneQuality = 1.0;
  const distanceToBall = calculateDistance(player.position, ball.position);
  
  if (distanceToBall < 250) {
    // Calculate a score for passing lane openness
    const ballToPlayerVector = {
      x: player.position.x - ball.position.x,
      y: player.position.y - ball.position.y
    };
    const ballToPlayerDistance = distanceToBall;
    
    // Check if opponents are blocking the passing lane
    if (context.opponents.length > 0) {
      for (const opponent of context.opponents) {
        const opponentToBallDistance = calculateDistance(ball.position, opponent);
        const opponentToPlayerDistance = calculateDistance(player.position, opponent);
        
        // Only consider opponents who are roughly between ball and player
        if (opponentToBallDistance < ballToPlayerDistance && 
            opponentToPlayerDistance < ballToPlayerDistance) {
          
          // Project opponent position onto ball-to-player line
          const ballToOpponentVector = {
            x: opponent.x - ball.position.x,
            y: opponent.y - ball.position.y
          };
          
          // Calculate dot product
          const dotProduct = 
            (ballToPlayerVector.x * ballToOpponentVector.x + 
             ballToPlayerVector.y * ballToOpponentVector.y) / 
            (ballToPlayerDistance * opponentToBallDistance);
          
          // Calculate distance from opponent to passing lane line
          const crossProduct = 
            Math.abs(ballToPlayerVector.x * ballToOpponentVector.y - 
                    ballToPlayerVector.y * ballToOpponentVector.x) / 
            ballToPlayerDistance;
          
          // If opponent is close to passing lane and between ball and player
          if (crossProduct < 50 && dotProduct > 0.7) {
            // Reduce passing lane quality based on how close opponent is to the lane
            passingLaneQuality *= (crossProduct / 50);
          }
        }
      }
    }
  }
  
  // Enhanced flags for special situations
  let isInShootingRange = 0;
  if (distanceToBall < 100 && distanceToGoal < 300) {
    // Directional awareness for shooting
    if ((player.team === 'red' && player.position.x > 400) || 
        (player.team === 'blue' && player.position.x < 400)) {
      isInShootingRange = 1;
    } else {
      // Far from correct shooting position
      isInShootingRange = 0.2;
    }
  }
  
  // Calculate passing opportunity based on open teammates and passing lane quality
  const isInPassingRange = distanceToBall < 80 && 
                          nearestTeammateDistance < 200 && 
                          passingLaneQuality > 0.5 ? 1 : 0;
  
  const isDangerousPosition = (distanceToBall < 100 && distanceToOwnGoal < 200) || 
                             (isBetweenBallAndOwnGoal && distanceToBall < 120) ? 1 : 0;
  
  // Check if defense is required
  const ballToOwnGoalDistance = calculateDistance(ball.position, context.ownGoal);
  const isDefendingRequired = ballToOwnGoalDistance < 300 ? 1 : 0;
  
  // Normalize team ELO
  const normalizedTeamElo = player.teamElo ? normalizeValue(player.teamElo, 1000, 3000) : 0.5;
  
  // Calculate ELO advantage 
  const averageElo = 2000;
  const eloAdvantage = player.teamElo ? normalizeValue(player.teamElo - averageElo, -1000, 1000) : 0.5;
  
  // Contextual inputs with safe fallbacks
  const gameTime = context.gameTime || 0.5;
  const scoreDifferential = context.scoreDiff || 0;
  const momentum = player.brain.successRate?.overall || 0.5;
  
  // Formation-based calculations
  const formationCompactness = context.formationCompactness || 0.5;
  const formationWidth = context.formationWidth || 0.5;
  const distanceFromFormationCenter = context.distanceFromCenter || 0.5;
  const isInFormationPosition = context.isInPosition ? 1 : 0;

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
    distanceToOwnGoal: normalizedDistanceToOwnGoal,
    angleToOwnGoal: normalizedAngleToOwnGoal,
    isFacingOwnGoal,
    isDangerousPosition,
    isBetweenBallAndOwnGoal,
    teamElo: normalizedTeamElo,
    eloAdvantage: eloAdvantage,
    gameTime,
    scoreDifferential,
    momentum,
    formationCompactness,
    formationWidth,
    recentSuccessRate: momentum,
    possessionDuration: context.possessionDuration || 0,
    distanceFromFormationCenter,
    isInFormationPosition,
    teammateDensity,
    opponentDensity
  };
};
