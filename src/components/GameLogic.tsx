
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
  onGoalScored?: (team: 'red' | 'blue') => void; // Add the onGoalScored prop
}

const GameLogic: React.FC<GameLogicProps> = ({
  players,
  setPlayers,
  ball,
  setBall,
  score,
  setScore,
  updatePlayerPositions,
  tournamentMode = false,
  onGoalScored // Add the prop here
}) => {
  // Reference to track the last player who touched the ball
  const lastPlayerTouchRef = React.useRef<Player | null>(null);
  
  // Calculate team ELOs for advantage calculations
  const redTeamElo = React.useMemo(() => {
    const redPlayers = players.filter(p => p.team === 'red');
    return redPlayers.length > 0 && redPlayers[0].teamElo ? redPlayers[0].teamElo : 2000;
  }, [players]);
  
  const blueTeamElo = React.useMemo(() => {
    const bluePlayers = players.filter(p => p.team === 'blue');
    return bluePlayers.length > 0 && bluePlayers[0].teamElo ? bluePlayers[0].teamElo : 2000;
  }, [players]);
  
  const eloAdvantageMultiplier = React.useMemo(() => {
    const eloDiff = Math.abs(redTeamElo - blueTeamElo);
    // Significantly increased multiplier effect - making ELO differences more impactful
    return Math.min(2.5, 1 + (eloDiff / 600));
  }, [redTeamElo, blueTeamElo]);
  
  console.log(`GameLogic rendered with players: ${players.length}, tournamentMode: ${tournamentMode}`);
  console.log(`Team ELOs - Red: ${redTeamElo}, Blue: ${blueTeamElo}, Advantage Multiplier: ${eloAdvantageMultiplier.toFixed(2)}`);

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
    tournamentMode,
    teamElos: { red: redTeamElo, blue: blueTeamElo }
  });

  // Model synchronization system with tournament mode flag and performance monitoring
  const { 
    syncModels, 
    incrementSyncCounter, 
    checkLearningProgress,
    checkPerformance,
    isLowPerformance
  } = useModelSyncSystem({
    players,
    setPlayers,
    tournamentMode,
    eloAdvantageMultiplier
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
    ball,
    score,
    tournamentMode,
    isLowPerformance,
    eloAdvantageMultiplier
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
        
        // Call the onGoalScored callback if provided
        if (onGoalScored) {
          onGoalScored(scoringTeam);
        }
        
        // Handle goal notification and ball reset
        return handleGoalScored(scoringTeam);
      }
      return null;
    },
    onBallTouch: (player) => {
      lastPlayerTouchRef.current = player;
      console.log(`Ball touched by ${player.team} ${player.role} #${player.id}`);
    },
    tournamentMode,
    eloAdvantageMultiplier
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
    ball,
    score,
    tournamentMode,
    isLowPerformance,
    eloAdvantageMultiplier
  });

  // Save models on component unmount
  useModelSaveOnExit({ players, tournamentMode });

  return null;
};

export default GameLogic;
