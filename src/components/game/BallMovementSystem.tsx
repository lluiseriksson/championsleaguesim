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
  
  // Track the last position the ball was kicked from to prevent "stuck" situations
  const lastKickPositionRef = React.useRef<Position | null>(null);
  
  // Track time without movement to add a random kick if needed
  const noMovementTimeRef = React.useRef(0);
  const lastPositionRef = React.useRef<Position | null>(null);

  const updateBallPosition = React.useCallback(() => {
    setBall(currentBall => {
      // Check current ball speed
      const currentSpeed = Math.sqrt(
        currentBall.velocity.x * currentBall.velocity.x + 
        currentBall.velocity.y * currentBall.velocity.y
      );
      
      // Detect if ball is stuck in same position
      if (lastPositionRef.current) {
        const dx = currentBall.position.x - lastPositionRef.current.x;
        const dy = currentBall.position.y - lastPositionRef.current.y;
        const positionDelta = Math.sqrt(dx * dx + dy * dy);
        
        if (positionDelta < 0.1) {
          noMovementTimeRef.current += 1;
          
          // If ball hasn't moved for a while, give it a random kick
          if (noMovementTimeRef.current > 20) {
            console.log("Ball stuck in place, giving it a random kick");
            noMovementTimeRef.current = 0;
            
            // Random direction but not completely random
            return {
              position: currentBall.position,
              velocity: {
                x: (Math.random() * 6) - 3,
                y: (Math.random() * 6) - 3
              }
            };
          }
        } else {
          // Reset counter if the ball is moving
          noMovementTimeRef.current = 0;
        }
      }
      
      // Update last position reference
      lastPositionRef.current = { ...currentBall.position };
      
      // If ball has zero velocity (should only happen at game start/reset),
      // give it a small push in a random direction
      if (currentSpeed === 0) {
        console.log("Ball has zero velocity, giving it an initial push");
        return {
          position: currentBall.position,
          velocity: {
            x: (Math.random() * 6) - 3,
            y: (Math.random() * 6) - 3
          }
        };
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
            x: goalScored === 'red' ? 5 : -5, 
            y: (Math.random() - 0.5) * 5
          }
        };
      }

      // Check for boundary collisions (top and bottom)
      let newVelocity = { ...currentBall.velocity };
      if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
        newVelocity.y = -newVelocity.y * 0.9; // Add damping
        
        // Ensure the ball bounces with sufficient speed
        if (Math.abs(newVelocity.y) < 3.5) {
          newVelocity.y = newVelocity.y > 0 ? 3.5 : -3.5;
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
          
          // Ensure the ball bounces with sufficient speed
          if (Math.abs(newVelocity.x) < 3.5) {
            newVelocity.x = newVelocity.x > 0 ? 3.5 : -3.5;
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
                
                newVelocity.x += normalizedDx * 1.5; // Increased from 1.2
                newVelocity.y += normalizedDy * 1.5; // Increased from 1.2
              }
              
              console.log(`Ball touched by ${player.team} ${player.role}`);
              break; // Only handle one collision per frame
            }
          }
        }
      }

      // Apply very mild deceleration - we want ball to keep moving
      newVelocity.x *= 0.998; // Reduced from 0.995
      newVelocity.y *= 0.998; // Reduced from 0.995
      
      // Never let the ball stop completely
      const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
      if (newSpeed < 3.5) {
        // Maintain direction but increase speed to minimum
        const factor = 3.5 / newSpeed;
        newVelocity.x *= factor;
        newVelocity.y *= factor;
      }

      return {
        position: newPosition,
        velocity: newVelocity
      };
    });
  }, [setBall, players, checkGoal, goalkeepers, fieldPlayers, onBallTouch]);

  return { updateBallPosition };
};
