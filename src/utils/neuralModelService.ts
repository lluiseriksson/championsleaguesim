
// Re-export all neural network service functionality from specialized modules
import { saveModel, loadModel, saveTrainingSession, loadModelAsync } from './neural/modelPersistence';
import { getBestModel, combineModels } from './neural/modelOptimization';
import { getModelStats, compareModelPerformance } from './neural/modelStatistics';

// Throttling function to prevent too many simultaneous model loads
const throttlePromises = async <T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = 1,
  delayBetweenBatches: number = 100
): Promise<T[]> => {
  console.log(`Throttling ${tasks.length} tasks with batch size ${batchSize}`);
  const results: T[] = [];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} tasks`);
    
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
    
    if (i + batchSize < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
};

// Batch load multiple models with throttling
const batchLoadModels = async (
  playerIds: string[],
  batchSize: number = 1
): Promise<Record<string, any>> => {
  console.log(`Batch loading ${playerIds.length} models with batch size ${batchSize}`);
  
  // Fix: mapping tasks now includes team, role, and version parameters
  const tasks = playerIds.map(id => {
    // Extract team and role from the player ID
    const [team, role] = id.split('-');
    return () => loadModelAsync(team, role, 1); // Using default version 1
  });
  
  const results = await throttlePromises(tasks, batchSize);
  
  const modelMap: Record<string, any> = {};
  playerIds.forEach((id, index) => {
    modelMap[id] = results[index];
  });
  
  return modelMap;
};

// Export all functions
export {
  // Persistence functions
  saveModel,
  loadModel,
  loadModelAsync,
  saveTrainingSession,
  
  // Optimization functions
  getBestModel,
  combineModels,
  
  // Statistics functions
  getModelStats,
  compareModelPerformance,
  
  // Batch loading utilities
  batchLoadModels,
  throttlePromises
};
