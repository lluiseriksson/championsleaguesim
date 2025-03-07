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
  const lastTickTimeRef = useRef<number>(Date.now());
  const timeEndCalledRef = useRef(false);
  const goldenGoalStartTimeRef = useRef(0);
  
  // Calculate what time should show on the chronometer (scaling to 90 minutes)
  const getDisplayMinutes = (elapsed: number, total: number) => {
    // Scale the elapsed time to a 90-minute match
    const scaledMinutes = Math.floor((elapsed / total) * 90);
    return scaledMinutes;
  };

  // Function to tick the timer, with safeguards against missed frames
  const tick = () => {
    const now = Date.now();
    const delta = Math.floor((now - lastTickTimeRef.current) / 1000);
    
    // If more than 5 seconds passed between ticks, something went wrong (tab inactive, etc.)
    // In that case, only increment by 1 to prevent huge jumps
    const increment = delta > 5 ? 1 : delta > 0 ? delta : 1;
    
    lastTickTimeRef.current = now;
    
    setElapsedTime(prev => {
      const newTime = prev + increment;
      return newTime;
    });
  };
  
  // Reset timer when component mounts or initialTime changes
  useEffect(() => {
    console.log('Setting up chronometer with total time:', initialTime);
    setElapsedTime(0);
    lastTickTimeRef.current = Date.now();
    timeEndCalledRef.current = false;
    goldenGoalStartTimeRef.current = 0;
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [initialTime]);

  // Store the time when golden goal starts
  useEffect(() => {
    if (goldenGoal && goldenGoalStartTimeRef.current === 0) {
      goldenGoalStartTimeRef.current = elapsedTime;
      console.log('Golden goal started at elapsed time:', goldenGoalStartTimeRef.current);
    } else if (!goldenGoal) {
      goldenGoalStartTimeRef.current = 0;
    }
  }, [goldenGoal, elapsedTime]);

  // Main timer effect
  useEffect(() => {
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
      // Use a more frequent interval (500ms) for better reliability
      // and to recover more quickly from potential browser throttling
      timerRef.current = setInterval(tick, 500);
    }

    // Cleanup function
    return () => {
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
  
  // In golden goal mode, calculate the extra time properly based on simulated match time
  let formattedTime;
  if (goldenGoal) {
    const extraTimeElapsed = elapsedTime - goldenGoalStartTimeRef.current;
    const extraTimeScaled = Math.floor((extraTimeElapsed / initialTime) * 90);
    const extraMinutes = Math.floor(extraTimeScaled / 60);
    const extraSeconds = extraTimeScaled % 60;
    
    formattedTime = `90+${extraMinutes}:${extraSeconds < 10 ? '0' : ''}${extraSeconds}`;
  } else {
    formattedTime = `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
  }

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
