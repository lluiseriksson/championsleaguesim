import React from 'react';
import { Player, Ball, Position, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT, PLAYER_RADIUS } from '../../types/football';
import { handleFieldPlayerCollisions } from './collisionHandlers';
import { checkCollision, calculateNewVelocity } from '../../utils/gamePhysics';
import { handleTopBottomBoundaries, handleLeftRightBoundaries } from './boundaryCollisions';
import { applyVelocityAdjustments, constrainBallPosition } from './velocityUtils';
import { useGoalkeeperReachAdjustment } from '../../components/game/BallMovementSystem';

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

  // Standard goalkeeper collision detection
  if (currentTime - lastCollisionTimeRef.current > goalkeeperCollisionCooldown) {
    for (const goalkeeper of goalkeepers) {
      // Calculate if this is an angled shot
      const dx = newPosition.x - goalkeeper.position.x;
      const dy = newPosition.y - goalkeeper.position.y;
      const ballAngle = Math.atan2(dy, dx);
      const isAngledShot = Math.abs(ballAngle) > Math.PI/8;
      
      // Check collision with adjusted reach based on ELO difference and shot angle
      const eloReachAdjustment = useGoalkeeperReachAdjustment(goalkeeper, [...goalkeepers, ...fieldPlayers], isAngledShot);
      
      // Add the ELO-based reach adjustment to the goalkeeper for collision detection
      // This effectively gives the higher-rated goalkeeper more reach for straight shots
      // and reduces reach for lower-rated goalkeepers on angled shots
      const adjustedGoalkeeper = {
        ...goalkeeper,
        radius: goalkeeper.radius + eloReachAdjustment
      };
      
      const collision = checkCollision(newPosition, adjustedGoalkeeper.position, true, adjustedGoalkeeper.radius);
      
      if (collision) {
        onBallTouch(goalkeeper);
        lastCollisionTimeRef.current = currentTime;
        lastKickPositionRef.current = { ...newPosition };
        
        newVelocity = calculateNewVelocity(
          newPosition,
          goalkeeper.position,
          currentVelocity,
          true,
          isAngledShot // Pass the angled shot flag to calculateNewVelocity
        );
        
        console.log(`Goalkeeper collision detected: ${isAngledShot ? 'angled shot' : 'straight shot'}, ELO adjustment: ${eloReachAdjustment.toFixed(2)}`);
        break;
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
