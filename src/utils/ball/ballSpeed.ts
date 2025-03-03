
import { Position } from '../../types/football';

const MAX_BALL_SPEED = 25; // Aumentado para mejor física de billar
const MIN_BALL_SPEED = 7.0; // Aumentado para asegurar que el balón siga moviéndose como bola de billar

export const limitSpeed = (velocity: Position): Position => {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  
  // Aplicar límite de velocidad máxima
  if (speed > MAX_BALL_SPEED) {
    const factor = MAX_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  // SIEMPRE aplicar velocidad mínima a menos que la bola deba detenerse completamente
  // Las bolas de billar mantienen el impulso - mayor velocidad mínima
  if (speed < MIN_BALL_SPEED && speed > 0.1) {
    const factor = MIN_BALL_SPEED / speed;
    return {
      x: velocity.x * factor,
      y: velocity.y * factor
    };
  }
  
  // Detener completamente solo cuando la velocidad es muy baja
  if (speed <= 0.1) {
    return { x: 0, y: 0 };
  }
  
  return velocity;
};

export const addRandomEffect = (velocity: Position): Position => {
  // Aleatoriedad estilo billar - más controlada pero aún impredecible
  const speedMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  const randomFactor = 0.2; // 20% de aleatorización
  
  const randomX = (Math.random() - 0.5) * speedMagnitude * randomFactor;
  const randomY = (Math.random() - 0.5) * speedMagnitude * randomFactor;
  
  return {
    x: velocity.x + randomX,
    y: velocity.y + randomY
  };
};
