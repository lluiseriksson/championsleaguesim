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
  
  // Track the last position the ball was kicked from to prevent "stuck" situations
  const lastKickPositionRef = React.useRef<Position | null>(null);

  const updateBallPosition = React.useCallback(() => {
    setBall(currentBall => {
      // Check if the ball is currently stopped
      const currentSpeed = Math.sqrt(
        currentBall.velocity.x * currentBall.velocity.x + 
        currentBall.velocity.y * currentBall.velocity.y
      );
      
      // If ball is already completely stopped, check if it's near a goalkeeper
      if (currentSpeed === 0) {
        // Get current time for cooldown calculations
        const currentTime = performance.now();
        
        // Check if the ball is too close to any goalkeeper and needs to be "unstuck"
        for (const goalkeeper of goalkeepers) {
          const dx = currentBall.position.x - goalkeeper.position.x;
          const dy = currentBall.position.y - goalkeeper.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // If the ball is very close to a goalkeeper (within 1.5x collision radius),
          // give it a small kick away from the goalkeeper
          if (distance < (PLAYER_RADIUS + BALL_RADIUS) * 1.5) {
            // Only do this if the collision cooldown has passed
            if (currentTime - lastCollisionTimeRef.current > 1000) {
              console.log("Ball stuck near goalkeeper, giving it a kick");
              lastCollisionTimeRef.current = currentTime;
              
              // Direction away from goalkeeper
              const normalizedDx = dx !== 0 ? dx / Math.abs(dx) : 0;
              const normalizedDy = dy !== 0 ? dy / Math.abs(dy) : 0;
              
              // Return a new ball state with a velocity away from the goalkeeper
              return {
                position: currentBall.position,
                velocity: {
                  x: normalizedDx * 4,
                  y: normalizedDy * 2 + (Math.random() - 0.5)
                }
              };
            }
          }
        }
        
        // If no unstick was needed, just return current ball state
        isStoppedRef.current = true;
        return currentBall;
      }
      
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
            lastKickPositionRef.current = { ...newPosition };
            
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
              lastKickPositionRef.current = { ...newPosition };
              
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
                
                newVelocity.x += normalizedDx * 1.2;
                newVelocity.y += normalizedDy * 1.2;
              }
              
              console.log(`Ball touched by ${player.team} ${player.role}`);
              break; // Only handle one collision per frame
            }
          }
        }
      }

      // Apply natural deceleration
      newVelocity.x *= 0.995;
      newVelocity.y *= 0.995;
      
      // If the ball is moving very slowly, stop it completely
      const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
      if (newSpeed < 0.3) {
        return {
          position: newPosition,
          velocity: { x: 0, y: 0 } // Completely stop the ball
        };
      }

      return {
        position: newPosition,
        velocity: newVelocity
      };
    });
  }, [setBall, players, checkGoal, goalkeepers, fieldPlayers, onBallTouch]);

  return { updateBallPosition };
};
