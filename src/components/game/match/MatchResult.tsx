
import React from 'react';
import { useMatchContext } from './MatchContext';

const MatchResult: React.FC = () => {
  const { score, homeTeam, awayTeam, lastScorer } = useMatchContext();

  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Partido finalizado</h2>
      <div className="text-xl">
        {homeTeam} {score.red} - {score.blue} {awayTeam}
      </div>
      <div className="mt-4 text-lg font-semibold">
        Ganador: {score.red > score.blue ? homeTeam : awayTeam}
        {lastScorer && <span className="ml-2 text-amber-500">(Gol de Oro)</span>}
      </div>
    </div>
  );
};

export default MatchResult;
