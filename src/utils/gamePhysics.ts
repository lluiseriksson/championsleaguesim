import { Position, Player, PLAYER_RADIUS, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { calculateDistance } from './neuralCore';

const MAX_BALL_SPEED = 18; // Keeping higher speed for powerful shots
const MIN_BALL_SPEED = 8.4; // Doubled from 4.2 to 8.4

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
  
  // ALWAYS apply minimum speed unless the ball should be completely stopped
  // (which should only happen at game reset/initialization)
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
  // Add a small random component to the X velocity
  const randomX = (Math.random() - 0.5) * 2;
  // Add a larger random component to the Y velocity to push ball inward
  const randomY = (Math.random() * 2) - 1;
  
  return {
    x: velocity.x + randomX,
    y: velocity.y + randomY * 2 // Greater effect on Y to push ball away from boundaries
  };
};

export const calculateNewVelocity = (
  ballPosition: Position,
  playerPosition: Position,
  currentVelocity: Position,
  isGoalkeeper: boolean = false,
  isAngledShot: boolean = false // New parameter for angled shots
): Position => {
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // Calculate incident angle
  const incidentAngle = Math.atan2(currentVelocity.y, currentVelocity.x);
  
  // Special handling for goalkeeper - BALANCED
  if (isGoalkeeper) {
    // Determine which goal the goalkeeper is defending
    const isLeftGoalkeeper = playerPosition.x < PITCH_WIDTH / 2;
    const centerY = PITCH_HEIGHT / 2;
    
    // Is the ball moving toward the goal?
    const ballMovingTowardsGoal = (isLeftGoalkeeper && currentVelocity.x < 0) || 
                                 (!isLeftGoalkeeper && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Apply extra power for angled shots but less effective goalkeeper response
      const angledShotMultiplier = isAngledShot ? 1.3 : 1.0; // Increased from 1.2 to 1.3
      
      // Calculate horizontal deflection direction (away from the goal)
      const deflectionX = isLeftGoalkeeper ? 4.5 * angledShotMultiplier : -4.5 * angledShotMultiplier; // Increased from 4.0 to 4.5
      
      // Calculate vertical deflection to push ball away from goal center
      const verticalOffset = ballPosition.y - centerY;
      const verticalFactor = Math.sign(verticalOffset) * (1.0 + Math.min(Math.abs(verticalOffset) / 100, 1.0));
      
      // Goalkeeper saves have more balanced power
      const baseSpeed = isAngledShot ? 12.5 : 11.5; // Increased from 12/11 to 12.5/11.5
      
      // Add randomness to saves - sometimes goalkeeper misjudges
      const misjudgeFactor = Math.random();
      if (misjudgeFactor < 0.25) { // 25% chance of misjudging (increased from 20%)
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
    // but with reduced power
    const teamDirection = isLeftGoalkeeper ? 1 : -1; // 1 for red (left goalkeeper), -1 for blue (right goalkeeper)
    
    return limitSpeed({
      x: Math.abs(currentVelocity.x) * teamDirection * 1.6, // Increased from 1.5 to 1.6
      y: currentVelocity.y
    });
  }

  // ENHANCED directional shooting for field players with MORE POWER
  // Add team-specific logic to make the ball tend to go in the right direction
  const team = playerPosition.x < PITCH_WIDTH / 2 ? 'red' : 'blue';
  const directionalBias = team === 'red' ? 0.3 : -0.3; // Increased from 0.25 to 0.3
  
  // For other players or when the ball isn't going toward goal
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Calculate reflection velocity using incident angle with directional bias
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );
  
  // Higher base speed for all balls - even higher for more powerful shots
  const adjustedSpeed = Math.max(10, speed * 1.5);  // Increased from 9 to 10 and from 1.4 to 1.5
  
  // Add directional bias to reflection angle
  const reflectionAngle = angle + (angle - incidentAngle) + directionalBias;
  
  // Add slight random variation to the reflection
  const randomVariation = (Math.random() - 0.5) * 0.4; // Increased from 0.3 to 0.4
  
  // Higher multiplier for player kicks
  const speedMultiplier = isGoalkeeper ? 1.8 : 1.8; // Increased for players from 1.7 to 1.8
  
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

// Add the missing functions that BallMovementSystem imports
export const applyFriction = (velocity: { x: number; y: number }, frictionFactor: number) => {
  return {
    x: velocity.x * frictionFactor,
    y: velocity.y * frictionFactor
  };
};

export const applyBallAcceleration = (velocity: { x: number; y: number }, position: { x: number; y: number }) => {
  // Apply slight acceleration based on ball position (can be customized)
  // This function can be enhanced to add wind effects, field gradient, etc.
  return {
    x: velocity.x,
    y: velocity.y
  };
};

// Add the missing exports for BallMovementSystem
export const simulateBounce = (velocity: Position, normal: Position): Position => {
  // Calculate dot product of velocity and normal
  const dot = velocity.x * normal.x + velocity.y * normal.y;
  
  // Calculate reflection vector: r = v - 2(v·n)n
  return {
    x: velocity.x - 2 * dot * normal.x,
    y: velocity.y - 2 * dot * normal.y
  };
};

export const calculateRebound = (
  playerPosition: Position, 
  playerVelocity: Position, 
  ballPosition: Position, 
  ballVelocity: Position
): Position => {
  // Direction from player to ball
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  
  // Normalize direction vector
  const distance = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / distance;
  const ny = dy / distance;
  
  // Calculate dot product for relative velocity
  const vx = ballVelocity.x - playerVelocity.x;
  const vy = ballVelocity.y - playerVelocity.y;
  const dotProduct = vx * nx + vy * ny;
  
  // Calculate impulse with elasticity
  const elasticity = 1.2; // Slightly bouncy
  const impulse = -dotProduct * elasticity;
  
  // Apply impulse vector
  return {
    x: ballVelocity.x + impulse * nx,
    y: ballVelocity.y + impulse * ny
  };
};

export const updatePosition = (position: Position, velocity: Position): Position => {
  return {
    x: position.x + velocity.x,
    y: position.y + velocity.y
  };
};

/**
 * Checks if a ball position collides with the boundaries and returns updated position and velocity
 * @param position Current position of the ball
 * @param velocity Current velocity of the ball
 * @param radius Radius of the ball for collision detection
 * @returns Object containing updated position and velocity after boundary collision check
 */
export const checkBoundaryCollision = (
  position: Position, 
  velocity: Position, 
  radius: number
): { position: Position; velocity: Position } => {
  let newPosition = { ...position };
  let newVelocity = { ...velocity };
  
  // Check left boundary
  if (newPosition.x < radius) {
    newPosition.x = radius;
    newVelocity.x = -newVelocity.x * 0.8; // Damping factor
  }
  
  // Check right boundary
  if (newPosition.x > PITCH_WIDTH - radius) {
    newPosition.x = PITCH_WIDTH - radius;
    newVelocity.x = -newVelocity.x * 0.8; // Damping factor
  }
  
  // Check top boundary
  if (newPosition.y < radius) {
    newPosition.y = radius;
    newVelocity.y = -newVelocity.y * 0.8; // Damping factor
  }
  
  // Check bottom boundary
  if (newPosition.y > PITCH_HEIGHT - radius) {
    newPosition.y = PITCH_HEIGHT - radius;
    newVelocity.y = -newVelocity.y * 0.8; // Damping factor
  }
  
  return { 
    position: newPosition, 
    velocity: newVelocity 
  };
};
