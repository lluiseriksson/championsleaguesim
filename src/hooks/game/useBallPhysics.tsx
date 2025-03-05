import React from 'react';
import { Player, Ball, Position, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../../types/football';
import { handleFieldPlayerCollisions } from './collisionHandlers';
import { checkCollision, calculateNewVelocity, addRandomEffect } from '../../utils/gamePhysics';

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
  
  newVelocity = handleTopBottomBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);
  newVelocity = handleLeftRightBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);

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

  // Apply velocity adjustments
  newVelocity = applyVelocityAdjustments(newVelocity);

  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}

// Apply subtle deceleration and minimum velocity
function applyVelocityAdjustments(velocity: Position): Position {
  // Apply very mild deceleration - we want ball to keep moving
  let adjustedVelocity = {
    x: velocity.x * 0.998, // Reduced from 0.995
    y: velocity.y * 0.998  // Reduced from 0.995
  };
  
  // Never let the ball stop completely
  const newSpeed = Math.sqrt(adjustedVelocity.x * adjustedVelocity.x + adjustedVelocity.y * adjustedVelocity.y);
  if (newSpeed < 3.5) {
    // Maintain direction but increase speed to minimum
    const factor = 3.5 / Math.max(0.01, newSpeed); // Prevent division by zero
    adjustedVelocity.x *= factor;
    adjustedVelocity.y *= factor;
  }
  
  return adjustedVelocity;
}

// Handle top and bottom boundary collisions
function handleTopBottomBoundaries(
  newPosition: Position, 
  velocity: Position, 
  bounceDetection: Ball['bounceDetection'], 
  currentTime: number,
  bounceCooldown: number
): Position {
  if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
    velocity.y = -velocity.y * 0.9; // Add damping
    
    // Ensure the ball bounces with sufficient speed
    if (Math.abs(velocity.y) < 3.5) {
      velocity.y = velocity.y > 0 ? 3.5 : -3.5;
    }
    
    // Track consecutive top/bottom bounces
    const currentSide = newPosition.y <= BALL_RADIUS ? 'top' : 'bottom';
    
    if (bounceDetection.lastBounceSide === currentSide && 
        currentTime - bounceDetection.lastBounceTime < bounceCooldown) {
      bounceDetection.consecutiveBounces++;
      
      // If ball is bouncing repeatedly on same side, add random effect
      if (bounceDetection.consecutiveBounces >= 2) {
        console.log(`Ball stuck on ${currentSide} border, adding random effect`);
        velocity = addRandomEffect(velocity);
        bounceDetection.sideEffect = true;
        
        // Push ball more toward center of field
        const centerY = PITCH_HEIGHT / 2;
        const pushDirection = currentSide === 'top' ? 1 : -1;
        velocity.y += pushDirection * 2;
        
        // Reset counter after applying effect
        bounceDetection.consecutiveBounces = 0;
      }
    } else {
      bounceDetection.consecutiveBounces = 1;
    }
    
    bounceDetection.lastBounceSide = currentSide;
    bounceDetection.lastBounceTime = currentTime;
  }
  
  return velocity;
}

// Handle left and right boundary collisions
function handleLeftRightBoundaries(
  newPosition: Position, 
  velocity: Position, 
  bounceDetection: Ball['bounceDetection'], 
  currentTime: number,
  bounceCooldown: number
): Position {
  // Handle left/right boundaries (with goal areas)
  if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
    // Only reverse if not in goal area
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;
    
    if (newPosition.y < goalTop || newPosition.y > goalBottom) {
      velocity.x = -velocity.x * 0.9; // Add damping
      
      // Ensure the ball bounces with sufficient speed
      if (Math.abs(velocity.x) < 3.5) {
        velocity.x = velocity.x > 0 ? 3.5 : -3.5;
      }
      
      // Track consecutive left/right bounces
      const currentSide = newPosition.x <= BALL_RADIUS ? 'left' : 'right';
      
      if (bounceDetection.lastBounceSide === currentSide && 
          currentTime - bounceDetection.lastBounceTime < bounceCooldown) {
        bounceDetection.consecutiveBounces++;
        
        // If ball is bouncing repeatedly on same side, add random effect
        if (bounceDetection.consecutiveBounces >= 2) {
          console.log(`Ball stuck on ${currentSide} border, adding random effect`);
          velocity = addRandomEffect(velocity);
          bounceDetection.sideEffect = true;
          
          // Push ball more toward center of field
          const centerX = PITCH_WIDTH / 2;
          const pushDirection = currentSide === 'left' ? 1 : -1;
          velocity.x += pushDirection * 2;
          
          // Reset counter after applying effect
          bounceDetection.consecutiveBounces = 0;
        }
      } else {
        bounceDetection.consecutiveBounces = 1;
      }
      
      bounceDetection.lastBounceSide = currentSide;
      bounceDetection.lastBounceTime = currentTime;
    }
  }
  
  return velocity;
}

// Re-export constants for convenience
export { PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../types/football';
