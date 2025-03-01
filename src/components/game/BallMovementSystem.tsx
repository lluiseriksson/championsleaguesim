
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

// Return a hook with ball movement functions instead of a React component
export const useBallMovementSystem = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch 
}: BallMovementSystemProps) => {
  // Memoize player categorization
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  const updateBallPosition = React.useCallback(() => {
    setBall(currentBall => {
      // Calculate new position based on current velocity
      const newPosition = {
        x: currentBall.position.x + currentBall.velocity.x,
        y: currentBall.position.y + currentBall.velocity.y
      };

      // First check if a goal was scored
      const goalScored = checkGoal(newPosition);
      if (goalScored) {
        console.log(`Goal detected for team ${goalScored}`);
        // Reset ball position to center with a significant initial velocity
        return {
          position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
          velocity: { 
            x: goalScored === 'red' ? 3 : -3, 
            y: (Math.random() - 0.5) * 4
          }
        };
      }

      // Check for boundary collisions (top and bottom)
      let newVelocity = { ...currentBall.velocity };
      if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
        newVelocity.y = -newVelocity.y * 0.9; // Add damping
        
        // Ensure the ball doesn't get stuck on the boundary
        if (Math.abs(newVelocity.y) < 0.5) {
          newVelocity.y = newVelocity.y > 0 ? 0.5 : -0.5;
        }
      }

      // Check for boundary collisions (left and right)
      if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
        // Only reverse if not in goal area
        const goalY = PITCH_HEIGHT / 2;
        const goalTop = goalY - GOAL_HEIGHT / 2;
        const goalBottom = goalY + GOAL_HEIGHT / 2;
        
        if (newPosition.y < goalTop || newPosition.y > goalBottom) {
          newVelocity.x = -newVelocity.x * 0.9; // Add damping
          
          // Ensure the ball doesn't get stuck on the boundary
          if (Math.abs(newVelocity.x) < 0.5) {
            newVelocity.x = newVelocity.x > 0 ? 0.5 : -0.5;
          }
        }
      }

      // Ensure ball stays within the pitch boundaries
      newPosition.x = Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newPosition.x));
      newPosition.y = Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newPosition.y));

      // Check collisions with players
      for (const player of [...goalkeepers, ...fieldPlayers]) {
        const collision = checkCollision(
          newPosition, 
          player.position
        );
        
        if (collision) {
          // Record which player touched the ball
          onBallTouch(player);
          
          // Calculate new velocity based on collision
          newVelocity = calculateNewVelocity(
            newPosition,
            player.position,
            currentBall.velocity,
            player.role === 'goalkeeper'
          );
          
          // Add some randomness to make gameplay more dynamic
          newVelocity.x += (Math.random() - 0.5) * 0.3;
          newVelocity.y += (Math.random() - 0.5) * 0.3;
          
          break; // Only handle one collision per frame
        }
      }

      // Apply natural deceleration, but not to the point of stopping
      newVelocity.x *= 0.995;
      newVelocity.y *= 0.995;
      
      // If the ball has almost stopped, give it a small push in a random direction
      const currentSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
      if (currentSpeed < 0.2) {
        const randomAngle = Math.random() * Math.PI * 2;
        newVelocity.x = 0.5 * Math.cos(randomAngle);
        newVelocity.y = 0.5 * Math.sin(randomAngle);
        console.log("Ball was nearly stopped - applied small random impulse");
      }

      return {
        position: newPosition,
        velocity: newVelocity
      };
    });
  }, [setBall, players, checkGoal, goalkeepers, fieldPlayers, onBallTouch]);

  return { updateBallPosition };
};
