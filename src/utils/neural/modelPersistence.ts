
import { supabase } from '../../integrations/supabase/client';
import { NeuralNet, Player, SpecializedNeuralNet, NeuralInput, NeuralOutput } from '../../types/football';
import { isNetworkValid } from '../neuralHelpers';
import { createPlayerBrain } from '../neuralNetwork';
import { NeuralModelData } from './neuralTypes';
import { calculatePerformanceScore } from './modelStatistics';
import * as brain from 'brain.js';

// Enhanced function to save a model to Supabase with better validation
export const saveModel = async (player: Player, version: number = 1): Promise<boolean> => {
  try {
    // Skip invalid brains entirely
    if (!player.brain || !player.brain.net) {
      console.warn(`Cannot save model for ${player.team} ${player.role} #${player.id}: No brain or neural network`);
      return false;
    }
    
    // Perform thorough validation before saving
    if (!isNetworkValid(player.brain.net)) {
      console.warn(`Neural model ${player.team} ${player.role} #${player.id} is not valid for saving`);
      
      // Try to recover the network if possible
      if (player.brain.specializedNetworks && player.brain.specializedNetworks.length > 0) {
        // Find a valid specialized network to use instead
        const validNetwork = player.brain.specializedNetworks.find(n => 
          n && n.net && isNetworkValid(n.net)
        );
        
        if (validNetwork) {
          console.log(`Recovered valid network from ${validNetwork.type} specialization for ${player.team} ${player.role}`);
          player.brain.net = validNetwork.net;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }

    // Extract weights from the neural network
    const weights = player.brain.net.toJSON();
    
    // Check if a model with this team, role and version already exists
    const { data: existingModel, error: findError } = await supabase
      .from('neural_models')
      .select('id, training_sessions, performance_score')
      .eq('team', player.team)
      .eq('role', player.role)
      .eq('version', version)
      .maybeSingle();

    if (findError) {
      console.error('Error finding model:', findError);
      return false;
    }

    // Calculate performance score based on player's role
    const performanceScore = calculatePerformanceScore(player);

    if (existingModel) {
      // Update existing model, preserving or improving performance score
      const newPerformanceScore = Math.max(
        performanceScore, 
        existingModel.performance_score || 0
      );
      
      const { error: updateError } = await supabase
        .from('neural_models')
        .update({ 
          weights, 
          training_sessions: (existingModel.training_sessions || 1) + 1,
          performance_score: newPerformanceScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingModel.id);

      if (updateError) {
        console.error('Error updating model:', updateError);
        return false;
      }
      
      console.log(`Model ${player.team} ${player.role} updated successfully (Sessions: ${(existingModel.training_sessions || 0) + 1})`);
    } else {
      // Create a new model
      const { error: insertError } = await supabase
        .from('neural_models')
        .insert({
          team: player.team,
          role: player.role,
          version,
          weights,
          training_sessions: 1,
          performance_score: performanceScore,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving model:', insertError);
        return false;
      }
      
      console.log(`Model ${player.team} ${player.role} saved successfully (new model)`);
    }

    // Save specialized networks if they exist and are valid
    if (player.brain.specializedNetworks && player.brain.specializedNetworks.length > 0) {
      for (const network of player.brain.specializedNetworks) {
        if (network && network.net && isNetworkValid(network.net)) {
          try {
            const specializedWeights = network.net.toJSON();
            
            // Save specialized network with its type in the identifier
            const { error: specializedError } = await supabase
              .from('specialized_models')
              .upsert({
                team: player.team,
                role: player.role,
                specialization: network.type,
                version,
                weights: specializedWeights,
                performance_score: network.performance.overallSuccess,
                usage_count: network.performance.usageCount,
                updated_at: new Date().toISOString()
              }, { onConflict: 'team,role,specialization,version' });
              
            if (!specializedError) {
              console.log(`Specialized network ${network.type} for ${player.team} ${player.role} saved`);
            }
          } catch (error) {
            console.warn(`Could not save specialized network ${network.type}:`, error);
          }
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error processing model for saving:', error);
    return false;
  }
};

// Function to load a model from Supabase
export const loadModel = async (team: string, role: string, version: number = 1): Promise<NeuralNet | null> => {
  try {
    const { data, error } = await supabase
      .from('neural_models')
      .select('weights')
      .eq('team', team)
      .eq('role', role)
      .eq('version', version)
      .maybeSingle();

    if (error || !data) {
      console.warn(`No model found for ${team} ${role} version ${version}`);
      return null;
    }

    // Create a new neural network with the saved weights
    const brain = createPlayerBrain();
    
    // Load weights into the neural network
    brain.net.fromJSON(data.weights);
    
    if (!isNetworkValid(brain.net)) {
      console.warn(`Loaded model for ${team} ${role} is not valid`);
      return null;
    }
    
    console.log(`Model ${team} ${role} loaded successfully`);
    return brain;
  } catch (error) {
    console.error('Error loading model:', error);
    return null;
  }
};

// New function to batch load models for multiple players
export const batchLoadModels = async (roles: string[], team: string, version: number = 1): Promise<Record<string, NeuralNet | null>> => {
  try {
    console.log(`Batch loading models for ${team} team...`);
    
    const { data, error } = await supabase
      .from('neural_models')
      .select('role, weights')
      .eq('team', team)
      .in('role', roles)
      .eq('version', version);

    if (error) {
      console.error('Error batch loading models:', error);
      return {};
    }

    const results: Record<string, NeuralNet | null> = {};
    
    // Initialize with null values for all requested roles
    for (const role of roles) {
      results[role] = null;
    }
    
    // Process successfully loaded models
    if (data && data.length > 0) {
      console.log(`Found ${data.length} models for ${team}`);
      
      for (const model of data) {
        try {
          const playerBrain = createPlayerBrain();
          playerBrain.net.fromJSON(model.weights);
          
          if (isNetworkValid(playerBrain.net)) {
            results[model.role] = playerBrain;
            console.log(`Model for ${team} ${model.role} loaded successfully`);
          } else {
            console.warn(`Loaded model for ${team} ${model.role} is not valid`);
          }
        } catch (error) {
          console.error(`Error processing model for ${team} ${model.role}:`, error);
        }
      }
    } else {
      console.log(`No models found for ${team}`);
    }
    
    return results;
  } catch (error) {
    console.error('Error in batch loading models:', error);
    return {};
  }
};

// Function to save training session data (for later collaborative training)
export const saveTrainingSession = async (player: Player, sessionData: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('training_sessions')
      .insert({
        team: player.team,
        role: player.role,
        session_data: sessionData
      });

    if (error) {
      console.error('Error saving training session:', error);
      return false;
    }
    
    console.log(`Training session for ${player.team} ${player.role} saved`);
    return true;
  } catch (error) {
    console.error('Error saving training session:', error);
    return false;
  }
};

// Added new function to load specialized networks
export const loadSpecializedNetworks = async (
  team: string, 
  role: string, 
  version: number = 1
): Promise<SpecializedNeuralNet[] | null> => {
  try {
    const { data, error } = await supabase
      .from('specialized_models')
      .select('*')
      .eq('team', team)
      .eq('role', role)
      .eq('version', version);

    if (error || !data || data.length === 0) {
      console.warn(`No specialized models found for ${team} ${role} version ${version}`);
      return null;
    }

    const specializedNetworks: SpecializedNeuralNet[] = [];
    
    for (const model of data) {
      try {
        // Create properly typed neural network
        const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>();
        
        // Load the weights - this is where the type error was occurring
        net.fromJSON(model.weights);
        
        if (isNetworkValid(net)) {
          specializedNetworks.push({
            type: model.specialization,
            net,
            confidence: 0.5,
            performance: {
              overallSuccess: model.performance_score || 0.5,
              situationSuccess: model.performance_score || 0.5,
              usageCount: model.usage_count || 0
            }
          });
          
          console.log(`Specialized model ${model.specialization} for ${team} ${role} loaded successfully`);
        }
      } catch (error) {
        console.warn(`Error loading specialized model ${model.specialization}:`, error);
      }
    }
    
    if (specializedNetworks.length > 0) {
      return specializedNetworks;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading specialized models:', error);
    return null;
  }
};
