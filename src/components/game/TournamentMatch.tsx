
import React, { useState, useEffect } from 'react';
import GameBoard from './GameBoard';
import usePlayerMovement from './PlayerMovement';
import MatchTimer from './MatchTimer';
import { Player, Ball, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { transliterateRussianName } from '../../utils/transliteration';
import { useTournamentPlayers } from '../../hooks/game/useTournamentPlayers';
import { useMatchTime } from '../../hooks/game/useMatchTime';
import { useGoldenGoal } from '../../hooks/game/useGoldenGoal';
import MatchResult from './MatchResult';

interface TournamentMatchProps {
  homeTeam: string;
  awayTeam: string;
  onMatchComplete: (winner: string, finalScore: Score, wasGoldenGoal: boolean) => void;
  matchDuration?: number; // in seconds
}

const TournamentMatch: React.FC<TournamentMatchProps> = ({ 
  homeTeam, 
  awayTeam, 
  onMatchComplete,
  matchDuration = 180 // 3 minutes by default
}) => {
  const displayHomeTeam = transliterateRussianName(homeTeam);
  const displayAwayTeam = transliterateRussianName(awayTeam);
  
  const [ball, setBall] = useState<Ball>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: Math.random() > 0.5 ? 3 : -3, y: (Math.random() - 0.5) * 3 },
    bounceDetection: {
      consecutiveBounces: 0,
      lastBounceTime: 0,
      lastBounceSide: '',
      sideEffect: false
    }
  });
  
  const [score, setScore] = useState<Score>({ red: 0, blue: 0 });
  const [matchEnded, setMatchEnded] = useState(false);
  const [goldenGoal, setGoldenGoal] = useState(false);
  const [lastScorer, setLastScorer] = useState<'red' | 'blue' | null>(null);
  
  const { players, setPlayers } = useTournamentPlayers({ homeTeam, awayTeam });
  
  const { updatePlayerPositions } = usePlayerMovement({ 
    players, 
    setPlayers, 
    ball, 
    gameReady: true 
  });
  
  const handleMatchComplete = (winner: string, finalScore: Score, wasGoldenGoal: boolean) => {
    setMatchEnded(true);
    onMatchComplete(winner, finalScore, wasGoldenGoal);
  };
  
  const handleGoldenGoalStart = () => {
    setGoldenGoal(true);
    setLastScorer(null);
  };
  
  const { handleTimeEnd } = useMatchTime({
    initialTime: matchDuration,
    score,
    homeTeam,
    awayTeam,
    onTimeEnd: handleGoldenGoalStart,
    onMatchEnd: handleMatchComplete
  });
  
  const { goldenGoalScored } = useGoldenGoal({
    score,
    goldenGoal,
    lastScorer,
    homeTeam,
    awayTeam,
    onMatchEnd: handleMatchComplete
  });
  
  useEffect(() => {
    console.log('TournamentMatch: matchDuration =', matchDuration);
  }, [matchDuration]);
  
  if (matchEnded) {
    return (
      <MatchResult
        score={score}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        goldenGoalScored={goldenGoalScored}
      />
    );
  }
  
  return (
    <div className="relative mt-12 pt-8">
      <MatchTimer 
        initialTime={matchDuration} 
        onTimeEnd={handleTimeEnd}
        goldenGoal={goldenGoal}
      />
      
      <GameBoard
        players={players}
        setPlayers={setPlayers}
        ball={ball}
        setBall={setBall}
        score={score}
        setScore={setScore}
        updatePlayerPositions={updatePlayerPositions}
        homeTeam={displayHomeTeam}
        awayTeam={displayAwayTeam}
        tournamentMode={true}
        onGoalScored={(team) => {
          console.log(`Goal scored by ${team} team, golden goal mode: ${goldenGoal}`);
          setLastScorer(team);
        }}
      />
    </div>
  );
};

export default TournamentMatch;
