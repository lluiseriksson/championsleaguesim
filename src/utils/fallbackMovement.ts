
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { applyPositionRestrictions } from './positionHelpers';

// Provides basic movement when neural network is unavailable
export const getFallbackMovement = (
  player: Player,
  ball: Ball,
  currentPlayers: Player[],
  positionRestricted: boolean
): { position: { x: number; y: number }, output: { x: number; y: number } } => {
  const dx = ball.position.x - player.position.x;
  const dy = ball.position.y - player.position.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const moveSpeed = 1.5;
  const moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
  const moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
  
  let newPosition = {
    x: player.position.x + moveX,
    y: player.position.y + moveY
  };
  
  // Increased by 50% from base values
  let maxDistance = 75; // 50 * 1.5 = 75
  switch (player.role) {
    case 'defender': maxDistance = 105; break; // 70 * 1.5 = 105
    case 'midfielder': maxDistance = 150; break; // 100 * 1.5 = 150
    case 'forward': maxDistance = 180; break; // 120 * 1.5 = 180
  }
  
  newPosition = applyPositionRestrictions(
    newPosition, 
    player, 
    player.targetPosition, 
    maxDistance, 
    positionRestricted, 
    currentPlayers
  );
  
  // Ensure players stay within the pitch boundaries
  newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
  newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
  
  return {
    position: newPosition,
    output: { x: moveX, y: moveY }
  };
};
