import { Position, PLAYER_RADIUS, BALL_RADIUS } from '../types/football';

const MAX_BALL_SPEED = 15;
const MIN_BALL_SPEED = 0.8; // Increased minimum ball speed

const limitSpeed = (velocity: Position): Position => {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  
  // Apply maximum speed limit
  if (speed > MAX_BALL_SPEED) {
    const factor = MAX_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  // Apply minimum speed if the ball is moving slowly
  if (speed < MIN_BALL_SPEED) {
    // If almost stopped, add a more noticeable random impulse
    if (speed < 0.3) {
      const randomAngle = Math.random() * Math.PI * 2;
      return {
        x: MIN_BALL_SPEED * Math.cos(randomAngle),
        y: MIN_BALL_SPEED * Math.sin(randomAngle)
      };
    }
    // Otherwise scale up to minimum speed
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  return velocity;
};

export const checkCollision = (ballPos: Position, playerPos: Position): boolean => {
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
): Position => {
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
        x: deflectionX * speed * 0.9,
        y: verticalFactor * speed * 1.3
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
  
  // Si la velocidad es muy baja, dar un impulso adicional
  const adjustedSpeed = speed < 2 ? 5 : speed * 1.2;
  
  const reflectionAngle = angle + (angle - incidentAngle);
  
  // Añadir una pequeña variación aleatoria al rebote
  const randomVariation = (Math.random() - 0.5) * 0.3;
  
  return limitSpeed({
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * (isGoalkeeper ? 1.3 : 1.2),
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * (isGoalkeeper ? 1.3 : 1.2)
  });
};
