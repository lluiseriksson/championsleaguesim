
import { loadModel, getBestModel, combineModels } from './neuralModelService';
import { NeuralNet, Player } from '../types/football';
import { createPlayerBrain } from './neuralNetwork';

// Cache for models to prevent redundant loading
const modelCache: Record<string, { model: NeuralNet, timestamp: number }> = {};

// Max age of cached models in milliseconds (5 minutes)
const MAX_CACHE_AGE = 5 * 60 * 1000;

// Function to initialize a player with pretrained model or new one
export const initializePlayerBrain = async (team: string, role: string): Promise<NeuralNet> => {
  try {
    const cacheKey = `${team}-${role}`;
    const currentTime = Date.now();
    
    // Check if we have a cached model that's still valid
    if (modelCache[cacheKey] && (currentTime - modelCache[cacheKey].timestamp) < MAX_CACHE_AGE) {
      console.log(`Using cached model for ${team} ${role}`);
      return modelCache[cacheKey].model;
    }
    
    // Try to load the best model available
    const bestModel = await getBestModel(team, role);
    if (bestModel) {
      console.log(`Loaded optimized model for ${team} ${role}`);
      // Store in cache
      modelCache[cacheKey] = { model: bestModel, timestamp: currentTime };
      return bestModel;
    }
    
    // If no "best" model exists, try to combine existing models
    const combinedModel = await combineModels(team, role);
    if (combinedModel) {
      console.log(`Loaded combined model for ${team} ${role}`);
      // Store in cache
      modelCache[cacheKey] = { model: combinedModel, timestamp: currentTime };
      return combinedModel;
    }
    
    // If no combined models exist, try to load the latest version
    const latestModel = await loadModel(team, role, 1);
    if (latestModel) {
      console.log(`Loaded latest model for ${team} ${role}`);
      // Store in cache
      modelCache[cacheKey] = { model: latestModel, timestamp: currentTime };
      return latestModel;
    }
    
    // If no models are available, create a new one
    console.log(`Creating new model for ${team} ${role}`);
    const newModel = createPlayerBrain();
    // Store in cache
    modelCache[cacheKey] = { model: newModel, timestamp: currentTime };
    return newModel;
  } catch (error) {
    console.error(`Error initializing brain for ${team} ${role}:`, error);
    return createPlayerBrain();
  }
};

// Function to update a player with the latest model available
export const updatePlayerWithLatestModel = async (player: Player): Promise<Player> => {
  try {
    const cacheKey = `${player.team}-${player.role}`;
    const currentTime = Date.now();
    
    // Check if we have a cached model that's still valid
    if (modelCache[cacheKey] && (currentTime - modelCache[cacheKey].timestamp) < MAX_CACHE_AGE) {
      console.log(`Using cached model to update ${player.team} ${player.role} #${player.id}`);
      return {
        ...player,
        brain: modelCache[cacheKey].model
      };
    }
    
    // Try to load the best model available
    const bestModel = await getBestModel(player.team, player.role);
    if (bestModel) {
      console.log(`Updated ${player.team} ${player.role} #${player.id} with the best model`);
      // Store in cache
      modelCache[cacheKey] = { model: bestModel, timestamp: currentTime };
      return {
        ...player,
        brain: bestModel
      };
    }
    
    // If no changes, return the player unmodified
    return player;
  } catch (error) {
    console.error(`Error updating player ${player.team} ${player.role} #${player.id}:`, error);
    return player;
  }
};

// Function to clean up the model cache
export const cleanupModelCache = () => {
  const currentTime = Date.now();
  let deletedCount = 0;
  
  // Remove aged entries
  Object.keys(modelCache).forEach(key => {
    if ((currentTime - modelCache[key].timestamp) >= MAX_CACHE_AGE) {
      delete modelCache[key];
      deletedCount++;
    }
  });
  
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} cached models`);
  }
  
  return deletedCount;
};

// Function to synchronize all players with the latest models
export const syncAllPlayers = async (players: Player[]): Promise<Player[]> => {
  // Clean up cache before syncing
  cleanupModelCache();
  
  // Limit the number of players updated at once to conserve memory
  const MAX_CONCURRENT_UPDATES = 4;
  const playersToUpdate = players.filter(p => p.role !== 'goalkeeper').slice(0, MAX_CONCURRENT_UPDATES);
  
  console.log(`Syncing ${playersToUpdate.length} players with latest models`);
  
  // Create a mapping of all players
  const updatedPlayers = [...players];
  
  // Update the selected players
  for (const player of playersToUpdate) {
    try {
      const updatedPlayer = await updatePlayerWithLatestModel(player);
      const index = updatedPlayers.findIndex(p => p.id === player.id);
      if (index !== -1) {
        updatedPlayers[index] = updatedPlayer;
      }
    } catch (error) {
      console.error(`Error syncing player ${player.team} ${player.role}:`, error);
    }
  }
  
  return updatedPlayers;
};
