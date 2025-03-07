
import React from 'react';
import PitchLayout from '../PitchLayout';
import ScoreDisplay from '../ScoreDisplay';
import Ball from '../Ball';
import PlayerSprite from '../PlayerSprite';
import GameLogic from '../GameLogic';
import { Player, Ball as BallType, Score } from '../../types/football';

interface GameBoardProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: BallType;
  setBall: React.Dispatch<React.SetStateAction<BallType>>;
  score: Score;
  setScore: React.Dispatch<React.SetStateAction<Score>>;
  updatePlayerPositions: () => void;
  homeTeam?: string;
  awayTeam?: string;
  onGoalScored?: (team: 'red' | 'blue') => void;
  tournamentMode?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  setPlayers,
  ball,
  setBall,
  score,
  setScore,
  updatePlayerPositions,
  homeTeam = 'Home',
  awayTeam = 'Away',
  onGoalScored,
  tournamentMode = false
}) => {
  // Debugging for score updates
  React.useEffect(() => {
    console.log(`GameBoard score updated: Red ${score.red} - Blue ${score.blue}`);
  }, [score]);

  return (
    <div className="relative w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg">
      <ScoreDisplay score={score} homeTeam={homeTeam} awayTeam={awayTeam} />
      <PitchLayout />

      {players.map((player) => (
        <PlayerSprite key={player.id} player={player} />
      ))}

      <Ball ball={ball} />

      <GameLogic
        players={players}
        setPlayers={setPlayers}
        ball={ball}
        setBall={setBall}
        score={score}
        setScore={setScore}
        updatePlayerPositions={updatePlayerPositions}
        tournamentMode={tournamentMode}
        onGoalScored={onGoalScored}
      />
    </div>
  );
};

export default GameBoard;
