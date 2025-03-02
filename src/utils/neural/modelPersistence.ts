
import { supabase } from '../../integrations/supabase/client';
import { NeuralNet, Player } from '../../types/football';
import { isNetworkValid } from '../neuralHelpers';
import { createPlayerBrain } from '../neuralNetwork';
import { NeuralModelData } from './neuralTypes';
import { calculatePerformanceScore } from './modelStatistics';

// Function to save a model to Supabase
export const saveModel = async (player: Player, version: number = 1): Promise<boolean> => {
  try {
    // Verify the model is valid before saving
    if (!isNetworkValid(player.brain.net)) {
      console.warn(`Neural model ${player.team} ${player.role} #${player.id} is not valid for saving`);
      return false;
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
          last_updated: new Date().toISOString()
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
          last_updated: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving model:', insertError);
        return false;
      }
      
      console.log(`Model ${player.team} ${player.role} saved successfully (new model)`);
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
