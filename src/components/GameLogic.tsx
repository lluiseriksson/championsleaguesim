
import React from 'react';
import { Player, Ball, Score, Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, PLAYER_RADIUS, GOAL_HEIGHT } from '../types/football';
import { checkCollision, calculateNewVelocity } from '../utils/gamePhysics';
import { updatePlayerBrain } from '../utils/playerBrain';

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
  const checkGoal = (position: Position) => {
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;

    if (position.x <= BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      setScore(prev => ({ ...prev, blue: prev.blue + 1 }));
      setPlayers(currentPlayers => 
        currentPlayers.map(player => ({
          ...player,
          brain: updatePlayerBrain(
            player.brain,
            player.team === 'blue',
            { position },
            player
          )
        }))
      );
      return 'blue';
    }
    
    if (position.x >= PITCH_WIDTH - BALL_RADIUS && position.y >= goalTop && position.y <= goalBottom) {
      setScore(prev => ({ ...prev, red: prev.red + 1 }));
      setPlayers(currentPlayers => 
        currentPlayers.map(player => ({
          ...player,
          brain: updatePlayerBrain(
            player.brain,
            player.team === 'red',
            { position },
            player
          )
        }))
      );
      return 'red';
    }

    return null;
  };

  React.useEffect(() => {
    const gameLoop = () => {
      updatePlayerPositions();
      
      setBall((prevBall) => {
        // Dividimos el movimiento en 16 pasos de 1ms cada uno
        for (let step = 1; step <= 16; step++) {
          const stepMovement = {
            x: prevBall.position.x + prevBall.velocity.x * (step/16),
            y: prevBall.position.y + prevBall.velocity.y * (step/16),
          };

          for (const player of players) {
            if (checkCollision(stepMovement, player.position)) {
              const newVelocity = calculateNewVelocity(stepMovement, player.position, prevBall.velocity);
              return {
                position: {
                  x: player.position.x + (PLAYER_RADIUS + BALL_RADIUS) * Math.cos(Math.atan2(stepMovement.y - player.position.y, stepMovement.x - player.position.x)),
                  y: player.position.y + (PLAYER_RADIUS + BALL_RADIUS) * Math.sin(Math.atan2(stepMovement.y - player.position.y, stepMovement.x - player.position.x))
                },
                velocity: newVelocity
              };
            }
          }
        }

        // Movimiento final si no hubo colisiones
        const newPosition = {
          x: prevBall.position.x + prevBall.velocity.x,
          y: prevBall.position.y + prevBall.velocity.y,
        };

        const scoringTeam = checkGoal(newPosition);
        if (scoringTeam) {
          return {
            position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
            velocity: { x: 2 * (scoringTeam === 'red' ? -1 : 1), y: 0 }
          };
        }

        const newVelocity = { ...prevBall.velocity };
        if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
          newVelocity.x = -prevBall.velocity.x * 0.9;
        }
        if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
          newVelocity.y = -prevBall.velocity.y * 0.9;
        }

        return {
          position: {
            x: Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newPosition.x)),
            y: Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newPosition.y))
          },
          velocity: newVelocity
        };
      });
    };

    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [players, updatePlayerPositions]);

  return null;
};

export default GameLogic;
