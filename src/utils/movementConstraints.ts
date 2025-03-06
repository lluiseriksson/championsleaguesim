
import { Position, Player } from '../types/football';
import { calculateDistance } from './neuralCore';

const ROLE_RADIUS_LIMITS = {
  goalkeeper: 70,    // Increased from 50
  defender: 150,     // Increased from 100
  midfielder: 180,   // Increased from 120
  forward: 220       // Increased from 150
};

export const constrainMovementToRadius = (
  currentPosition: Position,
  targetPosition: Position,
  proposedPosition: Position,
  role: Player['role']
): Position => {
  const maxRadius = ROLE_RADIUS_LIMITS[role];
  
  // Calculate distance from tactical position
  const distanceFromTarget = calculateDistance(proposedPosition, targetPosition);
  
  if (distanceFromTarget <= maxRadius) {
    return proposedPosition;
  }
  
  // If outside radius, constrain to the radius boundary
  const angle = Math.atan2(
    proposedPosition.y - targetPosition.y,
    proposedPosition.x - targetPosition.x
  );
  
  return {
    x: targetPosition.x + Math.cos(angle) * maxRadius,
    y: targetPosition.y + Math.sin(angle) * maxRadius
  };
};
