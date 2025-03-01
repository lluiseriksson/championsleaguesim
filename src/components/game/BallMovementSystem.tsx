
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
        // Reset ball position to center
        return {
          position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
          velocity: { 
            x: goalScored === 'red' ? 2 : -2, 
            y: (Math.random() - 0.5) * 3
          }
        };
      }

      // Check for boundary collisions (top and bottom)
      let newVelocity = { ...currentBall.velocity };
      if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
        newVelocity.y = -newVelocity.y * 0.9; // Add damping
      }

      // Check for boundary collisions (left and right)
      if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
        // Only reverse if not in goal area
        const goalY = PITCH_HEIGHT / 2;
        const goalTop = goalY - GOAL_HEIGHT / 2;
        const goalBottom = goalY + GOAL_HEIGHT / 2;
        
        if (newPosition.y < goalTop || newPosition.y > goalBottom) {
          newVelocity.x = -newVelocity.x * 0.9; // Add damping
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
          
          // Apply friction to slow ball down over time
          newVelocity.x *= 0.99;
          newVelocity.y *= 0.99;
          
          break; // Only handle one collision per frame
        }
      }

      // Apply natural deceleration
      newVelocity.x *= 0.995;
      newVelocity.y *= 0.995;
      
      // Minimum velocity threshold to prevent the ball from moving indefinitely
      const minVelocity = 0.01;
      if (Math.abs(newVelocity.x) < minVelocity && Math.abs(newVelocity.y) < minVelocity) {
        newVelocity = { x: 0, y: 0 };
      }

      return {
        position: newPosition,
        velocity: newVelocity
      };
    });
  }, [setBall, players, checkGoal, goalkeepers, fieldPlayers, onBallTouch]);

  return { updateBallPosition };
};
