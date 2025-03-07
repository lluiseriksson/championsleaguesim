
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
  
  // No advantage for higher-rated team, only compensation for lower-rated team
  if (teamElo >= opponentElo) {
    return 0; // No extra radius for higher-rated team
  }
  
  // Calculate adjustment for lower-rated team (0 to 3 units)
  // Square root to make the effect more pronounced at lower differences
  return Math.sqrt(eloDifference / 500) * 3;
};

// Format and log ELO advantages
export const logEloAdvantage = (homeTeam: string, homeElo: number, awayTeam: string, awayElo: number): void => {
  const eloDifference = Math.abs(homeElo - awayElo);
  const advantageTeam = homeElo > awayElo ? homeTeam : awayElo > homeElo ? awayTeam : null;
  
  if (advantageTeam && eloDifference > 50) {
    const disadvantageTeam = advantageTeam === homeTeam ? awayTeam : homeTeam;
    const radiusBonus = calculateEloRadiusAdjustment(
      advantageTeam === homeTeam ? awayElo : homeElo,
      advantageTeam === homeTeam ? homeElo : awayElo
    );
    
    console.log(
      `ELO advantage: ${advantageTeam} (${advantageTeam === homeTeam ? homeElo : awayElo}) vs ${disadvantageTeam} (${advantageTeam === homeTeam ? awayElo : homeElo}). ` +
      `Radius bonus: +${radiusBonus.toFixed(2)} units for ${disadvantageTeam}`
    );
  }
};
