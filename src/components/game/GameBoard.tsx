
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
}

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  setPlayers,
  ball,
  setBall,
  score,
  setScore,
  updatePlayerPositions
}) => {
  return (
    <div className="relative w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg">
      <ScoreDisplay score={score} />
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
      />
      
      {/* Leyenda de roles actualizada */}
      <div className="absolute bottom-2 right-2 bg-black/60 p-2 rounded text-xs text-white">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-700 mr-2"></div>
          <span>Equipo Rojo</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 mr-2"></div>
          <span>Equipo Azul</span>
        </div>
        <div className="text-center mt-1 text-xs text-gray-300">
          G: Portero | D: Defensa | M: Mediocampista | F: Delantero
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
