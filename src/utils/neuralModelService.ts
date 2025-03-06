// Re-export all neural network service functionality from specialized modules
import { saveModel, loadModel, saveTrainingSession, loadModelAsync } from './neural/modelPersistence';
import { getBestModel, combineModels } from './neural/modelOptimization';
import { getModelStats, compareModelPerformance } from './neural/modelStatistics';

// Cache for loaded models to prevent repeated loading
const modelCache: Record<string, any> = {};

// Throttling function to prevent too many simultaneous model loads
const throttlePromises = async <T>(
  tasks: (() => Promise<T>)[],
  batchSize: number = 1,
  delayBetweenBatches: number = 200  // Increased delay between batches
): Promise<T[]> => {
  console.log(`Throttling ${tasks.length} tasks with batch size ${batchSize}`);
  const results: T[] = [];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} tasks`);
    
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
    
    if (i + batchSize < tasks.length) {
      // Increased delay to reduce CPU/memory pressure
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
};

// Optimized batch load with caching
const batchLoadModels = async (
  playerIds: string[],
  batchSize: number = 1
): Promise<Record<string, any>> => {
  console.log(`Batch loading ${playerIds.length} models with batch size ${batchSize}`);
  
  // Check which models are already in cache vs need loading
  const tasksToRun: (() => Promise<any>)[] = [];
  const cacheKeys: string[] = [];
  
  for (const id of playerIds) {
    const cacheKey = `model-${id}-v1`;
    cacheKeys.push(cacheKey);
    
    if (modelCache[cacheKey]) {
      console.log(`Using cached model for ${id}`);
      tasksToRun.push(() => Promise.resolve(modelCache[cacheKey]));
    } else {
      // Extract team and role from the player ID
      const [team, role] = id.split('-');
      tasksToRun.push(async () => {
        const model = await loadModelAsync(team, role, 1);
        if (model) {
          modelCache[cacheKey] = model;
        }
        return model;
      });
    }
  }
  
  const results = await throttlePromises(tasksToRun, batchSize);
  
  const modelMap: Record<string, any> = {};
  playerIds.forEach((id, index) => {
    modelMap[id] = results[index];
  });
  
  return modelMap;
};

// Function to clear model cache (useful when memory pressure is detected)
const clearModelCache = () => {
  console.log("Clearing neural model cache to free memory");
  for (const key in modelCache) {
    delete modelCache[key];
  }
};

// Smart memory management - automatically clear cache when too many models are loaded
const monitorMemoryUsage = () => {
  if (Object.keys(modelCache).length > 30) {
    console.log("Cache size exceeds threshold, clearing oldest entries");
    
    // Keep only the 10 most recently used models
    const entries = Object.entries(modelCache);
    const toRemove = entries.slice(0, entries.length - 10);
    
    for (const [key] of toRemove) {
      delete modelCache[key];
    }
  }
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
  throttlePromises,
  
  // Memory management
  clearModelCache,
  monitorMemoryUsage
};
