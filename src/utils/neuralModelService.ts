
// Re-export all neural network service functionality from specialized modules
import { saveModel, loadModel, saveTrainingSession, loadSpecializedNetworks } from './neural/modelPersistence';
import { getBestModel, combineModels } from './neural/modelOptimization';
import { getModelStats, compareModelPerformance } from './neural/modelStatistics';
import { trainFromPreviousGames, syncPlayerHistoricalData } from './neural/historicalTraining';
import { getTeamElo } from './tournament/eloRatings';

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
  
  // Historical training functions
  trainFromPreviousGames,
  syncPlayerHistoricalData,
  
  // ELO rating helper
  getTeamElo
};
