
import React from 'react';
import { motion } from 'framer-motion';
import * as brain from 'brain.js';

interface Position {
  x: number;
  y: number;
}

interface NeuralNet {
  net: brain.NeuralNetwork<{ ballX: number, ballY: number, playerX: number, playerY: number }, { moveX: number, moveY: number }>;
  lastOutput: { x: number; y: number };
}

interface Player {
  id: number;
  position: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team: 'red' | 'blue';
  brain: NeuralNet;
  targetPosition: Position;
}

interface Ball {
  position: Position;
  velocity: Position;
}

interface Score {
  red: number;
  blue: number;
}

const PITCH_WIDTH = 800;
const PITCH_HEIGHT = 600;
const GOAL_WIDTH = 120;
const GOAL_HEIGHT = 160;
const PLAYER_RADIUS = 12;
const BALL_RADIUS = 6;
const PLAYER_SPEED = 2;

const createPlayerBrain = (): NeuralNet => {
  const net = new brain.NeuralNetwork<
    { ballX: number, ballY: number, playerX: number, playerY: number },
    { moveX: number, moveY: number }
  >({
    hiddenLayers: [4],
  });

  // Entrenamiento inicial básico
  net.train([
    { input: { ballX: 0, ballY: 0, playerX: 0, playerY: 0 }, output: { moveX: 1, moveY: 0 } },
    { input: { ballX: 1, ballY: 1, playerX: 0, playerY: 0 }, output: { moveX: 1, moveY: 1 } },
    { input: { ballX: 0, ballY: 1, playerX: 1, playerY: 0 }, output: { moveX: -1, moveY: 1 } },
  ], {
    iterations: 1000,
    errorThresh: 0.005
  });

  return {
    net,
    lastOutput: { x: 0, y: 0 },
  };
};

const updatePlayerBrain = (
  brain: NeuralNet, 
  isScoring: boolean, 
  ball: { position: Position },
  player: { position: Position }
) => {
  const normalizedInput = {
    ballX: ball.position.x / PITCH_WIDTH,
    ballY: ball.position.y / PITCH_HEIGHT,
    playerX: player.position.x / PITCH_WIDTH,
    playerY: player.position.y / PITCH_HEIGHT
  };

  // Ajustamos el comportamiento basado en si el equipo marcó o recibió el gol
  const learningRate = isScoring ? 0.3 : 0.1;
  const targetOutput = isScoring ? {
    // Si marcó, reforzamos el comportamiento que llevó al gol
    moveX: (ball.position.x - player.position.x) > 0 ? 1 : -1,
    moveY: (ball.position.y - player.position.y) > 0 ? 1 : -1
  } : {
    // Si recibió el gol, ajustamos para mejorar la defensa
    moveX: (player.position.x - ball.position.x) > 0 ? -1 : 1,
    moveY: (player.position.y - ball.position.y) > 0 ? -1 : 1
  };

  // Entrenamiento incremental
  brain.net.train([{
    input: normalizedInput,
    output: targetOutput
  }], {
    iterations: 100,
    errorThresh: 0.05,
    learningRate
  });

  return {
    net: brain.net,
    lastOutput: brain.lastOutput
  };
};

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
      { x: 450, y: PITCH_HEIGHT/4, role: 'forward' },
      { x: 450, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: 450, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
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
      { x: PITCH_WIDTH - 450, y: PITCH_HEIGHT/4, role: 'forward' },
      { x: PITCH_WIDTH - 450, y: PITCH_HEIGHT/2, role: 'forward' },
      { x: PITCH_WIDTH - 450, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
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
            maxDistance = distanceToBall < 150 ? 80 : 50;
            break;
          case 'midfielder':
            maxDistance = distanceToBall < 200 ? 120 : 80;
            break;
          case 'forward':
            maxDistance = distanceToBall < 250 ? 160 : 100;
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
            player.team === 'blue', // true si el equipo marcó, false si recibió
            { position }, // posición actual de la pelota
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
            player.team === 'red', // true si el equipo marcó, false si recibió
            { position }, // posición actual de la pelota
            player
          )
        }))
      );
      return 'red';
    }

    return null;
  };

  const checkCollision = (ballPos: Position, playerPos: Position) => {
    const dx = ballPos.x - playerPos.x;
    const dy = ballPos.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (PLAYER_RADIUS + BALL_RADIUS);
  };

  React.useEffect(() => {
    const gameLoop = () => {
      updatePlayerPositions();
      setBall((prevBall) => {
        const newPosition = {
          x: prevBall.position.x + prevBall.velocity.x,
          y: prevBall.position.y + prevBall.velocity.y,
        };

        for (const player of players) {
          if (checkCollision(newPosition, player.position)) {
            const dx = newPosition.x - player.position.x;
            const dy = newPosition.y - player.position.y;
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(
              prevBall.velocity.x * prevBall.velocity.x + 
              prevBall.velocity.y * prevBall.velocity.y
            ) * 1.1;

            return {
              position: {
                x: player.position.x + (PLAYER_RADIUS + BALL_RADIUS) * Math.cos(angle),
                y: player.position.y + (PLAYER_RADIUS + BALL_RADIUS) * Math.sin(angle)
              },
              velocity: {
                x: speed * Math.cos(angle),
                y: speed * Math.sin(angle)
              }
            };
          }
        }

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
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full font-bold text-xl shadow-md">
        <span className="text-team-red">{score.red}</span>
        <span className="mx-2">-</span>
        <span className="text-team-blue">{score.blue}</span>
      </div>

      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 w-32 h-32 border-2 border-pitch-lines rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-pitch-lines transform -translate-x-1/2" />
        <div className="absolute left-0 top-1/2 w-4 h-[160px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
        <div className="absolute right-0 top-1/2 w-4 h-[160px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
        <div className="absolute left-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
        <div className="absolute right-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
      </div>

      {players.map((player) => (
        <motion.div
          key={player.id}
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
