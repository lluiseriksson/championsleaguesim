
import React from 'react';
import PitchLayout from './PitchLayout';
import ScoreDisplay from './ScoreDisplay';
import Ball from './Ball';
import PlayerSprite from './PlayerSprite';
import GameLogic from './GameLogic';
import PlayerInitializer from './game/PlayerInitializer';
import PlayerMovement from './game/PlayerMovement';
import { Player, Ball as BallType, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

const FootballPitch: React.FC = () => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [ball, setBall] = React.useState<BallType>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: Math.random() > 0.5 ? 3 : -3, y: (Math.random() - 0.5) * 3 },
    bounceDetection: {
      consecutiveBounces: 0,
      lastBounceTime: 0,
      lastBounceSide: '',
      sideEffect: false
    }
  });
  const [score, setScore] = React.useState<Score>({ red: 0, blue: 0 });
  const [gameReady, setGameReady] = React.useState(false);

  // Use our new PlayerMovement component
  const { updatePlayerPositions } = PlayerMovement({ 
    players, 
    setPlayers, 
    ball, 
    gameReady 
  });

  if (!gameReady) {
    return (
      <div className="w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg flex items-center justify-center">
        <div className="text-white text-2xl">Loading game...</div>
        <PlayerInitializer setPlayers={setPlayers} setGameReady={setGameReady} />
      </div>
    );
  }

  return (
    <div className="relative w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg">
      <ScoreDisplay score={score} />
      <PitchLayout />

      {players.map((player) => (
        <PlayerSprite key={player.id} player={player} />
      ))}

      <Ball ball={ball} />

      {gameReady && (
        <GameLogic
          players={players}
          setPlayers={setPlayers}
          ball={ball}
          setBall={setBall}
          score={score}
          setScore={setScore}
          updatePlayerPositions={updatePlayerPositions}
        />
      )}
    </div>
  );
};

export default FootballPitch;
