
import React from 'react';
import { Score } from '../types/football';

interface ScoreDisplayProps {
  score: Score;
  homeTeam?: string;
  awayTeam?: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, homeTeam = 'Home', awayTeam = 'Away' }) => {
  // Add log to verify score is being updated correctly
  React.useEffect(() => {
    console.log(`ScoreDisplay rendering with score: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`);
  }, [score, homeTeam, awayTeam]);

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full font-bold text-xl shadow-md z-20 flex items-center">
      <span className="mr-2 text-sm font-medium">{homeTeam}</span>
      <span className="text-red-600">{score.red}</span>
      <span className="mx-2">-</span>
      <span className="text-blue-600">{score.blue}</span>
      <span className="ml-2 text-sm font-medium">{awayTeam}</span>
    </div>
  );
};

export default ScoreDisplay;
