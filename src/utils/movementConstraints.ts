import { Position, Player, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { calculateDistance } from './neuralCore';

// Role-specific radius limits with adjustments for positional discipline
const ROLE_RADIUS_LIMITS = {
  goalkeeper: 40,     // SIGNIFICANTLY reduced from 130 to 40 for goalkeepers
  defender: 150,      // Limited radius for defenders
  midfielder: 180,    // Increased from 140 to 180 for more freedom
  forward: 200        // Increased from 180 to 200 for more freedom
};

// Reduced neural adjustment radius for goalkeepers
const NEURAL_ADJUSTMENT_RADIUS = 25; // Kept the same overall

// Increased goal area padding to prevent goalkeepers straying
const FIELD_PADDING = {
  x: 12, // Minimum padding from edge of field
  goalX: 15, // Increased from 8 to 15 - Minimum distance from goal line (to prevent players going inside goals)
  y: 12  // Minimum padding from top/bottom edge
};

// Updated function to force a position within boundaries with stricter goalkeeper constraints
export const forcePositionWithinRadiusBounds = (
  position: Position,
  targetPosition: Position,
  role: Player['role'],
  isNeuralNetworkAdjustment: boolean = false
): Position => {
  // Calculate the base max radius for this role
  const baseMaxRadius = ROLE_RADIUS_LIMITS[role];
  
  // Apply extra radius for neural network adjustments, with special consideration for roles
  let extraRadius = 0;
  if (isNeuralNetworkAdjustment) {
    if (role === 'goalkeeper') {
      extraRadius = NEURAL_ADJUSTMENT_RADIUS * 0.6; // Significantly reduced from *2 to *0.6
    } else if (role === 'defender') {
      extraRadius = NEURAL_ADJUSTMENT_RADIUS * 1.5;
    } else if (role === 'midfielder') {
      extraRadius = NEURAL_ADJUSTMENT_RADIUS * 2.5; // More freedom
    } else if (role === 'forward') {
      extraRadius = NEURAL_ADJUSTMENT_RADIUS * 3; // Most freedom
    }
  }
  
  // Calculate max allowed radius without randomization
  const maxRadius = baseMaxRadius + extraRadius;
  
  // Calculate distance from tactical position
  const distanceFromTarget = calculateDistance(position, targetPosition);
  
  // First ensure the position is within the field boundaries
  let constrainedPosition = {
    x: Math.max(FIELD_PADDING.x, Math.min(PITCH_WIDTH - FIELD_PADDING.x, position.x)),
    y: Math.max(FIELD_PADDING.y, Math.min(PITCH_HEIGHT - FIELD_PADDING.y, position.y))
  };
  
  // Special handling for goalkeepers with MUCH stricter constraints
  if (role === 'goalkeeper') {
    // Determine if goalkeeper is on left or right side
    const isLeftSide = targetPosition.x < PITCH_WIDTH / 2;
    const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
    
    // Calculate maximum allowed distance from goal line
    const maxGoalDistance = 35; // Reduced from implied ~80 to just 35
    
    // Ensure goalkeeper stays within their restricted area
    if (isLeftSide) {
      constrainedPosition.x = Math.max(FIELD_PADDING.goalX, Math.min(goalLine + maxGoalDistance, position.x));
    } else {
      constrainedPosition.x = Math.max(goalLine - maxGoalDistance, Math.min(PITCH_WIDTH - FIELD_PADDING.goalX, position.x));
    }
    
    // Also restrict vertical movement more severely (can't go too far from goal center)
    const goalCenterY = PITCH_HEIGHT / 2;
    const maxVerticalDistance = 60; // Restricts vertical movement to ~120 total (goal height + 20 on each side)
    
    constrainedPosition.y = Math.max(
      goalCenterY - maxVerticalDistance, 
      Math.min(goalCenterY + maxVerticalDistance, position.y)
    );
  }
  
  // If within radius, return the position (after boundary constraints)
  if (distanceFromTarget <= maxRadius) {
    return constrainedPosition;
  }
  
  // If outside radius, force to the radius boundary
  const angle = Math.atan2(
    constrainedPosition.y - targetPosition.y,
    constrainedPosition.x - targetPosition.x
  );
  
  const radiusBoundPosition = {
    x: targetPosition.x + Math.cos(angle) * maxRadius,
    y: targetPosition.y + Math.sin(angle) * maxRadius
  };
  
  // Apply boundary constraints to the radius-constrained position
  let finalPosition = {
    x: Math.max(FIELD_PADDING.x, Math.min(PITCH_WIDTH - FIELD_PADDING.x, radiusBoundPosition.x)),
    y: Math.max(FIELD_PADDING.y, Math.min(PITCH_HEIGHT - FIELD_PADDING.y, radiusBoundPosition.y))
  };
  
  // Apply special goalkeeper constraints again to the radius-bound position
  if (role === 'goalkeeper') {
    const isLeftSide = targetPosition.x < PITCH_WIDTH / 2;
    const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
    const maxGoalDistance = 35;
    
    if (isLeftSide) {
      finalPosition.x = Math.max(FIELD_PADDING.goalX, Math.min(goalLine + maxGoalDistance, finalPosition.x));
    } else {
      finalPosition.x = Math.max(goalLine - maxGoalDistance, Math.min(PITCH_WIDTH - FIELD_PADDING.goalX, finalPosition.x));
    }
    
    // Also restrict vertical movement more severely
    const goalCenterY = PITCH_HEIGHT / 2;
    const maxVerticalDistance = 60;
    
    finalPosition.y = Math.max(
      goalCenterY - maxVerticalDistance, 
      Math.min(goalCenterY + maxVerticalDistance, finalPosition.y)
    );
  }
  
  return finalPosition;
};

export const constrainMovementToRadius = (
  currentPosition: Position,
  targetPosition: Position,
  proposedPosition: Position,
  role: Player['role'],
  isNeuralNetworkAdjustment: boolean = false
): Position => {
  // Add small randomization to radius limits (reduced from previous implementation)
  const baseMaxRadius = ROLE_RADIUS_LIMITS[role];
  const randomFactor = 1 + (Math.random() * 0.1 - 0.05); // ±5% randomization, reduced from ±10%
  
  // Less freedom for forwards in attacking position
  const isForwardInAttackingPosition = role === 'forward' && 
    ((currentPosition.x > 500 && proposedPosition.x > 450) || 
     (currentPosition.x < 300 && proposedPosition.x < 350));
  
  // Extra radius for neural network adjustments, with special consideration for roles
  const extraRadius = isNeuralNetworkAdjustment ? 
    (role === 'goalkeeper' ? NEURAL_ADJUSTMENT_RADIUS * 3 : NEURAL_ADJUSTMENT_RADIUS) : 0; // Increased from *2 to *3
  
  // Tighter radius constraints overall
  const maxRadius = isForwardInAttackingPosition 
    ? (baseMaxRadius * 1.15 * randomFactor) + extraRadius // Reduced from 1.3
    : (baseMaxRadius * randomFactor) + extraRadius;
  
  // First ensure the position is within the field boundaries
  let constrainedPosition = {
    x: Math.max(FIELD_PADDING.x, Math.min(PITCH_WIDTH - FIELD_PADDING.x, proposedPosition.x)),
    y: Math.max(FIELD_PADDING.y, Math.min(PITCH_HEIGHT - FIELD_PADDING.y, proposedPosition.y))
  };
  
  // Special handling for goalkeepers to ensure they're not inside the goals
  if (role === 'goalkeeper') {
    if (constrainedPosition.x < FIELD_PADDING.goalX) {
      constrainedPosition.x = FIELD_PADDING.goalX;
    } else if (constrainedPosition.x > PITCH_WIDTH - FIELD_PADDING.goalX) {
      constrainedPosition.x = PITCH_WIDTH - FIELD_PADDING.goalX;
    }
  }
  
  // Calculate distance from tactical position
  const distanceFromTarget = calculateDistance(constrainedPosition, targetPosition);
  
  if (distanceFromTarget <= maxRadius) {
    return constrainedPosition;
  }
  
  // If outside radius, constrain to the radius boundary
  const angle = Math.atan2(
    constrainedPosition.y - targetPosition.y,
    constrainedPosition.x - targetPosition.x
  );
  
  const radiusBoundPosition = {
    x: targetPosition.x + Math.cos(angle) * maxRadius,
    y: targetPosition.y + Math.sin(angle) * maxRadius
  };
  
  // Apply boundary constraints to the radius-constrained position
  return {
    x: Math.max(FIELD_PADDING.x, Math.min(PITCH_WIDTH - FIELD_PADDING.x, radiusBoundPosition.x)),
    y: Math.max(FIELD_PADDING.y, Math.min(PITCH_HEIGHT - FIELD_PADDING.y, radiusBoundPosition.y))
  };
};

// Calculate the quality of a passing lane between two positions
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
  
  // Skip if positions are the same to prevent division by zero
  if (distance < 1) return 0;
  
  const passingAngle = Math.atan2(passingVector.y, passingVector.x);
  
  // Calculate a passing lane quality score (0-1)
  let laneQuality = 1.0;
  
  // Check for obstacles in the passing lane
  for (const player of allPlayers) {
    // Skip if player position is not defined
    if (!player.position) continue;
    
    // Skip the passer
    if (player.position.x === passer.x && player.position.y === passer.y) continue;
    
    // Skip the requester
    if (player.position.x === requester.x && player.position.y === requester.y) continue;
    
    // Calculate vector from passer to this player
    const toPlayerVector = {
      x: player.position.x - passer.x,
      y: player.position.y - passer.y
    };
    
    const playerDistance = calculateDistance(passer, player.position);
    
    // If this player is further than the requester, they aren't in the way
    if (playerDistance > distance) continue;
    
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
  }
  
  return laneQuality;
};
