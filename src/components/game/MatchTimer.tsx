import React, { useEffect, useState, useRef } from 'react';

interface MatchTimerProps {
  initialTime: number; // in seconds (real time)
  onTimeEnd: () => void;
  goldenGoal?: boolean;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime, 
  onTimeEnd,
  goldenGoal = false
}) => {
  const [gameTime, setGameTime] = useState(0); // Virtual game time in seconds
  const [realTimeElapsed, setRealTimeElapsed] = useState(0); // Real time elapsed in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  
  // Virtual match duration (90 minutes = 5400 seconds)
  const MATCH_DURATION = 5400;
  
  // Calculate time conversion factor (how many virtual seconds per real second)
  const timeConversionFactor = MATCH_DURATION / initialTime;
  
  console.log('MatchTimer rendered with initialTime:', initialTime, 'gameTime:', gameTime);

  useEffect(() => {
    // Only initialize when the component mounts
    if (!initializedRef.current) {
      setGameTime(0);
      setRealTimeElapsed(0);
      initializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    console.log('Setting up timer with gameTime:', gameTime, 'goldenGoal:', goldenGoal);
    
    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setRealTimeElapsed((prevRealTime) => {
        const newRealTime = prevRealTime + 1;
        
        // Update game time based on real time
        setGameTime((prevGameTime) => {
          const newGameTime = Math.min(
            Math.floor(newRealTime * timeConversionFactor), 
            !goldenGoal ? MATCH_DURATION : Number.MAX_SAFE_INTEGER
          );
          
          console.log('Tick, new game time:', newGameTime);
          
          // If we reached the end of regular time and not in golden goal
          if (newGameTime >= MATCH_DURATION && !goldenGoal && prevGameTime < MATCH_DURATION) {
            console.log('Regular time ended, calling onTimeEnd');
            onTimeEnd();
          }
          
          return newGameTime;
        });
        
        // Stop the timer if we reach initialTime and we're not in golden goal
        if (newRealTime >= initialTime && !goldenGoal) {
          console.log('Real time elapsed, stopping timer');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
        
        return newRealTime;
      });
    }, 1000); // Update every real second

    // Cleanup function
    return () => {
      console.log('Cleaning up timer');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [initialTime, onTimeEnd, goldenGoal, timeConversionFactor]);

  // Format game time as MM:SS
  const formatGameTime = () => {
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  console.log('Displaying formatted time:', formatGameTime());

  return (
    <div className="match-timer font-mono text-2xl font-bold bg-black bg-opacity-80 text-white px-6 py-3 rounded-md shadow-lg absolute top-[-70px] left-1/2 transform -translate-x-1/2 z-30">
      {goldenGoal ? (
        <span className="text-amber-400 animate-pulse">¡GOL DE ORO!</span>
      ) : (
        formatGameTime()
      )}
    </div>
  );
};

export default MatchTimer;
