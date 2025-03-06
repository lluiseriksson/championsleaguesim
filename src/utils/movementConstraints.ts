
import { Position, Player } from '../types/football';
import { calculateDistance } from './neuralCore';

const ROLE_RADIUS_LIMITS = {
  goalkeeper: 90,    // Increased from 70 for more freedom
  defender: 190,     // Increased from 150 for more dynamic behavior
  midfielder: 180,   // Unchanged
  forward: 220       // Unchanged
};

export const constrainMovementToRadius = (
  currentPosition: Position,
  targetPosition: Position,
  proposedPosition: Position,
  role: Player['role']
): Position => {
  // Add randomization to radius limits for more varied movement
  const baseMaxRadius = ROLE_RADIUS_LIMITS[role];
  const randomFactor = 1 + (Math.random() * 0.2 - 0.1); // ±10% randomization
  const maxRadius = baseMaxRadius * randomFactor;
  
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
