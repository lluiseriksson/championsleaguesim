
import { Position, PLAYER_RADIUS, BALL_RADIUS, GOALKEEPER_ARM_LENGTH, GOALKEEPER_ARM_WIDTH } from '../types/football';

export const checkCollision = (ballPos: Position, playerPos: Position) => {
  const dx = ballPos.x - playerPos.x;
  const dy = ballPos.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (PLAYER_RADIUS + BALL_RADIUS);
};

export const calculateNewVelocity = (
  ballPosition: Position,
  playerPosition: Position,
  currentVelocity: Position,
  isGoalkeeper: boolean = false
) => {
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  
  // Si es portero y el balón va hacia la portería, calculamos un ángulo de rebote más realista
  if (isGoalkeeper) {
    const ballMovingTowardsGoal = (playerPosition.x < 400 && currentVelocity.x < 0) || 
                                 (playerPosition.x > 400 && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Calculamos el ángulo de impacto
      const impactAngle = Math.atan2(dy, dx);
      
      // Velocidad actual del balón
      const currentSpeed = Math.sqrt(
        currentVelocity.x * currentVelocity.x + 
        currentVelocity.y * currentVelocity.y
      );
      
      // Determinar dirección del rebote (alejándose de la portería)
      const deflectionX = playerPosition.x < 400 ? 1 : -1;
      
      // Calcular componente vertical del rebote basado en el punto de impacto
      const verticalFactor = dy / (PLAYER_RADIUS + BALL_RADIUS);
      
      return {
        x: deflectionX * currentSpeed * 0.8,
        y: verticalFactor * currentSpeed * 1.2
      };
    }
  }

  // Para otros jugadores o cuando el balón no va a gol, usamos el rebote normal
  const angle = Math.atan2(dy, dx);
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  ) * (isGoalkeeper ? 1.2 : 1.1);

  return {
    x: speed * Math.cos(angle),
    y: speed * Math.sin(angle)
  };
};
