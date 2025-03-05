
import React from 'react';
import { Score } from '../types/football';

interface ScoreDisplayProps {
  score: Score;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  // Add log to verify score is being updated correctly
  React.useEffect(() => {
    console.log(`ScoreDisplay rendering with score: Red ${score.red} - Blue ${score.blue}`);
  }, [score]);

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full font-bold text-xl shadow-md z-20">
      <span className="text-red-600">{score.red}</span>
      <span className="mx-2">-</span>
      <span className="text-blue-600">{score.blue}</span>
    </div>
  );
};

export default ScoreDisplay;
