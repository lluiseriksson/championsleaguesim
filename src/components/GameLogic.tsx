
import React, { useRef, useState } from 'react';
import { Player, Ball, Score, Position } from '../types/football';
import { useBallMovement } from './game/BallMovementSystem';
import { useModelSyncSystem } from './game/ModelSyncSystem';
import { useGoalSystem } from './game/GoalSystem';
import { useGameLoop } from '../hooks/game/useGameLoop';
import { useGoalNotification } from '../hooks/game/useGoalNotification';
import { useModelSaveOnExit } from '../hooks/game/useModelSaveOnExit';
import { useTeamContext } from '../hooks/game/useTeamContext';
import { usePerformanceTrackingSystem } from './game/PerformanceTrackingSystem';
import PerformanceDisplay from './PerformanceDisplay';

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
  
  // State to control visibility of performance metrics
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(!tournamentMode);
  
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

  // Performance tracking system
  const { redTeamMetrics, blueTeamMetrics, recordAction } = usePerformanceTrackingSystem({
    players,
    ball,
    score,
    lastPlayerTouchRef
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
  const { updateBallPosition } = useBallMovement({
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
    tournamentMode,
    onAction: (player, actionType, success) => {
      // Record the action for performance tracking
      recordAction(player, actionType, success);
    }
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

  // Toggle performance metrics display
  const togglePerformanceMetrics = () => {
    setShowPerformanceMetrics(prev => !prev);
  };

  return (
    <div>
      {!tournamentMode && (
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={togglePerformanceMetrics}
            className="px-3 py-1 bg-slate-800 text-white text-xs rounded shadow hover:bg-slate-700 transition-colors"
          >
            {showPerformanceMetrics ? "Hide" : "Show"} Performance
          </button>
        </div>
      )}
      
      {showPerformanceMetrics && (
        <div className="absolute top-12 right-4 z-10 w-72 md:w-96 bg-white/90 rounded shadow-lg border border-gray-200">
          <PerformanceDisplay 
            redTeamMetrics={redTeamMetrics}
            blueTeamMetrics={blueTeamMetrics}
            homeTeamLearning={homeTeamLearning}
            awayTeamLearning={awayTeamLearning}
          />
        </div>
      )}
    </div>
  );
};

export default GameLogic;
