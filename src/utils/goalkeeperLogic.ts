import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../types/football';

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball): { x: number, y: number } => {
  // Determine which side the goalkeeper is defending
  const isLeftSide = player.team === 'red';
  const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
  
  // Calculate distance to ball
  const dx = ball.position.x - player.position.x;
  const dy = ball.position.y - player.position.y;
  const distanceToBall = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate if ball is moving toward goal
  const ballMovingTowardGoal = 
    (isLeftSide && ball.velocity.x < -1) || 
    (!isLeftSide && ball.velocity.x > 1);
  
  // Calculate expected ball position based on trajectory
  const expectedBallY = ball.position.y + (ball.velocity.y * 10);
  
  // Calculate horizontal movement - be smarter about when to come out
  let moveX = 0;
  
  // More aggressive coming out when ball is close and moving toward goal
  const shouldMoveForward = 
    (isLeftSide && ball.position.x < 150 && ballMovingTowardGoal) || 
    (!isLeftSide && ball.position.x > PITCH_WIDTH - 150 && ballMovingTowardGoal);
  
  if (shouldMoveForward) {
    // Move toward ball more aggressively, but not too far from goal line
    const maxAdvance = isLeftSide ? 120 : PITCH_WIDTH - 120;
    const targetX = isLeftSide 
      ? Math.min(ball.position.x - 20, maxAdvance)
      : Math.max(ball.position.x + 20, maxAdvance);
    
    // Move faster when ball is coming directly at goal
    const directShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/2;
    const speedMultiplier = directShot ? 3.0 : 2.0;
    
    moveX = Math.sign(targetX - player.position.x) * speedMultiplier;
  } else {
    // Return to goal line with higher urgency
    const distanceToGoalLine = Math.abs(player.position.x - goalLine);
    moveX = Math.sign(goalLine - player.position.x) * Math.min(distanceToGoalLine * 0.2, 2.5);
  }
  
  // Calculate vertical movement to track the ball or expected ball position
  let moveY = 0;
  
  // If ball is moving fast, anticipate where it will go
  const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
  const targetY = isBallMovingFast ? expectedBallY : ball.position.y;
  
  // Limit target Y to reasonable goal area
  const limitedTargetY = Math.max(
    PITCH_HEIGHT/2 - GOAL_HEIGHT/2 - 30,
    Math.min(PITCH_HEIGHT/2 + GOAL_HEIGHT/2 + 30, targetY)
  );
  
  // Calculate vertical movement with higher responsiveness
  const yDifference = limitedTargetY - player.position.y;
  moveY = Math.sign(yDifference) * Math.min(Math.abs(yDifference) * 0.15, 3.0);
  
  // Prioritize vertical movement when ball is coming directly at goal
  if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 100) {
    moveY = moveY * 1.5; // Increase vertical movement priority
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), ball dist: ${distanceToBall.toFixed(0)}`);
  
  return { x: moveX, y: moveY };
};
