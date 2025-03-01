import { Player, Ball, PITCH_WIDTH } from '../types/football';

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball): { x: number, y: number } => {
  // Determine which side the goalkeeper is defending
  const isLeftSide = player.team === 'red';
  const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
  
  // Calculate direction to ball
  const ballDirection = Math.sign(ball.position.x - player.position.x);
  
  // Only move forward if the ball is close and coming toward goal
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 200 && ball.velocity.x < -2) || 
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 200 && ball.velocity.x > 2);
  
  // Calculate horizontal movement - mostly stay on goal line, but occasionally come out
  let moveX = 0;
  if (shouldMoveForward) {
    // Move toward ball, but not too far from goal line
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 20, 150)  // Don't go past halfway for red team
      : Math.max(ball.position.x + 20, PITCH_WIDTH - 150);  // Don't go past halfway for blue team
    
    moveX = Math.sign(targetX - player.position.x) * 2;
  } else {
    // Return to goal line
    moveX = Math.sign(goalLine - player.position.x) * 1.5;
  }
  
  // Calculate vertical movement to track the ball - make this more responsive
  let moveY = 0;
  const ballYDifference = ball.position.y - player.position.y;
  
  // Move toward the ball's vertical position with increased speed for better reactions
  if (Math.abs(ballYDifference) > 5) {  // Reduced threshold from 10 to 5
    moveY = Math.sign(ballYDifference) * Math.min(Math.abs(ballYDifference) * 0.1, 2.5);  // Increased max speed
  }
  
  return { x: moveX, y: moveY };
};
