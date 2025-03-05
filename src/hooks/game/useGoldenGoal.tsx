
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Score } from '../../types/football';
import { transliterateRussianName } from '../../utils/transliteration';

interface UseGoldenGoalProps {
  score: Score;
  goldenGoal: boolean;
  lastScorer: 'red' | 'blue' | null;
  homeTeam: string;
  awayTeam: string;
  onMatchEnd: (winner: string, score: Score, wasGoldenGoal: boolean) => void;
}

export const useGoldenGoal = ({
  score,
  goldenGoal,
  lastScorer,
  homeTeam,
  awayTeam,
  onMatchEnd
}: UseGoldenGoalProps) => {
  const [goldenGoalScored, setGoldenGoalScored] = useState(false);
  const displayHomeTeam = transliterateRussianName(homeTeam);
  const displayAwayTeam = transliterateRussianName(awayTeam);
  
  useEffect(() => {
    if (goldenGoal && !goldenGoalScored) {
      if (lastScorer) {
        console.log("Golden goal scored by:", lastScorer);
        setGoldenGoalScored(true);
        const winner = lastScorer === 'red' ? homeTeam : awayTeam;
        const displayWinner = transliterateRussianName(winner);
        
        console.log("Golden goal winner:", displayWinner);
        toast(`¡${displayWinner} gana con gol de oro!`, {
          description: `Resultado final: ${displayHomeTeam} ${score.red} - ${score.blue} ${displayAwayTeam}`,
        });
        
        setTimeout(() => {
          onMatchEnd(winner, score, true);
        }, 2000);
      }
    }
  }, [goldenGoal, lastScorer, score, homeTeam, awayTeam, goldenGoalScored, displayHomeTeam, displayAwayTeam, onMatchEnd]);
  
  return { goldenGoalScored };
};
