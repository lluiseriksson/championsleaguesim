
import React from 'react';
import { useEffect, useState } from 'react';

interface MatchTimerProps {
  initialTime: number; // en segundos
  isRunning: boolean;
  onTimeEnd: () => void;
  goldenGoal?: boolean;
  autoStart?: boolean; // Nuevo prop para iniciar automáticamente
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime, 
  isRunning, 
  onTimeEnd,
  goldenGoal = false,
  autoStart = true // Por defecto, el timer inicia automáticamente
}) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [started, setStarted] = useState(autoStart);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if ((isRunning && started) && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            clearInterval(timer);
            onTimeEnd();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (goldenGoal && timeRemaining === 0) {
      // En modo gol de oro, el contador se detiene pero el juego continúa
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeRemaining, onTimeEnd, goldenGoal, started]);
  
  // Efecto para manejar cambios en isRunning
  useEffect(() => {
    if (isRunning && !started) {
      setStarted(true);
    }
  }, [isRunning, started]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className="match-timer font-mono text-xl font-bold bg-black bg-opacity-80 text-white px-4 py-2 rounded-md shadow-lg absolute top-4 right-4 z-10">
      {goldenGoal && timeRemaining === 0 ? (
        <span className="text-amber-400">¡GOL DE ORO!</span>
      ) : (
        formatTime(timeRemaining)
      )}
    </div>
  );
};

export default MatchTimer;
