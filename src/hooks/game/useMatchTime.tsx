
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Score } from '../../types/football';
import { transliterateRussianName } from '../../utils/transliteration';

interface UseMatchTimeProps {
  initialTime: number;
  score: Score;
  homeTeam: string;
  awayTeam: string;
  onTimeEnd: () => void;
  onMatchEnd: (winner: string, score: Score, wasGoldenGoal: boolean) => void;
}

export const useMatchTime = ({
  initialTime,
  score,
  homeTeam,
  awayTeam,
  onTimeEnd,
  onMatchEnd
}: UseMatchTimeProps) => {
  const displayHomeTeam = transliterateRussianName(homeTeam);
  const displayAwayTeam = transliterateRussianName(awayTeam);
  
  const handleTimeEnd = useCallback(() => {
    console.log("Tiempo terminado. Puntuación:", score);
    
    if (score.red === score.blue) {
      console.log("Comenzando gol de oro");
      toast("¡TIEMPO AGOTADO! - Comienza el tiempo de gol de oro", {
        description: "El primer equipo en marcar gana el partido"
      });
      onTimeEnd();
    } else {
      const winner = score.red > score.blue ? homeTeam : awayTeam;
      const displayWinner = transliterateRussianName(winner);
      console.log("Partido terminado. Ganador:", displayWinner);
      toast(`¡Fin del partido! ${displayWinner} gana`, {
        description: `Resultado final: ${displayHomeTeam} ${score.red} - ${score.blue} ${displayAwayTeam}`,
      });
      
      setTimeout(() => {
        onMatchEnd(winner, score, false);
      }, 2000);
    }
  }, [score, homeTeam, awayTeam, onTimeEnd, onMatchEnd, displayHomeTeam, displayAwayTeam]);
  
  return { handleTimeEnd };
};
