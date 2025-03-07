
import { supabase } from '../../integrations/supabase/client';
import { Player } from '../../types/football';

// DRASTIC IMPROVEMENT: Enhanced performance score calculation based on role and ELO
export const calculatePerformanceScore = (player: Player): number => {
  // Base score based on role
  let performanceScore = 0;
  if (player.role === 'forward') {
    performanceScore = 1.2; // Increased from 1 to 1.2
  } else if (player.role === 'goalkeeper') {
    performanceScore = 1.2; // Increased from 1 to 1.2
  } else {
    performanceScore = 0.6; // Increased from 0.5 to 0.6
  }
  
  // DRASTIC IMPROVEMENT: Apply ELO factor to performance score
  if (player.teamElo) {
    // Normalize ELO to a reasonable range (1500-2500) and add bonus
    const normalizedElo = Math.max(1500, Math.min(2500, player.teamElo));
    const eloBonus = (normalizedElo - 2000) / 1000; // -0.5 to +0.5 bonus
    
    // Apply ELO bonus to performance, with stronger effect
    performanceScore *= (1 + eloBonus * 1.5);
    
    // Add extra bonus for very high ELO teams
    if (normalizedElo > 2200) {
      performanceScore *= 1.2;
    }
  }
  
  // Cap maximum performance score
  return Math.min(3.0, performanceScore);
};

// Function to get statistics about all models
export const getModelStats = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('neural_models')
      .select('team, role, version, training_sessions, performance_score, last_updated, elo')
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

// DRASTIC IMPROVEMENT: Enhanced team performance comparison with stronger ELO weighting
export const compareModelPerformance = async (teamA: string, teamB: string): Promise<{
  teamA: number,
  teamB: number,
  difference: number,
  eloRating: {
    teamA: number,
    teamB: number,
    eloDifference: number
  }
}> => {
  try {
    // Get all models for both teams
    const { data, error } = await supabase
      .from('neural_models')
      .select('team, role, performance_score, elo')
      .in('team', [teamA, teamB]);

    if (error || !data) {
      console.error('Error comparing model performance:', error);
      return { 
        teamA: 0, 
        teamB: 0, 
        difference: 0,
        eloRating: {
          teamA: 2000,
          teamB: 2000,
          eloDifference: 0
        }
      };
    }

    // Calculate total score per team with role weighting
    const teamAModels = data.filter(model => model.team === teamA);
    const teamBModels = data.filter(model => model.team === teamB);
    
    // Extract team ELO ratings
    const teamAElo = teamAModels.length > 0 && teamAModels[0].elo ? 
      teamAModels[0].elo : 2000;
    const teamBElo = teamBModels.length > 0 && teamBModels[0].elo ? 
      teamBModels[0].elo : 2000;
    
    // Calculate weighted performance scores
    const roleWeights = {
      goalkeeper: 1.3,  // Increased from 1.0
      defender: 1.1,    // Increased from 1.0
      midfielder: 1.2,  // Increased from 1.0
      forward: 1.4      // Increased from 1.0
    };
    
    const calculateWeightedTeamScore = (models: any[]) => {
      return models.reduce((sum, model) => {
        const roleWeight = model.role && roleWeights[model.role as keyof typeof roleWeights] 
          ? roleWeights[model.role as keyof typeof roleWeights] 
          : 1.0;
        return sum + (model.performance_score || 0) * roleWeight;
      }, 0);
    };
    
    const teamAScore = calculateWeightedTeamScore(teamAModels);
    const teamBScore = calculateWeightedTeamScore(teamBModels);
    
    // Adjust scores based on ELO difference
    const eloDifference = teamAElo - teamBElo;
    const eloAdjustmentFactor = Math.abs(eloDifference) / 1000; // 0 to 1+ based on 1000 ELO difference
    
    // Calculate final adjusted scores
    let adjustedTeamAScore = teamAScore;
    let adjustedTeamBScore = teamBScore;
    
    if (eloDifference > 0) {
      // Team A has higher ELO
      adjustedTeamAScore *= (1 + eloAdjustmentFactor * 0.5);
    } else if (eloDifference < 0) {
      // Team B has higher ELO
      adjustedTeamBScore *= (1 + eloAdjustmentFactor * 0.5);
    }
    
    return { 
      teamA: adjustedTeamAScore, 
      teamB: adjustedTeamBScore, 
      difference: adjustedTeamAScore - adjustedTeamBScore,
      eloRating: {
        teamA: teamAElo,
        teamB: teamBElo,
        eloDifference: eloDifference
      }
    };
  } catch (error) {
    console.error('Error comparing model performance:', error);
    return { 
      teamA: 0, 
      teamB: 0, 
      difference: 0,
      eloRating: {
        teamA: 2000,
        teamB: 2000,
        eloDifference: 0
      }
    };
  }
};
