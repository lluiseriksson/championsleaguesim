import { Position, Player, PLAYER_RADIUS, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { calculateDistance } from './neuralCore';

// Aumentamos las velocidades un 10% en relación a los valores anteriores
const MAX_BALL_SPEED = 16.5; // Increased from 15 (about 10% faster)
const MIN_BALL_SPEED = 7.6; // Increased from 6.9 (about 10% faster)

// Helper functions for coordinate mirroring
export const normalizeCoordinates = (position: Position, team: 'red' | 'blue'): Position => {
  // For blue team (playing right to left), flip the x-coordinate to normalize to red team's perspective
  if (team === 'blue') {
    return {
      x: PITCH_WIDTH - position.x,
      y: position.y
    };
  }
  // Red team coordinates remain unchanged as they're our reference frame
  return { ...position };
};

export const denormalizeCoordinates = (normalizedPosition: Position, team: 'red' | 'blue'): Position => {
  // For blue team, flip the x-coordinate back to their original perspective
  if (team === 'blue') {
    return {
      x: PITCH_WIDTH - normalizedPosition.x,
      y: normalizedPosition.y
    };
  }
  // Red team coordinates remain unchanged
  return { ...normalizedPosition };
};

export const normalizeVelocity = (velocity: Position, team: 'red' | 'blue'): Position => {
  // For blue team, flip the x-velocity to normalize to red team's perspective
  if (team === 'blue') {
    return {
      x: -velocity.x,
      y: velocity.y
    };
  }
  // Red team velocities remain unchanged
  return { ...velocity };
};

export const denormalizeVelocity = (normalizedVelocity: Position, team: 'red' | 'blue'): Position => {
  // For blue team, flip the x-velocity back to their original perspective
  if (team === 'blue') {
    return {
      x: -normalizedVelocity.x,
      y: normalizedVelocity.y
    };
  }
  // Red team velocities remain unchanged
  return { ...normalizedVelocity };
};

const limitSpeed = (velocity: Position): Position => {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  
  // Apply maximum speed limit
  if (speed > MAX_BALL_SPEED) {
    const factor = MAX_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  // Apply minimum speed unless the ball should be completely stopped
  if (speed < MIN_BALL_SPEED && speed > 0) {
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  return velocity;
};

export const checkCollision = (ballPos: Position, playerPos: Position, isGoalkeeper: boolean = false, playerRadius: number = PLAYER_RADIUS): boolean => {
  const dx = ballPos.x - playerPos.x;
  const dy = ballPos.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Use provided playerRadius instead of fixed PLAYER_RADIUS to account for ELO adjustments
  // Field players have 15 units of reach for interacting with the ball
  const fieldPlayerReach = 15 - BALL_RADIUS; // 15 units total minus ball radius
  
  // For goalkeepers, check if it's an angled shot
  if (isGoalkeeper) {
    const ballAngle = Math.atan2(dy, dx);
    const isAngledShot = Math.abs(ballAngle) > Math.PI/8;
    
    if (isAngledShot) {
      // Keep angled shot collision detection as is (15 units minus ball radius)
      const goalkeeperAngledReach = 15 - BALL_RADIUS;
      return distance <= (BALL_RADIUS + goalkeeperAngledReach + (playerRadius - PLAYER_RADIUS));
    } else {
      // For straight shots, base reach is now 0
      // ELO-based adjustments are handled separately in calculateEloGoalkeeperReachAdjustment
      const goalkeeperStraightReach = 0;
      return distance <= (BALL_RADIUS + goalkeeperStraightReach + (playerRadius - PLAYER_RADIUS));
    }
  }
  
  // For field players, use the extended 15-unit reach
  const reach = fieldPlayerReach;
  
  // Add a small buffer to prevent the ball from getting stuck
  // Include the difference between adjusted radius and standard radius
  return distance <= (BALL_RADIUS + reach + 0.5 + (playerRadius - PLAYER_RADIUS));
};

export const addRandomEffect = (velocity: Position): Position => {
  // Reduced randomness by 30%
  const randomX = (Math.random() - 0.5) * 1.4; // Reduced from 2
  const randomY = (Math.random() * 1.4) - 0.7; // Reduced from 2-1
  
  return {
    x: velocity.x + randomX,
    y: velocity.y + randomY * 1.4 // Reduced from 2
  };
};

export const calculateNewVelocity = (
  ballPosition: Position,
  playerPosition: Position,
  currentVelocity: Position,
  isGoalkeeper: boolean = false,
  isAngledShot: boolean = false // Parameter for angled shots
): Position => {
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // Calculate incident angle
  const incidentAngle = Math.atan2(currentVelocity.y, currentVelocity.x);
  
  // Special handling for goalkeeper - INCREASED SPEEDS BY 10%
  if (isGoalkeeper) {
    // Determine which goal the goalkeeper is defending
    const isLeftGoalkeeper = playerPosition.x < PITCH_WIDTH / 2;
    const centerY = PITCH_HEIGHT / 2;
    
    // Is the ball moving toward the goal?
    const ballMovingTowardsGoal = (isLeftGoalkeeper && currentVelocity.x < 0) || 
                                (!isLeftGoalkeeper && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Apply extra power for angled shots but less effective goalkeeper response
      const angledShotMultiplier = isAngledShot ? 1.2 : 1.0; // Keep same multiplier
      
      // Calculate horizontal deflection direction (away from the goal) - 10% FASTER
      const deflectionX = isLeftGoalkeeper ? 4.5 * angledShotMultiplier : -4.5 * angledShotMultiplier; // Increased from 4.1
      
      // Calculate vertical deflection to push ball away from goal center
      const verticalOffset = ballPosition.y - centerY;
      const verticalFactor = Math.sign(verticalOffset) * (1.01 + Math.min(Math.abs(verticalOffset) / 100, 1.01)); // Increased by 10%
      
      // Goalkeeper saves have more balanced power - 10% FASTER
      const baseSpeed = isAngledShot ? 11.4 : 10.1; // Increased from 10.4/9.2 (10% faster)
      
      // Add randomness to saves - sometimes goalkeeper misjudges
      const misjudgeFactor = Math.random();
      if (misjudgeFactor < 0.20) { // Keep 20% chance
        console.log(`Goalkeeper MISJUDGE by ${isLeftGoalkeeper ? 'red' : 'blue'} team!`);
        return limitSpeed({
          x: deflectionX * baseSpeed * 0.7,
          y: verticalFactor * baseSpeed * 0.7
        });
      }
      
      console.log(`Goalkeeper SAVE by ${isLeftGoalkeeper ? 'red' : 'blue'} team! ${isAngledShot ? '(angled shot)' : ''}`);
      
      return limitSpeed({
        x: deflectionX * baseSpeed,
        y: verticalFactor * baseSpeed
      });
    }
    
    // When not directly saving, still direct the ball towards the correct side of the field
    // but with increased power by 10%
    const teamDirection = isLeftGoalkeeper ? 1 : -1; // 1 for red (left goalkeeper), -1 for blue (right goalkeeper)
    
    return limitSpeed({
      x: Math.abs(currentVelocity.x) * teamDirection * 1.65, // Increased from 1.5
      y: currentVelocity.y
    });
  }

  // INCREASED directional shooting for field players by 10%
  // Add team-specific logic to make the ball tend to go in the right direction
  const team = playerPosition.x < PITCH_WIDTH / 2 ? 'red' : 'blue';
  const directionalBias = team === 'red' ? 0.32 : -0.32; // Increased from 0.29
  
  // For other players or when the ball isn't going toward goal
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Calculate reflection velocity using incident angle with directional bias
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );
  
  // INCREASED base speed for all balls by 10%
  const adjustedSpeed = Math.max(8.86, speed * 1.52);  // Increased from 8.05/1.38
  
  // Add directional bias to reflection angle
  const reflectionAngle = angle + (angle - incidentAngle) + directionalBias;
  
  // Add slight random variation to the reflection - KEEP SAME
  const randomVariation = (Math.random() - 0.5) * 0.3; // Keep as is
  
  // INCREASED multiplier for player kicks by 10%
  const speedMultiplier = isGoalkeeper ? 1.77 : 1.77; // Increased from 1.61
  
  // Calculate new velocity with all factors combined
  let newVelocity = {
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * speedMultiplier,
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * speedMultiplier
  };
  
  // Add one final directional bias check for very dangerous own-goal situations
  const movingTowardsOwnGoal = (team === 'red' && newVelocity.x < 0) || 
                             (team === 'blue' && newVelocity.x > 0);
                             
  if (movingTowardsOwnGoal && Math.abs(newVelocity.x) > 3) {
    // Flip the x direction if headed strongly towards own goal
    newVelocity.x = -newVelocity.x;
    console.log(`Emergency direction correction applied for ${team} team!`);
  }
  
  return limitSpeed(newVelocity);
};
