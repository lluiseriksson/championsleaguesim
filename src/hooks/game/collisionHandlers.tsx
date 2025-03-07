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
  lastKickPositionRef: React.MutableRefObject<Position | null>,
  eloFactors?: { red: number, blue: number }
): Position {
  for (const player of fieldPlayers) {
    // Apply ELO advantage to collision radius
    const eloFactor = eloFactors && player.team ? eloFactors[player.team] : 1.0;
    
    // Calculate radius multiplier based on ELO
    // Higher ELO teams have larger effective collision radius (up to 40% larger)
    const radiusMultiplier = eloFactor > 1.0 ? 
                           Math.min(1.4, eloFactor * 1.2) : // Upper limit of 1.4x
                           Math.max(0.8, eloFactor * 0.9);  // Lower limit of 0.8x
    
    // Use the improved collision detection with ELO-based radius
    const collision = checkCollision(
      newPosition, 
      player.position, 
      false, // This is a field player, not a goalkeeper
      radiusMultiplier // Apply the ELO-based radius multiplier
    );
    
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
      
      // DRASTIC IMPROVEMENT: Much stronger ELO advantage effect on ball control
      const dx = newPosition.x - player.position.x;
      const dy = newPosition.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Check if this might be an own goal situation
        const ownGoalRisk = (player.team === 'red' && normalizedDx < 0) || 
                           (player.team === 'blue' && normalizedDx > 0);
        
        // DRASTIC IMPROVEMENT: Ball control quality based on ELO
        const controlQuality = Math.min(2.5, Math.max(0.5, eloFactor * 1.5));
        const ballControlSuccessRate = Math.min(0.95, 0.6 + (eloFactor - 1) * 0.5);
        
        // Random factor to simulate skill in ball control
        const skillFactor = Math.random() < ballControlSuccessRate ? controlQuality : 0.9;
        
        if (ownGoalRisk) {
          // More aggressive prevention of own goals with ELO factor
          if (player.team === 'red') {
            newVelocity.x = Math.abs(newVelocity.x) * 1.5 * skillFactor; // Always positive X (rightward) for red team
          } else {
            newVelocity.x = -Math.abs(newVelocity.x) * 1.5 * skillFactor; // Always negative X (leftward) for blue team
          }
          
          // Add stronger sideways deflection
          const sidewaysDeflection = normalizedDy * 3.5 * skillFactor;
          newVelocity.y = sidewaysDeflection;
          console.log(`Strong own goal prevention for ${player.team} player - forcing ball away from own goal with skill factor: ${skillFactor.toFixed(2)}`);
        } else {
          // DRASTIC IMPROVEMENT: Much stronger directional control for high ELO teams
          // Higher ELO teams can direct the ball much more effectively where they want
          const directionBias = player.team === 'red' ? 0.4 : -0.4; // Doubled from 0.2 to 0.4
          
          // Apply ELO advantage - stronger kicks and better accuracy for teams with higher ELO
          const adjustedBias = directionBias * eloFactor;
          
          // DRASTIC IMPROVEMENT: High ELO teams can send the ball exactly where they want
          // Low ELO teams have random factors disrupting their intended direction
          let adjustedDx = normalizedDx + adjustedBias;
          
          // Add randomness for low ELO teams
          if (eloFactor < 1.0) {
            const randomness = (1.0 - eloFactor) * 0.5;
            adjustedDx += (Math.random() * 2 - 1) * randomness;
            newVelocity.y += (Math.random() * 2 - 1) * randomness * 3;
          }
          
          // DRASTIC IMPROVEMENT: Power and precision multipliers
          // Higher ELO = higher potential power and better accuracy
          const powerMultiplier = Math.min(3.0, eloFactor * 2.0); // Up to 3x from 1.8x
          const precisionFactor = Math.min(0.9, 0.5 + (eloFactor - 1) * 0.5);
          
          // Apply strong power and precision improvements
          newVelocity.x += adjustedDx * 2.5 * powerMultiplier * skillFactor; 
          newVelocity.y += normalizedDy * 2.5 * powerMultiplier * skillFactor;
          
          // DRASTIC IMPROVEMENT: High ELO players can occasionally make perfect shots
          if (eloFactor > 1.5 && Math.random() < precisionFactor) {
            // Calculate perfect shot toward goal
            const targetX = player.team === 'red' ? 800 : 0;
            const targetY = 300; // Center of goal
            
            const toGoalX = targetX - player.position.x;
            const toGoalY = targetY - player.position.y;
            const goalDist = Math.sqrt(toGoalX * toGoalX + toGoalY * toGoalY);
            
            if (goalDist > 0) {
              // Perfect shot with some randomness based on distance
              const distanceFactor = Math.max(0.6, 1.0 - (goalDist / 800));
              const perfectionFactor = precisionFactor * distanceFactor;
              
              // Mix current velocity with perfect shot
              newVelocity.x = newVelocity.x * (1 - perfectionFactor) + (toGoalX / goalDist) * 15 * perfectionFactor;
              newVelocity.y = newVelocity.y * (1 - perfectionFactor) + (toGoalY / goalDist) * 15 * perfectionFactor;
              
              console.log(`${player.team} player with high ELO made a precision shot! (${perfectionFactor.toFixed(2)})`);
            }
          }
        }
      }
      
      console.log(`Ball touched by ${player.team} ${player.role} with ELO factor: ${eloFactor.toFixed(2)}, radius multiplier: ${radiusMultiplier.toFixed(2)}`);
      break; // Only handle one collision per frame
    }
  }
  
  return newVelocity;
}

// New function to check if player-to-player collisions are occurring
export function handleTeamCollisions(players: Player[]): Player[] {
  // This function is now handled directly in the PlayerMovement.tsx component
  // with the useTeamCollisions hook for better integration with the movement system
  return players;
}
