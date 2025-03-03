import { Player, Position } from '../types/football';

// Helper function to get the last defender position
export const getLastDefenderPosition = (defenders: Player[], opposingTeam: 'red' | 'blue') => {
  if (defenders.length === 0) return null;
  
  if (opposingTeam === 'red') {
    // Blue team is attacking, find the defender closest to blue's goal (left side)
    return defenders.reduce((prev, current) => 
      prev.position.x < current.position.x ? prev : current
    ).position;
  } else {
    // Red team is attacking, find the defender closest to red's goal (right side)
    return defenders.reduce((prev, current) => 
      prev.position.x > current.position.x ? prev : current
    ).position;
  }
};

// Helper function to calculate the distance between two positions
export const calculateDistance = (pos1: Position, pos2: Position): number => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Apply position restrictions based on player role and game state
export const applyPositionRestrictions = (
  newPosition: Position,
  player: Player,
  targetPosition: Position,
  maxDistance: number,
  positionRestricted: boolean,
  currentPlayers: Player[]
): Position => {
  // Apply max distance from target position
  const distanceFromStart = Math.sqrt(
    Math.pow(newPosition.x - targetPosition.x, 2) +
    Math.pow(newPosition.y - targetPosition.y, 2)
  );

  if (distanceFromStart > maxDistance) {
    const angle = Math.atan2(
      targetPosition.y - newPosition.y,
      targetPosition.x - newPosition.x
    );
    newPosition.x = targetPosition.x - Math.cos(angle) * maxDistance;
    newPosition.y = targetPosition.y - Math.sin(angle) * maxDistance;
  }
  
  // Apply offside restriction for forwards
  if (positionRestricted && player.role === 'forward') {
    const defenders = currentPlayers.filter(p => p.team !== player.team && p.role === 'defender');
    const lastDefender = getLastDefenderPosition(defenders, player.team);
    
    if (lastDefender) {
      if ((player.team === 'red' && newPosition.x > lastDefender.x) || 
          (player.team === 'blue' && newPosition.x < lastDefender.x)) {
        // Keep the forward in line with the last defender
        newPosition.x = lastDefender.x;
      }
    }
  }
  
  return newPosition;
};
