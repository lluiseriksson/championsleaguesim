import { Player, Position, PLAYER_RADIUS } from '../../types/football';

// Minimum distance players of the same team should maintain
const MIN_TEAMMATE_DISTANCE = PLAYER_RADIUS * 2.5;

/**
 * Detects if two players are too close to each other
 */
export const arePlayersTooClose = (player1: Position, player2: Position): boolean => {
  const dx = player1.x - player2.x;
  const dy = player1.y - player2.y;
  const distanceSquared = dx * dx + dy * dy;
  
  // Using squared distance for performance (avoiding square root)
  return distanceSquared < MIN_TEAMMATE_DISTANCE * MIN_TEAMMATE_DISTANCE;
};

/**
 * Calculates an adjusted position to avoid teammate collisions
 */
export const calculateCollisionAvoidance = (
  player: Player,
  teammates: Player[],
  proposedPosition: Position
): Position => {
  // Skip processing for goalkeepers (they need to stay in position)
  if (player.role === 'goalkeeper') {
    return proposedPosition;
  }
  
  let adjustedPosition = { ...proposedPosition };
  let collisionDetected = false;
  
  // Check for collisions with teammates
  for (const teammate of teammates) {
    // Skip self and goalkeeper comparisons
    if (teammate.id === player.id || teammate.role === 'goalkeeper') {
      continue;
    }
    
    if (arePlayersTooClose(adjustedPosition, teammate.position)) {
      collisionDetected = true;
      
      // Calculate vector from teammate to player
      const dx = adjustedPosition.x - teammate.position.x;
      const dy = adjustedPosition.y - teammate.position.y;
      
      // Calculate distance
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        // Calculate normalized direction vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate how much overlap needs to be resolved
        const overlap = MIN_TEAMMATE_DISTANCE - distance;
        
        // Apply force proportional to overlap (push players apart)
        adjustedPosition.x += nx * overlap * 0.5;
        adjustedPosition.y += ny * overlap * 0.5;
      } else {
        // If distance is 0 (exactly same position), apply small random offset
        adjustedPosition.x += (Math.random() - 0.5) * MIN_TEAMMATE_DISTANCE;
        adjustedPosition.y += (Math.random() - 0.5) * MIN_TEAMMATE_DISTANCE;
      }
    }
  }
  
  if (collisionDetected) {
    // If player is a defender, they should maintain more structure
    if (player.role === 'defender') {
      // Pull more toward original target position to maintain formation
      const targetVector = {
        x: player.targetPosition.x - adjustedPosition.x,
        y: player.targetPosition.y - adjustedPosition.y
      };
      
      const targetDistance = Math.sqrt(
        targetVector.x * targetVector.x + targetVector.y * targetVector.y
      );
      
      if (targetDistance > 0) {
        // Add a small bias toward the target position
        adjustedPosition.x += targetVector.x / targetDistance * 1.5;
        adjustedPosition.y += targetVector.y / targetDistance * 1.5;
      }
    }
  }
  
  return adjustedPosition;
};
