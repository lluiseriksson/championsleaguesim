
import React from 'react';
import TournamentMatch from '../../components/game/TournamentMatch';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

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
  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) {
    console.log("ActiveMatch component received invalid match data");
    return null;
  }

  console.log("Rendering ActiveMatch component with teams:", activeMatch.teamA.name, activeMatch.teamB.name);

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-md">
      <div className="mb-4">
        <Button 
          onClick={onBackClick}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tournament
        </Button>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold">
          {activeMatch.teamA.name} vs {activeMatch.teamB.name}
        </div>
      </div>
      
      <div className="w-full min-h-[500px]">
        <TournamentMatch 
          homeTeam={activeMatch.teamA.name}
          awayTeam={activeMatch.teamB.name}
          onMatchComplete={onMatchComplete}
          matchDuration={60} // 1 minute match duration
        />
      </div>
    </div>
  );
};

export default ActiveMatch;
