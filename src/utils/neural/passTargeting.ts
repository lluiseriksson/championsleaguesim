
import { Player, Ball, Position } from '../../types/football';
import { calculateDistance } from '../positionHelpers';

// Function to find the best teammate to pass to
export const findBestPassTarget = (
  player: Player,
  ball: Ball,
  players: Player[]
): Player | undefined => {
  // Filter to get only teammates
  const teammates = players.filter(p => p.team === player.team && p.id !== player.id);
  
  if (teammates.length === 0) return undefined;
  
  // Define weights for scoring
  const DISTANCE_WEIGHT = 0.4;  // Lower is better
  const FORWARD_POSITION_WEIGHT = 0.3;  // Higher is better
  const OPPONENT_PROXIMITY_WEIGHT = 0.3;  // Lower is better
  
  // Get opponents to check passing lanes
  const opponents = players.filter(p => p.team !== player.team);
  
  // Scoring function for each potential target
  const getPassScore = (target: Player): number => {
    // Distance score - we want closer players to have higher scores
    const distance = calculateDistance(player.position, target.position);
    const normalizedDistance = Math.min(1, distance / 400); // Normalize to 0-1 range
    const distanceScore = 1 - normalizedDistance;
    
    // Forward position score - prefer players further in attacking direction
    const isForward = (player.team === 'red' && target.position.x > player.position.x) ||
                      (player.team === 'blue' && target.position.x < player.position.x);
    const forwardPositionScore = isForward ? 0.8 : 0.2;
    
    // Check if passing lane is clear
    let clearLaneScore = 1.0;
    
    for (const opponent of opponents) {
      // Calculate if opponent is in the passing lane
      const inPassingLane = isInPassingLane(
        player.position, 
        target.position, 
        opponent.position
      );
      
      if (inPassingLane) {
        clearLaneScore *= 0.5; // Reduce score if opponent in lane
      }
    }
    
    // Calculate final score
    const finalScore = 
      (distanceScore * DISTANCE_WEIGHT) +
      (forwardPositionScore * FORWARD_POSITION_WEIGHT) +
      (clearLaneScore * OPPONENT_PROXIMITY_WEIGHT);
    
    return finalScore;
  };
  
  // Calculate scores for all teammates
  const scoredTeammates = teammates.map(teammate => ({
    player: teammate,
    score: getPassScore(teammate)
  }));
  
  // Sort by score (highest first)
  scoredTeammates.sort((a, b) => b.score - a.score);
  
  // Return the best target, or undefined if no good targets
  return scoredTeammates.length > 0 ? scoredTeammates[0].player : undefined;
};

// Helper function to check if a point is in the passing lane
const isInPassingLane = (
  from: Position,
  to: Position,
  point: Position,
  tolerance: number = 30 // Adjust tolerance as needed
): boolean => {
  // Vector from start to end
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Normalized direction vector
  const dirX = dx / length;
  const dirY = dy / length;
  
  // Vector from start to point
  const pointDx = point.x - from.x;
  const pointDy = point.y - from.y;
  
  // Project point onto line
  const projectionLength = pointDx * dirX + pointDy * dirY;
  
  // Check if the projection is within the line segment
  if (projectionLength < 0 || projectionLength > length) {
    return false;
  }
  
  // Calculate the distance from the point to the line
  const projectedX = from.x + dirX * projectionLength;
  const projectedY = from.y + dirY * projectionLength;
  
  const distanceToLine = Math.sqrt(
    Math.pow(point.x - projectedX, 2) + 
    Math.pow(point.y - projectedY, 2)
  );
  
  // Return true if the point is close enough to the line
  return distanceToLine < tolerance;
};
