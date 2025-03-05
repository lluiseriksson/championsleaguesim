
// Re-export all neural network service functionality from specialized modules
import { saveModel, loadModel, saveTrainingSession } from './neural/modelPersistence';
import { getBestModel, combineModels } from './neural/modelOptimization';
import { getModelStats, compareModelPerformance } from './neural/modelStatistics';

// Export all functions
export {
  // Persistence functions
  saveModel,
  loadModel,
  saveTrainingSession,
  
  // Optimization functions
  getBestModel,
  combineModels,
  
  // Statistics functions
  getModelStats,
  compareModelPerformance
};
