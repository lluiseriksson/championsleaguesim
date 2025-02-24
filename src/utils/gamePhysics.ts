
import { Position, PLAYER_RADIUS, BALL_RADIUS, GOALKEEPER_ARM_LENGTH, GOALKEEPER_ARM_WIDTH } from '../types/football';

export const checkCollision = (ballPos: Position, playerPos: Position, isGoalkeeper: boolean = false) => {
  // Colisión normal con el cuerpo del jugador
  const dx = ballPos.x - playerPos.x;
  const dy = ballPos.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < (PLAYER_RADIUS + BALL_RADIUS)) {
    return true;
  }

  // Si es portero, comprobar colisión con los brazos
  if (isGoalkeeper) {
    // Brazo horizontal
    const armY = playerPos.y;
    const armStartX = playerPos.x - GOALKEEPER_ARM_LENGTH/2;
    const armEndX = playerPos.x + GOALKEEPER_ARM_LENGTH/2;
    
    if (ballPos.y >= armY - GOALKEEPER_ARM_WIDTH/2 - BALL_RADIUS &&
        ballPos.y <= armY + GOALKEEPER_ARM_WIDTH/2 + BALL_RADIUS &&
        ballPos.x >= armStartX - BALL_RADIUS &&
        ballPos.x <= armEndX + BALL_RADIUS) {
      return true;
    }
  }

  return false;
};

export const calculateNewVelocity = (
  ballPosition: Position,
  playerPosition: Position,
  currentVelocity: Position,
  isGoalkeeper: boolean = false
) => {
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  const angle = Math.atan2(dy, dx);
  let speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );

  // Si es portero, aumentamos la velocidad de rebote y hacemos que sea más predecible
  if (isGoalkeeper) {
    speed *= 1.5; // Rebote más fuerte para el portero
    // Hacer que el rebote sea más vertical cuando golpea los brazos
    if (Math.abs(dy) < GOALKEEPER_ARM_WIDTH) {
      return {
        x: -currentVelocity.x * 1.2,
        y: (Math.random() > 0.5 ? 1 : -1) * speed * 0.8
      };
    }
  }

  return {
    x: speed * Math.cos(angle),
    y: speed * Math.sin(angle)
  };
};
