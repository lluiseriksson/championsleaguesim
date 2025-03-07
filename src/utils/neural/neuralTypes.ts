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

// Calculate radius adjustment based on ELO difference - EXTREMELY AGGRESSIVE IMPLEMENTATION
export const calculateEloRadiusAdjustment = (teamElo: number = 1500, opponentElo: number = 1500): number => {
  // Get absolute ELO difference (cap at 500 to prevent extreme adjustments)
  const eloDifference = Math.min(Math.abs(teamElo - opponentElo), 500);
  
  // Higher-rated team gets very significant radius boost, lower-rated team gets stronger penalty
  if (teamElo > opponentElo) {
    // Super aggressive bonus for higher-rated team (0 to 20 units, up from 15)
    return Math.sqrt(eloDifference / 500) * 20;
  } else if (teamElo < opponentElo) {
    // Super aggressive penalty for lower-rated team (0 to -20 units, down from -15)
    return -Math.sqrt(eloDifference / 500) * 20;
  }
  
  return 0; // No adjustment for equal ratings
};

// Calculate goalkeeper reach adjustment for straight and angled shots based on ELO - EXTREMELY AGGRESSIVE IMPLEMENTATION
export const calculateEloGoalkeeperReachAdjustment = (
  teamElo: number = 1500, 
  opponentElo: number = 1500, 
  isAngledShot: boolean = false
): number => {
  // Get absolute ELO difference (cap at 500 to prevent extreme adjustments)
  const eloDifference = Math.min(Math.abs(teamElo - opponentElo), 500);
  
  if (teamElo > opponentElo) {
    // Higher-rated team's goalkeeper gets vastly improved reach
    if (isAngledShot) {
      // Bigger bonus for angled shots (up to 12 units, up from 8)
      return Math.sqrt(eloDifference / 500) * 12;
    } else {
      // Major bonus for straight shots (up to 30 units, up from 25)
      return Math.sqrt(eloDifference / 500) * 30;
    }
  } else if (teamElo < opponentElo) {
    // Lower-rated team's goalkeeper gets severely reduced reach
    if (isAngledShot) {
      // Much more severe penalty for angled shots (up to -25 units, down from -15)
      return -Math.sqrt(eloDifference / 500) * 25;
    } else {
      // Bigger penalty for straight shots too (up to -10 units, down from -5)
      return -Math.sqrt(eloDifference / 500) * 10;
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
