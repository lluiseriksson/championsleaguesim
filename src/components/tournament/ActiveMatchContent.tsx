
import React from 'react';
import TournamentMatch from '../game/TournamentMatch';
import { Match } from '../../types/tournament';
import { Score } from '../../types/football';

interface ActiveMatchContentProps {
  activeMatch: Match;
  onMatchComplete: (winnerName: string, finalScore: Score, wasGoldenGoal: boolean) => void;
}

const ActiveMatchContent: React.FC<ActiveMatchContentProps> = ({
  activeMatch,
  onMatchComplete
}) => {
  if (!activeMatch || !activeMatch.teamA || !activeMatch.teamB) return null;

  return (
    <TournamentMatch 
      homeTeam={activeMatch.teamA.name}
      awayTeam={activeMatch.teamB.name}
      onMatchComplete={onMatchComplete}
      matchDuration={180}
    />
  );
};

export default ActiveMatchContent;
