
import React from 'react';
import { Score } from '../../types/football';
import { transliterateRussianName } from '../../utils/transliteration';

interface MatchResultProps {
  score: Score;
  homeTeam: string;
  awayTeam: string;
  goldenGoalScored: boolean;
}

const MatchResult: React.FC<MatchResultProps> = ({ 
  score, 
  homeTeam, 
  awayTeam,
  goldenGoalScored 
}) => {
  const displayHomeTeam = transliterateRussianName(homeTeam);
  const displayAwayTeam = transliterateRussianName(awayTeam);
  
  const winner = score.red > score.blue ? displayHomeTeam : displayAwayTeam;
  
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Partido finalizado</h2>
      <div className="text-xl">
        {displayHomeTeam} {score.red} - {score.blue} {displayAwayTeam}
      </div>
      <div className="mt-4 text-lg font-semibold">
        Ganador: {winner}
        {goldenGoalScored && <span className="ml-2 text-amber-500">(Gol de Oro)</span>}
      </div>
    </div>
  );
};

export default MatchResult;
