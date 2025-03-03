
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

// Handle boundary collisions with improved physics
export function handleBoundaryBounce(
  newPosition: Position, 
  newVelocity: Position,
  bounceDetectionRef: BounceDetection
): BoundaryResult {
  const currentTime = performance.now();
  const bounceCooldown = 500; // reduced from 1000ms for more responsive bounce detection
  
  // Check for boundary collisions (top and bottom)
  if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
    // More realistic bounce with some energy loss
    newVelocity.y = -newVelocity.y * 0.85; // 85% energy conservation (reduced from 95%)
    
    // Push ball away from boundary to prevent sticking
    if (newPosition.y <= BALL_RADIUS) {
      newPosition.y = BALL_RADIUS + 2; // Push away from top boundary
    } else {
      newPosition.y = PITCH_HEIGHT - BALL_RADIUS - 2; // Push away from bottom boundary
    }
    
    // Ensure the ball bounces with sufficient speed but not excessive
    if (Math.abs(newVelocity.y) < 2.0) {
      newVelocity.y = newVelocity.y > 0 ? 2.0 : -2.0;
    }
    
    // Track consecutive top/bottom bounces
    const currentSide = newPosition.y <= BALL_RADIUS ? 'top' : 'bottom';
    
    if (bounceDetectionRef.lastBounceSide === currentSide && 
        currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
      bounceDetectionRef.consecutiveBounces++;
      
      // If ball is bouncing repeatedly on same side, add stronger effect
      if (bounceDetectionRef.consecutiveBounces >= 2) {
        console.log(`Ball stuck on ${currentSide} border, adding stronger deflection`);
        
        // Push ball more aggressively toward center of field
        const centerY = PITCH_HEIGHT / 2;
        const pushDirection = currentSide === 'top' ? 1 : -1;
        
        // More consistent redirection toward center
        newVelocity.y = Math.abs(newVelocity.y) * pushDirection * 1.2;
        
        // Add some random horizontal movement to escape corner traps
        newVelocity.x += (Math.random() * 2 - 1) * 1.5;
        
        bounceDetectionRef.sideEffect = true;
        
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
      // More realistic bounce with some energy loss
      newVelocity.x = -newVelocity.x * 0.85; // 85% energy conservation
      
      // Push ball away from boundary to prevent sticking
      if (newPosition.x <= BALL_RADIUS) {
        newPosition.x = BALL_RADIUS + 2; // Push away from left boundary
      } else {
        newPosition.x = PITCH_WIDTH - BALL_RADIUS - 2; // Push away from right boundary
      }
      
      // Ensure the ball bounces with sufficient speed but not excessive
      if (Math.abs(newVelocity.x) < 2.0) {
        newVelocity.x = newVelocity.x > 0 ? 2.0 : -2.0;
      }
      
      // Track consecutive left/right bounces
      const currentSide = newPosition.x <= BALL_RADIUS ? 'left' : 'right';
      
      if (bounceDetectionRef.lastBounceSide === currentSide && 
          currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
        bounceDetectionRef.consecutiveBounces++;
        
        // If ball is bouncing repeatedly on same side, add stronger effect
        if (bounceDetectionRef.consecutiveBounces >= 2) {
          console.log(`Ball stuck on ${currentSide} border, adding stronger deflection`);
          
          // Push ball more aggressively toward center of field
          const centerX = PITCH_WIDTH / 2;
          const pushDirection = currentSide === 'left' ? 1 : -1;
          
          // More consistent redirection toward center
          newVelocity.x = Math.abs(newVelocity.x) * pushDirection * 1.2;
          
          // Add some random vertical movement to escape corner traps
          newVelocity.y += (Math.random() * 2 - 1) * 1.5;
          
          bounceDetectionRef.sideEffect = true;
          
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

  // Ensure ball stays within the pitch boundaries with a small buffer
  newPosition.x = Math.max(BALL_RADIUS + 0.5, Math.min(PITCH_WIDTH - BALL_RADIUS - 0.5, newPosition.x));
  newPosition.y = Math.max(BALL_RADIUS + 0.5, Math.min(PITCH_HEIGHT - BALL_RADIUS - 0.5, newPosition.y));

  return { position: newPosition, velocity: newVelocity };
}
