
import React from 'react';
import { Button } from '../../components/ui/button';
import { ArrowLeftCircle } from 'lucide-react';
import TournamentMatch from '../../components/game/TournamentMatch';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';

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

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {activeMatch.teamA.name} - {activeMatch.teamB.name}
        </h3>
        <Button 
          variant="outline" 
          onClick={onBackClick}
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
