
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

  // Model synchronization system with tournament mode flag and performance monitoring
  const { 
    syncModels, 
    incrementSyncCounter, 
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining,
    isLowPerformance
  } = useModelSyncSystem({
    players,
    setPlayers,
    tournamentMode
  });

  // Goal notification system
  const { totalGoalsRef } = useGameLoop({
    players,
    updatePlayerPositions: () => updatePlayerPositions(),
    updateBallPosition: () => {}, // Will be overridden below
    incrementSyncCounter,
    syncModels,
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining,
    ball,
    score,
    tournamentMode,
    isLowPerformance
  });

  // Goal notification hook
  const { handleGoalScored } = useGoalNotification({
    tournamentMode,
    totalGoalsRef,
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
        
        // Handle goal notification and ball reset
        return handleGoalScored(scoringTeam);
      }
      return null;
    },
    onBallTouch: (player) => {
      lastPlayerTouchRef.current = player;
      console.log(`Ball touched by ${player.team} ${player.role} #${player.id}`);
    },
    tournamentMode
  });

  // Run game loop with actual functions and performance monitoring
  useGameLoop({
    players,
    updatePlayerPositions,
    updateBallPosition,
    incrementSyncCounter,
    syncModels,
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining,
    ball,
    score,
    tournamentMode,
    isLowPerformance
  });

  // Save models on component unmount
  useModelSaveOnExit({ players, tournamentMode });

  return null;
};

export default GameLogic;
