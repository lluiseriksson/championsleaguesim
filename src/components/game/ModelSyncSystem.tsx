
import React from 'react';
import { Player } from '../../types/football';
import { loadModel, batchLoadModels, loadSpecializedNetworks } from '../../utils/neural/modelPersistence';
import { isNetworkValid } from '../../utils/neuralHelpers';
import { createPlayerBrain } from '../../utils/neuralNetwork';
import { toast } from 'sonner';
import { validatePlayerBrain } from '../../utils/neural/networkValidator';

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournamentMode?: boolean;
}

export const useModelSyncSystem = ({ 
  players, 
  setPlayers,
  tournamentMode = false
}: ModelSyncSystemProps) => {
  // Counter for sync operations
  const syncCounterRef = React.useRef(0);
  const [modelsLoaded, setModelsLoaded] = React.useState(false);
  
  // Track the timestamp of the last model load operation
  const lastModelLoadTimestampRef = React.useRef(0);
  // Throttle model loading to avoid excessive operations
  const MODEL_LOAD_THROTTLE_MS = 15000; // 15 seconds
  
  // Learning progress interval (in ms)
  const LEARNING_CHECK_INTERVAL = 30000; // 30 seconds
  
  React.useEffect(() => {
    if (!modelsLoaded && players.length > 0) {
      // Load models on initial mount
      syncModels();
    }
  }, [players, modelsLoaded]);
  
  // Function to increment the sync counter
  const incrementSyncCounter = React.useCallback(() => {
    // Increment counter
    syncCounterRef.current++;
  }, []);
  
  // Check if there are any invalid neural networks in the players array
  const hasInvalidNetworks = React.useCallback(() => {
    return players.some(player => 
      !player.brain || 
      !player.brain.net || 
      !isNetworkValid(player.brain.net)
    );
  }, [players]);
  
  // Function to sync neural models from database
  const syncModels = React.useCallback(async () => {
    if (players.length === 0) {
      console.log('No players to sync models for');
      return;
    }
    
    const currentTime = Date.now();
    
    // Check if we should throttle model loading
    if (currentTime - lastModelLoadTimestampRef.current < MODEL_LOAD_THROTTLE_MS) {
      console.log('Model loading throttled, skipping this sync operation');
      return;
    }
    
    // Update timestamp
    lastModelLoadTimestampRef.current = currentTime;
    
    console.log('Syncing neural models...');
    
    try {
      // Optimization: Batch load models by team
      const redTeamRoles = players
        .filter(p => p.team === 'red')
        .map(p => p.role)
        .filter((role, index, self) => self.indexOf(role) === index); // Unique roles
      
      const blueTeamRoles = players
        .filter(p => p.team === 'blue')
        .map(p => p.role)
        .filter((role, index, self) => self.indexOf(role) === index); // Unique roles
      
      // Load models in batch by team
      const redModels = await batchLoadModels(redTeamRoles, 'red');
      const blueModels = await batchLoadModels(blueTeamRoles, 'blue');
      
      // Update players with the loaded models
      setPlayers(currentPlayers => {
        return currentPlayers.map(player => {
          // Skip players that already have valid networks
          if (player.brain && player.brain.net && isNetworkValid(player.brain.net)) {
            return player;
          }
          
          // Get the appropriate model based on team and role
          const modelMap = player.team === 'red' ? redModels : blueModels;
          const loadedBrain = modelMap[player.role];
          
          if (loadedBrain) {
            // Only use the model if it's valid
            if (loadedBrain.net && isNetworkValid(loadedBrain.net)) {
              // Load specialized networks in the background (don't await)
              loadSpecializedNetworks(player.team, player.role)
                .then(specializedNetworks => {
                  if (specializedNetworks && specializedNetworks.length > 0) {
                    // Update player with specialized networks asynchronously
                    setPlayers(prevPlayers => 
                      prevPlayers.map(p => {
                        if (p.id === player.id) {
                          return {
                            ...p,
                            brain: {
                              ...p.brain,
                              specializedNetworks
                            }
                          };
                        }
                        return p;
                      })
                    );
                  }
                })
                .catch(error => {
                  console.error(`Error loading specialized networks for ${player.team} ${player.role}:`, error);
                });
              
              // Use the loaded brain
              return {
                ...player,
                brain: {
                  ...loadedBrain,
                  lastOutput: { x: 0, y: 0 },
                  lastAction: 'move'
                }
              };
            }
          }
          
          // If no valid model was loaded, create a new brain
          const newBrain = createPlayerBrain();
          return {
            ...player,
            brain: {
              ...newBrain,
              lastOutput: { x: 0, y: 0 },
              lastAction: 'move'
            }
          };
        });
      });
      
      console.log('Neural models sync completed');
      setModelsLoaded(true);
      
      if (!tournamentMode) {
        toast.success("Neural models loaded", {
          description: "AI players are ready to play"
        });
      }
    } catch (error) {
      console.error('Error syncing models:', error);
      
      // Fallback: ensure all players have valid brains
      setPlayers(currentPlayers => {
        return currentPlayers.map(player => {
          if (!player.brain || !player.brain.net || !isNetworkValid(player.brain.net)) {
            const newBrain = createPlayerBrain();
            return {
              ...player,
              brain: {
                ...newBrain,
                lastOutput: { x: 0, y: 0 },
                lastAction: 'move'
              }
            };
          }
          return player;
        });
      });
      
      if (!tournamentMode) {
        toast.error("Error loading neural models", {
          description: "Using fallback AI behaviors"
        });
      }
    }
  }, [players, setPlayers, tournamentMode]);
  
  // Function to check learning progress and validate player brains
  const checkLearningProgress = React.useCallback(() => {
    // Skip checks in tournament mode
    if (tournamentMode) return;
    
    console.log('Checking learning progress...');
    
    // Validate all player brains
    const updatedPlayers = players.map(player => validatePlayerBrain(player));
    
    // Only update if there were changes
    const hasChanges = updatedPlayers.some((player, index) => player !== players[index]);
    if (hasChanges) {
      console.log('Updating players with validated brains');
      setPlayers(updatedPlayers);
    }
    
    // Check if any players still have invalid networks
    if (hasInvalidNetworks()) {
      console.warn('Some players still have invalid neural networks');
      syncModels();
    } else {
      console.log('All players have valid neural networks');
    }
  }, [players, setPlayers, hasInvalidNetworks, syncModels, tournamentMode]);
  
  return { 
    syncModels, 
    incrementSyncCounter,
    checkLearningProgress
  };
};
