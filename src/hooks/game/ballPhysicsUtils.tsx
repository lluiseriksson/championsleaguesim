import React from 'react';
import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../types/football';
import { checkCollision, calculateNewVelocity } from '../../utils/gamePhysics';

// Handle collisions and physics for the ball
export function handleBallPhysics(
  currentBall: Ball,
  newPosition: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
): Ball {
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

  // ENHANCED: Prioritize goalkeeper collisions with higher priority window
  // Use a shorter cooldown for goalkeeper collisions to improve their reactions
  const goalkeeperCollisionCooldown = 100; // shorter cooldown for goalkeepers

  // Check goalkeeper collisions first with higher priority
  if (currentTime - lastCollisionTimeRef.current > goalkeeperCollisionCooldown) {
    for (const goalkeeper of goalkeepers) {
      const collision = checkCollision(newPosition, goalkeeper.position);
      
      if (collision) {
        // Record which player touched the ball
        onBallTouch(goalkeeper);
        lastCollisionTimeRef.current = currentTime;
        lastKickPositionRef.current = { ...newPosition };
        
        // Calculate new velocity based on collision
        newVelocity = calculateNewVelocity(
          newPosition,
          goalkeeper.position,
          currentVelocity,
          true // is goalkeeper
        );
        
        console.log("Goalkeeper collision detected");
        break; // Only handle one collision per frame
      }
    }
  }

  // Then check field player collisions if no goalkeeper collision occurred
  if (currentTime - lastCollisionTimeRef.current > collisionCooldown) {
    newVelocity = handleFieldPlayerCollisions(
      newPosition,
      newVelocity,
      currentBall.velocity,
      fieldPlayers,
      onBallTouch,
      currentTime,
      lastCollisionTimeRef,
      lastKickPositionRef
    );
  }

  // Apply very mild deceleration - we want ball to keep moving
  newVelocity.x *= 0.998; // Reduced from 0.995
  newVelocity.y *= 0.998; // Reduced from 0.995
  
  // Never let the ball stop completely
  const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
  if (newSpeed < 3.5) {
    // Maintain direction but increase speed to minimum
    const factor = 3.5 / Math.max(0.01, newSpeed); // Prevent division by zero
    newVelocity.x *= factor;
    newVelocity.y *= factor;
  }

  return {
    position: newPosition,
    velocity: newVelocity
  };
}

// Handle collisions between the ball and field players
function handleFieldPlayerCollisions(
  newPosition: Position,
  newVelocity: Position,
  currentVelocity: Position,
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  currentTime: number,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
): Position {
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
        currentVelocity,
        false
      );
      
      // Add some force to ensure it moves away from player
      const dx = newPosition.x - player.position.x;
      const dy = newPosition.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // ENHANCED: Check if this might be an own goal situation
        const ownGoalRisk = (player.team === 'red' && normalizedDx < 0) || 
                           (player.team === 'blue' && normalizedDx > 0);
                           
        if (ownGoalRisk) {
          // If high risk of own goal, deflect ball more sideways to avoid shooting toward own goal
          const sidewaysDeflection = normalizedDy * 2.5;
          newVelocity.x += normalizedDx * 0.5; // Reduced forward component
          newVelocity.y += sidewaysDeflection; // Increased sideways component
          console.log(`Potential own goal situation detected - deflecting ball sideways`);
        } else {
          // Normal deflection physics
          newVelocity.x += normalizedDx * 1.5; 
          newVelocity.y += normalizedDy * 1.5;
        }
      }
      
      console.log(`Ball touched by ${player.team} ${player.role}`);
      break; // Only handle one collision per frame
    }
  }
  
  return newVelocity;
}
