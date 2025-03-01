
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

  // Track last collision time to prevent multiple collisions in a short time
  const lastCollisionTimeRef = React.useRef(0);
  
  // Track if the ball is currently stopped
  const isStoppedRef = React.useRef(false);

  const updateBallPosition = React.useCallback(() => {
    setBall(currentBall => {
      // Check if the ball is currently stopped
      const currentSpeed = Math.sqrt(
        currentBall.velocity.x * currentBall.velocity.x + 
        currentBall.velocity.y * currentBall.velocity.y
      );
      
      // If ball speed is extremely low, consider it stopped
      isStoppedRef.current = currentSpeed < 0.1;
      
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
            x: goalScored === 'red' ? 4 : -4, 
            y: (Math.random() - 0.5) * 5
          }
        };
      }

      // Check for boundary collisions (top and bottom)
      let newVelocity = { ...currentBall.velocity };
      if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
        newVelocity.y = -newVelocity.y * 0.9; // Add damping
        
        // Ensure the ball doesn't get stuck on the boundary
        if (Math.abs(newVelocity.y) < 1.5) {
          newVelocity.y = newVelocity.y > 0 ? 1.5 : -1.5;
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
          if (Math.abs(newVelocity.x) < 1.5) {
            newVelocity.x = newVelocity.x > 0 ? 1.5 : -1.5;
          }
        }
      }

      // Ensure ball stays within the pitch boundaries
      newPosition.x = Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newPosition.x));
      newPosition.y = Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newPosition.y));

      // Get current time to prevent multiple collisions
      const currentTime = performance.now();
      const collisionCooldown = 150; // ms

      // Check collisions with players if cooldown has passed
      if (currentTime - lastCollisionTimeRef.current > collisionCooldown) {
        // First check collisions with goalkeepers (they should have priority)
        for (const player of goalkeepers) {
          const collision = checkCollision(newPosition, player.position);
          
          if (collision) {
            // Record which player touched the ball
            onBallTouch(player);
            lastCollisionTimeRef.current = currentTime;
            
            // Calculate new velocity based on collision
            newVelocity = calculateNewVelocity(
              newPosition,
              player.position,
              currentBall.velocity,
              true // is goalkeeper
            );
            
            console.log("Goalkeeper collision detected");
            break; // Only handle one collision per frame
          }
        }
        
        // Then check field players if no goalkeeper collision
        if (currentTime - lastCollisionTimeRef.current > collisionCooldown) {
          for (const player of fieldPlayers) {
            const collision = checkCollision(newPosition, player.position);
            
            if (collision) {
              // Record which player touched the ball
              onBallTouch(player);
              lastCollisionTimeRef.current = currentTime;
              
              // Calculate new velocity based on collision
              newVelocity = calculateNewVelocity(
                newPosition,
                player.position,
                currentBall.velocity,
                false
              );
              
              // Add some force to ensure it moves away from player
              const dx = newPosition.x - player.position.x;
              const dy = newPosition.y - player.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 0) {
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;
                
                newVelocity.x += normalizedDx * 1.0;
                newVelocity.y += normalizedDy * 1.0;
              }
              
              console.log(`Ball touched by ${player.team} ${player.role}`);
              break; // Only handle one collision per frame
            }
          }
        }
      }

      // Apply natural deceleration, but not to the point of stopping completely
      newVelocity.x *= 0.995;
      newVelocity.y *= 0.995;
      
      // If the ball is moving very slowly, gradually bring it to a complete stop
      // instead of applying random movement
      const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
      if (newSpeed < 0.3) {
        newVelocity.x = 0;
        newVelocity.y = 0;
        isStoppedRef.current = true;
      }

      return {
        position: newPosition,
        velocity: newVelocity
      };
    });
  }, [setBall, players, checkGoal, goalkeepers, fieldPlayers, onBallTouch]);

  return { updateBallPosition };
};
