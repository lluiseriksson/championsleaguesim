
import React, { useEffect, useState, useRef } from 'react';

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  
  console.log('MatchTimer renderizado con initialTime:', initialTime, 'timeLeft:', timeLeft);

  useEffect(() => {
    // Only set timeLeft when the component mounts or initialTime changes
    if (!initializedRef.current || initialTime !== timeLeft) {
      console.log('Setting initial time to:', initialTime);
      setTimeLeft(initialTime);
      initializedRef.current = true;
    }
  }, [initialTime]);

  useEffect(() => {
    console.log('Setting up timer with timeLeft:', timeLeft, 'goldenGoal:', goldenGoal);
    
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Only start the timer if we have time left and we're not in golden goal
    if (timeLeft > 0 && !goldenGoal) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          console.log('Tick, new time:', newTime);
          
          if (newTime <= 0) {
            console.log('Time ended, calling onTimeEnd');
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            onTimeEnd();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    // Call onTimeEnd immediately if we activate golden goal and time is already 0
    if (goldenGoal && timeLeft === 0 && !timerRef.current) {
      console.log('Golden goal activated with no time left');
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up timer');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, onTimeEnd, goldenGoal]);

  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  
  console.log('Displaying formatted time:', formattedTime);

  return (
    <div className="match-timer font-mono text-2xl font-bold bg-black bg-opacity-80 text-white px-6 py-3 rounded-md shadow-lg absolute top-[-70px] left-1/2 transform -translate-x-1/2 z-30">
      {goldenGoal ? (
        <span className="text-amber-400 animate-pulse">¡GOL DE ORO!</span>
      ) : (
        formattedTime
      )}
    </div>
  );
};

export default MatchTimer;
