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
  const maxRadius = ROLE_RADIUS_LIMITS[role];
  
  if (role === 'goalkeeper') {
    return {
      x: Math.max(targetPosition.x - 10, Math.min(targetPosition.x + 10, proposedPosition.x)),
      y: Math.max(targetPosition.y - 50, Math.min(targetPosition.y + 50, proposedPosition.y))
    };
  }
  
  const distanceFromTarget = calculateDistance(proposedPosition, targetPosition);
  
  if (distanceFromTarget <= maxRadius) {
    return proposedPosition;
  }
  
  const angle = Math.atan2(
    proposedPosition.y - targetPosition.y,
    proposedPosition.x - targetPosition.x
  );
  
  return {
    x: targetPosition.x + Math.cos(angle) * maxRadius,
    y: targetPosition.y + Math.sin(angle) * maxRadius
  };
};

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
  
  let laneQuality = 1.0;
  
  allPlayers.forEach(player => {
    if (player.position.x === passer.x && player.position.y === passer.y) return;
    if (player.position.x === requester.x && player.position.y === requester.y) return;
    
    const toPlayerVector = {
      x: player.position.x - passer.x,
      y: player.position.y - passer.y
    };
    
    const playerDistance = calculateDistance(passer, player.position);
    
    if (playerDistance > distance) return;
    
    const playerAngle = Math.atan2(toPlayerVector.y, toPlayerVector.x);
    
    let angleDiff = Math.abs(passingAngle - playerAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    if (angleDiff < Math.PI / 4 && playerDistance < distance) {
      const blockFactor = 1 - (angleDiff / (Math.PI / 4));
      const distanceRatio = playerDistance / distance;
      
      laneQuality *= (distanceRatio + (1 - blockFactor) * (1 - distanceRatio));
    }
  });
  
  return laneQuality;
};
