
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

// Calculate radius adjustment based on ELO difference
export const calculateEloRadiusAdjustment = (teamElo: number = 1500, opponentElo: number = 1500): number => {
  // Get absolute ELO difference (cap at 500 to prevent extreme adjustments)
  const eloDifference = Math.min(Math.abs(teamElo - opponentElo), 500);
  
  // Higher-rated team gets radius boost, lower-rated team gets penalty
  if (teamElo > opponentElo) {
    // Calculate bonus for higher-rated team (0 to 3 units)
    return Math.sqrt(eloDifference / 500) * 3;
  } else if (teamElo < opponentElo) {
    // Calculate penalty for lower-rated team (0 to -1.5 units)
    // Using half the positive adjustment to ensure playability
    return -Math.sqrt(eloDifference / 500) * 1.5;
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
