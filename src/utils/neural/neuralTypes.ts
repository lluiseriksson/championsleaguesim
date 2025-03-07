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

// Calculate radius adjustment based on ELO difference - FIXED IMPLEMENTATION
export const calculateEloRadiusAdjustment = (teamElo: number = 1500, opponentElo: number = 1500): number => {
  // Get absolute ELO difference (cap at 500 to prevent extreme adjustments)
  const eloDifference = Math.min(Math.abs(teamElo - opponentElo), 500);
  
  // CRITICAL FIX: Previous implementation had reversed logic - higher-rated teams should get a bonus
  // The issue was that the function returned positive values for weaker teams and negative for stronger teams
  if (teamElo > opponentElo) {
    // Correct bonus for higher-rated team (0 to 20 units)
    return Math.sqrt(eloDifference / 500) * 20;
  } else if (teamElo < opponentElo) {
    // Correct penalty for lower-rated team (0 to -20 units)
    return -Math.sqrt(eloDifference / 500) * 20;
  }
  
  return 0; // No adjustment for equal ratings
};

// Calculate goalkeeper reach adjustment for straight and angled shots based on ELO - FIXED IMPLEMENTATION
export const calculateEloGoalkeeperReachAdjustment = (
  teamElo: number = 1500, 
  opponentElo: number = 1500, 
  isAngledShot: boolean = false
): number => {
  // Get absolute ELO difference (cap at 500 to prevent extreme adjustments)
  const eloDifference = Math.min(Math.abs(teamElo - opponentElo), 500);
  
  // CRITICAL FIX: Previous implementation had reversed logic - higher-rated goalkeepers should get better reach
  if (teamElo > opponentElo) {
    // Higher-rated team's goalkeeper gets improved reach
    if (isAngledShot) {
      // Bonus for angled shots (up to 12 units)
      return Math.sqrt(eloDifference / 500) * 12;
    } else {
      // Major bonus for straight shots (up to 30 units)
      return Math.sqrt(eloDifference / 500) * 30;
    }
  } else if (teamElo < opponentElo) {
    // Lower-rated team's goalkeeper gets reduced reach
    if (isAngledShot) {
      // Penalty for angled shots (up to -25 units)
      return -Math.sqrt(eloDifference / 500) * 25;
    } else {
      // Penalty for straight shots too (up to -10 units)
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

// NEW: Diagnostic logging for neural network operations
export const logNeuralNetworkStatus = (team: string, role: string, playerId: number, status: string, details?: any): void => {
  const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS format
  console.log(`[NN:${timestamp}] ${team} ${role} #${playerId}: ${status}`);
  if (details) {
    console.log(`  Details: `, typeof details === 'object' ? JSON.stringify(details, null, 2) : details);
  }
};

// NEW: Log neural network validation results
export const logNetworkValidation = (team: string, role: string, playerId: number, isValid: boolean, error?: any): void => {
  const timestamp = new Date().toISOString().substr(11, 8);
  if (isValid) {
    console.log(`[NN-Valid:${timestamp}] ${team} ${role} #${playerId}: Network is valid`);
  } else {
    console.log(`[NN-Error:${timestamp}] ${team} ${role} #${playerId}: Network validation failed`);
    if (error) {
      console.error(`  Error: `, error);
    }
  }
};

// NEW: Log neural network training operations
export const logTrainingOperation = (team: string, role: string, playerId: number, actionType: string, reward: number, success: boolean): void => {
  const timestamp = new Date().toISOString().substr(11, 8);
  console.log(
    `[NN-Train:${timestamp}] ${team} ${role} #${playerId}: ` +
    `Action: ${actionType}, Reward: ${reward.toFixed(2)}, Success: ${success ? 'Yes' : 'No'}`
  );
};

// NEW: Log neural network prediction issues
export const logPredictionIssue = (team: string, role: string, playerId: number, issue: string): void => {
  const timestamp = new Date().toISOString().substr(11, 8);
  console.warn(`[NN-Predict:${timestamp}] ${team} ${role} #${playerId}: ${issue}`);
};

// NEW: Log ELO adjustment details for debugging
export const logEloAdjustmentDetails = (
  type: string, 
  team: string, 
  teamElo: number, 
  opponentElo: number, 
  adjustment: number
): void => {
  const timestamp = new Date().toISOString().substr(11, 8);
  console.log(
    `[ELO-Adjust:${timestamp}] ${team}: ${type} adjustment: ${adjustment.toFixed(2)} units ` +
    `(Team ELO: ${teamElo}, Opponent ELO: ${opponentElo}, Diff: ${(teamElo - opponentElo).toFixed(0)})`
  );
};
