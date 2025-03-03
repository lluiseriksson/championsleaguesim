
import { Player, Ball, Position, BALL_RADIUS, PLAYER_RADIUS, SHOOT_POWER, PASS_POWER } from '../../types/football';
import { calculateDistance } from '../neuralCore';

// Constants for interaction physics
const COLLISION_THRESHOLD = PLAYER_RADIUS + BALL_RADIUS;
const INTERACTION_RANGE = COLLISION_THRESHOLD + 5;
const POSSESSION_DISTANCE = PLAYER_RADIUS + BALL_RADIUS;
const FRICTION = 0.98;

// Check if a player can interact with the ball
export const canInteractWithBall = (player: Player, ball: Ball): boolean => {
  const distance = calculateDistance(player.position, ball.position);
  return distance <= INTERACTION_RANGE;
};

// Handle collision between player and ball
export const handleBallPlayerCollision = (ball: Ball, player: Player): Ball => {
  const distance = calculateDistance(player.position, ball.position);
  
  if (distance <= COLLISION_THRESHOLD) {
    // Calculate collision direction
    const dx = ball.position.x - player.position.x;
    const dy = ball.position.y - player.position.y;
    const angle = Math.atan2(dy, dx);
    
    // Update ball position to prevent overlap
    const newBallPosition = {
      x: player.position.x + Math.cos(angle) * COLLISION_THRESHOLD,
      y: player.position.y + Math.sin(angle) * COLLISION_THRESHOLD
    };
    
    // Calculate new velocity after collision
    const speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
    const newVelocity = {
      x: Math.cos(angle) * speed * 1.5, // Amplify the velocity a bit after collision
      y: Math.sin(angle) * speed * 1.5
    };
    
    return {
      ...ball,
      position: newBallPosition,
      velocity: newVelocity
    };
  }
  
  return ball;
};

// Handle shooting the ball
export const shootBall = (player: Player, ball: Ball, targetPosition: Position): Ball => {
  // Calculate direction to target
  const dx = targetPosition.x - ball.position.x;
  const dy = targetPosition.y - ball.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Normalize direction
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Set new ball velocity based on shoot power
  return {
    ...ball,
    velocity: {
      x: normalizedDx * SHOOT_POWER,
      y: normalizedDy * SHOOT_POWER
    }
  };
};

// Handle passing the ball
export const passBall = (player: Player, ball: Ball, targetPosition: Position): Ball => {
  // Calculate direction to target position
  const dx = targetPosition.x - ball.position.x;
  const dy = targetPosition.y - ball.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Normalize direction
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Set new ball velocity based on pass power
  return {
    ...ball,
    velocity: {
      x: normalizedDx * PASS_POWER,
      y: normalizedDy * PASS_POWER
    }
  };
};

// Process ball bounce against the pitch boundaries
export const processBallBounce = (ball: Ball): Ball => {
  let { x, y } = ball.position;
  let { x: vx, y: vy } = ball.velocity;
  let didBounce = false;
  let bounceSide = '';
  
  // Initialize bounce detection if it doesn't exist
  const bounceDetection = ball.bounceDetection || {
    consecutiveBounces: 0,
    lastBounceTime: 0,
    lastBounceSide: '',
    sideEffect: false
  };
  
  // Check for horizontal bounds (side walls)
  if (x <= BALL_RADIUS) {
    x = BALL_RADIUS;
    vx = Math.abs(vx) * 0.8; // Reduce velocity a bit on bounce
    didBounce = true;
    bounceSide = 'left';
  } else if (x >= 800 - BALL_RADIUS) {
    x = 800 - BALL_RADIUS;
    vx = -Math.abs(vx) * 0.8; // Reduce velocity a bit on bounce
    didBounce = true;
    bounceSide = 'right';
  }
  
  // Check for vertical bounds (top and bottom walls)
  if (y <= BALL_RADIUS) {
    y = BALL_RADIUS;
    vy = Math.abs(vy) * 0.8; // Reduce velocity a bit on bounce
    didBounce = true;
    bounceSide = 'top';
  } else if (y >= 600 - BALL_RADIUS) {
    y = 600 - BALL_RADIUS;
    vy = -Math.abs(vy) * 0.8; // Reduce velocity a bit on bounce
    didBounce = true;
    bounceSide = 'bottom';
  }
  
  // Update bounce detection
  let newBounceDetection = { ...bounceDetection };
  if (didBounce) {
    const now = performance.now();
    
    // If bounce is within 500ms of the last one and on the same side
    if (now - bounceDetection.lastBounceTime < 500 && bounceSide === bounceDetection.lastBounceSide) {
      newBounceDetection.consecutiveBounces += 1;
    } else {
      newBounceDetection.consecutiveBounces = 1;
    }
    
    newBounceDetection.lastBounceTime = now;
    newBounceDetection.lastBounceSide = bounceSide;
    
    // If we've had 3 or more consecutive bounces on the same side, add some side effect
    if (newBounceDetection.consecutiveBounces >= 3) {
      newBounceDetection.sideEffect = true;
      
      // Add random perturbation to break the bounce loop
      vx += (Math.random() - 0.5) * 2;
      vy += (Math.random() - 0.5) * 2;
    } else {
      newBounceDetection.sideEffect = false;
    }
  } else if (bounceDetection.sideEffect) {
    // Clear side effect after a while
    const now = performance.now();
    if (now - bounceDetection.lastBounceTime > 1000) {
      newBounceDetection.sideEffect = false;
    }
  }
  
  // Apply friction to slow the ball
  vx *= FRICTION;
  vy *= FRICTION;
  
  // Ensure the ball has minimum movement
  const speed = Math.sqrt(vx * vx + vy * vy);
  const MIN_SPEED = 0.1; // Minimum speed to maintain
  if (speed > 0 && speed < MIN_SPEED) {
    const ratio = MIN_SPEED / speed;
    vx *= ratio;
    vy *= ratio;
  }
  
  return {
    ...ball,
    position: { x, y },
    velocity: { x: vx, y: vy },
    bounceDetection: newBounceDetection
  };
};
