
import React from 'react';
import GameBoard from '../GameBoard';
import MatchTimer from '../MatchTimer';
import usePlayerMovement from '../PlayerMovement';
import { useMatchContext } from './MatchContext';
import { useMatchCompletion } from './useMatchCompletion';

interface MatchFieldProps {
  onMatchComplete: (winner: string, finalScore: any, wasGoldenGoal: boolean) => void;
  matchDuration: number;
}

const MatchField: React.FC<MatchFieldProps> = ({ onMatchComplete, matchDuration }) => {
  const { 
    players, 
    setPlayers, 
    ball, 
    setBall, 
    score, 
    setScore, 
    homeTeam, 
    awayTeam,
    goldenGoal
  } = useMatchContext();

  const { handleTimeEnd } = useMatchCompletion({ 
    onMatchComplete, 
    matchDuration 
  });

  const { updatePlayerPositions } = usePlayerMovement({ 
    players, 
    setPlayers, 
    ball, 
    gameReady: true 
  });

  return (
    <div className="relative mt-12 pt-8"> {/* Espacio para el temporizador */}
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
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />
    </div>
  );
};

export default MatchField;
