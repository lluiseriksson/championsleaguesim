
/**
 * Utility functions for ELO-based calculations in the tournament
 */

// Calculate win probability based on ELO difference using the formula:
// P(win) = 1 / (1 + 10^(-eloDiff/400))
export const calculateWinProbability = (playerElo: number, opponentElo: number): number => {
  const eloDiff = playerElo - opponentElo;
  return 1 / (1 + Math.pow(10, -eloDiff / 400));
};

// Determine winner based on ELO ratings and randomization
export const determineWinnerByElo = (teamAElo: number, teamBElo: number): 'A' | 'B' => {
  const teamAProbability = calculateWinProbability(teamAElo, teamBElo);
  const randomValue = Math.random();
  
  // If random value is less than the calculated probability, team A wins
  return randomValue < teamAProbability ? 'A' : 'B';
};

// Generate realistic score based on ELO difference
export const generateScore = (winnerElo: number, loserElo: number, isGoldenGoal: boolean = false): { winner: number, loser: number } => {
  // If it's a golden goal situation, always return a 1-0 score
  if (isGoldenGoal) {
    return { winner: 1, loser: 0 };
  }
  
  // Base scores
  const eloDifference = Math.abs(winnerElo - loserElo);
  
  // Calculate base goal difference based on ELO difference
  // Higher ELO difference leads to higher goal difference but with realistic scaling
  // With real ELO values, differences are more subtle
  const baseGoalDiff = Math.min(Math.floor(eloDifference / 100), 4);
  
  // Winner will score at least 1 goal
  // More goals for higher ELO teams but keep it realistic
  const winnerGoals = 1 + Math.floor(Math.random() * 3) + (Math.random() < 0.6 ? Math.floor(baseGoalDiff / 2) : 0);
  
  // Loser might score 0 or more goals, but less than winner
  let loserGoals = Math.max(0, winnerGoals - baseGoalDiff - Math.floor(Math.random() * 2));
  
  // Ensure no draws
  if (winnerGoals === loserGoals) {
    // In case of a mathematical tie, increase winner goals
    return { winner: winnerGoals + 1, loser: loserGoals };
  }
  
  return { winner: winnerGoals, loser: loserGoals };
};

// Check if the match should be decided by golden goal
export const shouldUseGoldenGoal = (teamAElo: number, teamBElo: number): boolean => {
  // Close ELO ratings increase chance of golden goal
  const eloDifference = Math.abs(teamAElo - teamBElo);
  
  // If teams are closely matched (small ELO difference), higher chance of golden goal
  // With real ELO values, we need to adjust the scaling
  const goldenGoalProbability = Math.max(0, 0.3 - eloDifference / 500);
  
  return Math.random() < goldenGoalProbability;
};

// Calculate training effectiveness based on ELO differences
export const calculateExpectedTrainingEffectiveness = (
  trainingTeamElo: number, 
  nonTrainingTeamElo: number
): number => {
  // Calculate how much benefit training should provide based on ELO gap
  const eloDifference = trainingTeamElo - nonTrainingTeamElo;
  
  // If team is already stronger, training should have diminishing returns
  if (eloDifference > 0) {
    // Diminishing returns for already stronger teams
    return Math.max(0.8, 1.0 - (eloDifference / 500)); 
  }
  
  // If team is weaker, training should be more effective
  // The weaker the team, the more room for improvement
  return Math.min(1.5, 1.0 + (Math.abs(eloDifference) / 300));
};

// Determine if training is beneficial for a specific team
export const isTrainingBeneficial = (
  teamElo: number,
  avgOpponentElo: number,
  actualWinRate: number
): { 
  isBeneficial: boolean,
  expectedEffectiveness: number,
  actualEffectiveness: number,
  effectivenessRatio: number,
  confidence: number
} => {
  const expectedEffectiveness = calculateExpectedTrainingEffectiveness(teamElo, avgOpponentElo);
  
  // Expected win rate based on ELO
  const expectedWinRate = calculateWinProbability(teamElo, avgOpponentElo);
  
  // Calculate actual effectiveness as ratio between actual win rate and expected win rate
  const actualEffectiveness = actualWinRate / expectedWinRate;
  
  // Calculate ratio between actual and expected effectiveness
  const effectivenessRatio = actualEffectiveness / expectedEffectiveness;
  
  // Determine confidence based on sample size (assuming matches data is passed)
  // More matches = higher confidence in the results
  const matchesCount = Math.min(20, actualWinRate > 0 ? 10 : 5); // Estimate based on having a win rate
  const confidence = Math.min(0.95, matchesCount / 20);
  
  // Training is beneficial if effectiveness ratio exceeds threshold
  const benefitThreshold = 0.95; // 95% of expected effectiveness is still considered beneficial
  const isBeneficial = effectivenessRatio >= benefitThreshold;
  
  return {
    isBeneficial,
    expectedEffectiveness,
    actualEffectiveness,
    effectivenessRatio,
    confidence
  };
};

// Calculate comparative performance between training and non-training neural networks
export const compareTrainingPerformance = (
  trainingTeamResults: { wins: number, matches: number },
  nonTrainingTeamResults: { wins: number, matches: number },
  trainingTeamElo: number,
  nonTrainingTeamElo: number
): {
  trainingWinRate: number,
  nonTrainingWinRate: number,
  expectedTrainingWinRate: number,
  expectedNonTrainingWinRate: number,
  trainingEfficiency: number,
  nonTrainingEfficiency: number,
  comparisonRatio: number,
  isTrainingEffective: boolean
} => {
  // Calculate actual win rates
  const trainingWinRate = trainingTeamResults.matches > 0 ? 
    trainingTeamResults.wins / trainingTeamResults.matches : 0;
  
  const nonTrainingWinRate = nonTrainingTeamResults.matches > 0 ? 
    nonTrainingTeamResults.wins / nonTrainingTeamResults.matches : 0;
  
  // Calculate expected win rates based on ELO
  const expectedTrainingWinRate = calculateWinProbability(trainingTeamElo, nonTrainingTeamElo);
  const expectedNonTrainingWinRate = calculateWinProbability(nonTrainingTeamElo, trainingTeamElo);
  
  // Calculate efficiency (actual win rate / expected win rate)
  const trainingEfficiency = expectedTrainingWinRate > 0 ? 
    trainingWinRate / expectedTrainingWinRate : 0;
  
  const nonTrainingEfficiency = expectedNonTrainingWinRate > 0 ? 
    nonTrainingWinRate / expectedNonTrainingWinRate : 0;
  
  // Compare training team's efficiency to non-training team's efficiency
  // Values > 1 indicate training is effective
  const comparisonRatio = nonTrainingEfficiency > 0 ? 
    trainingEfficiency / nonTrainingEfficiency : 
    trainingEfficiency > 0 ? 2.0 : 1.0;
  
  // Determine if training is effective (if the ratio exceeds threshold)
  const isTrainingEffective = comparisonRatio >= 1.05; // 5% improvement threshold
  
  return {
    trainingWinRate,
    nonTrainingWinRate,
    expectedTrainingWinRate,
    expectedNonTrainingWinRate,
    trainingEfficiency,
    nonTrainingEfficiency,
    comparisonRatio,
    isTrainingEffective
  };
};
