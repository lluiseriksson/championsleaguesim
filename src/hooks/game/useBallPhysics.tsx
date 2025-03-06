
import React from 'react';
import { Player, Ball, Position, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT, PLAYER_RADIUS } from '../../types/football';
import { handleFieldPlayerCollisions } from './collisionHandlers';
import { checkCollision, calculateNewVelocity } from '../../utils/gamePhysics';
import { handleTopBottomBoundaries, handleLeftRightBoundaries } from './boundaryCollisions';
import { applyVelocityAdjustments, constrainBallPosition } from './velocityUtils';

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
  
  // Handle boundary collisions using the dedicated functions
  newVelocity = handleTopBottomBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);
  newVelocity = handleLeftRightBoundaries(newPosition, newVelocity, bounceDetectionRef, currentTime, bounceCooldown);

  // Ensure ball stays within the pitch boundaries
  newPosition = constrainBallPosition(newPosition, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT);

  // Handle player collisions
  newVelocity = handlePlayerCollisions(
    newPosition,
    newVelocity,
    currentBall.velocity,
    goalkeepers,
    fieldPlayers,
    onBallTouch,
    currentTime,
    lastCollisionTimeRef,
    lastKickPositionRef
  );

  // Apply velocity adjustments
  newVelocity = applyVelocityAdjustments(newVelocity);

  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}

// Handle player (goalkeeper and field players) collisions
function handlePlayerCollisions(
  newPosition: Position,
  newVelocity: Position,
  currentVelocity: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  currentTime: number,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
): Position {
  // Get current time to prevent multiple collisions
  const collisionCooldown = 150; // ms
  const goalkeeperCollisionCooldown = 100; // shorter cooldown for goalkeepers

  // Enhanced goalkeeper collision detection with predictive positioning
  if (currentTime - lastCollisionTimeRef.current > goalkeeperCollisionCooldown) {
    for (const goalkeeper of goalkeepers) {
      // Standard collision detection first
      let collision = checkCollision(newPosition, goalkeeper.position, true); // Use goalkeepr flag
      
      // If no direct collision, check for angled shots using a more aggressive approach
      if (!collision) {
        // Calculate ball trajectory angle
        const ballAngle = Math.atan2(currentVelocity.y, currentVelocity.x);
        
        // Get goalkeeper side (left or right)
        const isLeftGoalkeeper = goalkeeper.position.x < PITCH_WIDTH / 2;
        
        // Check if ball is approaching the goal at ANY angle (more permissive)
        const isAngledShot = Math.abs(ballAngle) > Math.PI/8; // Consider almost any non-straight shot
        
        // Is ball moving toward the goal?
        const ballMovingTowardsGoal = 
          (isLeftGoalkeeper && currentVelocity.x < -0.5) || 
          (!isLeftGoalkeeper && currentVelocity.x > 0.5);
        
        // Calculate distance with much larger collision radius for angled shots
        const dx = newPosition.x - goalkeeper.position.x;
        const dy = newPosition.y - goalkeeper.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // More aggressive collision detection for angled shots
        // Use a variable extension factor based on shot angle
        const angleExtensionFactor = 1.0 + Math.min(Math.abs(ballAngle) / Math.PI, 1.0);
        const extendedRadius = ballMovingTowardsGoal ? 
          (1.8 * angleExtensionFactor) : // Up to 2.8x larger for extreme angles 
          1.6; // Basic extension for other cases
        
        // Check with significantly enlarged radius for angled shots
        collision = distance <= (BALL_RADIUS + goalkeeper.radius * extendedRadius);
          
        if (collision) {
          console.log(`Enhanced goalkeeper collision detected for angled shot (${Math.round(ballAngle * 180/Math.PI)}°)`);
        }
      }
      
      if (collision) {
        // Record which player touched the ball
        onBallTouch(goalkeeper);
        lastCollisionTimeRef.current = currentTime;
        lastKickPositionRef.current = { ...newPosition };
        
        // Calculate new velocity based on collision with improved deflection
        const isAngledShot = Math.abs(Math.atan2(currentVelocity.y, currentVelocity.x)) > Math.PI/6;
        
        // Provide extra clearance power for angled shots
        newVelocity = calculateNewVelocity(
          newPosition,
          goalkeeper.position,
          currentVelocity,
          true, // is goalkeeper
          isAngledShot // Pass angle information for better response
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
      currentVelocity,
      fieldPlayers,
      onBallTouch,
      currentTime,
      lastCollisionTimeRef,
      lastKickPositionRef
    );
  }

  return newVelocity;
}

// Re-export constants for convenience
export { PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS, GOAL_HEIGHT } from '../../types/football';
