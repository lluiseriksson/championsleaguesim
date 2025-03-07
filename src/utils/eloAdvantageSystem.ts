
import { Player, Position } from '../types/football';

// Calculate ELO advantage for a player based on team ELO difference
export const calculatePlayerEloAdvantage = (
  player: Player, 
  opponentElo: number
): number => {
  if (!player.teamElo) return 1.0;
  
  const eloDifference = player.teamElo - opponentElo;
  
  if (eloDifference <= 0) return 1.0;
  
  // Progressive scaling based on ELO difference
  const advantageFactor = Math.min(2.5, 1 + (eloDifference / 600));
  
  // Scale advantage based on player's role
  let roleMultiplier = 1.0;
  switch (player.role) {
    case 'forward':
      roleMultiplier = 1.2; // Forwards get biggest boost
      break;
    case 'midfielder':
      roleMultiplier = 1.1; // Midfielders get medium boost
      break;
    case 'defender':
      roleMultiplier = 0.9; // Defenders get smaller boost
      break;
    case 'goalkeeper':
      roleMultiplier = 0.8; // Goalkeepers get smallest boost
      break;
  }
  
  return 1.0 + ((advantageFactor - 1.0) * roleMultiplier);
};

// Get team ELO ratings from players array
export const getTeamEloRatings = (players: Player[]): { red: number, blue: number } => {
  const redPlayers = players.filter(p => p.team === 'red');
  const bluePlayers = players.filter(p => p.team === 'blue');
  
  const redElo = redPlayers.length > 0 && redPlayers[0].teamElo ? redPlayers[0].teamElo : 2000;
  const blueElo = bluePlayers.length > 0 && bluePlayers[0].teamElo ? bluePlayers[0].teamElo : 2000;
  
  return { red: redElo, blue: blueElo };
};

// Calculate team advantage factors based on ELO difference
export const calculateTeamAdvantageFactors = (
  redElo: number,
  blueElo: number,
  baseMultiplier: number = 1.0
): { red: number, blue: number } => {
  // No advantage by default
  const factors = { red: 1.0, blue: 1.0 };
  
  const eloDifference = redElo - blueElo;
  
  if (Math.abs(eloDifference) < 50) {
    // Teams are very close in rating, no significant advantage
    return factors;
  }
  
  // Calculate advantage scaling based on ELO difference
  const advantageScale = Math.min(2.5, 1.0 + (Math.abs(eloDifference) / 600)) * baseMultiplier;
  
  if (eloDifference > 0) {
    // Red team has advantage
    factors.red = advantageScale;
  } else {
    // Blue team has advantage
    factors.blue = advantageScale;
  }
  
  return factors;
};

// Apply ELO advantage to movement speed
export const applyEloAdvantageToMovement = (
  currentPosition: Position,
  targetPosition: Position,
  eloFactor: number
): Position => {
  if (eloFactor <= 1.0) return currentPosition;
  
  // Calculate direction vector
  const dx = targetPosition.x - currentPosition.x;
  const dy = targetPosition.y - currentPosition.y;
  
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return currentPosition;
  
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Scale movement speed based on ELO advantage, max 50% faster
  const speedBoost = Math.min(1.5, eloFactor);
  const moveSpeed = Math.min(distance, 2 * speedBoost);
  
  if (distance > 0) {
    return {
      x: currentPosition.x + (dx / distance) * moveSpeed * 0.2,
      y: currentPosition.y + (dy / distance) * moveSpeed * 0.2
    };
  }
  
  return currentPosition;
};

// Apply ELO advantage to ball interaction strength
export const applyEloAdvantageToBallInteraction = (
  kickPower: number,
  eloFactor: number
): number => {
  if (eloFactor <= 1.0) return kickPower;
  
  // Higher ELO teams can kick the ball harder
  return kickPower * Math.min(1.8, eloFactor);
};

// Apply ELO advantage to receiving ability (ball control)
export const applyEloAdvantageToBallControl = (
  controlFactor: number,
  eloFactor: number
): number => {
  if (eloFactor <= 1.0) return controlFactor;
  
  // Higher ELO teams have better ball control
  return controlFactor * Math.min(1.6, eloFactor);
};
