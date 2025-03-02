
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
      
      {/* Player role legend */}
      <div className="absolute bottom-2 right-2 bg-black/40 p-2 rounded text-xs text-white flex gap-2">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-lg bg-white border border-white mr-1"></div>
          <span>GK</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full opacity-80 bg-white mr-1"></div>
          <span>DEF</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-white mr-1 flex items-center justify-center">
            <div className="w-1 h-1 bg-black rounded-full"></div>
          </div>
          <span>MID</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-white mr-1 flex items-center justify-center">
            <div className="w-0.5 h-1.5 bg-black rounded-sm"></div>
          </div>
          <span>FWD</span>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
