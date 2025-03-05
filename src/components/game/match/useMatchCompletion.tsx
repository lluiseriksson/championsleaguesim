
import { useEffect, useMemo } from 'react';
import { Score } from '../../../types/football';
import { useMatchContext } from './MatchContext';
import { toast } from 'sonner';

interface UseMatchCompletionProps {
  onMatchComplete: (winner: string, finalScore: Score, wasGoldenGoal: boolean) => void;
  matchDuration: number;
}

export const useMatchCompletion = ({ onMatchComplete, matchDuration }: UseMatchCompletionProps) => {
  const { 
    score, 
    homeTeam, 
    awayTeam, 
    goldenGoal, 
    setGoldenGoal, 
    lastScorer, 
    matchEnded,
    setMatchEnded
  } = useMatchContext();

  // Handle time end
  const handleTimeEnd = useMemo(() => {
    return () => {
      console.log("Tiempo terminado. Puntuación:", score);
      
      if (score.red === score.blue) {
        console.log("Comenzando gol de oro");
        setGoldenGoal(true);
        toast("¡TIEMPO AGOTADO! - Comienza el tiempo de gol de oro", {
          description: "El primer equipo en marcar gana el partido"
        });
      } else {
        const winner = score.red > score.blue ? homeTeam : awayTeam;
        console.log("Partido terminado. Ganador:", winner);
        toast(`¡Fin del partido! ${winner} gana`, {
          description: `Resultado final: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`,
        });
        
        setTimeout(() => {
          setMatchEnded(true);
          onMatchComplete(winner, score, false);
        }, 2000);
      }
    };
  }, [score, homeTeam, awayTeam, onMatchComplete, setGoldenGoal, setMatchEnded]);

  // Check for golden goal
  useEffect(() => {
    const totalGoals = score.red + score.blue;
    const previousTotalGoals = lastScorer ? 1 : 0;
    
    if (goldenGoal && totalGoals > previousTotalGoals) {
      const winner = lastScorer === 'red' ? homeTeam : awayTeam;
      
      console.log("Golden goal winner:", winner);
      console.log("Final score (including golden goal):", score);
      
      toast(`¡${winner} gana con gol de oro!`, {
        description: `Resultado final: ${homeTeam} ${score.red} - ${score.blue} ${awayTeam}`,
      });
      
      setTimeout(() => {
        setMatchEnded(true);
        onMatchComplete(winner, score, true);
      }, 2000);
    }
  }, [score, goldenGoal, homeTeam, awayTeam, onMatchComplete, lastScorer, setMatchEnded]);

  return { handleTimeEnd };
};
