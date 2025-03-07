
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

  // Create a key based on both team names to force component remounting
  const matchKey = `${activeMatch.teamA.name}-vs-${activeMatch.teamB.name}-${Date.now()}`;

  return (
    <div className="mb-10 p-4 bg-gray-50 rounded-lg shadow-md">
      <button 
        onClick={onBackClick}
        className="mb-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
      >
        ← Back to tournament
      </button>
      
      <TournamentMatch 
        key={matchKey}
        homeTeam={activeMatch.teamA.name}
        awayTeam={activeMatch.teamB.name}
        onMatchComplete={onMatchComplete}
        matchDuration={60} // 1 minute match duration
      />
    </div>
  );
};

export default ActiveMatch;
