
import { Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../../types/football';

interface BounceDetection {
  consecutiveBounces: number;
  lastBounceTime: number;
  lastBounceSide: string;
  sideEffect: boolean;
}

interface BoundaryResult {
  position: Position;
  velocity: Position;
}

// Handle boundary collisions with billiard-style physics
export function handleBoundaryBounce(
  newPosition: Position, 
  newVelocity: Position,
  bounceDetectionRef: BounceDetection
): BoundaryResult {
  const currentTime = performance.now();
  const bounceCooldown = 1000; // 1 second between bounce counts
  
  // Check for boundary collisions (top and bottom)
  if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
    // Perfect billiard ball reflection (high elasticity)
    newVelocity.y = -newVelocity.y * 0.95; // 95% energy conservation
    
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
      // Perfect billiard ball reflection (high elasticity)
      newVelocity.x = -newVelocity.x * 0.95; // 95% energy conservation
      
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

  return { position: newPosition, velocity: newVelocity };
}

// Add a random effect to the ball's velocity to prevent it from getting stuck
function addRandomEffect(velocity: Position): Position {
  // Create a new velocity with random adjustments
  return {
    x: velocity.x + (Math.random() * 6 - 3),
    y: velocity.y + (Math.random() * 6 - 3)
  };
}
