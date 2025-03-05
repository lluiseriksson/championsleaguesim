
import React, { useEffect, useState } from 'react';

interface MatchTimerProps {
  initialTime: number; // in seconds
  onTimeEnd: () => void;
  goldenGoal?: boolean;
}

const MatchTimer: React.FC<MatchTimerProps> = ({ 
  initialTime, 
  onTimeEnd,
  goldenGoal = false
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  
  console.log('MatchTimer renderizado con initialTime:', initialTime, 'timeLeft:', timeLeft);

  useEffect(() => {
    console.log('Timer iniciado con initialTime:', initialTime);
    setTimeLeft(initialTime);
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        console.log('Tick:', prevTime);
        if (prevTime <= 0) {
          console.log('Tiempo terminado, llamando a onTimeEnd');
          clearInterval(timer);
          onTimeEnd();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => {
      console.log('Limpiando temporizador');
      clearInterval(timer);
    };
  }, [initialTime, onTimeEnd]);

  // Formatear el tiempo como MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  
  console.log('Mostrando tiempo formateado:', formattedTime);

  return (
    <div className="match-timer font-mono text-2xl font-bold bg-black bg-opacity-80 text-white px-6 py-3 rounded-md shadow-lg absolute top-[-50px] left-1/2 transform -translate-x-1/2 z-30">
      {goldenGoal && timeLeft === 0 ? (
        <span className="text-amber-400">¡GOL DE ORO!</span>
      ) : (
        formattedTime
      )}
    </div>
  );
};

export default MatchTimer;
