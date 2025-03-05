
import { Player, Position } from '../../types/football';
import { checkCollision, calculateNewVelocity } from '../../utils/gamePhysics';

// Handle collisions between the ball and field players
export function handleFieldPlayerCollisions(
  newPosition: Position,
  newVelocity: Position,
  currentVelocity: Position,
  fieldPlayers: Player[],
  onBallTouch: (player: Player) => void,
  currentTime: number,
  lastCollisionTimeRef: React.MutableRefObject<number>,
  lastKickPositionRef: React.MutableRefObject<Position | null>
): Position {
  for (const player of fieldPlayers) {
    const collision = checkCollision(newPosition, player.position);
    
    if (collision) {
      // Record which player touched the ball
      onBallTouch(player);
      lastCollisionTimeRef.current = currentTime;
      lastKickPositionRef.current = { ...newPosition };
      
      // Calculate new velocity based on collision
      newVelocity = calculateNewVelocity(
        newPosition,
        player.position,
        currentVelocity,
        false
      );
      
      // Add some force to ensure it moves away from player
      const dx = newPosition.x - player.position.x;
      const dy = newPosition.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // ENHANCED: Check if this might be an own goal situation
        const ownGoalRisk = (player.team === 'red' && normalizedDx < 0) || 
                           (player.team === 'blue' && normalizedDx > 0);
                           
        if (ownGoalRisk) {
          // IMPROVED: More aggressive prevention of own goals
          // If high risk of own goal, deflect ball more strongly to avoid shooting toward own goal
          if (player.team === 'red') {
            newVelocity.x = Math.abs(newVelocity.x) * 1.2; // Always positive X (rightward) for red team
          } else {
            newVelocity.x = -Math.abs(newVelocity.x) * 1.2; // Always negative X (leftward) for blue team
          }
          
          // Add stronger sideways deflection
          const sidewaysDeflection = normalizedDy * 3.0;
          newVelocity.y = sidewaysDeflection;
          console.log(`Strong own goal prevention for ${player.team} player - forcing ball away from own goal`);
        } else {
          // Normal deflection physics with slight directional bias towards opponent goal
          const directionBias = player.team === 'red' ? 0.2 : -0.2; // Positive for red, negative for blue
          const adjustedDx = normalizedDx + directionBias;
          
          newVelocity.x += adjustedDx * 1.5; 
          newVelocity.y += normalizedDy * 1.5;
        }
      }
      
      console.log(`Ball touched by ${player.team} ${player.role}`);
      break; // Only handle one collision per frame
    }
  }
  
  return newVelocity;
}
