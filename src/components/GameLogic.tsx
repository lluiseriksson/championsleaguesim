
import React, { useRef } from 'react';
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
  const lastPlayerTouchRef = useRef<Player | null>(null);
  
  // Control the frequency of historical training
  const historicalTrainingCountRef = useRef(0);
  
  console.log(`GameLogic rendered with players: ${players.length}, tournamentMode: ${tournamentMode}`);

  // Find team ELO values for comparison
  const homeTeamElo = players.find(p => p.team === 'red')?.teamElo || 1500;
  const awayTeamElo = players.find(p => p.team === 'blue')?.teamElo || 1500;
  
  // Default setup: home team (red) always learns, away team (blue) never learns
  const homeTeamLearning = true;
  const awayTeamLearning = false;
  
  // Log ELO comparison for debugging
  console.log(`Team ELO comparison - Home Team: ${homeTeamElo}, Away Team: ${awayTeamElo}`);
  console.log(`Learning configuration - Home team: ${homeTeamLearning ? 'YES' : 'NO'}, Away team: ${awayTeamLearning ? 'YES' : 'NO'}`);

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

  // Create a throttled version of the historical training function
  const throttledHistoricalTraining = () => {
    // Only run historical training occasionally to prevent performance issues
    historicalTrainingCountRef.current += 1;
    
    // In tournament mode, run it even less frequently
    const threshold = tournamentMode ? 5 : 3;
    
    if (historicalTrainingCountRef.current >= threshold) {
      historicalTrainingCountRef.current = 0;
      
      // Actually perform the training
      if (performHistoricalTraining) {
        console.log("Running scheduled historical training");
        performHistoricalTraining();
      }
    } else {
      console.log(`Skipping historical training (${historicalTrainingCountRef.current}/${threshold})`);
    }
  };

  // Goal notification system
  const { totalGoalsRef } = useGameLoop({
    players,
    updatePlayerPositions: updatePlayerPositions,
    updateBallPosition: () => {}, // Will be overridden below
    incrementSyncCounter,
    syncModels,
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining: throttledHistoricalTraining,
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
      console.log(`Ball touched by ${player.team === 'red' ? 'home' : 'away'} ${player.role} #${player.id}`);
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
    performHistoricalTraining: throttledHistoricalTraining,
    ball,
    score,
    tournamentMode,
    isLowPerformance
  });

  // Save models on component unmount
  useModelSaveOnExit({ 
    players, 
    tournamentMode,
    homeTeamLearning,
    awayTeamLearning
  });

  return null;
};

export default GameLogic;
