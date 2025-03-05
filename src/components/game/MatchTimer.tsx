
import React from 'react';
import { useMatchTimer } from '../../hooks/game/useMatchTimer';

interface MatchTimerProps {
  initialTime: number; // in seconds (total match duration)
  onTimeEnd: () => void;
  goldenGoal?: boolean;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime, 
  onTimeEnd,
  goldenGoal = false
}) => {
  const { display } = useMatchTimer({
    initialTime,
    onTimeEnd,
    goldenGoal
  });
  
  return (
    <div className="match-timer font-mono text-2xl font-bold bg-black bg-opacity-80 text-white px-6 py-3 rounded-md shadow-lg absolute top-[-70px] left-1/2 transform -translate-x-1/2 z-30">
      {display.isGoldenGoal ? (
        <span className="text-amber-400 animate-pulse">GOLDEN GOAL! {display.formattedTime}</span>
      ) : (
        display.formattedTime
      )}
    </div>
  );
};

export default MatchTimer;
