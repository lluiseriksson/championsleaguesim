
import { Position } from '../../types/football';

const MAX_BALL_SPEED = 18; // Increased for better billiard physics
const MIN_BALL_SPEED = 6.0; // Increased to ensure ball keeps moving like a billiard ball

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
  // Billiard balls maintain momentum - higher minimum speed
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
  // Billiard-like randomness - more controlled but still unpredictable
  const randomX = (Math.random() - 0.5) * 3; // Reduced randomness for more predictable bounces
  const randomY = (Math.random() - 0.5) * 3; // Reduced randomness for more predictable bounces
  
  return {
    x: velocity.x + randomX,
    y: velocity.y + randomY
  };
};
