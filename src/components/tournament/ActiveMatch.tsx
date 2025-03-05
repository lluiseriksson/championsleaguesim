
import React from 'react';
import { Button } from '../../components/ui/button';
import { ArrowLeftCircle } from 'lucide-react';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';
import ActiveMatchContent from './ActiveMatchContent';
import { useBackToTournament } from '../../hooks/tournament/useBackToTournament';

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
  const { handleBackClick } = useBackToTournament({ onBackClick });

  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) return null;

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          {activeMatch.teamA.name} vs {activeMatch.teamB.name}
        </h3>
        <Button 
          variant="outline" 
          onClick={handleBackClick}
          className="flex items-center gap-2"
        >
          <ArrowLeftCircle className="h-4 w-4" />
          Back to Tournament
        </Button>
      </div>
      
      <ActiveMatchContent 
        activeMatch={activeMatch}
        onMatchComplete={onMatchComplete}
      />
    </div>
  );
};

export default ActiveMatch;
