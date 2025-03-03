
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { applyPositionRestrictions } from './positionHelpers';
import { calculateDistance } from './positionHelpers';

// Process player movement using neural network
export const getNeuralMovement = (
  player: Player,
  ball: Ball,
  currentPlayers: Player[],
  positionRestricted: boolean
): { position: { x: number; y: number }, output: { x: number; y: number }, action?: 'move' | 'shoot' | 'pass' | 'intercept', targetPlayer?: Player } => {
  // Using neural network for movement
  const input = {
    ballX: ball.position.x / PITCH_WIDTH,
    ballY: ball.position.y / PITCH_HEIGHT,
    playerX: player.position.x / PITCH_WIDTH,
    playerY: player.position.y / PITCH_HEIGHT,
    ballVelocityX: ball.velocity.x / 20,
    ballVelocityY: ball.velocity.y / 20,
    distanceToGoal: 0.5,
    angleToGoal: 0,
    nearestTeammateDistance: 0.5,
    nearestTeammateAngle: 0,
    nearestOpponentDistance: 0.5,
    nearestOpponentAngle: 0,
    isInShootingRange: 0,
    isInPassingRange: 0,
    isDefendingRequired: 0,
    distanceToOwnGoal: 0.5,
    angleToOwnGoal: 0,
    isFacingOwnGoal: 0,
    isDangerousPosition: 0,
    isBetweenBallAndOwnGoal: 0
  };

  const output = player.brain.net.run(input);
  const moveX = (output.moveX || 0.5) * 2 - 1;
  const moveY = (output.moveY || 0.5) * 2 - 1;
  
  // Determine if the player should pass the ball
  const passBall = output.passBall || 0;
  const shootBall = output.shootBall || 0;
  const intercept = output.intercept || 0;
  
  // Increased all distances by 50% from base values
  let maxDistance = 75; // 50 * 1.5 = 75
  const distanceToBall = Math.sqrt(
    Math.pow(ball.position.x - player.position.x, 2) +
    Math.pow(ball.position.y - player.position.y, 2)
  );

  switch (player.role) {
    case 'defender':
      maxDistance = distanceToBall < 150 ? 144 : 90; // 96 * 1.5 = 144, 60 * 1.5 = 90
      break;
    case 'midfielder':
      maxDistance = distanceToBall < 200 ? 180 : 120; // 120 * 1.5 = 180, 80 * 1.5 = 120
      break;
    case 'forward':
      maxDistance = distanceToBall < 250 ? 300 : 180; // 200 * 1.5 = 300, 120 * 1.5 = 180
      break;
  }

  let newPosition = {
    x: player.position.x + moveX * 2,
    y: player.position.y + moveY * 2,
  };

  newPosition = applyPositionRestrictions(
    newPosition, 
    player, 
    player.targetPosition, 
    maxDistance, 
    positionRestricted, 
    currentPlayers
  );

  // Ensure players stay within the pitch boundaries
  newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
  newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));

  // Determine action based on neural network output
  let action: 'move' | 'shoot' | 'pass' | 'intercept' = 'move';
  let targetPlayer: Player | undefined = undefined;
  
  // Only consider passing when player is close to ball
  if (distanceToBall < 30 && passBall > 0.6) {
    action = 'pass';
    targetPlayer = findBestPassTarget(player, ball, currentPlayers);
  } else if (distanceToBall < 25 && shootBall > 0.7) {
    action = 'shoot';
  } else if (distanceToBall < 40 && intercept > 0.6) {
    action = 'intercept';
  }

  return {
    position: newPosition,
    output: { x: moveX, y: moveY },
    action,
    targetPlayer
  };
};

// Find the best teammate to pass to
export const findBestPassTarget = (
  player: Player,
  ball: Ball,
  allPlayers: Player[]
): Player | undefined => {
  // Get teammates
  const teammates = allPlayers.filter(p => 
    p.team === player.team && 
    p.id !== player.id && 
    p.role !== 'goalkeeper'
  );
  
  if (teammates.length === 0) return undefined;
  
  // Calculate score for each teammate based on strategic considerations
  const rankedTeammates = teammates.map(teammate => {
    const distanceToTeammate = calculateDistance(player.position, teammate.position);
    
    // Don't pass if teammate is too close or too far
    if (distanceToTeammate < 50 || distanceToTeammate > 300) {
      return { player: teammate, score: -1 };
    }
    
    let score = 100 - (distanceToTeammate * 0.2); // Base score - prefer closer players
    
    // Check if teammate is in a better attacking position
    const isAttackingDirection = 
      (player.team === 'red' && teammate.position.x > player.position.x) || 
      (player.team === 'blue' && teammate.position.x < player.position.x);
    
    if (isAttackingDirection) {
      score += 30; // Significant bonus for teammates ahead in attacking direction
    }
    
    // Check if the pass lane is clear of opponents
    const opponents = allPlayers.filter(p => p.team !== player.team);
    let clearLane = true;
    
    opponents.forEach(opponent => {
      // Calculate if opponent is between passer and receiver
      const isInLane = isPlayerInPassLane(
        player.position, 
        teammate.position, 
        opponent.position,
        30 // Lane width threshold
      );
      
      if (isInLane) {
        clearLane = false;
      }
    });
    
    if (clearLane) {
      score += 40; // Big bonus for clear passing lanes
    } else {
      score -= 30; // Penalty for blocked passing lanes
    }
    
    // Prefer players in more advanced positions (role-based)
    if (teammate.role === 'forward') score += 25;
    else if (teammate.role === 'midfielder') score += 15;
    
    // Check if teammate has space around them
    let spaceAround = true;
    opponents.forEach(opponent => {
      if (calculateDistance(teammate.position, opponent.position) < 50) {
        spaceAround = false;
      }
    });
    
    if (spaceAround) {
      score += 20; // Bonus for teammates with space
    }
    
    return { player: teammate, score };
  });
  
  // Sort by score and filter out negative scores
  const validTargets = rankedTeammates
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Return the best teammate if any valid targets exist
  return validTargets.length > 0 ? validTargets[0].player : undefined;
};

// Check if a player is in the passing lane
export const isPlayerInPassLane = (
  origin: { x: number, y: number },
  target: { x: number, y: number },
  position: { x: number, y: number },
  thresholdDistance: number
): boolean => {
  // Calculate the passage line using parametric form
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Check if player is beyond start or end points
  const dotProduct = ((position.x - origin.x) * dx + (position.y - origin.y) * dy) / (length * length);
  
  if (dotProduct < 0 || dotProduct > 1) {
    return false;
  }
  
  // Calculate closest point on line to the position
  const closestX = origin.x + dotProduct * dx;
  const closestY = origin.y + dotProduct * dy;
  
  // Calculate distance from position to the line
  const distance = calculateDistance(
    { x: closestX, y: closestY },
    position
  );
  
  return distance < thresholdDistance;
};

