import { Position, Player } from '../types/football';
import { calculateDistance } from './neuralCore';

const ROLE_RADIUS_LIMITS = {
  goalkeeper: 70,     // Goalkeepers stay close to goal
  defender: 100,      // Further reduced from 120 - Defenders maintain tighter defensive structure
  midfielder: 130,    // Further reduced from 150 - Midfielders have more restricted movement range
  forward: 160        // Further reduced from 180 - Forwards have more constrained freedom to move
};

export const constrainMovementToRadius = (
  currentPosition: Position,
  targetPosition: Position,
  proposedPosition: Position,
  role: Player['role']
): Position => {
  // No randomization to radius limits for completely deterministic movement
  const maxRadius = ROLE_RADIUS_LIMITS[role];
  
  // Special case for goalkeeper - extremely strict constraints
  if (role === 'goalkeeper') {
    return {
      x: Math.max(targetPosition.x - 10, Math.min(targetPosition.x + 10, proposedPosition.x)),
      y: Math.max(targetPosition.y - 50, Math.min(targetPosition.y + 50, proposedPosition.y))
    };
  }
  
  // Calculate distance from tactical position
  const distanceFromTarget = calculateDistance(proposedPosition, targetPosition);
  
  if (distanceFromTarget <= maxRadius) {
    return proposedPosition;
  }
  
  // If outside radius, strictly constrain to the radius boundary
  const angle = Math.atan2(
    proposedPosition.y - targetPosition.y,
    proposedPosition.x - targetPosition.x
  );
  
  return {
    x: targetPosition.x + Math.cos(angle) * maxRadius,
    y: targetPosition.y + Math.sin(angle) * maxRadius
  };
};

// Updated to accept Player[] array instead of Position[]
export const isPassingLaneOpen = (
  requester: Position,
  passer: Position,
  allPlayers: Player[]
): number => {
  const passingVector = {
    x: requester.x - passer.x,
    y: requester.y - passer.y
  };
  
  const distance = calculateDistance(requester, passer);
  const passingAngle = Math.atan2(passingVector.y, passingVector.x);
  
  // Calculate a passing lane quality score (0-1)
  let laneQuality = 1.0;
  
  // Check for obstacles in the passing lane
  allPlayers.forEach(player => {
    // Skip the passer and requester (now checking player objects)
    if (player.position.x === passer.x && player.position.y === passer.y) return;
    if (player.position.x === requester.x && player.position.y === requester.y) return;
    
    // Calculate vector from passer to this player
    const toPlayerVector = {
      x: player.position.x - passer.x,
      y: player.position.y - passer.y
    };
    
    const playerDistance = calculateDistance(passer, player.position);
    
    // If this player is further than the requester, they aren't in the way
    if (playerDistance > distance) return;
    
    // Calculate angle to this player
    const playerAngle = Math.atan2(toPlayerVector.y, toPlayerVector.x);
    
    // Calculate angular difference (how directly in the path they are)
    let angleDiff = Math.abs(passingAngle - playerAngle);
    // Ensure we get the smallest angle difference
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    // If player is close to passing lane, reduce quality
    if (angleDiff < Math.PI / 4 && playerDistance < distance) {
      const blockFactor = 1 - (angleDiff / (Math.PI / 4));
      const distanceRatio = playerDistance / distance;
      
      // Players directly in path reduce quality more
      laneQuality *= (distanceRatio + (1 - blockFactor) * (1 - distanceRatio));
    }
  });
  
  return laneQuality;
};
