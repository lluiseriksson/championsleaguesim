
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
