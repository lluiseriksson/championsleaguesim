
import React, { useEffect, useState, useRef } from 'react';

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
  // Instead of counting down, we'll track elapsed time
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  
  // Calculate what time should show on the chronometer (scaling to 90 minutes)
  const getDisplayMinutes = (elapsed: number, total: number) => {
    // Scale the elapsed time to a 90-minute match
    return Math.floor((elapsed / total) * 90);
  };
  
  console.log('MatchTimer renderizado con initialTime:', initialTime, 'elapsedTime:', elapsedTime);

  useEffect(() => {
    // Only reset elapsed time when initialTime changes
    if (!initializedRef.current) {
      console.log('Setting up chronometer with total time:', initialTime);
      setElapsedTime(0);
      initializedRef.current = true;
    }
  }, [initialTime]);

  useEffect(() => {
    console.log('Setting up timer with elapsedTime:', elapsedTime, 'initialTime:', initialTime, 'goldenGoal:', goldenGoal);
    
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Only start the timer if we haven't reached the end time and we're not in golden goal
    if (elapsedTime < initialTime && !goldenGoal) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prevTime) => {
          const newTime = prevTime + 1;
          console.log('Tick, elapsed time:', newTime, 'of', initialTime);
          
          if (newTime >= initialTime) {
            console.log('Time ended, calling onTimeEnd');
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            onTimeEnd();
            return initialTime;
          }
          
          return newTime;
        });
      }, 1000);
    }

    // Call onTimeEnd immediately if we activate golden goal and time has already elapsed
    if (goldenGoal && elapsedTime >= initialTime && !timerRef.current) {
      console.log('Golden goal activated with time already elapsed');
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up timer');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [elapsedTime, onTimeEnd, goldenGoal, initialTime]);

  // Calculate the display time in football match format (MM:SS)
  const displayMinutes = getDisplayMinutes(elapsedTime, initialTime);
  const displaySeconds = Math.floor((elapsedTime / initialTime) * 90 * 60) % 60;
  const formattedTime = `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  
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
