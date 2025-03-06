import { Ball, Player, TeamContext, NeuralInput } from '../types/football';
import { calculateDistance, normalizeValue } from './neuralCore';
import { calculateShotQuality } from './playerBrain';

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

  // Calculate shooting angles and opportunities in all directions
  let bestShootingAngle = 0;
  let bestShootingQuality = 0;
  
  // Check shooting opportunities in 8 directions
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const targetPosition = {
      x: player.position.x + Math.cos(angle) * 100,
      y: player.position.y + Math.sin(angle) * 100
    };
    
    const shotQuality = calculateShotQuality(
      player.position,
      targetPosition,
      context.teammates,
      context.opponents
    );
    
    if (shotQuality > bestShootingQuality) {
      bestShootingQuality = shotQuality;
      bestShootingAngle = angle;
    }
  }
  
  // New tactical features calculations
  
  // Calculate zone control - how much team controls the current zone
  let zoneControl = 0.5; // Default neutral value
  const currentZoneRadius = 150;
  let teammateCount = 0;
  let opponentCount = 0;
  
  // Count players in current zone
  context.teammates.forEach(teamPos => {
    if (calculateDistance(player.position, teamPos) < currentZoneRadius) {
      teammateCount++;
    }
  });
  
  context.opponents.forEach(oppPos => {
    if (calculateDistance(player.position, oppPos) < currentZoneRadius) {
      opponentCount++;
    }
  });
  
  // Calculate zone control ratio
  const totalPlayers = teammateCount + opponentCount + 1; // +1 for current player
  zoneControl = totalPlayers > 0 ? (teammateCount + 1) / totalPlayers : 0.5;
  
  // Calculate passing lanes quality
  let passingLanesQuality = 0;
  let potentialLanes = 0;
  
  if (context.teammates.length > 0) {
    context.teammates.forEach(teamPos => {
      const laneDistance = calculateDistance(player.position, teamPos);
      if (laneDistance > 0 && laneDistance < 300) {
        potentialLanes++;
        // Direction vector from player to teammate
        const dirX = (teamPos.x - player.position.x) / laneDistance;
        const dirY = (teamPos.y - player.position.y) / laneDistance;
        
        // Check if opponents block the passing lane
        let laneClearness = 1;
        context.opponents.forEach(oppPos => {
          // Calculate distance from opponent to passing lane
          const oppDistToPlayer = calculateDistance(player.position, oppPos);
          // Only consider opponents closer than the teammate
          if (oppDistToPlayer < laneDistance) {
            // Project opponent onto passing lane
            const dot = dirX * (oppPos.x - player.position.x) + 
                       dirY * (oppPos.y - player.position.y);
            const projX = player.position.x + dot * dirX;
            const projY = player.position.y + dot * dirY;
            
            // Distance from opponent to projection point (perpendicular to lane)
            const distToLane = calculateDistance(oppPos, {x: projX, y: projY});
            
            // If opponent is close to passing lane, reduce clearness
            if (distToLane < 50) {
              laneClearness *= (distToLane / 50);
            }
          }
        });
        
        passingLanesQuality += laneClearness;
      }
    });
  }
  
  // Normalize passing lanes quality
  passingLanesQuality = potentialLanes > 0 ? passingLanesQuality / potentialLanes : 0;
  
  // Calculate space creation value
  // Higher when player is moving to a position that creates space for teammates
  let spaceCreation = 0;
  
  // Positions ahead in direction of player's current movement
  const lastOutput = player.brain.lastOutput || { x: 0, y: 0 };
  if (Math.abs(lastOutput.x) > 0.1 || Math.abs(lastOutput.y) > 0.1) {
    const moveDirection = {
      x: lastOutput.x / Math.sqrt(lastOutput.x * lastOutput.x + lastOutput.y * lastOutput.y),
      y: lastOutput.y / Math.sqrt(lastOutput.x * lastOutput.x + lastOutput.y * lastOutput.y)
    };
    
    // Check if movement creates space
    const futurePos = {
      x: player.position.x + moveDirection.x * 50,
      y: player.position.y + moveDirection.y * 50
    };
    
    // Calculate teammate density at current and future positions
    let currentDensity = 0;
    let futureDensity = 0;
    
    context.teammates.forEach(teamPos => {
      const currentDist = calculateDistance(player.position, teamPos);
      const futureDist = calculateDistance(futurePos, teamPos);
      
      if (currentDist < 100) currentDensity += (100 - currentDist) / 100;
      if (futureDist < 100) futureDensity += (100 - futureDist) / 100;
    });
    
    // Movement that reduces teammate density creates space
    spaceCreation = Math.max(0, Math.min(1, (currentDensity - futureDensity) / 2 + 0.5));
  }
  
  // Calculate defensive support
  let defensiveSupport = 0;
  if (player.role !== 'goalkeeper') {
    // Check if player is between ball and own goal
    const ballToGoalX = context.ownGoal.x - ball.position.x;
    const ballToGoalY = context.ownGoal.y - ball.position.y;
    const ballToGoalDist = Math.sqrt(ballToGoalX * ballToGoalX + ballToGoalY * ballToGoalY);
    
    const playerToBallX = ball.position.x - player.position.x;
    const playerToBallY = ball.position.y - player.position.y;
    const playerToBallDist = Math.sqrt(playerToBallX * playerToBallX + playerToBallY * playerToBallY);
    
    const playerToGoalX = context.ownGoal.x - player.position.x;
    const playerToGoalY = context.ownGoal.y - player.position.y;
    const playerToGoalDist = Math.sqrt(playerToGoalX * playerToGoalX + playerToGoalY * playerToGoalY);
    
    // If player is between ball and own goal
    if (playerToBallDist + playerToGoalDist < ballToGoalDist * 1.1) {
      defensiveSupport = 1 - (playerToGoalDist / ballToGoalDist);
    }
  }
  
  // Calculate pressure index - how much pressure the player is under
  let pressureIndex = 0;
  let nearestOpponentDistance = 1000;
  
  context.opponents.forEach(oppPos => {
    const distance = calculateDistance(player.position, oppPos);
    if (distance < nearestOpponentDistance) {
      nearestOpponentDistance = distance;
    }
    
    // Add pressure based on opponents within pressing distance
    if (distance < 100) {
      pressureIndex += (100 - distance) / 100;
    }
  });
  
  pressureIndex = Math.min(1, pressureIndex);
  
  // Calculate expected goal (xG) value for current position
  let xgPosition = 0;
  
  // Simple model: distance and angle to goal affect xG
  const distanceToGoal = calculateDistance(player.position, context.opponentGoal);
  const maxScoringDistance = 300;
  
  if (distanceToGoal < maxScoringDistance) {
    // Calculate angle to goal posts (simplified)
    const goalWidth = 120;
    const goalCenterX = context.opponentGoal.x;
    const goalCenterY = context.opponentGoal.y;
    
    const leftPostY = goalCenterY - goalWidth/2;
    const rightPostY = goalCenterY + goalWidth/2;
    
    const angleToLeftPost = Math.atan2(leftPostY - player.position.y, goalCenterX - player.position.x);
    const angleToRightPost = Math.atan2(rightPostY - player.position.y, goalCenterX - player.position.x);
    
    const shootingAngle = Math.abs(angleToRightPost - angleToLeftPost);
    const normalizedAngle = shootingAngle / Math.PI;
    
    // xG model: better angle and closer distance = higher xG
    const distanceFactor = 1 - (distanceToGoal / maxScoringDistance);
    xgPosition = normalizedAngle * distanceFactor;
    
    // Adjust for any opponents in shooting path
    context.opponents.forEach(oppPos => {
      const oppDistance = calculateDistance(player.position, oppPos);
      const oppAngle = Math.atan2(oppPos.y - player.position.y, oppPos.x - player.position.x);
      const goalAngle = Math.atan2(goalCenterY - player.position.y, goalCenterX - player.position.x);
      
      // Check if opponent is in shooting path
      const angleDiff = Math.abs(oppAngle - goalAngle);
      if (angleDiff < 0.5 && oppDistance < distanceToGoal) {
        // Reduce xG based on how directly opponent blocks shot
        xgPosition *= (angleDiff / 0.5);
      }
    });
  }
  
  // Calculate optimal position distance based on player's role
  let optimalPosition = { x: 0, y: 0 };
  let optimalPositionDistance = 1;
  
  switch (player.role) {
    case 'goalkeeper':
      // Goalkeeper's optimal position is near own goal
      optimalPosition = { ...context.ownGoal };
      break;
    case 'defender':
      // Defenders should position between ball and own goal
      optimalPosition = {
        x: context.ownGoal.x + (ball.position.x - context.ownGoal.x) * 0.3,
        y: context.ownGoal.y + (ball.position.y - context.ownGoal.y) * 0.3
      };
      break;
    case 'midfielder':
      // Midfielders position centrally with tactical spread
      const midX = (context.ownGoal.x + context.opponentGoal.x) / 2;
      const spreadX = player.positionPreference === 'left' ? -100 : 
                      player.positionPreference === 'right' ? 100 : 0;
      optimalPosition = {
        x: midX + spreadX,
        y: ball.position.y
      };
      break;
    case 'forward':
      // Forwards position near opponent goal with tactical spread
      const forwardX = context.opponentGoal.x + (context.ownGoal.x - context.opponentGoal.x) * 0.2;
      const forwardSpreadX = player.positionPreference === 'left' ? -150 : 
                            player.positionPreference === 'right' ? 150 : 0;
      const forwardSpreadY = player.positionPreference === 'center' ? 0 : 
                            ball.position.y > 300 ? -100 : 100;
      optimalPosition = {
        x: forwardX + forwardSpreadX,
        y: ball.position.y + forwardSpreadY
      };
      break;
  }
  
  // Calculate distance to optimal position and normalize
  const distToOptimal = calculateDistance(player.position, optimalPosition);
  const maxDistToOptimal = 400; // Maximum reasonable distance
  optimalPositionDistance = Math.min(1, distToOptimal / maxDistToOptimal);
  
  // Calculate lane blocking value
  let laneBlockingValue = 0;
  
  // For defensive players, value blocking passing lanes to goal
  if (player.role === 'defender' || player.role === 'goalkeeper') {
    context.opponents.forEach(oppPos => {
      // Check if opponent has shooting/passing lane to goal
      const oppToGoalX = context.ownGoal.x - oppPos.x;
      const oppToGoalY = context.ownGoal.y - oppPos.y;
      const oppToGoalDist = Math.sqrt(oppToGoalX * oppToGoalX + oppToGoalY * oppToGoalY);
      
      // Direction vector from opponent to goal
      const dirX = oppToGoalX / oppToGoalDist;
      const dirY = oppToGoalY / oppToGoalDist;
      
      // Player's perpendicular distance to this line
      const dot = (player.position.x - oppPos.x) * dirX + 
                  (player.position.y - oppPos.y) * dirY;
      
      const projX = oppPos.x + dot * dirX;
      const projY = oppPos.y + dot * dirY;
      
      const distToLane = calculateDistance(player.position, {x: projX, y: projY});
      
      // Player is close to lane and between opponent and goal
      if (distToLane < 50 && dot > 0 && dot < oppToGoalDist) {
        laneBlockingValue += (50 - distToLane) / 50;
      }
    });
    
    laneBlockingValue = Math.min(1, laneBlockingValue);
  }
  
  // Calculate player role specific value
  let playerRoleSpecificValue = 0.5;
  
  // Different evaluations based on role
  switch (player.role) {
    case 'goalkeeper':
      // Goalkeepers value being in front of goal
      const distToOwnGoal = calculateDistance(player.position, context.ownGoal);
      playerRoleSpecificValue = 1 - Math.min(1, distToOwnGoal / 100);
      break;
    case 'defender':
      // Defenders value defensive coverage
      playerRoleSpecificValue = defensiveSupport;
      break;
    case 'midfielder':
      // Midfielders value balance between attack and defense
      const midDistToOwnGoal = calculateDistance(player.position, context.ownGoal);
      const midDistToOppGoal = calculateDistance(player.position, context.opponentGoal);
      const pitchLength = 800;
      // Balance is being centrally positioned
      playerRoleSpecificValue = 1 - Math.abs((midDistToOwnGoal - midDistToOppGoal) / pitchLength);
      break;
    case 'forward':
      // Forwards value attacking positions
      playerRoleSpecificValue = xgPosition * 0.7 + (1 - optimalPositionDistance) * 0.3;
      break;
  }
  
  // Calculate supporting run value
  let supportingRunValue = 0;
  
  // Supporting runs are valuable in attacking scenarios
  const ballToOppGoalDist = calculateDistance(ball.position, context.opponentGoal);
  if (ballToOppGoalDist < 400) {
    const playerToBallDist = calculateDistance(player.position, ball.position);
    
    // Supporting runs should be ahead of ball carrier but not too far
    if (
      ((player.team === 'red' && player.position.x > ball.position.x) || 
       (player.team === 'blue' && player.position.x < ball.position.x)) && 
      playerToBallDist < 200
    ) {
      // Check if player is in a good supporting position
      const isClear = !context.opponents.some(oppPos => 
        calculateDistance(player.position, oppPos) < 50
      );
      
      supportingRunValue = isClear ? (200 - playerToBallDist) / 200 : 0;
    }
  }
  
  // Calculate offensive positioning value
  const pitchLength = 800;
  const offensiveThird = player.team === 'red' ? pitchLength * 2/3 : pitchLength * 1/3;
  const isInOffensiveThird = player.team === 'red' ? 
    player.position.x > offensiveThird : 
    player.position.x < offensiveThird;
  
  let offensivePositioningValue = 0;
  
  if (isInOffensiveThird) {
    offensivePositioningValue = xgPosition * 0.6 + spaceCreation * 0.4;
  } else {
    // For non-forwards, supporting position can still be valuable
    offensivePositioningValue = player.role === 'forward' ? 0.2 : supportingRunValue;
  }
  
  // Calculate defensive positioning value
  const defensiveThird = player.team === 'red' ? pitchLength * 1/3 : pitchLength * 2/3;
  const isInDefensiveThird = player.team === 'red' ? 
    player.position.x < defensiveThird : 
    player.position.x > defensiveThird;
  
  let defensivePositioningValue = 0;
  
  if (isInDefensiveThird) {
    defensivePositioningValue = defensiveSupport * 0.7 + laneBlockingValue * 0.3;
  } else {
    // Even in middle/offensive third, some defensive positioning is valuable
    defensivePositioningValue = player.role === 'defender' ? 
      (1 - optimalPositionDistance) * 0.5 : 
      defensiveSupport * 0.3;
  }
  
  // Calculate team tactical balance
  let teamTacticalBalance = 0.5; // Default balanced value
  
  // Count players in each third of the pitch
  let playersInDefense = 0;
  let playersInMidfield = 0;
  let playersInAttack = 0;
  
  const isTeammateInDefense = (pos: Position) => 
    player.team === 'red' ? pos.x < 267 : pos.x > 533;
  
  const isTeammateInMidfield = (pos: Position) => 
    player.team === 'red' ? (pos.x >= 267 && pos.x <= 533) : 
                            (pos.x >= 267 && pos.x <= 533);
  
  const isTeammateInAttack = (pos: Position) => 
    player.team === 'red' ? pos.x > 533 : pos.x < 267;
  
  // Count the current player
  if (isTeammateInDefense(player.position)) playersInDefense++;
  else if (isTeammateInMidfield(player.position)) playersInMidfield++;
  else if (isTeammateInAttack(player.position)) playersInAttack++;
  
  // Count teammates
  context.teammates.forEach(pos => {
    if (isTeammateInDefense(pos)) playersInDefense++;
    else if (isTeammateInMidfield(pos)) playersInMidfield++;
    else if (isTeammateInAttack(pos)) playersInAttack++;
  });
  
  // Calculate balance based on distribution
  // Ideal distribution might be 3-4-3 or 4-3-3, so we want some players in each zone
  const totalPlayers = playersInDefense + playersInMidfield + playersInAttack;
  if (totalPlayers > 0) {
    // Simplistic balance metric - deviations from expected proportions
    const idealDefenseRatio = 0.36; // ~4/11
    const idealMidfieldRatio = 0.36; // ~4/11
    const idealAttackRatio = 0.28; // ~3/11
    
    const actualDefenseRatio = playersInDefense / totalPlayers;
    const actualMidfieldRatio = playersInMidfield / totalPlayers;
    const actualAttackRatio = playersInAttack / totalPlayers;
    
    const defenseDev = Math.abs(actualDefenseRatio - idealDefenseRatio);
    const midfieldDev = Math.abs(actualMidfieldRatio - idealMidfieldRatio);
    const attackDev = Math.abs(actualAttackRatio - idealAttackRatio);
    
    // Balance is higher when deviations are lower
    teamTacticalBalance = 1 - ((defenseDev + midfieldDev + attackDev) / 2);
  }
  
  // Calculate formation adherence
  const formationAdherence = 1 - optimalPositionDistance;
  
  // Calculate how unique this player's position is (to prevent clustering)
  let uniquePositionalValue = 1; // Default to high value
  let overlapCount = 0;
  
  context.teammates.forEach(pos => {
    const distToTeammate = calculateDistance(player.position, pos);
    // If teammate is too close, reduce uniqueness
    if (distToTeammate < 100) {
      uniquePositionalValue -= 0.15; // Penalize close positioning
      overlapCount++;
    }
  });
  
  uniquePositionalValue = Math.max(0, uniquePositionalValue);
  const overlapWithTeammates = Math.min(1, overlapCount / 5); // Normalize
  
  // Calculate additional features based on player's unique tactical ID
  const tacticalId = player.tacticalId || 0;
  const specialization = player.specialization || 'generalist';
  
  // Return the enhanced neural input with all new tactical features
  return {
    ballX: normalizedBallX,
    ballY: normalizedBallY,
    playerX: normalizedPlayerX,
    playerY: normalizedPlayerY,
    ballVelocityX: normalizeValue(ball.velocity.x, -20, 20),
    ballVelocityY: normalizeValue(ball.velocity.y, -20, 20),
    distanceToGoal: normalizeValue(distanceToGoal, 0, 1000),
    angleToGoal: normalizeValue(Math.atan2(
      context.opponentGoal.y - player.position.y,
      context.opponentGoal.x - player.position.x
    ), -Math.PI, Math.PI),
    nearestTeammateDistance: context.teammates.length === 0 ? 0.5 : 
      normalizeValue(Math.min(...context.teammates.map(t => 
        calculateDistance(player.position, t))), 0, 1000),
    nearestTeammateAngle: context.teammates.length === 0 ? 0 : 
      normalizeValue(Math.atan2(
        context.teammates.reduce((closest, t) => 
          calculateDistance(player.position, t) < calculateDistance(player.position, closest) ? t : closest
        , context.teammates[0]).y - player.position.y,
        context.teammates.reduce((closest, t) => 
          calculateDistance(player.position, t) < calculateDistance(player.position, closest) ? t : closest
        , context.teammates[0]).x - player.position.x
      ), -Math.PI, Math.PI),
    nearestOpponentDistance: context.opponents.length === 0 ? 0.5 : 
      normalizeValue(Math.min(...context.opponents.map(o => 
        calculateDistance(player.position, o))), 0, 1000),
    nearestOpponentAngle: context.opponents.length === 0 ? 0 : 
      normalizeValue(Math.atan2(
        context.opponents.reduce((closest, o) => 
          calculateDistance(player.position, o) < calculateDistance(player.position, closest) ? o : closest
        , context.opponents[0]).y - player.position.y,
        context.opponents.reduce((closest, o) => 
          calculateDistance(player.position, o) < calculateDistance(player.position, closest) ? o : closest
        , context.opponents[0]).x - player.position.x
      ), -Math.PI, Math.PI),
    isInShootingRange: distanceToGoal < 300 && (
      (player.team === 'red' && player.position.x > 400) || 
      (player.team === 'blue' && player.position.x < 400)
    ) ? 1 : 0,
    isInPassingRange: distanceToBall < 80 && context.teammates.some(t => 
      calculateDistance(player.position, t) < 200) ? 1 : 0,
    isDefendingRequired: calculateDistance(ball.position, context.ownGoal) < 300 ? 1 : 0,
    distanceToOwnGoal: normalizeValue(calculateDistance(player.position, context.ownGoal), 0, 1000),
    angleToOwnGoal: normalizeValue(Math.atan2(
      context.ownGoal.y - player.position.y,
      context.ownGoal.x - player.position.x
    ), -Math.PI, Math.PI),
    isFacingOwnGoal: ((player.team === 'red' && player.position.x < ball.position.x) || 
                     (player.team === 'blue' && player.position.x > ball.position.x)) ? 1 : 0,
    isDangerousPosition: (distanceToBall < 100 && calculateDistance(player.position, context.ownGoal) < 200) ? 1 : 0,
    isBetweenBallAndOwnGoal: ((player.team === 'red' && 
                             player.position.x < ball.position.x && 
                             player.position.x > context.ownGoal.x) || 
                            (player.team === 'blue' && 
                             player.position.x > ball.position.x && 
                             player.position.x < context.ownGoal.x)) ? 1 : 0,
    teamElo: player.teamElo ? normalizeValue(player.teamElo, 1000, 3000) : 0.5,
    eloAdvantage: player.teamElo ? normalizeValue(player.teamElo - 2000, -1000, 1000) : 0.5,
    // Existing contextual inputs
    gameTime,
    scoreDifferential,
    momentum,
    formationCompactness,
    formationWidth,
    recentSuccessRate: player.brain.successRate?.overall || 0.5,
    possessionDuration: context.possessionDuration || 0,
    distanceFromFormationCenter,
    isInFormationPosition,
    teammateDensity: context.teammateDensity || 0.5,
    opponentDensity: context.opponentDensity || 0.5,
    shootingAngle: normalizeValue(bestShootingAngle, 0, Math.PI * 2),
    shootingQuality: bestShootingQuality,
    
    // New tactical features
    zoneControl,
    passingLanesQuality,
    spaceCreation,
    defensiveSupport,
    pressureIndex,
    xgPosition,
    optimalPositionDistance: 1 - optimalPositionDistance, // Inverted so higher is better
    laneBlockingValue,
    playerRoleSpecificValue,
    supportingRunValue,
    offensivePositioningValue,
    defensivePositioningValue,
    teamTacticalBalance,
    formationAdherence,
    uniquePositionalValue,
    overlapWithTeammates
  };
};
