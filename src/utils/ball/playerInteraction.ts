import { Ball, Player, Position } from '../../types/football';
import { calculateDistance } from '../positionHelpers';
import { PLAYER_TOUCH_RADIUS, MIN_KICK_INTERVAL, SHOOT_POWER, PASS_POWER, DRIBBLE_POWER } from './ballConstants';

// Handle goalkeeper interactions with the ball
export const handleGoalkeeperBallInteractions = (
  goalkeeper: Player,
  ballPosition: Position,
  ballVelocity: Position,
  currentTime: number,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  onBallTouch: (player: Player) => void
) => {
  const distance = calculateDistance(goalkeeper.position, ballPosition);
  
  if (distance < PLAYER_TOUCH_RADIUS) {
    // Goalkeeper touches the ball
    onBallTouch(goalkeeper);
    
    const timeSinceLastCollision = currentTime - lastCollisionTimeRef.current;
    if (timeSinceLastCollision > MIN_KICK_INTERVAL) {
      // Stronger clearing for goalkeepers when appropriate
      const shouldClear = 
        (goalkeeper.team === 'red' && ballPosition.x < 100) || 
        (goalkeeper.team === 'blue' && ballPosition.x > 700);
      
      let updatedVelocity = { ...ballVelocity };
      
      if (shouldClear) {
        // Clear in appropriate direction with good strength
        const clearDirection = goalkeeper.team === 'red' ? 1 : -1;
        updatedVelocity.x = clearDirection * 14;
        updatedVelocity.y = (Math.random() - 0.5) * 8;
        lastCollisionTimeRef.current = currentTime;
        return { updatedVelocity, sideEffect: true };
      } else {
        // Simple deflection from goalkeeper body
        updatedVelocity.x = -updatedVelocity.x * 0.9;
        updatedVelocity.y = -updatedVelocity.y * 0.9;
        lastCollisionTimeRef.current = currentTime;
        return { updatedVelocity, sideEffect: false };
      }
    }
  }
  
  return null;
};

// Handle player shooting mechanics
export const handlePlayerShoot = (player: Player, updatedVelocity: Position) => {
  // Shoot in appropriate direction with high power
  const shootDirectionX = player.team === 'red' ? 1 : -1;
  updatedVelocity.x = shootDirectionX * SHOOT_POWER;
  // Vary vertical component based on player's relative Y position
  updatedVelocity.y = (player.position.y < 300 ? 1 : -1) * (Math.random() * 5);
  console.log(`${player.team} ${player.role} #${player.id} shoots!`);
  return updatedVelocity;
};

// Handle player passing mechanics
export const handlePlayerPass = (player: Player, updatedVelocity: Position) => {
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
  
  return updatedVelocity;
};

// Handle player intercept mechanics
export const handlePlayerIntercept = (player: Player, updatedVelocity: Position) => {
  // Just deflect the ball to stop it
  updatedVelocity.x = -updatedVelocity.x * 0.5;
  updatedVelocity.y = -updatedVelocity.y * 0.5;
  console.log(`${player.team} ${player.role} #${player.id} intercepts`);
  return updatedVelocity;
};

// Handle player dribble mechanics
export const handlePlayerDribble = (player: Player, updatedVelocity: Position) => {
  // Regular dribble in general attacking direction
  const moveX = player.brain.lastOutput.x || 0;
  const moveY = player.brain.lastOutput.y || 0;
  
  // Dribbling logic that takes into account player's intended direction
  updatedVelocity.x = moveX * DRIBBLE_POWER;
  updatedVelocity.y = moveY * DRIBBLE_POWER;
  return updatedVelocity;
};

// Handle field player interactions with the ball
export const handleFieldPlayerBallInteractions = (
  player: Player,
  ballPosition: Position,
  ballVelocity: Position,
  currentTime: number,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>,
  onBallTouch: (player: Player) => void
) => {
  const distance = calculateDistance(player.position, ballPosition);
  
  if (distance < PLAYER_TOUCH_RADIUS) {
    // Only process if sufficient time since last collision
    const timeSinceLastCollision = currentTime - lastCollisionTimeRef.current;
    if (timeSinceLastCollision > MIN_KICK_INTERVAL) {
      onBallTouch(player);
      lastCollisionTimeRef.current = currentTime;
      
      let updatedVelocity = { ...ballVelocity };
      let sideEffect = false;
      
      // Check if player is intentionally kicking the ball
      if (player.brain && player.brain.lastAction) {
        // Handle different kick types
        switch (player.brain.lastAction) {
          case 'shoot':
            updatedVelocity = handlePlayerShoot(player, updatedVelocity);
            break;
            
          case 'pass':
            updatedVelocity = handlePlayerPass(player, updatedVelocity);
            break;
            
          case 'intercept':
            updatedVelocity = handlePlayerIntercept(player, updatedVelocity);
            break;
            
          default:
            updatedVelocity = handlePlayerDribble(player, updatedVelocity);
            break;
        }
        
        // Save last kick position to detect if ball gets stuck
        lastKickPositionRef.current = { ...player.position };
        
        // Visual feedback for ball touches
        sideEffect = true;
      } else {
        // Simple deflection for legacy players
        updatedVelocity.x = (player.team === 'red' ? 1 : -1) * 5;
        updatedVelocity.y = (Math.random() - 0.5) * 3;
      }
      
      return { updatedVelocity, sideEffect };
    }
  }
  
  return null;
};
