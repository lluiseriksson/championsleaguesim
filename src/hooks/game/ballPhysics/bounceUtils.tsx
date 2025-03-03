
import React from 'react';
import { Position, PITCH_HEIGHT, PITCH_WIDTH } from '../../../types/football';
import { addRandomEffect } from '../../../utils/ball/ballSpeed';

interface BounceDetection {
  consecutiveBounces: number;
  lastBounceTime: number;
  lastBounceSide: string;
  sideEffect: boolean;
}

export function handleBoundaryBounce(
  newPosition: Position,
  newVelocity: Position,
  bounceDetectionRef: BounceDetection
): { position: Position, velocity: Position, bounceDetection: BounceDetection } {
  const currentTime = performance.now();
  const bounceCooldown = 1000; // 1 segundo entre contar rebotes consecutivos
  
  // Variables para el rebote de billar
  const ELASTICITY = 0.98; // Para rebotes muy elásticos como billar (casi 1)
  const MIN_BOUNCE_SPEED = 7; // Velocidad mínima después de rebotes
  const CORNER_BOOST = 1.2; // Rebote más fuerte en esquinas
  
  // Handle top and bottom boundary collisions con física de billar
  if (newPosition.y <= BALL_RADIUS || newPosition.y >= PITCH_HEIGHT - BALL_RADIUS) {
    // BILLIARD-STYLE BOUNCE: highly elastic, almost perfect conservation of energy
    newVelocity.y = -newVelocity.y * ELASTICITY; // Muy poca pérdida de energía
    
    // Asegurar que la bola rebota con velocidad suficiente (nunca pierde fuerza, como billar)
    if (Math.abs(newVelocity.y) < MIN_BOUNCE_SPEED) {
      newVelocity.y = newVelocity.y > 0 ? MIN_BOUNCE_SPEED : -MIN_BOUNCE_SPEED;
    }
    
    // Incrementar levemente componente X para prevenir rebotes verticales infinitos
    newVelocity.x *= 1.02;
    
    // Registrar el lado del rebote
    const currentSide = newPosition.y <= BALL_RADIUS ? 'top' : 'bottom';
    
    // Detectar rebotes consecutivos en el mismo lado
    if (bounceDetectionRef.lastBounceSide === currentSide && 
        currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
      bounceDetectionRef.consecutiveBounces++;
      
      // Si la bola está rebotando repetidamente en el mismo lado, añadir efecto aleatorio
      if (bounceDetectionRef.consecutiveBounces >= 2) {
        console.log(`¡Bola atrapada en borde ${currentSide}! Aplicando efecto de billar`);
        
        // Agregar un ángulo más pronunciado para escapar - como en billar
        const centerY = PITCH_HEIGHT / 2;
        const pushDirection = currentSide === 'top' ? 1 : -1;
        
        // Componente Y más fuerte para escapar del borde
        newVelocity.y = pushDirection * Math.abs(newVelocity.y) * 1.3;
        
        // Aumentar componente X para agregar más ángulo al rebote
        newVelocity.x *= 1.5;
        
        // Marcar que se aplicó un efecto especial visual
        bounceDetectionRef.sideEffect = true;
        
        // Reiniciar contador después de aplicar efecto
        bounceDetectionRef.consecutiveBounces = 0;
      }
    } else {
      bounceDetectionRef.consecutiveBounces = 1;
    }
    
    bounceDetectionRef.lastBounceSide = currentSide;
    bounceDetectionRef.lastBounceTime = currentTime;
  }

  // Handle left and right boundary collisions - FÍSICA DE BILLAR PERFECTA
  if (newPosition.x <= BALL_RADIUS || newPosition.x >= PITCH_WIDTH - BALL_RADIUS) {
    // Verificar si está en la zona de gol
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;
    
    if (newPosition.y < goalTop || newPosition.y > goalBottom) {
      // REBOTE DE BILLAR: perfectamente elástico, casi sin pérdida de energía
      newVelocity.x = -newVelocity.x * ELASTICITY; 
      
      // Asegurar velocidad mínima después del rebote
      if (Math.abs(newVelocity.x) < MIN_BOUNCE_SPEED) {
        newVelocity.x = newVelocity.x > 0 ? MIN_BOUNCE_SPEED : -MIN_BOUNCE_SPEED;
      }
      
      // Agregar ángulo para evitar rebotes perfectamente horizontales
      if (Math.abs(newVelocity.y) < 2) {
        // Agregar componente Y para que nunca rebote perfectamente horizontal
        // En billar, las bolas rara vez rebotan en línea recta perfecta
        newVelocity.y += (Math.random() - 0.5) * 3;
      } else {
        // Potenciar componente Y existente levemente
        newVelocity.y *= 1.05;
      }
      
      // Verificar si es un rebote en esquina para dar efecto especial
      const isNearTopCorner = newPosition.y < BALL_RADIUS * 3;
      const isNearBottomCorner = newPosition.y > PITCH_HEIGHT - BALL_RADIUS * 3;
      
      if (isNearTopCorner || isNearBottomCorner) {
        console.log("¡Rebote en esquina! Aplicando efecto de billar especial");
        // En billar, los rebotes de esquina tienen efectos interesantes
        newVelocity.x *= CORNER_BOOST;
        newVelocity.y *= CORNER_BOOST;
        bounceDetectionRef.sideEffect = true;
      }
      
      // Seguimiento de rebotes consecutivos en el mismo lado
      const currentSide = newPosition.x <= BALL_RADIUS ? 'left' : 'right';
      
      if (bounceDetectionRef.lastBounceSide === currentSide && 
          currentTime - bounceDetectionRef.lastBounceTime < bounceCooldown) {
        bounceDetectionRef.consecutiveBounces++;
        
        // Incluso con física de billar, evitar que se quede atascada
        if (bounceDetectionRef.consecutiveBounces >= 2) {
          console.log(`Bola atascada en borde ${currentSide}, aplicando rebote de billar mejorado`);
          bounceDetectionRef.sideEffect = true;
          
          // Agregar un ángulo más pronunciado - como en billar cuando golpea con efecto
          const centerX = PITCH_WIDTH / 2;
          const pushDirection = currentSide === 'left' ? 1 : -1;
          
          // Corrección más agresiva con componente horizontal más fuerte
          newVelocity.x = pushDirection * Math.abs(newVelocity.x) * 1.5;
          
          // Agregar componente Y significativo para rebote en ángulo
          const yVariation = (Math.random() - 0.5) * 10;
          newVelocity.y += yVariation;
          
          // Reiniciar contador después de aplicar efecto
          bounceDetectionRef.consecutiveBounces = 0;
        }
      } else {
        bounceDetectionRef.consecutiveBounces = 1;
      }
      
      bounceDetectionRef.lastBounceSide = currentSide;
      bounceDetectionRef.lastBounceTime = currentTime;
    }
  }

  // Asegurar que la bola permanezca dentro de los límites del campo
  newPosition.x = Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newPosition.x));
  newPosition.y = Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newPosition.y));

  return {
    position: newPosition,
    velocity: newVelocity,
    bounceDetection: bounceDetectionRef
  };
}

// Constantes
const BALL_RADIUS = 6;
const GOAL_HEIGHT = 160;
