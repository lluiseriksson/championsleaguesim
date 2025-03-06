import { Player, Position, PLAYER_RADIUS } from '../../types/football';

// Fixed minimum distance that players should maintain
const MIN_PLAYER_DISTANCE = PLAYER_RADIUS * 2;

/**
 * Detects if two players are too close to each other
 */
export const arePlayersTooClose = (player1: Position, player2: Position): boolean => {
  const dx = player1.x - player2.x;
  const dy = player1.y - player2.y;
  const distanceSquared = dx * dx + dy * dy;
  
  // Using squared distance for performance (avoiding square root)
  return distanceSquared < MIN_PLAYER_DISTANCE * MIN_PLAYER_DISTANCE;
};

/**
 * Calculates an adjusted position to avoid player collisions
 * (both teammates and opponents)
 */
export const calculateCollisionAvoidance = (
  player: Player,
  teammates: Player[],
  proposedPosition: Position,
  allPlayers?: Player[]
): Position => {
  // Skip processing for goalkeepers (they need to stay in position)
  if (player.role === 'goalkeeper') {
    return proposedPosition;
  }
  
  let adjustedPosition = { ...proposedPosition };
  let collisionDetected = false;
  
  // Get all other players (including opponents if provided)
  const otherPlayers = allPlayers || teammates;
  
  // Check for collisions with all other players
  for (const otherPlayer of otherPlayers) {
    // Skip self and goalkeeper comparisons
    if (otherPlayer.id === player.id || otherPlayer.role === 'goalkeeper') {
      continue;
    }
    
    if (arePlayersTooClose(adjustedPosition, otherPlayer.position)) {
      collisionDetected = true;
      
      // Calculate vector from other player to this player
      const dx = adjustedPosition.x - otherPlayer.position.x;
      const dy = adjustedPosition.y - otherPlayer.position.y;
      
      // Calculate distance
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        // Calculate normalized direction vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate how much overlap needs to be resolved
        const overlap = MIN_PLAYER_DISTANCE - distance;
        
        // Apply force proportional to overlap (push players apart)
        adjustedPosition.x += nx * overlap * 0.5;
        adjustedPosition.y += ny * overlap * 0.5;
      } else {
        // If distance is 0 (exactly same position), apply small random offset
        adjustedPosition.x += (Math.random() - 0.5) * MIN_PLAYER_DISTANCE;
        adjustedPosition.y += (Math.random() - 0.5) * MIN_PLAYER_DISTANCE;
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
