
import { Position, Ball, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../../types/football';
import { addRandomEffect } from '../../utils/gamePhysics';

// Handle top and bottom boundary collisions
export function handleTopBottomBoundaries(
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
export function handleLeftRightBoundaries(
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
