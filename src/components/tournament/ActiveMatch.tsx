
import React from 'react';
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
      <div className="mb-2">
        <button 
          onClick={onBackClick}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          ← Back to Tournament
        </button>
      </div>
      
      <TournamentMatch 
        homeTeam={activeMatch.teamA.name}
        awayTeam={activeMatch.teamB.name}
        onMatchComplete={onMatchComplete}
        matchDuration={60} // 1 minute match duration
      />
    </div>
  );
};

export default ActiveMatch;
