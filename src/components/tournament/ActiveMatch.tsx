
import React, { useState, useEffect } from 'react';
import TournamentMatch from '../../components/game/TournamentMatch';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';
import { 
  compareModelPerformance, 
  getTrainingEffectiveness, 
  isNeuralTrainingEffective 
} from '../../utils/neuralModelService';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';

interface ActiveMatchProps {
  activeMatch: Match;
  onBackClick: () => void;
  onMatchComplete: (winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => void;
}

const ActiveMatch: React.FC<ActiveMatchProps> = ({
  activeMatch,
  onBackClick,
  onMatchComplete
}) => {
  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) return null;

  const [performanceData, setPerformanceData] = useState<{
    teamA: number;
    teamB: number;
    difference: number;
  } | null>(null);
  
  const [trainingEffectiveness, setTrainingEffectiveness] = useState<{
    teamA: { isEffective: boolean; ratio: number; confidence: number } | null;
    teamB: { isEffective: boolean; ratio: number; confidence: number } | null;
  }>({
    teamA: null,
    teamB: null
  });

  // Fetch performance data when match starts
  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        // Get neural model performance comparison
        const performanceCompare = await compareModelPerformance(
          activeMatch.teamA.name, 
          activeMatch.teamB.name
        );
        setPerformanceData(performanceCompare);
        
        // Check training effectiveness for both teams
        const teamAEffectiveness = await isNeuralTrainingEffective(activeMatch.teamA.name);
        const teamBEffectiveness = await isNeuralTrainingEffective(activeMatch.teamB.name);
        
        setTrainingEffectiveness({
          teamA: teamAEffectiveness ? {
            isEffective: teamAEffectiveness.isEffective,
            ratio: teamAEffectiveness.ratio,
            confidence: teamAEffectiveness.confidence
          } : null,
          teamB: teamBEffectiveness ? {
            isEffective: teamBEffectiveness.isEffective,
            ratio: teamBEffectiveness.ratio,
            confidence: teamBEffectiveness.confidence
          } : null
        });
      } catch (error) {
        console.error("Error fetching neural network performance data:", error);
      }
    };
    
    fetchPerformanceData();
  }, [activeMatch]);

  // Determine which team has higher ELO (this team will be training)
  const teamAElo = activeMatch.teamA.eloRating || 1500;
  const teamBElo = activeMatch.teamB.eloRating || 1500;
  const trainingTeam = teamAElo > teamBElo ? 'A' : 'B';
  const nonTrainingTeam = trainingTeam === 'A' ? 'B' : 'A';
  
  // Get team names for display
  const trainingTeamName = trainingTeam === 'A' ? activeMatch.teamA.name : activeMatch.teamB.name;
  const nonTrainingTeamName = trainingTeam === 'A' ? activeMatch.teamB.name : activeMatch.teamA.name;

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <button 
        onClick={onBackClick}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors"
      >
        ← Back to Tournament
      </button>
      
      {/* Neural Network Performance Overview */}
      <div className="mb-6 p-3 bg-white rounded-md shadow-sm">
        <h3 className="text-lg font-medium mb-2">Neural Network Training Status</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="p-2 border rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">{trainingTeamName}</span>
              <Badge variant="outline" className="bg-blue-50">Training</Badge>
            </div>
            
            {trainingEffectiveness[trainingTeam === 'A' ? 'teamA' : 'teamB'] && (
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Effectiveness Ratio:</span>
                  <span className={
                    trainingEffectiveness[trainingTeam === 'A' ? 'teamA' : 'teamB']?.isEffective 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }>
                    {trainingEffectiveness[trainingTeam === 'A' ? 'teamA' : 'teamB']?.ratio.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, trainingEffectiveness[trainingTeam === 'A' ? 'teamA' : 'teamB']?.ratio * 50 || 50)} 
                  className="h-2"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Confidence: {Math.round((trainingEffectiveness[trainingTeam === 'A' ? 'teamA' : 'teamB']?.confidence || 0) * 100)}%
                </div>
              </div>
            )}
          </div>
          
          <div className="p-2 border rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">{nonTrainingTeamName}</span>
              <Badge variant="outline" className="bg-gray-100">Not Training</Badge>
            </div>
            
            {trainingEffectiveness[nonTrainingTeam === 'A' ? 'teamA' : 'teamB'] && (
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Effectiveness Ratio:</span>
                  <span className="text-gray-600">
                    {trainingEffectiveness[nonTrainingTeam === 'A' ? 'teamA' : 'teamB']?.ratio.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, trainingEffectiveness[nonTrainingTeam === 'A' ? 'teamA' : 'teamB']?.ratio * 50 || 50)} 
                  className="h-2"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Baseline for comparison
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Performance Comparison */}
        {performanceData && (
          <div className="bg-gray-50 p-2 rounded-md">
            <div className="text-sm font-medium mb-1">Neural Model Performance Comparison</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-xs">
                <span>{activeMatch.teamA.name}:</span> 
                <span className="font-medium ml-1">{performanceData.teamA.toFixed(2)}</span>
              </div>
              <div className="text-xs">
                <span>{activeMatch.teamB.name}:</span>
                <span className="font-medium ml-1">{performanceData.teamB.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-600">
              <span className="font-medium">Performance Difference:</span> 
              <span className={`ml-1 ${performanceData.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performanceData.difference.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <TournamentMatch 
        homeTeam={activeMatch.teamA.name}
        awayTeam={activeMatch.teamB.name}
        onMatchComplete={onMatchComplete}
        matchDuration={60} // 60 real seconds match duration
      />
    </div>
  );
};

export default ActiveMatch;
