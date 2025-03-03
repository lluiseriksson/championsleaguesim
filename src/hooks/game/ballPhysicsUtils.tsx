import React from 'react';
import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../types/football';
import { 
  checkCollision, 
  calculateNewVelocity, 
  addRandomEffect 
} from '../../utils/gamePhysics';

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
  
  // Track consecutive bounces on same side
  const bounceDetectionRef = currentBall.bounceDetection || {
    consecutiveBounces: 0,
    lastBounceTime: 0,
    lastBounceSide: '',
    sideEffect: false
  };
  
  const currentTime = performance.now();
  const bounceCooldown = 1000; // 1 second between bounce counts
  
  // Check for boundary collisions (top and bottom)
  if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
    newVelocity.y = -newVelocity.y * 0.9; // Add damping
    
    // Ensure the ball bounces with sufficient speed
    if (Math.abs(newVelocity.y) < 3.5) {
      newVelocity.y = newVelocity.y > 0 ? 3.5 : -3.5;
    }
    
    // Track consecutive top/bottom bounces
    const currentSide = newPosition.y <= BALL_RADIUS ? 'top' : 'bottom';
    
    if (bounceDetectionRef.lastBounceSide === currentSide && 
        currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
      bounceDetectionRef.consecutiveBounces++;
      
      // If ball is bouncing repeatedly on same side, add random effect
      if (bounceDetectionRef.consecutiveBounces >= 2) {
        console.log(`Ball stuck on ${currentSide} border, adding random effect`);
        newVelocity = addRandomEffect(newVelocity);
        bounceDetectionRef.sideEffect = true;
        
        // Push ball more toward center of field
        const centerY = PITCH_HEIGHT / 2;
        const pushDirection = currentSide === 'top' ? 1 : -1;
        newVelocity.y += pushDirection * 2;
        
        // Reset counter after applying effect
        bounceDetectionRef.consecutiveBounces = 0;
      }
    } else {
      bounceDetectionRef.consecutiveBounces = 1;
    }
    
    bounceDetectionRef.lastBounceSide = currentSide;
    bounceDetectionRef.lastBounceTime = currentTime;
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
      
      // Track consecutive left/right bounces
      const currentSide = newPosition.x <= BALL_RADIUS ? 'left' : 'right';
      
      if (bounceDetectionRef.lastBounceSide === currentSide && 
          currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
        bounceDetectionRef.consecutiveBounces++;
        
        // If ball is bouncing repeatedly on same side, add random effect
        if (bounceDetectionRef.consecutiveBounces >= 2) {
          console.log(`Ball stuck on ${currentSide} border, adding random effect`);
          newVelocity = addRandomEffect(newVelocity);
          bounceDetectionRef.sideEffect = true;
          
          // Push ball more toward center of field
          const centerX = PITCH_WIDTH / 2;
          const pushDirection = currentSide === 'left' ? 1 : -1;
          newVelocity.x += pushDirection * 2;
          
          // Reset counter after applying effect
          bounceDetectionRef.consecutiveBounces = 0;
        }
      } else {
        bounceDetectionRef.consecutiveBounces = 1;
      }
      
      bounceDetectionRef.lastBounceSide = currentSide;
      bounceDetectionRef.lastBounceTime = currentTime;
    }
  }

  // Ensure ball stays within the pitch boundaries
  newPosition.x = Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newPosition.x));
  newPosition.y = Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newPosition.y));

  // Get current time to prevent multiple collisions
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
          currentBall.velocity,
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
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
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
          // IMPROVED: More aggressive prevention of own goals
          // If high risk of own goal, deflect ball more strongly to avoid shooting toward own goal
          if (player.team === 'red') {
            newVelocity.x = Math.abs(newVelocity.x) * 1.2; // Always positive X (rightward) for red team
          } else {
            newVelocity.x = -Math.abs(newVelocity.x) * 1.2; // Always negative X (leftward) for blue team
          }
          
          // Add stronger sideways deflection
          const sidewaysDeflection = normalizedDy * 3.0;
          newVelocity.y = sidewaysDeflection;
          console.log(`Strong own goal prevention for ${player.team} player - forcing ball away from own goal`);
        } else {
          // Normal deflection physics with slight directional bias towards opponent goal
          const directionBias = player.team === 'red' ? 0.2 : -0.2; // Positive for red, negative for blue
          const adjustedDx = normalizedDx + directionBias;
          
          newVelocity.x += adjustedDx * 1.5; 
          newVelocity.y += normalizedDy * 1.5;
        }
      }
      
      console.log(`Ball touched by ${player.team} ${player.role}`);
      break; // Only handle one collision per frame
    }
  }
  
  return newVelocity;
}
