
import React from 'react';
import { Player, Ball, Position } from '../../types/football';
import { handleBallPhysics } from './ballPhysics/mainPhysics';

// Re-export main function to maintain compatibility with existing code
export { handleBallPhysics };

// Exportar nuevas utilidades de rebote y velocidad para usar en otros componentes
export { handleBoundaryBounce } from './ballPhysics/bounceUtils';
export { applyBallDeceleration } from './ballPhysics/velocityUtils';

// Helper function para crear efectos visuales al rebotar
export const createBounceEffect = (position: Position): void => {
  console.log("Efecto de rebote creado en:", position);
  // En el futuro podría implementarse una animación o efecto visual
};
