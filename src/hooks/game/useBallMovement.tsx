import React from 'react';
import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS } from '../../types/football';
import { handleBallPhysics } from './ballPhysicsUtils';
import { checkOffside } from '../../utils/gamePhysics';
import { toast } from 'sonner';

interface BallMovementProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch 
}: BallMovementProps) => {
  // Memoize player categorization
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  // Track last collision time to prevent multiple collisions in a short time
  const lastCollisionTimeRef = React.useRef(0);
  
  // Track the last position the ball was kicked from to prevent "stuck" situations
  const lastKickPositionRef = React.useRef<Position | null>(null);
  
  // Track time without movement to add a random kick if needed
  const noMovementTimeRef = React.useRef(0);
  const lastPositionRef = React.useRef<Position | null>(null);
  
  // Nuevo: Referencia para el último equipo que tocó el balón
  const lastTouchTeamRef = React.useRef<'red' | 'blue' | null>(null);
  
  // Nuevo: Referencia para controlar si hay un fuera de juego en curso
  const offsideDetectedRef = React.useRef(false);

  const updateBallPosition = React.useCallback(() => {
    setBall(currentBall => {
      // Check current ball speed
      const currentSpeed = Math.sqrt(
        currentBall.velocity.x * currentBall.velocity.x + 
        currentBall.velocity.y * currentBall.velocity.y
      );
      
      // Detect if ball is stuck in same position
      if (lastPositionRef.current) {
        const dx = currentBall.position.x - lastPositionRef.current.x;
        const dy = currentBall.position.y - lastPositionRef.current.y;
        const positionDelta = Math.sqrt(dx * dx + dy * dy);
        
        if (positionDelta < 0.1) {
          noMovementTimeRef.current += 1;
          
          // If ball hasn't moved for a while, give it a random kick
          if (noMovementTimeRef.current > 20) {
            console.log("Ball stuck in place, giving it a random kick");
            noMovementTimeRef.current = 0;
            
            // Random direction but not completely random
            return {
              ...currentBall,
              position: currentBall.position,
              velocity: {
                x: (Math.random() * 6) - 3,
                y: (Math.random() * 6) - 3
              }
            };
          }
        } else {
          // Reset counter if the ball is moving
          noMovementTimeRef.current = 0;
        }
      }
      
      // Update last position reference
      lastPositionRef.current = { ...currentBall.position };
      
      // If ball has zero velocity (should only happen at game start/reset),
      // give it a small push in a random direction
      if (currentSpeed === 0) {
        console.log("Ball has zero velocity, giving it an initial push");
        return {
          ...currentBall,
          position: currentBall.position,
          velocity: {
            x: (Math.random() * 6) - 3,
            y: (Math.random() * 6) - 3
          }
        };
      }
      
      // Calculate new position based on current velocity
      const newPosition = {
        x: currentBall.position.x + currentBall.velocity.x,
        y: currentBall.position.y + currentBall.velocity.y
      };

      // First check if a goal was scored
      const goalScored = checkGoal(newPosition);
      if (goalScored) {
        console.log(`Goal detected for team ${goalScored}`);
        // Reset ball position to center with a significant initial velocity
        return {
          ...currentBall,
          position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
          velocity: { 
            x: goalScored === 'red' ? 5 : -5, 
            y: (Math.random() - 0.5) * 5
          },
          bounceDetection: {
            consecutiveBounces: 0,
            lastBounceTime: 0,
            lastBounceSide: '',
            sideEffect: false
          }
        };
      }

      // Handle ball physics, but with a custom onBallTouch handler to track last touch team
      return handleBallPhysics(
        currentBall,
        newPosition,
        goalkeepers,
        fieldPlayers,
        (player) => {
          // Si ya se detectó un fuera de juego, ignorar nuevos toques hasta reiniciar
          if (offsideDetectedRef.current) return;
          
          // Guardar el equipo que tocó el balón por última vez
          lastTouchTeamRef.current = player.team;
          
          // Después de un toque, comprobar si hay jugadores en fuera de juego que reciban el balón
          for (const potentialReceiver of players) {
            // Solo comprobar jugadores del mismo equipo que el pasador
            if (potentialReceiver.id !== player.id && potentialReceiver.team === player.team) {
              // Calcular distancia al balón
              const dx = potentialReceiver.position.x - currentBall.position.x;
              const dy = potentialReceiver.position.y - currentBall.position.y;
              const distToBall = Math.sqrt(dx*dx + dy*dy);
              
              // Si está cerca del balón (posible receptor) y está en fuera de juego
              if (distToBall < 40 && checkOffside(potentialReceiver, players, currentBall.position, player.team)) {
                console.log(`¡Fuera de juego detectado! Jugador ${potentialReceiver.id} del equipo ${potentialReceiver.team}`);
                
                // Marcar que se ha detectado un fuera de juego
                offsideDetectedRef.current = true;
                
                // Mostrar notificación de fuera de juego
                toast(`¡FUERA DE JUEGO!`, {
                  description: `Equipo ${potentialReceiver.team === 'red' ? 'rojo' : 'azul'}`,
                  position: "top-center",
                });
                
                // Cambiar la dirección del balón (tiro libre indirecto)
                const newDirection = potentialReceiver.team === 'red' ? -1 : 1;
                
                // Devolver el balón con una velocidad controlada
                return {
                  ...currentBall,
                  position: currentBall.position,
                  velocity: { 
                    x: newDirection * 5, 
                    y: (Math.random() - 0.5) * 2
                  }
                };
              }
            }
          }
          
          // Si no hay fuera de juego, llamar al manipulador de toques normal
          onBallTouch(player);
        },
        lastCollisionTimeRef,
        lastKickPositionRef
      );
    });
    
    // Resetear el estado de fuera de juego después de un tiempo
    if (offsideDetectedRef.current) {
      setTimeout(() => {
        offsideDetectedRef.current = false;
      }, 1500);
    }
  }, [setBall, checkGoal, goalkeepers, fieldPlayers, onBallTouch, players]);

  return { updateBallPosition };
};
