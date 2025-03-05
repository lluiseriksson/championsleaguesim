
import React, { useState, useEffect } from 'react';
import { Score } from '../../types/football';
import { MatchProvider } from './match/MatchContext';
import MatchField from './match/MatchField';
import MatchResult from './match/MatchResult';
import { useMatchInitialization } from './match/useMatchInitialization';

interface TournamentMatchProps {
  homeTeam: string;
  awayTeam: string;
  onMatchComplete: (winner: string, finalScore: Score, wasGoldenGoal: boolean) => void;
  matchDuration?: number; // en segundos
}

const TournamentMatch: React.FC<TournamentMatchProps> = ({ 
  homeTeam, 
  awayTeam, 
  onMatchComplete,
  matchDuration = 180 // 3 minutos por defecto
}) => {
  const [matchEnded, setMatchEnded] = useState(false);
  
  useEffect(() => {
    console.log('TournamentMatch: matchDuration =', matchDuration);
  }, [matchDuration]);
  
  if (matchEnded) {
    return (
      <MatchProvider homeTeam={homeTeam} awayTeam={awayTeam}>
        <MatchResult />
      </MatchProvider>
    );
  }
  
  return (
    <MatchProvider homeTeam={homeTeam} awayTeam={awayTeam}>
      <MatchField 
        onMatchComplete={onMatchComplete}
        matchDuration={matchDuration}
      />
    </MatchProvider>
  );
};

export default TournamentMatch;
