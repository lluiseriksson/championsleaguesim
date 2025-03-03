
import { Position } from '../../../types/football';

export function applyBallDeceleration(velocity: Position): Position {
  let newVelocity = { ...velocity };
  
  // Aplicar MÍNIMA desaceleración como en billar
  // Las bolas de billar tienen muy poca fricción/resistencia al aire
  newVelocity.x *= 0.997; // Casi nula desaceleración - física de billar
  newVelocity.y *= 0.997; // Casi nula desaceleración - física de billar
  
  // Comportamiento estilo billar: velocidad mínima fuerte para mantener el balón en movimiento
  const newSpeed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
  if (newSpeed < 6.0 && newSpeed > 0.1) {
    // Mantener dirección pero aumentar velocidad al mínimo
    const factor = 6.0 / Math.max(0.01, newSpeed); // Prevenir división por cero
    newVelocity.x *= factor;
    newVelocity.y *= factor;
  }
  
  // La bola se detiene completamente solo cuando está muy cercana a velocidad cero
  if (newSpeed < 0.1) {
    newVelocity.x = 0;
    newVelocity.y = 0;
  }
  
  return newVelocity;
}
