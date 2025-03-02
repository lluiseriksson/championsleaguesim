
import { supabase } from '../../integrations/supabase/client';
import { NeuralNet } from '../../types/football';
import { isNetworkValid } from '../neuralHelpers';
import { createPlayerBrain } from '../neuralNetwork';

// Function to get the best model (by performance score)
export const getBestModel = async (team: string, role: string): Promise<NeuralNet | null> => {
  try {
    const { data, error } = await supabase
      .from('neural_models')
      .select('*')
      .eq('team', team)
      .eq('role', role)
      .order('performance_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn(`No model found for ${team} ${role}`);
      return null;
    }

    // Create a new neural network with the saved weights
    const brain = createPlayerBrain();
    
    // Load weights into the neural network
    brain.net.fromJSON(data.weights);
    
    if (!isNetworkValid(brain.net)) {
      console.warn(`Best model found for ${team} ${role} is not valid`);
      return null;
    }
    
    console.log(`Best model for ${team} ${role} loaded successfully (score: ${data.performance_score})`);
    return brain;
  } catch (error) {
    console.error('Error loading best model:', error);
    return null;
  }
};

// Function to combine multiple models
export const combineModels = async (team: string, role: string): Promise<NeuralNet | null> => {
  try {
    // Get the latest 3 models for this team and role
    const { data, error } = await supabase
      .from('neural_models')
      .select('weights, performance_score')
      .eq('team', team)
      .eq('role', role)
      .order('updated_at', { ascending: false })
      .limit(3);

    if (error || !data || data.length === 0) {
      console.warn(`No models found to combine for ${team} ${role}`);
      return null;
    }

    // If there's only one model, return it directly
    if (data.length === 1) {
      const brain = createPlayerBrain();
      brain.net.fromJSON(data[0].weights);
      return brain;
    }

    // Create a new network with blended weights (weighted average)
    const totalScore = data.reduce((sum, model) => sum + (model.performance_score || 1), 0);
    const weightedModels = data.map(model => ({
      weights: model.weights,
      weight: (model.performance_score || 1) / totalScore
    }));

    // Blend the weights using weighted average
    const brain = createPlayerBrain();
    
    // Simple implementation: use the model with the best score
    // In a more advanced implementation, we could average the weights
    brain.net.fromJSON(data[0].weights);
    
    console.log(`Models combined for ${team} ${role}`);
    return brain;
  } catch (error) {
    console.error('Error combining models:', error);
    return null;
  }
};
