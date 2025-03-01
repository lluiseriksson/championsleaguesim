
import React from 'react';
import { Player, Ball, Score, Position } from '../types/football';
import { saveModel } from '../utils/neuralModelService';
import { useBallMovementSystem } from './game/BallMovementSystem';
import { useModelSyncSystem } from './game/ModelSyncSystem';
import { useGoalSystem } from './game/GoalSystem';

interface GameLogicProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  score: Score;
  setScore: React.Dispatch<React.SetStateAction<Score>>;
  updatePlayerPositions: () => void;
}

const GameLogic: React.FC<GameLogicProps> = ({
  players,
  setPlayers,
  ball,
  setBall,
  score,
  setScore,
  updatePlayerPositions,
}) => {
  // Reference to track the last player who touched the ball
  const lastPlayerTouchRef = React.useRef<Player | null>(null);
  
  console.log("GameLogic rendered with players:", players.length);

  // Memoize team context to avoid unnecessary recalculations
  const getTeamContext = React.useCallback((player: Player) => ({
    teammates: players.filter(p => p.team === player.team && p.id !== player.id).map(p => p.position),
    opponents: players.filter(p => p.team !== player.team).map(p => p.position),
    ownGoal: player.team === 'red' ? { x: 0, y: 500/2 } : { x: 800, y: 500/2 },
    opponentGoal: player.team === 'red' ? { x: 800, y: 500/2 } : { x: 0, y: 500/2 }
  }), [players]);

  // Goal system
  const { checkGoal, processGoal } = useGoalSystem({ 
    setScore, 
    players, 
    setPlayers, 
    getTeamContext, 
    ball,
    lastPlayerTouchRef
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
        console.log(`Goal scored by team ${scoringTeam}`);
        processGoal(scoringTeam);
        
        // Reset ball position to center after goal
        setBall(prev => ({
          ...prev,
          position: { x: 800/2, y: 500/2 },
          velocity: { 
            x: Math.random() * 2 - 1, 
            y: Math.random() * 2 - 1 
          }
        }));
        
        return scoringTeam; // Fix: Return the scoring team instead of boolean
      }
      return null; // Fix: Return null instead of boolean false
    },
    onBallTouch: (player) => {
      lastPlayerTouchRef.current = player;
      console.log(`Ball touched by ${player.team} ${player.role} #${player.id}`);
    }
  });

  // Model synchronization system
  const { syncModels, incrementSyncCounter } = useModelSyncSystem({
    players,
    setPlayers
  });

  // Track if game is running
  const isRunningRef = React.useRef(true);

  React.useEffect(() => {
    console.log("Game loop started");
    let frameId: number;
    let lastTime = performance.now();
    const TIME_STEP = 16; // 60 FPS target
    
    const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= TIME_STEP) {
        // Update player positions
        updatePlayerPositions();

        // Update ball position and handle collisions
        updateBallPosition();

        // Increment sync counter
        incrementSyncCounter();
        
        lastTime = currentTime;
      }
      
      frameId = requestAnimationFrame(gameLoop);
    };

    // Start the game loop immediately
    frameId = requestAnimationFrame(gameLoop);
    
    // Sync models on startup
    syncModels();
    
    console.log("Game loop initialized");

    // Debug timer to log ball state every 5 seconds
    const debugInterval = setInterval(() => {
      if (isRunningRef.current) {
        console.log("Ball state:", {
          position: ball.position,
          velocity: ball.velocity,
          speed: Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y)
        });
        console.log("Current score:", score);
      }
    }, 5000);

    return () => {
      console.log("Game loop cleanup");
      cancelAnimationFrame(frameId);
      clearInterval(debugInterval);
      isRunningRef.current = false;
      
      // When unmounting, save current models
      players
        .filter(p => p.role !== 'goalkeeper')
        .forEach(player => {
          saveModel(player)
            .catch(err => console.error(`Error saving model on exit:`, err));
        });
    };
  }, [players, updatePlayerPositions, updateBallPosition, incrementSyncCounter, syncModels, ball, score]);

  return null;
};

export default GameLogic;
