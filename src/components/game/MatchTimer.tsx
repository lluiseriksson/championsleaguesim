
import React, { useEffect, useState, useRef } from 'react';

interface MatchTimerProps {
  initialTime: number; // en segundos
  isRunning: boolean;
  onTimeEnd: () => void;
  goldenGoal?: boolean;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime, 
  isRunning, 
  onTimeEnd,
  goldenGoal = false
}) => {
  const [seconds, setSeconds] = useState(initialTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Reset timer when initialTime changes
  useEffect(() => {
    setSeconds(initialTime);
  }, [initialTime]);
  
  // Start/stop timer based on isRunning
  useEffect(() => {
    console.log('Timer effect triggered:', { isRunning, seconds });
    
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Only set up new interval if the timer should be running
    if (isRunning && seconds > 0) {
      console.log('Starting timer interval');
      
      // Start a new interval
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            // Clear interval when time is up
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            
            // Call the callback
            onTimeEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, onTimeEnd, seconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="match-timer font-mono text-xl font-bold bg-black bg-opacity-80 text-white px-4 py-2 rounded-md shadow-lg absolute top-4 right-4 z-10">
      {goldenGoal && seconds === 0 ? (
        <span className="text-amber-400">¡GOL DE ORO!</span>
      ) : (
        formatTime(seconds)
      )}
    </div>
  );
};

export default MatchTimer;
