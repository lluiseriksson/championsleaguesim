
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
  const timeEndCalledRef = useRef(false);
  
  // Calculate what time should show on the chronometer (scaling to 90 minutes)
  const getDisplayMinutes = (elapsed: number, total: number) => {
    // Scale the elapsed time to a 90-minute match
    const scaledMinutes = Math.floor((elapsed / total) * 90);
    // In golden goal mode, we need to show 90+ minutes
    return goldenGoal ? Math.max(90, scaledMinutes) : scaledMinutes;
  };
  
  console.log('MatchTimer rendered with initialTime:', initialTime, 'elapsedTime:', elapsedTime, 'goldenGoal:', goldenGoal);

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
    
    // Call onTimeEnd when we reach initialTime AND we're not in golden goal mode AND we haven't called it yet
    if (elapsedTime >= initialTime && !goldenGoal && !timeEndCalledRef.current) {
      console.log('Time ended, calling onTimeEnd');
      timeEndCalledRef.current = true;
      onTimeEnd();
    }

    // In regular mode: start timer if we haven't reached the end time
    // In golden goal mode: always keep the timer running
    if (elapsedTime < initialTime || goldenGoal) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prevTime) => {
          const newTime = prevTime + 1;
          console.log('Tick, elapsed time:', newTime, 'of', initialTime, 'goldenGoal:', goldenGoal);
          return newTime;
        });
      }, 1000);
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

  // Reset the timeEndCalled ref when golden goal state changes
  useEffect(() => {
    if (goldenGoal) {
      console.log('Golden goal mode activated, resetting timeEndCalled flag');
      timeEndCalledRef.current = false;
    }
  }, [goldenGoal]);

  // Calculate the display time in football match format (MM:SS)
  const displayMinutes = getDisplayMinutes(elapsedTime, initialTime);
  const displaySeconds = Math.floor((elapsedTime / initialTime) * 90 * 60) % 60;
  
  // In golden goal mode after regulation time, show 90+ minutes
  const formattedTime = goldenGoal && elapsedTime >= initialTime 
    ? `90+${Math.floor((elapsedTime - initialTime) / 60)}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`
    : `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  
  console.log('Displaying formatted time:', formattedTime, 'goldenGoal:', goldenGoal);

  return (
    <div className="match-timer font-mono text-2xl font-bold bg-black bg-opacity-80 text-white px-6 py-3 rounded-md shadow-lg absolute top-[-70px] left-1/2 transform -translate-x-1/2 z-30">
      {goldenGoal ? (
        <span className="text-amber-400 animate-pulse">GOLDEN GOAL! {formattedTime}</span>
      ) : (
        formattedTime
      )}
    </div>
  );
};

export default MatchTimer;
