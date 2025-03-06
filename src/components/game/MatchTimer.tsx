
import React, { useEffect, useState, useRef } from 'react';

interface MatchTimerProps {
  initialTime: number;
  onTimeEnd: () => void;
  goldenGoal?: boolean;
  startTimer?: boolean; // Add this prop to control when timer starts
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime, 
  onTimeEnd,
  goldenGoal = false,
  startTimer = false // Default to false
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const timeEndCalledRef = useRef(false);
  const goldenGoalStartTimeRef = useRef(0);
  
  const getDisplayMinutes = (elapsed: number, total: number) => {
    // Speed up initial time progression to show movement earlier
    // More aggressive acceleration of early game time
    const scaleFactor = elapsed < 5 ? 6 : // First 5 seconds - 6x speed
                       elapsed < 10 ? 4 : // Next 5 seconds - 4x speed
                       elapsed < 20 ? 2 : // Next 10 seconds - 2x speed
                       1;  // Normal speed after that
    const scaledMinutes = Math.floor((elapsed / total) * 90 * scaleFactor);
    return Math.min(90, scaledMinutes);  // Cap at 90 minutes
  };

  useEffect(() => {
    // Only reset elapsed time when initialTime changes
    if (!initializedRef.current) {
      setElapsedTime(0);
      initializedRef.current = true;
    }
  }, [initialTime]);

  useEffect(() => {
    if (goldenGoal && goldenGoalStartTimeRef.current === 0) {
      goldenGoalStartTimeRef.current = elapsedTime;
    } else if (!goldenGoal) {
      goldenGoalStartTimeRef.current = 0;
    }
  }, [goldenGoal, elapsedTime]);

  useEffect(() => {
    // Only start the timer if startTimer is true
    if (!startTimer && !goldenGoal) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (elapsedTime >= initialTime && !goldenGoal && !timeEndCalledRef.current) {
      timeEndCalledRef.current = true;
      onTimeEnd();
    }

    if (elapsedTime < initialTime || goldenGoal) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 300); // Update approximately 3 times per second for smoother progression (reduced from 500ms)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [elapsedTime, onTimeEnd, goldenGoal, initialTime, startTimer]);

  useEffect(() => {
    if (goldenGoal) {
      timeEndCalledRef.current = false;
    }
  }, [goldenGoal]);

  const displayMinutes = getDisplayMinutes(elapsedTime, initialTime);
  const displaySeconds = Math.floor((elapsedTime / initialTime) * 90 * 60) % 60;
  
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
      {!startTimer && !goldenGoal ? (
        <span className="text-amber-400 animate-pulse">READY...</span>
      ) : goldenGoal ? (
        <span className="text-amber-400 animate-pulse">GOLDEN GOAL! {formattedTime}</span>
      ) : (
        formattedTime
      )}
    </div>
  );
};

export default MatchTimer;
