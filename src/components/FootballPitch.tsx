import React from 'react';
import { motion } from 'framer-motion';

interface Position {
  x: number;
  y: number;
}

interface Player {
  id: number;
  position: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team: 'red' | 'blue';
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
const GOAL_WIDTH = 80;
const GOAL_HEIGHT = 120;
const PLAYER_RADIUS = 12;
const BALL_RADIUS = 6;

const FootballPitch: React.FC = () => {
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [ball, setBall] = React.useState<Ball>({
    position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
    velocity: { x: 2, y: 2 },
  });
  const [score, setScore] = React.useState<Score>({ red: 0, blue: 0 });

  // Initialize players
  React.useEffect(() => {
    const initialPlayers: Player[] = [];
    
    // Initialize red team
    initialPlayers.push(
      { id: 1, position: { x: 50, y: PITCH_HEIGHT/2 }, role: 'goalkeeper', team: 'red' },
      // Defenders
      { id: 2, position: { x: 150, y: PITCH_HEIGHT/4 }, role: 'defender', team: 'red' },
      { id: 3, position: { x: 150, y: PITCH_HEIGHT/2 }, role: 'defender', team: 'red' },
      { id: 4, position: { x: 150, y: (PITCH_HEIGHT*3)/4 }, role: 'defender', team: 'red' },
      // Midfielders
      { id: 5, position: { x: 300, y: PITCH_HEIGHT/3 }, role: 'midfielder', team: 'red' },
      { id: 6, position: { x: 300, y: PITCH_HEIGHT/2 }, role: 'midfielder', team: 'red' },
      { id: 7, position: { x: 300, y: (PITCH_HEIGHT*2)/3 }, role: 'midfielder', team: 'red' },
      // Forwards
      { id: 8, position: { x: 450, y: PITCH_HEIGHT/4 }, role: 'forward', team: 'red' },
      { id: 9, position: { x: 450, y: PITCH_HEIGHT/2 }, role: 'forward', team: 'red' },
      { id: 10, position: { x: 450, y: (PITCH_HEIGHT*3)/4 }, role: 'forward', team: 'red' },
    );

    // Initialize blue team (mirrored positions)
    initialPlayers.push(
      { id: 11, position: { x: PITCH_WIDTH - 50, y: PITCH_HEIGHT/2 }, role: 'goalkeeper', team: 'blue' },
      // Defenders
      { id: 12, position: { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/4 }, role: 'defender', team: 'blue' },
      { id: 13, position: { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/2 }, role: 'defender', team: 'blue' },
      { id: 14, position: { x: PITCH_WIDTH - 150, y: (PITCH_HEIGHT*3)/4 }, role: 'defender', team: 'blue' },
      // Midfielders
      { id: 15, position: { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/3 }, role: 'midfielder', team: 'blue' },
      { id: 16, position: { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/2 }, role: 'midfielder', team: 'blue' },
      { id: 17, position: { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*2)/3 }, role: 'midfielder', team: 'blue' },
      // Forwards
      { id: 18, position: { x: PITCH_WIDTH - 450, y: PITCH_HEIGHT/4 }, role: 'forward', team: 'blue' },
      { id: 19, position: { x: PITCH_WIDTH - 450, y: PITCH_HEIGHT/2 }, role: 'forward', team: 'blue' },
      { id: 20, position: { x: PITCH_WIDTH - 450, y: (PITCH_HEIGHT*3)/4 }, role: 'forward', team: 'blue' },
    );

    setPlayers(initialPlayers);
  }, []);

  // Detect goal
  const checkGoal = (position: Position) => {
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;

    // Left goal (Red team scores)
    if (position.x <= 0 && position.y >= goalTop && position.y <= goalBottom) {
      setScore(prev => ({ ...prev, red: prev.red + 1 }));
      return 'red';
    }
    
    // Right goal (Blue team scores)
    if (position.x >= PITCH_WIDTH && position.y >= goalTop && position.y <= goalBottom) {
      setScore(prev => ({ ...prev, blue: prev.blue + 1 }));
      return 'blue';
    }

    return null;
  };

  // Check collision between ball and player
  const checkCollision = (ballPos: Position, playerPos: Position) => {
    const dx = ballPos.x - playerPos.x;
    const dy = ballPos.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (PLAYER_RADIUS + BALL_RADIUS);
  };

  // Ball movement
  React.useEffect(() => {
    const moveBall = () => {
      setBall((prevBall) => {
        const newPosition = {
          x: prevBall.position.x + prevBall.velocity.x,
          y: prevBall.position.y + prevBall.velocity.y,
        };

        // Check collisions with players
        for (const player of players) {
          if (checkCollision(newPosition, player.position)) {
            const dx = newPosition.x - player.position.x;
            const dy = newPosition.y - player.position.y;
            const angle = Math.atan2(dy, dx);
            const speed = Math.sqrt(
              prevBall.velocity.x * prevBall.velocity.x + 
              prevBall.velocity.y * prevBall.velocity.y
            );
            
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

        // Check for goals
        const scoringTeam = checkGoal(newPosition);
        if (scoringTeam) {
          return {
            position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
            velocity: { x: 2 * (scoringTeam === 'red' ? -1 : 1), y: 0 }
          };
        }

        // Bounce off walls
        const newVelocity = { ...prevBall.velocity };
        if (newPosition.x <= 0 || newPosition.x >= PITCH_WIDTH) {
          newVelocity.x = -prevBall.velocity.x;
        }
        if (newPosition.y <= 0 || newPosition.y >= PITCH_HEIGHT) {
          newVelocity.y = -prevBall.velocity.y;
        }

        return {
          position: {
            x: Math.max(0, Math.min(PITCH_WIDTH, newPosition.x)),
            y: Math.max(0, Math.min(PITCH_HEIGHT, newPosition.y))
          },
          velocity: newVelocity
        };
      });
    };

    const interval = setInterval(moveBall, 16); // 60fps
    return () => clearInterval(interval);
  }, [players]);

  return (
    <div className="relative w-[800px] h-[600px] bg-pitch mx-auto overflow-hidden rounded-lg shadow-lg">
      {/* Score display */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 px-4 py-2 rounded-full font-bold text-xl shadow-md">
        <span className="text-team-red">{score.red}</span>
        <span className="mx-2">-</span>
        <span className="text-team-blue">{score.blue}</span>
      </div>

      {/* Pitch markings */}
      <div className="absolute inset-0">
        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 w-32 h-32 border-2 border-pitch-lines rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-pitch-lines transform -translate-x-1/2" />
        {/* Goals */}
        <div className="absolute left-0 top-1/2 w-4 h-[120px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
        <div className="absolute right-0 top-1/2 w-4 h-[120px] border-2 border-pitch-lines transform -translate-y-1/2 bg-white/20" />
        {/* Penalty areas */}
        <div className="absolute left-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
        <div className="absolute right-0 top-1/2 w-36 h-72 border-2 border-pitch-lines transform -translate-y-1/2" />
      </div>

      {/* Players */}
      {players.map((player) => (
        <motion.div
          key={player.id}
          className={`absolute w-6 h-6 rounded-full ${
            player.team === 'red' ? 'bg-team-red' : 'bg-team-blue'
          }`}
          style={{
            left: player.position.x,
            top: player.position.y,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: [0, 2, 0, -2, 0],
            y: [0, -2, 0, 2, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}

      {/* Ball */}
      <motion.div
        className="absolute w-3 h-3 bg-white rounded-full shadow-md"
        style={{
          left: ball.position.x,
          top: ball.position.y,
          transform: 'translate(-50%, -50%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export default FootballPitch;
