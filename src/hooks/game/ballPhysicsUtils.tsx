
import { Ball, Player, Position } from '../../types/football';
import { calculateDistance } from '../../utils/positionHelpers';

// Constants for ball physics
const FRICTION = 0.98;
const BOUNCE_FACTOR = 0.8;
const GOAL_POST_BOUNCE = 0.7;
const PLAYER_TOUCH_RADIUS = 20;
const SHOOT_POWER = 15;
const PASS_POWER = 8;
const DRIBBLE_POWER = 3;
const MIN_KICK_INTERVAL = 300; // ms

export const handleBallPhysics = (
  currentBall: Ball,
  newPosition: Position,
  goalkeepers: Player[],
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
): Ball => {
  // Apply friction
  const newVelocity = {
    x: currentBall.velocity.x * FRICTION,
    y: currentBall.velocity.y * FRICTION
  };

  let updatedPosition = { ...newPosition };
  let updatedVelocity = { ...newVelocity };
  
  // Initialize or propagate bounce detection state
  let bounceDetection = currentBall.bounceDetection || {
    consecutiveBounces: 0,
    lastBounceTime: 0,
    lastBounceSide: '',
    sideEffect: false
  };

  // Handle wall collisions
  const ballRadius = 6;
  
  // Improved boundary collision with bounce effect
  if (newPosition.x - ballRadius < 0) {
    updatedPosition.x = ballRadius;
    updatedVelocity.x = Math.abs(newVelocity.x) * BOUNCE_FACTOR;
    handleBounceTracking(bounceDetection, 'left');
  } else if (newPosition.x + ballRadius > 800) {
    updatedPosition.x = 800 - ballRadius;
    updatedVelocity.x = -Math.abs(newVelocity.x) * BOUNCE_FACTOR;
    handleBounceTracking(bounceDetection, 'right');
  }
  
  if (newPosition.y - ballRadius < 0) {
    updatedPosition.y = ballRadius;
    updatedVelocity.y = Math.abs(newVelocity.y) * BOUNCE_FACTOR;
    handleBounceTracking(bounceDetection, 'top');
  } else if (newPosition.y + ballRadius > 600) {
    updatedPosition.y = 600 - ballRadius;
    updatedVelocity.y = -Math.abs(newVelocity.y) * BOUNCE_FACTOR;
    handleBounceTracking(bounceDetection, 'bottom');
  }

  // Check goal post collisions (simplified)
  const goalPostBounce = checkGoalPostCollision(updatedPosition, 6);
  if (goalPostBounce) {
    if (goalPostBounce === 'vertical') {
      updatedVelocity.y = -updatedVelocity.y * GOAL_POST_BOUNCE;
    } else {
      updatedVelocity.x = -updatedVelocity.x * GOAL_POST_BOUNCE;
    }
  }

  // Handle player collisions
  const currentTime = Date.now();
  const timeSinceLastCollision = currentTime - lastCollisionTimeRef.current;
  
  // First check goalkeepers for ball collision with priority
  for (const goalkeeper of goalkeepers) {
    const distance = calculateDistance(goalkeeper.position, updatedPosition);
    
    if (distance < PLAYER_TOUCH_RADIUS) {
      // Goalkeeper touches the ball
      onBallTouch(goalkeeper);
      
      if (timeSinceLastCollision > MIN_KICK_INTERVAL) {
        // Stronger clearing for goalkeepers when appropriate
        const shouldClear = 
          (goalkeeper.team === 'red' && updatedPosition.x < 100) || 
          (goalkeeper.team === 'blue' && updatedPosition.x > 700);
        
        if (shouldClear) {
          // Clear in appropriate direction with good strength
          const clearDirection = goalkeeper.team === 'red' ? 1 : -1;
          updatedVelocity.x = clearDirection * 14;
          updatedVelocity.y = (Math.random() - 0.5) * 8;
          lastCollisionTimeRef.current = currentTime;
          bounceDetection.sideEffect = true;
        } else {
          // Simple deflection from goalkeeper body
          updatedVelocity.x = -updatedVelocity.x * 0.9;
          updatedVelocity.y = -updatedVelocity.y * 0.9;
          lastCollisionTimeRef.current = currentTime;
        }
      }
      
      break;
    }
  }
  
  // Then check field players
  for (const player of fieldPlayers) {
    const distance = calculateDistance(player.position, updatedPosition);
    
    if (distance < PLAYER_TOUCH_RADIUS) {
      // Only process if sufficient time since last collision
      if (timeSinceLastCollision > MIN_KICK_INTERVAL) {
        onBallTouch(player);
        lastCollisionTimeRef.current = currentTime;
        
        // Check if player is intentionally kicking the ball
        if (player.brain && player.brain.lastAction) {
          // Handle different kick types
          switch (player.brain.lastAction) {
            case 'shoot':
              // Shoot in appropriate direction with high power
              const shootDirectionX = player.team === 'red' ? 1 : -1;
              updatedVelocity.x = shootDirectionX * SHOOT_POWER;
              // Vary vertical component based on player's relative Y position
              updatedVelocity.y = (player.position.y < 300 ? 1 : -1) * (Math.random() * 5);
              console.log(`${player.team} ${player.role} #${player.id} shoots!`);
              break;
              
            case 'pass':
              // Check if the player has a target player to pass to
              if (player.brain.targetPlayer) {
                // Get the target player
                const target = player.brain.targetPlayer;
                
                // Calculate direction vector
                const dx = target.position.x - player.position.x;
                const dy = target.position.y - player.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Normalize and apply pass power (factoring in distance)
                const passPowerFactor = Math.min(1, distance / 300) * PASS_POWER;
                updatedVelocity.x = (dx / distance) * passPowerFactor;
                updatedVelocity.y = (dy / distance) * passPowerFactor;
                
                console.log(`${player.team} ${player.role} #${player.id} passes to ${target.role} #${target.id}`);
                
                // Add slight unpredictability to passes (pass accuracy)
                updatedVelocity.x += (Math.random() - 0.5) * 1;
                updatedVelocity.y += (Math.random() - 0.5) * 1;
              } else {
                // Default pass in team's attacking direction if no specific target
                const passDirectionX = player.team === 'red' ? 1 : -1;
                updatedVelocity.x = passDirectionX * PASS_POWER * 0.7;
                updatedVelocity.y = (Math.random() - 0.5) * 4;
                console.log(`${player.team} ${player.role} #${player.id} makes default pass`);
              }
              break;
              
            case 'intercept':
              // Just deflect the ball to stop it
              updatedVelocity.x = -updatedVelocity.x * 0.5;
              updatedVelocity.y = -updatedVelocity.y * 0.5;
              console.log(`${player.team} ${player.role} #${player.id} intercepts`);
              break;
              
            default:
              // Regular dribble in general attacking direction
              const moveX = player.brain.lastOutput.x || 0;
              const moveY = player.brain.lastOutput.y || 0;
              
              // Dribbling logic that takes into account player's intended direction
              updatedVelocity.x = moveX * DRIBBLE_POWER;
              updatedVelocity.y = moveY * DRIBBLE_POWER;
              break;
          }
          
          // Save last kick position to detect if ball gets stuck
          lastKickPositionRef.current = { ...player.position };
          
          // Visual feedback for ball touches
          bounceDetection.sideEffect = true;
        } else {
          // Simple deflection for legacy players
          updatedVelocity.x = (player.team === 'red' ? 1 : -1) * 5;
          updatedVelocity.y = (Math.random() - 0.5) * 3;
        }
      }
      break; // Only process one player collision per frame
    }
  }

  // Reset side effect flag if velocity is low
  if (Math.abs(updatedVelocity.x) < 0.2 && Math.abs(updatedVelocity.y) < 0.2) {
    bounceDetection.sideEffect = false;
  }

  return {
    position: updatedPosition,
    velocity: updatedVelocity,
    bounceDetection
  };
};

// Helper function to track consecutive bounces
const handleBounceTracking = (bounceDetection: Ball['bounceDetection'], side: string) => {
  if (!bounceDetection) return;
  
  const currentTime = Date.now();
  
  if (bounceDetection.lastBounceSide === side && 
      currentTime - bounceDetection.lastBounceTime < 1000) {
    bounceDetection.consecutiveBounces += 1;
    
    if (bounceDetection.consecutiveBounces > 3) {
      // Trigger side effect flag for visual indication when ball is bouncing too much
      bounceDetection.sideEffect = true;
    }
  } else {
    bounceDetection.consecutiveBounces = 1;
  }
  
  bounceDetection.lastBounceTime = currentTime;
  bounceDetection.lastBounceSide = side;
};

// Simplified goal post collision check
const checkGoalPostCollision = (position: Position, ballRadius: number): false | 'horizontal' | 'vertical' => {
  // Goal dimensions (simplified)
  const leftGoalX = 0;
  const rightGoalX = 800;
  const goalTop = 220;
  const goalBottom = 380;
  
  // Check left goal post
  if (position.x - ballRadius < leftGoalX + 20 && 
      (position.y < goalTop || position.y > goalBottom)) {
    if (position.y > goalTop - ballRadius && position.y < goalTop + ballRadius) {
      return 'vertical'; // Top post
    }
    if (position.y > goalBottom - ballRadius && position.y < goalBottom + ballRadius) {
      return 'vertical'; // Bottom post
    }
    return 'horizontal'; // Side post
  }
  
  // Check right goal post
  if (position.x + ballRadius > rightGoalX - 20 && 
      (position.y < goalTop || position.y > goalBottom)) {
    if (position.y > goalTop - ballRadius && position.y < goalTop + ballRadius) {
      return 'vertical'; // Top post
    }
    if (position.y > goalBottom - ballRadius && position.y < goalBottom + ballRadius) {
      return 'vertical'; // Bottom post
    }
    return 'horizontal'; // Side post
  }
  
  return false;
};
