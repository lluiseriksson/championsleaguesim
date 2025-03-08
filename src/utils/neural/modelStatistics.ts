
import { supabase } from '../../integrations/supabase/client';
import { Player } from '../../types/football';

// Calculate performance score based on player role
export const calculatePerformanceScore = (player: Player): number => {
  let performanceScore = 0;
  if (player.role === 'forward') {
    performanceScore = 1; // Base score for forwards
  } else if (player.role === 'goalkeeper') {
    performanceScore = 1; // Base score for goalkeepers
  } else {
    performanceScore = 0.5; // For other positions
  }
  return performanceScore;
};

// Function to get statistics about all models
export const getModelStats = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('neural_models')
      .select('team, role, version, training_sessions, performance_score, last_updated')
      .order('performance_score', { ascending: false });

    if (error || !data) {
      console.error('Error getting model statistics:', error);
      return [];
    }

    return data.map(model => ({
      ...model,
      training_sessions: model.training_sessions || 0,
      performance_score: model.performance_score || 0
    }));
  } catch (error) {
    console.error('Error getting model statistics:', error);
    return [];
  }
};

// Function to compare performance between networks
export const compareModelPerformance = async (teamA: string, teamB: string): Promise<{
  teamA: number,
  teamB: number,
  difference: number
}> => {
  try {
    // Get all models for both teams
    const { data, error } = await supabase
      .from('neural_models')
      .select('team, role, performance_score')
      .in('team', [teamA, teamB]);

    if (error || !data) {
      console.error('Error comparing model performance:', error);
      return { teamA: 0, teamB: 0, difference: 0 };
    }

    // Calculate total score per team
    const teamAModels = data.filter(model => model.team === teamA);
    const teamBModels = data.filter(model => model.team === teamB);
    
    const teamAScore = teamAModels.reduce((sum, model) => sum + (model.performance_score || 0), 0);
    const teamBScore = teamBModels.reduce((sum, model) => sum + (model.performance_score || 0), 0);
    
    return { 
      teamA: teamAScore, 
      teamB: teamBScore, 
      difference: teamAScore - teamBScore 
    };
  } catch (error) {
    console.error('Error comparing model performance:', error);
    return { teamA: 0, teamB: 0, difference: 0 };
  }
};

// NEW: Track and compare training vs non-training performance
interface TrainingEffectivenessData {
  team: string;
  trainingWins: number;
  nonTrainingWins: number;
  draws: number;
  matchesCount: number;
  effectivenessRatio: number; // > 1 means training is effective
  lastUpdated: string;
}

// Function to track training effectiveness
export const recordTrainingEffectiveness = async (
  trainingTeam: string, 
  nonTrainingTeam: string, 
  winner: string | null
): Promise<boolean> => {
  try {
    // First get existing record if any
    const { data: existingData, error: fetchError } = await supabase
      .from('training_effectiveness')
      .select('*')
      .eq('team', trainingTeam)
      .maybeSingle();
      
    if (fetchError) {
      console.error('Error fetching training effectiveness data:', fetchError);
      return false;
    }
    
    const now = new Date().toISOString();
    
    // Initialize data structure
    const newData: Partial<TrainingEffectivenessData> = {
      team: trainingTeam,
      trainingWins: existingData?.trainingWins || 0,
      nonTrainingWins: existingData?.nonTrainingWins || 0,
      draws: existingData?.draws || 0,
      matchesCount: (existingData?.matchesCount || 0) + 1,
      lastUpdated: now
    };
    
    // Update based on match result
    if (winner === trainingTeam) {
      newData.trainingWins = (existingData?.trainingWins || 0) + 1;
    } else if (winner === nonTrainingTeam) {
      newData.nonTrainingWins = (existingData?.nonTrainingWins || 0) + 1;
    } else {
      newData.draws = (existingData?.draws || 0) + 1;
    }
    
    // Calculate effectiveness ratio
    const trainingWinRate = newData.trainingWins! / newData.matchesCount!;
    const nonTrainingWinRate = newData.nonTrainingWins! / newData.matchesCount!;
    
    // Prevent division by zero
    newData.effectivenessRatio = nonTrainingWinRate === 0 
      ? trainingWinRate > 0 ? 2 : 1 
      : trainingWinRate / nonTrainingWinRate;
    
    // Save to database
    const { error: upsertError } = await supabase
      .from('training_effectiveness')
      .upsert(newData, {
        onConflict: 'team'
      });
      
    if (upsertError) {
      console.error('Error saving training effectiveness data:', upsertError);
      return false;
    }
    
    console.log(`Training effectiveness updated for ${trainingTeam}: ratio = ${newData.effectivenessRatio.toFixed(2)}`);
    return true;
  } catch (error) {
    console.error('Error recording training effectiveness:', error);
    return false;
  }
};

// Function to get training effectiveness for a team
export const getTrainingEffectiveness = async (team: string): Promise<TrainingEffectivenessData | null> => {
  try {
    const { data, error } = await supabase
      .from('training_effectiveness')
      .select('*')
      .eq('team', team)
      .maybeSingle();
      
    if (error || !data) {
      console.error('Error getting training effectiveness:', error);
      return null;
    }
    
    return data as TrainingEffectivenessData;
  } catch (error) {
    console.error('Error getting training effectiveness:', error);
    return null;
  }
};

// Function to check if neural network training is effective
export const isNeuralTrainingEffective = async (team: string, threshold: number = 1.0): Promise<{
  isEffective: boolean;
  ratio: number;
  confidence: number;
  data: TrainingEffectivenessData | null;
}> => {
  try {
    const data = await getTrainingEffectiveness(team);
    
    if (!data || data.matchesCount < 5) {
      return { 
        isEffective: true, // Assume it's effective until we have enough data
        ratio: 1,
        confidence: 0.1,
        data 
      };
    }
    
    // Calculate confidence based on number of matches
    const confidence = Math.min(0.95, data.matchesCount / 50); // Confidence grows with match count, maxes at 95%
    
    // Determine effectiveness
    const isEffective = data.effectivenessRatio >= threshold;
    
    return {
      isEffective,
      ratio: data.effectivenessRatio,
      confidence,
      data
    };
  } catch (error) {
    console.error('Error checking neural training effectiveness:', error);
    return { 
      isEffective: true,
      ratio: 1,
      confidence: 0, 
      data: null 
    };
  }
};
