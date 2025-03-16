
import React from 'react';
import GameBoard from './game/GameBoard';
import LoadingState from './game/LoadingState';
import usePlayerMovement from './game/PlayerMovement';
import { Player, Ball as BallType, Score, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

const FootballPitch: React.FC = () => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [ball, setBall] = React.useState<BallType>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: Math.random() > 0.5 ? 5 : -5, y: (Math.random() - 0.5) * 5 },
    bounceDetection: {
      consecutiveBounces: 0,
      lastBounceTime: 0,
      lastBounceSide: '',
      sideEffect: false
    }
  });
  const [score, setScore] = React.useState<Score>({ red: 0, blue: 0 });
  const [gameReady, setGameReady] = React.useState(false);
  const [homeTeam, setHomeTeam] = React.useState<string>('Home');
  const [awayTeam, setAwayTeam] = React.useState<string>('Away');
  // CRITICAL: Initialize gameActive state to true to ensure movement happens
  const [gameActive, setGameActive] = React.useState<boolean>(true);

  // Update team names when players are initialized
  React.useEffect(() => {
    if (players.length > 0) {
      const redTeamPlayer = players.find(p => p.team === 'red');
      const blueTeamPlayer = players.find(p => p.team === 'blue');
      
      if (redTeamPlayer?.teamName) {
        setHomeTeam(redTeamPlayer.teamName);
      }
      
      if (blueTeamPlayer?.teamName) {
        setAwayTeam(blueTeamPlayer.teamName);
      }
    }
  }, [players]);

  // Use our PlayerMovement hook
  const { updatePlayerPositions } = usePlayerMovement({ 
    players, 
    setPlayers, 
    ball, 
    gameReady,
    // Pass gameActive to ensure player movement
    gameActive
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
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      // Always set matchEnded to false in the main game to ensure movement
      matchEnded={false}
    />
  );
};

export default FootballPitch;
