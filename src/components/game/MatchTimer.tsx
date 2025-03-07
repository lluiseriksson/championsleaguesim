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
  // Track elapsed time in real seconds
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());
  const timeEndCalledRef = useRef(false);
  const goldenGoalStartTimeRef = useRef(0);
  const intervalErrorCountRef = useRef(0);
  
  // Calculate what time should show on the chronometer (scaling to 90 minutes)
  const getDisplayMinutes = (elapsed: number, total: number) => {
    // Scale the elapsed time to a 90-minute match
    const scaledMinutes = Math.floor((elapsed / total) * 90);
    return scaledMinutes;
  };

  // Function to tick the timer, with safeguards against missed frames
  const tick = () => {
    const now = Date.now();
    const deltaSeconds = (now - lastTickTimeRef.current) / 1000;
    
    // If more than 5 seconds passed between ticks, something went wrong (tab inactive, etc.)
    // In that case, use a value based on real time to prevent huge jumps
    const increment = deltaSeconds > 5 ? 
      Math.min(5, (now - lastTickTimeRef.current) / 1000) : 
      deltaSeconds;
    
    lastTickTimeRef.current = now;
    
    setElapsedTime(prev => {
      const newTime = prev + increment;
      // Log when we're approaching the end time
      if (initialTime - newTime <= 5 && initialTime - newTime > 0) {
        console.log(`Approaching end time: ${newTime.toFixed(1)}/${initialTime}`);
      }
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
    intervalErrorCountRef.current = 0;
    
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
      console.log('Golden goal started at elapsed time:', goldenGoalStartTimeRef.current.toFixed(1));
    } else if (!goldenGoal) {
      goldenGoalStartTimeRef.current = 0;
    }
  }, [goldenGoal, elapsedTime]);

  // Main timer effect with additional resilience - use a more accurate timing mechanism
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

    // Create a reliable timer using requestAnimationFrame for smoother updates
    let frameId: number;
    const animationFrame = () => {
      try {
        tick();
        frameId = requestAnimationFrame(animationFrame);
      } catch (error) {
        console.error("Error in timer tick:", error);
        intervalErrorCountRef.current++;
        
        // If we get too many errors, revert to interval as fallback
        if (intervalErrorCountRef.current > 5) {
          console.warn("Reverting to interval timer due to animation frame errors");
          cancelAnimationFrame(frameId);
          startIntervalTimer();
          intervalErrorCountRef.current = 0;
        } else {
          frameId = requestAnimationFrame(animationFrame);
        }
      }
    };
    
    // Fallback to interval timer if needed
    const startIntervalTimer = () => {
      timerRef.current = setInterval(() => {
        try {
          tick();
        } catch (error) {
          console.error("Error in interval timer tick:", error);
        }
      }, 100); // Update 10 times per second for smoother display
    };
    
    // In regular mode: start timer if we haven't reached the end time
    // In golden goal mode: always keep the timer running
    if (elapsedTime < initialTime || goldenGoal) {
      // Start with requestAnimationFrame for smoother updates
      frameId = requestAnimationFrame(animationFrame);
      
      // Add a backup system to ensure time progresses
      const backupTimerId = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastTick = now - lastTickTimeRef.current;
        
        // If more than 2 seconds have passed without a tick, force an update
        if (timeSinceLastTick > 2000) {
          console.warn("Timer appears to be stalled, forcing update");
          lastTickTimeRef.current = now;
          setElapsedTime(prev => prev + 2);
        }
      }, 3000);
      
      return () => {
        cancelAnimationFrame(frameId);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        clearTimeout(backupTimerId);
      };
    }

    // Cleanup function
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
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
    const extraMinutes = Math.floor(extraTimeScaled);
    const extraSeconds = Math.floor((extraTimeScaled % 1) * 60);
    
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
