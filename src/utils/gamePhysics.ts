
import { Position, PLAYER_RADIUS, BALL_RADIUS } from '../types/football';

export const checkCollision = (ballPos: Position, playerPos: Position) => {
  const dx = ballPos.x - playerPos.x;
  const dy = ballPos.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (PLAYER_RADIUS + BALL_RADIUS);
};

export const calculateNewVelocity = (
  ballPosition: Position,
  playerPosition: Position,
  currentVelocity: Position
) => {
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  const angle = Math.atan2(dy, dx);
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  ) * 1.1;

  return {
    x: speed * Math.cos(angle),
    y: speed * Math.sin(angle)
  };
};
