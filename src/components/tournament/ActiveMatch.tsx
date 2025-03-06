
import React, { lazy, Suspense } from 'react';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';

// Lazy load the TournamentMatch component
const TournamentMatch = lazy(() => import('../../components/game/TournamentMatch'));

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
      <Suspense fallback={
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading match...</p>
            <p className="text-gray-500">{activeMatch.teamA.name} vs {activeMatch.teamB.name}</p>
          </div>
        </div>
      }>
        <TournamentMatch 
          homeTeam={activeMatch.teamA.name}
          awayTeam={activeMatch.teamB.name}
          onMatchComplete={onMatchComplete}
          matchDuration={60} // 1 minute match duration
        />
      </Suspense>
    </div>
  );
};

export default ActiveMatch;
