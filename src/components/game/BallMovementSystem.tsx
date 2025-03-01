import React from 'react';
import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, PLAYER_RADIUS, GOAL_HEIGHT } from '../../types/football';
import { checkCollision, calculateNewVelocity } from '../../utils/gamePhysics';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
}

export const BallMovementSystem: React.FC<BallMovementSystemProps> = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch 
}) => {
  // Memoize player categorization
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  const updateBallPosition = React.useCallback(() => {
    setBall((prevBall) => {
      const STEPS = 16; // Reduced from 32 to 16 for better performance
      let newBallState = { ...prevBall };

      // Calculate complete movement once
      const totalMovementX = newBallState.velocity.x / STEPS;
      const totalMovementY = newBallState.velocity.y / STEPS;

      for (let step = 1; step <= STEPS; step++) {
        const stepMovement = {
          x: newBallState.position.x + totalMovementX,
          y: newBallState.position.y + totalMovementY,
        };

        // Check collisions first with goalkeepers
        let collision = false;
        for (const player of [...goalkeepers, ...fieldPlayers]) {
          if (checkCollision(stepMovement, player.position)) {
            const newVelocity = calculateNewVelocity(
              stepMovement,
              player.position,
              newBallState.velocity,
              player.role === 'goalkeeper'
            );

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

            // Register the last player to touch the ball
            onBallTouch(player);
            console.log(`Last touch: ${player.team} ${player.role} #${player.id}`);
            
            collision = true;
            break;
          }
        }

        if (!collision) {
          newBallState.position = stepMovement;
        }
      }

      // Check if goal was scored
      const scoringTeam = checkGoal(newBallState.position);
      if (scoringTeam) {
        return {
          position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
          velocity: { x: 2 * (scoringTeam === 'red' ? -1 : 1), y: 0 }
        };
      }

      // Wall rebounds with optimized calculation
      const hitWallX = newBallState.position.x <= BALL_RADIUS || 
                        newBallState.position.x >= PITCH_WIDTH - BALL_RADIUS;
      const hitWallY = newBallState.position.y <= BALL_RADIUS || 
                        newBallState.position.y >= PITCH_HEIGHT - BALL_RADIUS;

      if (hitWallX) newBallState.velocity.x *= -0.9;
      if (hitWallY) newBallState.velocity.y *= -0.9;

      // Limit ball position to field
      return {
        position: {
          x: Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newBallState.position.x)),
          y: Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newBallState.position.y))
        },
        velocity: newBallState.velocity
      };
    });
  }, [setBall, goalkeepers, fieldPlayers, checkGoal, onBallTouch]);

  return { updateBallPosition };
};
