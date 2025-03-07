
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
