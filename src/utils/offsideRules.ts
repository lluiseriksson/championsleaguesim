import { Player, Ball, Position } from '../types/football';

// Check if a player is in an offside position
export const isOffside = (
  player: Player, 
  allPlayers: Player[],
  lastTeamTouched: 'red' | 'blue' | null
): boolean => {
  // No offside if player's team was the last to touch the ball
  if (lastTeamTouched === player.team) {
    return false;
  }
  
  // No offside in own half
  const inOwnHalf = (player.team === 'red' && player.position.x < 400) || 
                    (player.team === 'blue' && player.position.x > 400);
  if (inOwnHalf) {
    return false;
  }
  
  // Get all defenders of the opposing team
  const defenders = allPlayers.filter(p => 
    p.team !== player.team && 
    (p.role === 'defender' || p.role === 'goalkeeper')
  );
  
  // Find the second last defender (including goalkeeper)
  if (defenders.length < 2) return false;
  
  // Sort defenders by their position along the x-axis (depending on which side they defend)
  let sortedDefenders;
  if (player.team === 'red') {
    // Red attacks right, so sort defenders from right to left
    sortedDefenders = [...defenders].sort((a, b) => b.position.x - a.position.x);
  } else {
    // Blue attacks left, so sort defenders from left to right
    sortedDefenders = [...defenders].sort((a, b) => a.position.x - b.position.x);
  }
  
  const secondLastDefender = sortedDefenders[1];
  
  // Check if player is ahead of the second last defender
  if (player.team === 'red') {
    // Red attacks right
    return player.position.x > secondLastDefender.position.x;
  } else {
    // Blue attacks left
    return player.position.x < secondLastDefender.position.x;
  }
};

// Function to determine which team last touched the ball
export const getLastTeamTouchingBall = (players: Player[], ball: Ball): Player | null => {
  // Find the closest player to the ball within touching distance
  const touchDistance = 25; // Proximity required to consider a touch
  
  // Filter players close to the ball
  const nearbyPlayers = players.filter(player => {
    const dx = player.position.x - ball.position.x;
    const dy = player.position.y - ball.position.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared < touchDistance * touchDistance;
  });
  
  if (nearbyPlayers.length === 0) {
    return null;
  }
  
  // Return the closest player
  return nearbyPlayers.reduce((closest, current) => {
    const closestDist = calculateDistance(closest.position, ball.position);
    const currentDist = calculateDistance(current.position, ball.position);
    return currentDist < closestDist ? current : closest;
  });
};

// Helper function to calculate distance between two positions
const calculateDistance = (pos1: Position, pos2: Position): number => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
};
