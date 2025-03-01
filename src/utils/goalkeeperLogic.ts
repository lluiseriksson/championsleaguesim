import { Player, Ball } from '../types/football';

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball): { x: number, y: number } => {
  // Simple goalkeeper algorithm - focus on vertical movement to block the ball
  const moveX = 0; // Keep x position fixed near the goal line
  
  // Calculate vertical movement to track the ball
  let moveY = 0;
  const ballYDifference = ball.position.y - player.position.y;
  
  // Move toward the ball's vertical position, but slower than regular players
  if (Math.abs(ballYDifference) > 10) {
    moveY = Math.sign(ballYDifference) * 1.5;
  }
  
  return { x: moveX, y: moveY };
};
