// Types for neural network models in database
export interface NeuralModelData {
  id?: number;
  team: string;
  role: string;
  version: number;
  weights: any;
  training_sessions?: number;
  performance_score?: number;
  last_updated?: string;
}

// Calculate radius adjustment based on ELO difference - MORE AGGRESSIVE IMPLEMENTATION
export const calculateEloRadiusAdjustment = (teamElo: number = 1500, opponentElo: number = 1500): number => {
  // Get absolute ELO difference (cap at 500 to prevent extreme adjustments)
  const eloDifference = Math.min(Math.abs(teamElo - opponentElo), 500);
  
  // Higher-rated team gets more significant radius boost, lower-rated team gets stronger penalty
  if (teamElo > opponentElo) {
    // More aggressive bonus for higher-rated team (0 to 15 units, up from 10)
    return Math.sqrt(eloDifference / 500) * 15;
  } else if (teamElo < opponentElo) {
    // More aggressive penalty for lower-rated team (0 to -15 units, down from -10)
    return -Math.sqrt(eloDifference / 500) * 15;
  }
  
  return 0; // No adjustment for equal ratings
};

// Calculate goalkeeper reach adjustment for straight and angled shots based on ELO - MORE AGGRESSIVE IMPLEMENTATION
export const calculateEloGoalkeeperReachAdjustment = (
  teamElo: number = 1500, 
  opponentElo: number = 1500, 
  isAngledShot: boolean = false
): number => {
  // Get absolute ELO difference (cap at 500 to prevent extreme adjustments)
  const eloDifference = Math.min(Math.abs(teamElo - opponentElo), 500);
  
  if (teamElo > opponentElo) {
    // Higher-rated team's goalkeeper gets stronger bonus reach
    if (isAngledShot) {
      // Now adding a small bonus for angled shots too (up to 8 units)
      return Math.sqrt(eloDifference / 500) * 8;
    } else {
      // Even more significant bonus for straight shots (up to 25 units, up from 20)
      return Math.sqrt(eloDifference / 500) * 25;
    }
  } else if (teamElo < opponentElo) {
    // Lower-rated team's goalkeeper gets stronger penalty
    if (isAngledShot) {
      // More severe penalty for angled shots (up to -15 units, down from -10)
      // The larger the ELO difference, the more severe the penalty
      return -Math.sqrt(eloDifference / 500) * 15;
    } else {
      // Adding a small penalty for straight shots too (up to -5 units)
      return -Math.sqrt(eloDifference / 500) * 5;
    }
  }
  
  return 0; // No adjustment for equal ratings
};

// Format and log ELO advantages
export const logEloAdvantage = (homeTeam: string, homeElo: number, awayTeam: string, awayElo: number): void => {
  const eloDifference = Math.abs(homeElo - awayElo);
  const advantageTeam = homeElo > awayElo ? homeTeam : awayElo > homeElo ? awayTeam : null;
  
  if (advantageTeam && eloDifference > 50) {
    const disadvantageTeam = advantageTeam === homeTeam ? awayTeam : homeTeam;
    const advantageElo = advantageTeam === homeTeam ? homeElo : awayElo;
    const disadvantageElo = advantageTeam === homeTeam ? awayElo : homeElo;
    
    const radiusBonus = calculateEloRadiusAdjustment(
      advantageElo,
      disadvantageElo
    );
    
    console.log(
      `ELO advantage: ${advantageTeam} (${advantageElo}) vs ${disadvantageTeam} (${disadvantageElo}). ` +
      `Radius bonus: ${radiusBonus > 0 ? '+' : ''}${radiusBonus.toFixed(2)} units for ${advantageTeam}`
    );
  }
};
