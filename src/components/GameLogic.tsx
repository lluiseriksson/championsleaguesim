
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
  const getTeamContext = (player: Player) => ({
    teammates: players.filter(p => p.team === player.team && p.id !== player.id).map(p => p.position),
    opponents: players.filter(p => p.team !== player.team).map(p => p.position),
    ownGoal: player.team === 'red' ? { x: 0, y: PITCH_HEIGHT/2 } : { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 },
    opponentGoal: player.team === 'red' ? { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 } : { x: 0, y: PITCH_HEIGHT/2 }
  });

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
            ball,
            player,
            getTeamContext(player)
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
            ball,
            player,
            getTeamContext(player)
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
        // División del movimiento en pasos más pequeños para mejor detección de colisiones
        const STEPS = 32; // Aumentado de 16 a 32 pasos
        let newBallState = { ...prevBall };

        for (let step = 1; step <= STEPS; step++) {
          const stepMovement = {
            x: newBallState.position.x + (newBallState.velocity.x / STEPS),
            y: newBallState.position.y + (newBallState.velocity.y / STEPS),
          };

          // Priorizar porteros en la detección de colisiones
          const goalkeepers = players.filter(p => p.role === 'goalkeeper');
          const fieldPlayers = players.filter(p => p.role !== 'goalkeeper');
          const allPlayers = [...goalkeepers, ...fieldPlayers];

          for (const player of allPlayers) {
            if (checkCollision(stepMovement, player.position)) {
              const newVelocity = calculateNewVelocity(
                stepMovement,
                player.position,
                newBallState.velocity,
                player.role === 'goalkeeper'
              );

              // Calcular nueva posición después de la colisión
              const collisionAngle = Math.atan2(
                stepMovement.y - player.position.y,
                stepMovement.x - player.position.x
              );

              newBallState = {
                position: {
                  x: player.position.x + (PLAYER_RADIUS + BALL_RADIUS) * Math.cos(collisionAngle),
                  y: player.position.y + (PLAYER_RADIUS + BALL_RADIUS) * Math.sin(collisionAngle)
                },
                velocity: newVelocity
              };

              break;
            }
          }

          // Actualizar la posición para el siguiente sub-paso
          newBallState.position = stepMovement;
        }

        // Verificar goles y límites del campo
        const scoringTeam = checkGoal(newBallState.position);
        if (scoringTeam) {
          return {
            position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
            velocity: { x: 2 * (scoringTeam === 'red' ? -1 : 1), y: 0 }
          };
        }

        // Rebote en los límites del campo
        if (newBallState.position.x <= BALL_RADIUS || newBallState.position.x >= PITCH_WIDTH - BALL_RADIUS) {
          newBallState.velocity.x = -newBallState.velocity.x * 0.9;
        }
        if (newBallState.position.y <= BALL_RADIUS || newBallState.position.y >= PITCH_HEIGHT - BALL_RADIUS) {
          newBallState.velocity.y = -newBallState.velocity.y * 0.9;
        }

        // Asegurar que el balón no salga del campo
        return {
          position: {
            x: Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newBallState.position.x)),
            y: Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newBallState.position.y))
          },
          velocity: newBallState.velocity
        };
      });
    };

    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [players, updatePlayerPositions]);

  return null;
};

export default GameLogic;
