
import React from 'react';
import { Position, PITCH_HEIGHT, PITCH_WIDTH } from '../../../types/football';
import { addRandomEffect } from '../../../utils/gamePhysics';

interface BounceDetection {
  consecutiveBounces: number;
  lastBounceTime: number;
  lastBounceSide: string;
  sideEffect: boolean;
}

export function handleBoundaryBounce(
  newPosition: Position,
  newVelocity: Position,
  bounceDetectionRef: BounceDetection
): { position: Position, velocity: Position, bounceDetection: BounceDetection } {
  const currentTime = performance.now();
  const bounceCooldown = 1000; // 1 second between bounce counts
  
  // Handle top and bottom boundary collisions
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

  // Handle left and right boundary collisions - IMPROVED
  if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
    // Only reverse if not in goal area
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;
    
    if (newPosition.y < goalTop || newPosition.y > goalBottom) {
      // Stronger bounce coefficient for sides (increased from 0.9 to 0.95)
      newVelocity.x = -newVelocity.x * 0.95;
      
      // Ensure the ball bounces with sufficient speed
      if (Math.abs(newVelocity.x) < 4.0) { // Increased from 3.5 to 4.0
        newVelocity.x = newVelocity.x > 0 ? 4.0 : -4.0;
      }
      
      // Track consecutive left/right bounces
      const currentSide = newPosition.x <= BALL_RADIUS ? 'left' : 'right';
      
      if (bounceDetectionRef.lastBounceSide === currentSide && 
          currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
        bounceDetectionRef.consecutiveBounces++;
        
        // If ball is bouncing repeatedly on same side, add random effect
        // Lowered threshold from 2 to 1 for quicker intervention
        if (bounceDetectionRef.consecutiveBounces >= 1) {
          console.log(`Ball stuck on ${currentSide} border, adding random effect`);
          newVelocity = addRandomEffect(newVelocity);
          bounceDetectionRef.sideEffect = true;
          
          // Push ball more toward center of field (stronger effect)
          const centerX = PITCH_WIDTH / 2;
          const pushDirection = currentSide === 'left' ? 1 : -1;
          newVelocity.x += pushDirection * 3; // Increased from 2 to 3
          
          // Add slight vertical component to avoid straight horizontal bounces
          newVelocity.y += (Math.random() - 0.5) * 2;
          
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

  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}

// Missing constant, adding it here to avoid errors
const BALL_RADIUS = 6;
const GOAL_HEIGHT = 160;
