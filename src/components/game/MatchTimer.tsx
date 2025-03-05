import React, { useEffect, useState, useRef } from 'react';

interface MatchTimerProps {
  initialTime?: number; // in seconds, optional as we'll start from 0
  onTimeEnd: () => void;
  goldenGoal?: boolean;
  isGoalScored?: boolean; // New prop to stop timer when goal is scored
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime = 0,
  onTimeEnd,
  goldenGoal = false,
  isGoalScored = false
}) => {
  const [timeElapsed, setTimeElapsed] = useState(initialTime);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 3 real minutes = 180 seconds, mapped to 90 game minutes
  const REAL_TIME_SECONDS = 180;    // 3 real minutes
  const GAME_TIME_SECONDS = 90 * 60; // 90 minutes in seconds

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop timer if goal is scored during golden goal
    if (goldenGoal && isGoalScored) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeElapsed((prevTime) => {
        const newTime = prevTime + 1;
        
        // Convert real seconds to game seconds
        const gameSecondsElapsed = Math.floor((newTime / REAL_TIME_SECONDS) * GAME_TIME_SECONDS);
        
        // Check if we've reached 90:00 in game time
        if (!goldenGoal && gameSecondsElapsed >= GAME_TIME_SECONDS) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          onTimeEnd();
          return REAL_TIME_SECONDS; // Cap at real time equivalent of 90:00
        }
        
        return newTime;
      });
    }, 1000); // Update every real second

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [goldenGoal, isGoalScored, onTimeEnd]);

  // Convert real seconds to game time
  const gameSeconds = Math.min(
    Math.floor((timeElapsed / REAL_TIME_SECONDS) * GAME_TIME_SECONDS),
    GAME_TIME_SECONDS // Cap at 90:00 during regular time
  ) + (goldenGoal ? (timeElapsed - REAL_TIME_SECONDS) * (GAME_TIME_SECONDS / REAL_TIME_SECONDS) : 0);
  
  const displayMinutes = Math.floor(gameSeconds / 60);
  const displaySeconds = gameSeconds % 60;
  const formattedTime = `${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`;

  return (
    <div className="match-timer font-mono text-2xl font-bold bg-black bg-opacity-80 text-white px-6 py-3 rounded-md shadow-lg absolute top-[-70px] left-1/2 transform -translate-x-1/2 z-30">
      {goldenGoal ? (
        <span className="text-amber-400 animate-pulse">¡GOL DE ORO! {formattedTime}</span>
      ) : (
        formattedTime
      )}
    </div>
  );
};

export default MatchTimer;
