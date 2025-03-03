
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

  // Handle left and right boundary collisions - BILLIARD STYLE PHYSICS
  if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
    // Only reverse if not in goal area
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;
    
    if (newPosition.y < goalTop || newPosition.y > goalBottom) {
      // Perfect billiard-style bounce - very elastic with minimal energy loss
      newVelocity.x = -newVelocity.x * 0.95; // Less damping for more elastic bounce
      
      // Ensure minimum speed after bounce like in billiards
      if (Math.abs(newVelocity.x) < 6) {
        newVelocity.x = newVelocity.x > 0 ? 6 : -6;
      }
      
      // Apply slight angle variation based on current y velocity
      // This creates more natural billiard-style bounces that preserve momentum
      if (Math.abs(newVelocity.y) > 0.5) {
        // Slightly enhance the y component to make bounces more angled
        newVelocity.y *= 1.05;
      } else {
        // Add a small random y component if almost flat to prevent perfectly horizontal bounces
        newVelocity.y += (Math.random() - 0.5) * 1.5;
      }
      
      // Track consecutive left/right bounces
      const currentSide = newPosition.x <= BALL_RADIUS ? 'left' : 'right';
      
      if (bounceDetectionRef.lastBounceSide === currentSide && 
          currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
        bounceDetectionRef.consecutiveBounces++;
        
        // Even with billiard physics, prevent getting stuck
        if (bounceDetectionRef.consecutiveBounces >= 2) {
          console.log(`Ball stuck on ${currentSide} border, applying billiard bounce effect`);
          bounceDetectionRef.sideEffect = true;
          
          // Add a more pronounced angle to the bounce
          const centerX = PITCH_WIDTH / 2;
          const pushDirection = currentSide === 'left' ? 1 : -1;
          
          // In billiards, a ball never bounces straight - add angle
          newVelocity.x = pushDirection * (Math.abs(newVelocity.x) * 1.1);
          
          // More significant y component for angled bounce
          const yVariation = (Math.random() - 0.5) * 7;
          newVelocity.y += yVariation;
          
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
