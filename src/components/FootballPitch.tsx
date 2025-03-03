
import React from 'react';
import GameBoard from './game/GameBoard';
import LoadingState from './game/LoadingState';
import usePlayerMovement from './game/PlayerMovement';
import { Player, Ball as BallType, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

const FootballPitch: React.FC = () => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [ball, setBall] = React.useState<BallType>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: Math.random() > 0.5 ? 5 : -5, y: (Math.random() - 0.5) * 5 }, // Increased initial velocity for classic feel
    bounceDetection: {
      consecutiveBounces: 0,
      lastBounceTime: 0,
      lastBounceSide: '',
      sideEffect: false
    }
  });
  const [score, setScore] = React.useState<Score>({ red: 0, blue: 0 });
  const [gameReady, setGameReady] = React.useState(false);

  // Use our PlayerMovement hook
  const { updatePlayerPositions } = usePlayerMovement({ 
    players, 
    setPlayers, 
    ball, 
    gameReady 
  });

  if (!gameReady) {
    return <LoadingState setPlayers={setPlayers} setGameReady={setGameReady} />;
  }

  return (
    <GameBoard
      players={players}
      setPlayers={setPlayers}
      ball={ball}
      setBall={setBall}
      score={score}
      setScore={setScore}
      updatePlayerPositions={updatePlayerPositions}
    />
  );
};

export default FootballPitch;
