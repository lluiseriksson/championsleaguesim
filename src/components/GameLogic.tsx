
import React from 'react';
import { Player, Ball, Score, Position } from '../types/football';
import { useBallMovementSystem } from './game/BallMovementSystem';
import { useModelSyncSystem } from './game/ModelSyncSystem';
import { useGoalSystem } from './game/GoalSystem';
import { useGameLoop } from '../hooks/game/useGameLoop';
import { useGoalNotification } from '../hooks/game/useGoalNotification';
import { useModelSaveOnExit } from '../hooks/game/useModelSaveOnExit';
import { useTeamContext } from '../hooks/game/useTeamContext';

interface GameLogicProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  score: Score;
  setScore: React.Dispatch<React.SetStateAction<Score>>;
  updatePlayerPositions: () => void;
  tournamentMode?: boolean;
}

const GameLogic: React.FC<GameLogicProps> = ({
  players,
  setPlayers,
  ball,
  setBall,
  score,
  setScore,
  updatePlayerPositions,
  tournamentMode = false
}) => {
  // Reference to track the last player who touched the ball
  const lastPlayerTouchRef = React.useRef<Player | null>(null);
  
  console.log(`GameLogic rendered with players: ${players.length}, tournamentMode: ${tournamentMode}`);

  // Get team context functions
  const { getTeamContext } = useTeamContext({ players });

  // Goal system for checking and processing goals
  const { checkGoal, processGoal } = useGoalSystem({ 
    setScore, 
    players, 
    setPlayers, 
    getTeamContext, 
    ball,
    lastPlayerTouchRef,
    tournamentMode
  });

  // Goal notification system
  useGoalNotification({
    tournamentMode,
    totalGoalsRef: React.useRef(0),
    ball,
    setBall
  });

  // Ball movement system
  const { updateBallPosition } = useBallMovementSystem({
    ball,
    setBall,
    players,
    checkGoal: (position) => {
      const scoringTeam = checkGoal(position);
      if (scoringTeam) {
        // If a goal is scored, process it immediately
        processGoal(scoringTeam);
        console.log(`Goal scored by ${scoringTeam} team!`);
        return scoringTeam;
      }
      return null;
    },
    onBallTouch: (player) => {
      lastPlayerTouchRef.current = player;
      console.log(`Ball touched by ${player.team} ${player.role} #${player.id}`);
    },
    tournamentMode
  });

  // Model synchronization system with tournament mode flag
  const { syncModels, incrementSyncCounter, checkLearningProgress } = useModelSyncSystem({
    players,
    setPlayers,
    tournamentMode
  });

  // Force initial ball movement on component mount
  React.useEffect(() => {
    if (players.length > 0 && ball) {
      console.log("Forcing initial ball and player movement");
      // Apply a strong initial movement to the ball
      setBall(currentBall => ({
        ...currentBall,
        velocity: {
          x: Math.random() > 0.5 ? 8 : -8,
          y: (Math.random() - 0.5) * 8
        }
      }));
      
      // Force an initial player position update
      updatePlayerPositions();
    }
  }, [players.length, ball, setBall, updatePlayerPositions]);

  // Run game loop with actual functions
  const { totalGoalsRef } = useGameLoop({
    players,
    updatePlayerPositions,
    updateBallPosition,
    incrementSyncCounter,
    syncModels,
    checkLearningProgress,
    ball,
    score,
    tournamentMode
  });

  // Save models on component unmount
  useModelSaveOnExit({ players, tournamentMode });

  return null;
};

export default GameLogic;
