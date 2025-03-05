
import React, { useEffect, useState } from 'react';

interface MatchTimerProps {
  initialTime: number; // in seconds
  onTimeEnd: () => void;
  goldenGoal?: boolean;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime, 
  onTimeEnd,
  goldenGoal = false
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  
  useEffect(() => {
    // Start the timer immediately on component mount
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(interval);
          onTimeEnd();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [onTimeEnd]);
  
  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  
  return (
    <div className="match-timer font-mono text-xl font-bold bg-black bg-opacity-80 text-white px-4 py-2 rounded-md shadow-lg absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
      {goldenGoal && timeLeft === 0 ? (
        <span className="text-amber-400">¡GOL DE ORO!</span>
      ) : (
        formattedTime
      )}
    </div>
  );
};

export default MatchTimer;
