
// Re-export all neural network service functionality from specialized modules
import { saveModel, loadModel, saveTrainingSession, loadSpecializedNetworks } from './neural/modelPersistence';
import { getBestModel, combineModels } from './neural/modelOptimization';
import { 
  getModelStats, 
  compareModelPerformance, 
  recordTrainingEffectiveness,
  getTrainingEffectiveness,
  isNeuralTrainingEffective
} from './neural/modelStatistics';
import { trainFromPreviousGames, syncPlayerHistoricalData } from './neural/historicalTraining';
import { getTeamElo } from './tournament/eloRatings';
import { areTeamsInConflictList } from '../types/kits/kitConflictChecker';

// Export kit conflict checking as part of the neural model service
// This helps AI understand when visual confusion might impact game outcome
export const checkKitConflict = (homeTeam: string, awayTeam: string): boolean => {
  return areTeamsInConflictList(homeTeam, awayTeam);
};

// Export all functions
export {
  // Persistence functions
  saveModel,
  loadModel,
  saveTrainingSession,
  loadSpecializedNetworks,
  
  // Optimization functions
  getBestModel,
  combineModels,
  
  // Statistics functions
  getModelStats,
  compareModelPerformance,
  recordTrainingEffectiveness,
  getTrainingEffectiveness,
  isNeuralTrainingEffective,
  
  // Historical training functions
  trainFromPreviousGames,
  syncPlayerHistoricalData,
  
  // ELO rating helper
  getTeamElo
};
