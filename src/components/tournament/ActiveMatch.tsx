
import React from 'react';
import { Button } from '../../components/ui/button';
import { ArrowLeftCircle } from 'lucide-react';
import TournamentMatch from '../game/TournamentMatch';
import { Score } from '../../types/football';
import { Match } from '../../types/tournament';

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

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {activeMatch.teamA.name} vs {activeMatch.teamB.name}
        </h3>
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
