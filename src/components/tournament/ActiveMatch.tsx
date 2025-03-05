
import React from 'react';
import { Button } from '../../components/ui/button';
import { ArrowLeftCircle } from 'lucide-react';
import TournamentMatch from '../game/TournamentMatch';
import { Score } from '../../types/football';
import { Match } from '../../types/tournament';
import { calculateStrengthMultiplier } from '../../data/teamEloData';

interface ActiveMatchProps {
  activeMatch: Match;
  onBackToTournament: () => void;
  onMatchComplete: (winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => void;
}

const ActiveMatch: React.FC<ActiveMatchProps> = ({ 
  activeMatch, 
  onBackToTournament, 
  onMatchComplete 
}) => {
  if (!activeMatch.teamA || !activeMatch.teamB) return null;

  // Calcular los multiplicadores de fuerza basados en ELO
  const teamAMultiplier = calculateStrengthMultiplier(activeMatch.teamA.eloRating);
  const teamBMultiplier = calculateStrengthMultiplier(activeMatch.teamB.eloRating);

  // Redondear a 2 decimales para mostrar
  const teamAStrength = Math.round(teamAMultiplier * 100) / 100;
  const teamBStrength = Math.round(teamBMultiplier * 100) / 100;

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            {activeMatch.teamA.name} vs {activeMatch.teamB.name}
          </h3>
          <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">{activeMatch.teamA.name}</span>
              <div className="text-gray-600">
                ELO: {activeMatch.teamA.eloRating} (Strength: {teamAStrength})
              </div>
            </div>
            <div>
              <span className="font-medium">{activeMatch.teamB.name}</span>
              <div className="text-gray-600">
                ELO: {activeMatch.teamB.eloRating} (Strength: {teamBStrength})
              </div>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={onBackToTournament}
          className="flex items-center gap-2"
        >
          <ArrowLeftCircle className="h-4 w-4" />
          Back to Tournament
        </Button>
      </div>
      
      <TournamentMatch 
        homeTeam={activeMatch.teamA.name}
        awayTeam={activeMatch.teamB.name}
        onMatchComplete={onMatchComplete}
        matchDuration={180}
      />
    </div>
  );
};

export default ActiveMatch;
