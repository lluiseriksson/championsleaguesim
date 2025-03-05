
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
  const [timerActive, setTimerActive] = useState(autoStart);
  
  // Reiniciar el timer cuando cambie initialTime
  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);
  
  // Efecto principal para gestionar el contador
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if ((isRunning || timerActive) && timeRemaining > 0) {
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
      
      console.log("Timer started/running", { timeRemaining, isRunning, timerActive });
    }
    
    return () => {
      if (timer) {
        console.log("Clearing timer interval");
        clearInterval(timer);
      }
    };
  }, [isRunning, timeRemaining, onTimeEnd, timerActive]);
  
  // Activar el timer cuando isRunning cambie a true
  useEffect(() => {
    if (isRunning && !timerActive) {
      console.log("Setting timer active due to isRunning change");
      setTimerActive(true);
    }
  }, [isRunning, timerActive]);
  
  // Activar el timer automáticamente al montar el componente si autoStart es true
  useEffect(() => {
    if (autoStart) {
      console.log("Auto-starting timer");
      setTimerActive(true);
    }
  }, [autoStart]);
  
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
