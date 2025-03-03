
import { Position } from '../../types/football';

const MAX_BALL_SPEED = 15;
const MIN_BALL_SPEED = 4.5; // Increased to classic value - ball needs to keep moving!

export const limitSpeed = (velocity: Position): Position => {
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
  // Classic behavior maintained higher minimum speed
  if (speed < MIN_BALL_SPEED && speed > 0) {
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  return velocity;
};

export const addRandomEffect = (velocity: Position): Position => {
  // Classic behavior: stronger random effects
  const randomX = (Math.random() - 0.5) * 4; // Doubled from 2 to 4
  const randomY = (Math.random() - 0.5) * 4; // Changed from asymmetric to symmetric, doubled force
  
  return {
    x: velocity.x + randomX,
    y: velocity.y + randomY
  };
};
