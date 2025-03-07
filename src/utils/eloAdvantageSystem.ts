
import { Player, Position } from '../types/football';

// Base multiplier to adjust the overall strength of ELO effects
// Higher value = stronger effects for the same ELO difference
export const BASE_ELO_IMPACT = 1.0; 

// ELO difference at which a team reaches maximum advantage
// Lower value = reaches max advantage at smaller ELO differences
export const MAX_ADVANTAGE_ELO_DIFF = 400;

// Maximum advantage multiplier regardless of ELO difference
// Higher value = stronger maximum possible advantage
export const MAX_ADVANTAGE_MULTIPLIER = 2.5;

// Minimum multiplier for disadvantaged teams
// Higher value = less disadvantage for lower ELO teams
export const MIN_DISADVANTAGE_MULTIPLIER = 0.5; 

// Calculate advantage factors for both teams based on their ELO difference
export const calculateTeamAdvantageFactors = (
  redElo: number,
  blueElo: number,
  baseImpactMultiplier: number = BASE_ELO_IMPACT
): { red: number, blue: number } => {
  // Equal ELO = no advantage for either team
  if (Math.abs(redElo - blueElo) < 20) {
    return { red: 1.0, blue: 1.0 };
  }
  
  const eloDifference = redElo - blueElo;
  
  // Normalize ELO difference to a 0-1 scale based on MAX_ADVANTAGE_ELO_DIFF
  const normalizedDifference = Math.min(
    Math.abs(eloDifference) / MAX_ADVANTAGE_ELO_DIFF, 
    1.0
  ) * baseImpactMultiplier;
  
  // Calculate advantage scaling (from 1.0 to MAX_ADVANTAGE_MULTIPLIER)
  const advantageScale = 1.0 + normalizedDifference * (MAX_ADVANTAGE_MULTIPLIER - 1.0);
  
  // Calculate disadvantage scaling (from MIN_DISADVANTAGE_MULTIPLIER to 1.0)
  // Higher normalizedDifference = closer to MIN_DISADVANTAGE_MULTIPLIER
  const disadvantageScale = 1.0 - normalizedDifference * (1.0 - MIN_DISADVANTAGE_MULTIPLIER);
  
  // Apply advantage to team with higher ELO, disadvantage to team with lower ELO
  if (eloDifference > 0) {
    // Red has higher ELO
    return { 
      red: advantageScale, 
      blue: disadvantageScale 
    };
  } else {
    // Blue has higher ELO
    return { 
      red: disadvantageScale, 
      blue: advantageScale 
    };
  }
};

// Get team ELO ratings from players array
export const getTeamEloRatings = (players: Player[]): { red: number, blue: number } => {
  const redPlayers = players.filter(p => p.team === 'red');
  const bluePlayers = players.filter(p => p.team === 'blue');
  
  const redElo = redPlayers.length > 0 && redPlayers[0].teamElo ? redPlayers[0].teamElo : 2000;
  const blueElo = bluePlayers.length > 0 && bluePlayers[0].teamElo ? bluePlayers[0].teamElo : 2000;
  
  return { red: redElo, blue: blueElo };
};

// Calculate player-specific advantage based on role and team advantage
export const calculatePlayerAdvantage = (
  player: Player,
  teamAdvantage: number
): number => {
  // Role-specific multipliers (optional refinement)
  let roleMultiplier = 1.0;
  switch (player.role) {
    case 'forward':
      roleMultiplier = 1.15; // Forwards get biggest boost
      break;
    case 'midfielder':
      roleMultiplier = 1.1; // Midfielders get medium boost
      break;
    case 'defender':
      roleMultiplier = 0.95; // Defenders get slightly smaller boost
      break;
    case 'goalkeeper':
      roleMultiplier = 0.9; // Goalkeepers get smallest boost
      break;
  }
  
  // Scale the team advantage by role
  const baseAdvantage = teamAdvantage;
  const scaledAdvantage = 1.0 + ((baseAdvantage - 1.0) * roleMultiplier);
  
  return scaledAdvantage;
};

// Debug function to log ELO advantages
export const logEloAdvantages = (
  redElo: number,
  blueElo: number,
  baseImpactMultiplier: number = BASE_ELO_IMPACT
): void => {
  const diff = Math.abs(redElo - blueElo);
  const factors = calculateTeamAdvantageFactors(redElo, blueElo, baseImpactMultiplier);
  
  console.log(`ELO Analysis: Red ${redElo} vs Blue ${blueElo} (diff: ${diff})`);
  console.log(`  Impact multiplier: ${baseImpactMultiplier.toFixed(2)}`);
  console.log(`  Red advantage: ${factors.red.toFixed(2)}x`);
  console.log(`  Blue advantage: ${factors.blue.toFixed(2)}x`);
  
  if (redElo > blueElo) {
    console.log(`  Red has ${((factors.red - 1.0) * 100).toFixed(0)}% advantage`);
    console.log(`  Blue has ${((1.0 - factors.blue) * 100).toFixed(0)}% disadvantage`);
  } else if (blueElo > redElo) {
    console.log(`  Blue has ${((factors.blue - 1.0) * 100).toFixed(0)}% advantage`);
    console.log(`  Red has ${((1.0 - factors.red) * 100).toFixed(0)}% disadvantage`);
  } else {
    console.log(`  Teams are even (no advantage)`);
  }
}
