
import { Player, Position } from '../../types/football';
import { calculateDistance } from '../positionHelpers';

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
