
import { Position, PLAYER_RADIUS, BALL_RADIUS } from '../types/football';

const MAX_BALL_SPEED = 15;

const limitSpeed = (velocity: Position): Position => {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  if (speed > MAX_BALL_SPEED) {
    const factor = MAX_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  return velocity;
};

export const checkCollision = (ballPos: Position, playerPos: Position) => {
  const dx = ballPos.x - playerPos.x;
  const dy = ballPos.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = PLAYER_RADIUS + BALL_RADIUS;
  return distance <= minDistance;
};

export const calculateNewVelocity = (
  ballPosition: Position,
  playerPosition: Position,
  currentVelocity: Position,
  isGoalkeeper: boolean = false
) => {
  const dx = ballPosition.x - playerPosition.x;
  const dy = ballPosition.y - playerPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // Calcular el ángulo de incidencia
  const incidentAngle = Math.atan2(currentVelocity.y, currentVelocity.x);
  
  // Para porteros, calcular un rebote más realista
  if (isGoalkeeper) {
    const ballMovingTowardsGoal = (playerPosition.x < 400 && currentVelocity.x < 0) || 
                                 (playerPosition.x > 400 && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Calcular dirección del rebote (alejándose de la portería)
      const deflectionX = playerPosition.x < 400 ? 1 : -1;
      
      // Calcular componente vertical del rebote basado en el punto de impacto
      const verticalFactor = dy / (PLAYER_RADIUS + BALL_RADIUS);
      
      // Mantener parte de la velocidad original
      const speed = Math.sqrt(
        currentVelocity.x * currentVelocity.x + 
        currentVelocity.y * currentVelocity.y
      );
      
      return limitSpeed({
        x: deflectionX * speed * 0.8,
        y: verticalFactor * speed * 1.2
      });
    }
  }

  // Para otros jugadores o cuando el balón no va a gol
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Calcular la velocidad de rebote usando el ángulo de incidencia
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );
  
  const reflectionAngle = angle + (angle - incidentAngle);
  
  // Añadir una pequeña variación aleatoria al rebote
  const randomVariation = (Math.random() - 0.5) * 0.2;
  
  return limitSpeed({
    x: speed * Math.cos(reflectionAngle + randomVariation) * (isGoalkeeper ? 1.2 : 1.1),
    y: speed * Math.sin(reflectionAngle + randomVariation) * (isGoalkeeper ? 1.2 : 1.1)
  });
};
