
import React from 'react';
import { Player, Ball, Score, Position } from '../types/football';
import { useBallMovementSystem } from './game/BallMovementSystem';
import { useModelSyncSystem } from './game/ModelSyncSystem';
import { useGoalSystem } from './game/GoalSystem';
import { useGameLoop } from '../hooks/game/useGameLoop';
import { useGoalNotification } from '../hooks/game/useGoalNotification';
import { useModelSaveOnExit } from '../hooks/game/useModelSaveOnExit';
import { useTeamContext } from '../hooks/game/useTeamContext';
import { 
  getTeamEloRatings, 
  calculateTeamAdvantageFactors, 
  logEloAdvantages,
  BASE_ELO_IMPACT
} from '../utils/eloAdvantageSystem';

interface GameLogicProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  score: Score;
  setScore: React.Dispatch<React.SetStateAction<Score>>;
  updatePlayerPositions: () => void;
  tournamentMode?: boolean;
  onGoalScored?: (team: 'red' | 'blue') => void;
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
  onGoalScored
}) => {
  // Reference to track the last player who touched the ball
  const lastPlayerTouchRef = React.useRef<Player | null>(null);
  
  // Track total goals scored - MOVED THIS REF DECLARATION UP
  const totalGoalsRef = React.useRef<number>(0);
  
  // Get team ELO ratings using our utility function
  const teamElos = React.useMemo(() => 
    getTeamEloRatings(players), 
  [players]);
  
  // Calculate team advantage factors using our utility function
  const teamAdvantageFactors = React.useMemo(() => 
    calculateTeamAdvantageFactors(teamElos.red, teamElos.blue, BASE_ELO_IMPACT), 
  [teamElos.red, teamElos.blue]);
  
  // Log ELO advantage info when it changes
  React.useEffect(() => {
    if (players.length > 0) {
      logEloAdvantages(teamElos.red, teamElos.blue, BASE_ELO_IMPACT);
    }
  }, [teamElos.red, teamElos.blue, players.length]);
  
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
    tournamentMode,
    teamElos
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
    teamAdvantageFactors
  });

  // Goal notification hook with setScore added
  const { handleGoalScored } = useGoalNotification({
    tournamentMode,
    totalGoalsRef,
    ball,
    setBall,
    setScore  // Make sure setScore is passed here
  });

  // Update game loop with goal notification hook
  const gameLoopProps = {
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
    teamAdvantageFactors
  };

  // Run game loop with actual functions and performance monitoring
  useGameLoop(gameLoopProps);

  // Ball movement system with proper integration
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
        
        return scoringTeam;
      }
      return null;
    },
    onBallTouch: (player) => {
      lastPlayerTouchRef.current = player;
      console.log(`Ball touched by ${player.team} ${player.role} #${player.id}`);
    },
    tournamentMode,
    teamAdvantageFactors
  });

  // Save models on component unmount
  useModelSaveOnExit({ players, tournamentMode });

  return null;
};

export default GameLogic;
