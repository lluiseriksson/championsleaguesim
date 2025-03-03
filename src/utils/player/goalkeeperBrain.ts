import { PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../../types/football';

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player, ball) => {
  // Track the ball vertically (y-axis) but stay on the goal line (fixed x)
  const preferredY = ball.position.y;
  const distanceToBall = Math.sqrt(
    Math.pow(ball.position.x - player.position.x, 2) +
    Math.pow(ball.position.y - player.position.y, 2)
  );
  
  const movementSpeed = distanceToBall < 100 ? 3 : 2;
  const goalY = PITCH_HEIGHT / 2;
  const goalAreaHeight = GOAL_HEIGHT;
  
  // Calculate the restricted movement range for the goalkeeper
  const minY = goalY - goalAreaHeight / 2 + 20;
  const maxY = goalY + goalAreaHeight / 2 - 20;
  
  // Get the horizontal position for the goalkeeper's team
  const goalX = player.team === 'red' ? 50 : PITCH_WIDTH - 50;
  
  // Calculate the target Y position, constrained to the goal area
  const targetY = Math.max(minY, Math.min(maxY, preferredY));
  
  // Calculate movement
  const moveY = targetY > player.position.y ? 
                Math.min(movementSpeed, targetY - player.position.y) : 
                Math.max(-movementSpeed, targetY - player.position.y);
  
  return {
    x: 0, // Goalkeeper stays at fixed X position
    y: moveY
  };
};
