import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMatchTimerProps {
  initialTime: number;
  onTimeEnd: () => void;
  goldenGoal: boolean;
}

interface TimerDisplay {
  formattedTime: string;
  isGoldenGoal: boolean;
}

export const useMatchTimer = ({
  initialTime,
  onTimeEnd,
  goldenGoal
}: UseMatchTimerProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const timeEndCalledRef = useRef(false);
  
  // Calculate what time should show on the chronometer (scaling to 90 minutes)
  const getDisplayTime = useCallback((): TimerDisplay => {
    // Scale the elapsed time to a 90-minute match
    const displayMinutes = getDisplayMinutes(elapsedTime, initialTime, goldenGoal);
    const displaySeconds = Math.floor((elapsedTime / initialTime) * 90 * 60) % 60;
    
    // In golden goal mode after regulation time, show 90+ minutes
    const formattedTime = goldenGoal && elapsedTime >= initialTime 
      ? `90+${Math.floor((elapsedTime - initialTime) / 60)}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`
      : `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;
    
    return {
      formattedTime,
      isGoldenGoal: goldenGoal
    };
  }, [elapsedTime, initialTime, goldenGoal]);
  
  // Reset the timeEndCalled ref when golden goal state changes
  useEffect(() => {
    if (goldenGoal) {
      console.log('Golden goal mode activated, resetting timeEndCalled flag');
      timeEndCalledRef.current = false;
    }
  }, [goldenGoal]);
  
  // Initialize the timer state when mounting
  useEffect(() => {
    if (!initializedRef.current) {
      console.log('Setting up chronometer with total time:', initialTime);
      setElapsedTime(0);
      initializedRef.current = true;
    }
  }, [initialTime]);
  
  // Main timer effect
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
  
  return {
    display: getDisplayTime(),
    elapsedTime
  };
};

// Helper function to calculate display minutes
const getDisplayMinutes = (elapsed: number, total: number, goldenGoal: boolean) => {
  // Scale the elapsed time to a 90-minute match
  const scaledMinutes = Math.floor((elapsed / total) * 90);
  // In golden goal mode, we need to show 90+ minutes
  return goldenGoal ? Math.max(90, scaledMinutes) : scaledMinutes;
};
