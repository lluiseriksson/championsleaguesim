
import React, { useRef, useState, useEffect } from 'react';
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
  
  // NEW: Track match result for training effectiveness
  const [matchResult, setMatchResult] = useState<{ 
    winner: string | null, 
    score: { red: number, blue: number } 
  } | null>(null);
  
  // Watch for score changes to update match result
  useEffect(() => {
    // Only update if we have a significant score difference
    if (score.red >= 3 && score.red > score.blue + 1) {
      setMatchResult({
        winner: 'red',
        score: { ...score }
      });
    } else if (score.blue >= 3 && score.blue > score.red + 1) {
      setMatchResult({
        winner: 'blue',
        score: { ...score }
      });
    } else if (score.red >= 1 && score.blue >= 1) {
      // If scores are close, set as a draw
      setMatchResult({
        winner: null, // draw
        score: { ...score }
      });
    }
  }, [score]);
  
  console.log(`GameLogic rendered with players: ${players.length}, tournamentMode: ${tournamentMode}`);

  // Find team ELO values for comparison
  const homeTeamElo = players.find(p => p.team === 'red')?.teamElo || 1500;
  const awayTeamElo = players.find(p => p.team === 'blue')?.teamElo || 1500;
  
  // Determine which team has higher ELO
  const higherEloTeam = homeTeamElo > awayTeamElo ? 'red' : 'blue';
  const lowerEloTeam = homeTeamElo > awayTeamElo ? 'blue' : 'red';
  
  // Only higher ELO team should learn, regardless of red/blue designation
  const higherEloTeamShouldLearn = true;  // Higher ELO team always learns
  const lowerEloTeamShouldLearn = false;  // Lower ELO team never learns
  
  // Log ELO comparison for debugging
  console.log(`Team ELO comparison - Home Team (red): ${homeTeamElo}, Away Team (blue): ${awayTeamElo}`);
  console.log(`Learning configuration - Higher ELO team (${higherEloTeam}): ${higherEloTeamShouldLearn ? 'YES' : 'NO'}, Lower ELO team (${lowerEloTeam}): ${lowerEloTeamShouldLearn ? 'YES' : 'NO'}`);

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

  // Model synchronization system with ELO-based learning
  const { 
    syncModels, 
    incrementSyncCounter, 
    checkLearningProgress,
    checkPerformance,
    performHistoricalTraining,
    checkTrainingEffectiveness,
    trainingEffectiveness,
    isLowPerformance
  } = useModelSyncSystem({
    players,
    setPlayers,
    tournamentMode,
    matchResult
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
    checkTrainingEffectiveness, // NEW: Add training effectiveness check
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
    checkTrainingEffectiveness, // NEW: Add training effectiveness check
    ball,
    score,
    tournamentMode,
    isLowPerformance
  });

  // Save models on component unmount
  useModelSaveOnExit({ 
    players, 
    tournamentMode,
    homeTeamLearning: higherEloTeam === 'red' ? higherEloTeamShouldLearn : lowerEloTeamShouldLearn,
    awayTeamLearning: higherEloTeam === 'blue' ? higherEloTeamShouldLearn : lowerEloTeamShouldLearn
  });

  return null;
};

export default GameLogic;
