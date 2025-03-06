
import React from 'react';
import { Player, Ball, Score, Position } from '../types/football';
import { useBallMovementSystem } from './game/BallMovementSystem';
import { useModelSyncSystem } from './game/ModelSyncSystem';
import { useGoalSystem } from './game/GoalSystem';
import { useGameLoop } from '../hooks/game/useGameLoop';
import { useGoalNotification } from '../hooks/game/useGoalNotification';
import { useModelSaveOnExit } from '../hooks/game/useModelSaveOnExit';
import { useTeamContext } from '../hooks/game/useTeamContext';
import { validatePlayerBrain } from '../utils/neural/networkValidator';
import { getFormation, calculateFormationPositions, teamFormations } from '../utils/formations';

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
  // Game time reference (in frames)
  const gameTimeRef = React.useRef<number>(0);
  // Formation positions storage
  const formationPositionsRef = React.useRef<{
    red: Position[],
    blue: Position[]
  }>({ red: [], blue: [] });
  
  console.log(`GameLogic rendered with players: ${players.length}, tournamentMode: ${tournamentMode}`);

  // Validate player brains on initial mount and when players change
  React.useEffect(() => {
    if (players.length > 0) {
      const validatedPlayers = players.map(player => validatePlayerBrain(player));
      
      // Only update if something changed
      const hasChanged = validatedPlayers.some((player, index) => 
        player.brain !== players[index].brain
      );
      
      if (hasChanged) {
        console.log('Updating players with validated brains');
        setPlayers(validatedPlayers);
      }
    }
  }, [players, setPlayers]);

  // Calculate formation positions whenever the ball or score changes
  React.useEffect(() => {
    if (players.length === 0) return;
    
    // Determine which teams are present
    const redTeam = players.find(p => p.team === 'red')?.teamName || 'Default';
    const blueTeam = players.find(p => p.team === 'blue')?.teamName || 'Default';
    
    // Get formations for each team
    const redFormationType = teamFormations[redTeam] || '3-4-3';
    const blueFormationType = teamFormations[blueTeam] || '3-4-3';
    
    const redFormation = getFormation(redFormationType);
    const blueFormation = getFormation(blueFormationType);
    
    // Determine possession
    const redPlayers = players.filter(p => p.team === 'red');
    const bluePlayers = players.filter(p => p.team === 'blue');
    
    // Simple proximity-based possession determination
    const redClosestToBall = redPlayers.reduce((closest, player) => {
      const dist = Math.sqrt(
        Math.pow(player.position.x - ball.position.x, 2) +
        Math.pow(player.position.y - ball.position.y, 2)
      );
      return dist < closest.dist ? { player, dist } : closest;
    }, { player: null, dist: Infinity });
    
    const blueClosestToBall = bluePlayers.reduce((closest, player) => {
      const dist = Math.sqrt(
        Math.pow(player.position.x - ball.position.x, 2) +
        Math.pow(player.position.y - ball.position.y, 2)
      );
      return dist < closest.dist ? { player, dist } : closest;
    }, { player: null, dist: Infinity });
    
    const redHasPossession = redClosestToBall.dist < blueClosestToBall.dist && redClosestToBall.dist < 50;
    const blueHasPossession = blueClosestToBall.dist < redClosestToBall.dist && blueClosestToBall.dist < 50;
    
    // Calculate score differential from each team's perspective
    const redScoreDiff = score.red - score.blue;
    const blueScoreDiff = score.blue - score.red;
    
    // Calculate formation positions
    const redPositions = calculateFormationPositions(
      redFormation,
      'red',
      ball.position,
      redHasPossession,
      redScoreDiff
    );
    
    const bluePositions = calculateFormationPositions(
      blueFormation,
      'blue',
      ball.position,
      blueHasPossession,
      blueScoreDiff
    );
    
    // Update formation positions ref
    formationPositionsRef.current = {
      red: redPositions,
      blue: bluePositions
    };
    
    // Log information for debugging
    if (gameTimeRef.current % 300 === 0) { // Log every 5 seconds (at 60fps)
      console.log('Updated formation positions:', {
        red: redHasPossession ? 'has possession' : 'defending',
        blue: blueHasPossession ? 'has possession' : 'defending',
        scoreDiff: { red: redScoreDiff, blue: blueScoreDiff }
      });
    }
    
    // Update player target positions based on formation
    setPlayers(currentPlayers => {
      // Only update if something changed
      const updatedPlayers = currentPlayers.map(player => {
        // Get formation position for this player's role and team
        const teamFormationPositions = player.team === 'red' ? redPositions : bluePositions;
        
        // Find matching position by role
        const rolePositions = teamFormationPositions.filter(
          (_, index) => currentPlayers.find(p => 
            p.team === player.team && 
            p.role === player.role && 
            p.id === player.id
          ) !== undefined
        );
        
        // Get the position index for this player within its role group
        const rolePlayers = currentPlayers.filter(p => 
          p.team === player.team && p.role === player.role
        );
        
        const playerIndex = rolePlayers.findIndex(p => p.id === player.id);
        
        // Get formation position for this player (if available)
        const formationPosition = rolePositions[Math.min(playerIndex, rolePositions.length - 1)];
        
        if (formationPosition) {
          return {
            ...player,
            targetPosition: {
              x: formationPosition.x,
              y: formationPosition.y
            }
          };
        }
        
        return player;
      });
      
      return updatedPlayers;
    });
    
  }, [ball.position, score, players, setPlayers]);

  // Increment game time counter on each frame
  React.useEffect(() => {
    const gameTimeInterval = setInterval(() => {
      gameTimeRef.current += 1;
    }, 16.67); // ~60fps
    
    return () => clearInterval(gameTimeInterval);
  }, []);

  // Get team context functions
  const { getTeamContext } = useTeamContext({ 
    players,
    score,
    gameTime: gameTimeRef.current 
  });

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
  const { totalGoalsRef } = useGameLoop({
    players,
    updatePlayerPositions,
    updateBallPosition: () => {}, // Will be overridden below
    incrementSyncCounter: () => {}, // Will be overridden below
    syncModels: () => {}, // Will be overridden below
    checkLearningProgress: () => {}, // Will be overridden below
    ball,
    score,
    tournamentMode
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

  // Model synchronization system with tournament mode flag
  const { syncModels, incrementSyncCounter, checkLearningProgress } = useModelSyncSystem({
    players,
    setPlayers,
    tournamentMode
  });

  // Run game loop with actual functions
  useGameLoop({
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
