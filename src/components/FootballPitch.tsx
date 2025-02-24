import React from 'react';
import { motion } from 'framer-motion';
import PitchLayout from './PitchLayout';
import ScoreDisplay from './ScoreDisplay';
import { createPlayerBrain, updatePlayerBrain } from '../utils/playerBrain';
import { checkCollision, calculateNewVelocity } from '../utils/gamePhysics';
import {
  Player, Ball, Score, Position,
  PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT,
  BALL_RADIUS, PLAYER_RADIUS, PLAYER_SPEED,
  GOALKEEPER_ARM_LENGTH
} from '../types/football';

const FootballPitch: React.FC = () => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [ball, setBall] = React.useState<Ball>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: 2, y: 2 },
  });
  const [score, setScore] = React.useState<Score>({ red: 0, blue: 0 });

  React.useEffect(() => {
    const initialPlayers: Player[] = [];
    
    [
      { x: 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
      { x: 150, y: PITCH_HEIGHT/4, role: 'defender' },
      { x: 150, y: PITCH_HEIGHT/2, role: 'defender' },
      { x: 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
      { x: 300, y: PITCH_HEIGHT/3, role: 'midfielder' },
      { x: 300, y: PITCH_HEIGHT/2, role: 'midfielder' },
      { x: 300, y: (PITCH_HEIGHT*2)/3, role: 'midfielder' },
      { x: 500, y: PITCH_HEIGHT/4, role: 'forward' }, // Adelantamos a los delanteros
      { x: 500, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
    ].forEach((pos, index) => {
      initialPlayers.push({
        id: index + 1,
        position: { x: pos.x, y: pos.y },
        role: pos.role as Player['role'],
        team: 'red',
        brain: createPlayerBrain(),
        targetPosition: { x: pos.x, y: pos.y }
      });
    });

    [
      { x: PITCH_WIDTH - 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
      { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/4, role: 'defender' },
      { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/2, role: 'defender' },
      { x: PITCH_WIDTH - 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
      { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/3, role: 'midfielder' },
      { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/2, role: 'midfielder' },
      { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*2)/3, role: 'midfielder' },
      { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/4, role: 'forward' }, // Adelantamos a los delanteros
      { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: PITCH_WIDTH - 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
    ].forEach((pos, index) => {
      initialPlayers.push({
        id: index + 11,
        position: { x: pos.x, y: pos.y },
        role: pos.role as Player['role'],
        team: 'blue',
        brain: createPlayerBrain(),
        targetPosition: { x: pos.x, y: pos.y }
      });
    });

    setPlayers(initialPlayers);
  }, []);

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

  const updatePlayerPositions = React.useCallback(() => {
    setPlayers(currentPlayers => 
      currentPlayers.map(player => {
        const input = {
          ballX: ball.position.x / PITCH_WIDTH,
          ballY: ball.position.y / PITCH_HEIGHT,
          playerX: player.position.x / PITCH_WIDTH,
          playerY: player.position.y / PITCH_HEIGHT,
        };

        const output = player.brain.net.run(input);
        player.brain.lastOutput = { 
          x: (output.moveX || 0.5) * 2 - 1, 
          y: (output.moveY || 0.5) * 2 - 1 
        };

        let maxDistance = 50;
        const distanceToBall = Math.sqrt(
          Math.pow(ball.position.x - player.position.x, 2) +
          Math.pow(ball.position.y - player.position.y, 2)
        );

        switch (player.role) {
          case 'goalkeeper':
            maxDistance = distanceToBall < 100 ? 40 : 20;
            break;
          case 'defender':
            // Aumentamos el rango en un 20%
            maxDistance = distanceToBall < 150 ? 96 : 60; // 80 * 1.2 = 96, 50 * 1.2 = 60
            break;
          case 'midfielder':
            maxDistance = distanceToBall < 200 ? 120 : 80;
            break;
          case 'forward':
            maxDistance = distanceToBall < 250 ? 200 : 120; // Aumentamos el rango de los delanteros
            break;
        }

        const newPosition = {
          x: player.position.x + player.brain.lastOutput.x * PLAYER_SPEED,
          y: player.position.y + player.brain.lastOutput.y * PLAYER_SPEED,
        };

        const distanceFromStart = Math.sqrt(
          Math.pow(newPosition.x - player.targetPosition.x, 2) +
          Math.pow(newPosition.y - player.targetPosition.y, 2)
        );

        if (distanceFromStart > maxDistance) {
          const angle = Math.atan2(
            player.targetPosition.y - newPosition.y,
            player.targetPosition.x - newPosition.x
          );
          newPosition.x = player.targetPosition.x + Math.cos(angle) * maxDistance;
          newPosition.y = player.targetPosition.y + Math.sin(angle) * maxDistance;
        }

        newPosition.x = Math.max(PLAYER_RADIUS, Math.min(PITCH_WIDTH - PLAYER_RADIUS, newPosition.x));
        newPosition.y = Math.max(PLAYER_RADIUS, Math.min(PITCH_HEIGHT - PLAYER_RADIUS, newPosition.y));

        return {
          ...player,
          position: newPosition,
        };
      })
    );
  }, [ball.position]);

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
            const isGoalkeeper = player.role === 'goalkeeper';
            if (checkCollision(stepMovement, player.position, isGoalkeeper)) {
              const newVelocity = calculateNewVelocity(stepMovement, player.position, prevBall.velocity, isGoalkeeper);
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

  return (
    <div className="relative w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg">
      <ScoreDisplay score={score} />
      <PitchLayout />

      {players.map((player) => (
        <React.Fragment key={player.id}>
          <motion.div
            className={`absolute w-6 h-6 rounded-full ${
              player.team === 'red' ? 'bg-team-red' : 'bg-team-blue'
            }`}
            animate={{
              x: player.position.x,
              y: player.position.y,
            }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 100,
              mass: 0.8
            }}
            initial={false}
          />
          {player.role === 'goalkeeper' && (
            <motion.div
              className={`absolute w-1 ${
                player.team === 'red' ? 'bg-team-red' : 'bg-team-blue'
              }`}
              style={{
                height: GOALKEEPER_ARM_LENGTH,
              }}
              animate={{
                x: player.position.x,
                y: player.position.y - GOALKEEPER_ARM_LENGTH/2,
              }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 100,
                mass: 0.8
              }}
              initial={false}
            />
          )}
        </React.Fragment>
      ))}

      <motion.div
        className="absolute w-3 h-3 bg-white rounded-full shadow-md"
        animate={{
          x: ball.position.x,
          y: ball.position.y,
          rotate: ball.velocity.x * 20,
        }}
        transition={{
          type: "tween",
          duration: 0.016,
          ease: "linear"
        }}
        initial={false}
      />
    </div>
  );
};

export default FootballPitch;
