import { Position, Player, PLAYER_RADIUS, BALL_RADIUS, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

const MAX_BALL_SPEED = 15;
const MIN_BALL_SPEED = 3.5; // Significantly increased minimum speed

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
  
  // ALWAYS apply minimum speed unless the ball should be completely stopped
  // (which should only happen at game reset/initialization)
  if (speed < MIN_BALL_SPEED && speed > 0) {
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
  
  // Add a small buffer to prevent the ball from getting stuck
  return distance <= minDistance + 0.5;
};

export const addRandomEffect = (velocity: Position): Position => {
  // Add a small random component to the X velocity
  const randomX = (Math.random() - 0.5) * 2;
  // Add a larger random component to the Y velocity to push ball inward
  const randomY = (Math.random() * 2) - 1;
  
  return {
    x: velocity.x + randomX,
    y: velocity.y + randomY * 2 // Greater effect on Y to push ball away from boundaries
  };
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
  
  // Calculate incident angle
  const incidentAngle = Math.atan2(currentVelocity.y, currentVelocity.x);
  
  // Special handling for goalkeeper - ENHANCED
  if (isGoalkeeper) {
    // Determine which goal the goalkeeper is defending
    const isLeftGoalkeeper = playerPosition.x < PITCH_WIDTH / 2;
    const centerY = PITCH_HEIGHT / 2;
    
    // Is the ball moving toward the goal?
    const ballMovingTowardsGoal = (isLeftGoalkeeper && currentVelocity.x < 0) || 
                                 (!isLeftGoalkeeper && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Calculate horizontal deflection direction (away from the goal)
      const deflectionX = isLeftGoalkeeper ? 4.5 : -4.5; // Increased power for stronger clearance
      
      // Calculate vertical deflection to push ball away from goal center for better clearances
      const verticalOffset = ballPosition.y - centerY;
      const verticalFactor = Math.sign(verticalOffset) * (1.0 + Math.min(Math.abs(verticalOffset) / 100, 1.0));
      
      // Higher base speed for goalkeeper saves
      const baseSpeed = 14; // Increased from 12
      
      console.log(`Goalkeeper SAVE by ${isLeftGoalkeeper ? 'red' : 'blue'} team!`);
      
      return limitSpeed({
        x: deflectionX * baseSpeed,
        y: verticalFactor * baseSpeed * 1.5
      });
    }
    
    // When not directly saving, still direct the ball towards the correct side of the field
    // to prevent own goals by the goalkeeper
    const teamDirection = isLeftGoalkeeper ? 1 : -1; // 1 for red (left goalkeeper), -1 for blue (right goalkeeper)
    
    return limitSpeed({
      x: Math.abs(currentVelocity.x) * teamDirection * 1.5,
      y: currentVelocity.y
    });
  }

  // ENHANCED directional shooting for field players
  // Add team-specific logic to make the ball tend to go in the right direction
  const team = playerPosition.x < PITCH_WIDTH / 2 ? 'red' : 'blue';
  const directionalBias = team === 'red' ? 0.2 : -0.2; // Positive for red team, negative for blue team
  
  // For other players or when the ball isn't going toward goal
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Calculate reflection velocity using incident angle with directional bias
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );
  
  // Higher base speed for all balls - never let it get too slow
  const adjustedSpeed = Math.max(7, speed * 1.3);  // Ensure speed is at least 7
  
  // Add directional bias to reflection angle
  const reflectionAngle = angle + (angle - incidentAngle) + directionalBias;
  
  // Add slight random variation to the reflection (reduced for more predictable behavior)
  const randomVariation = (Math.random() - 0.5) * 0.2; // Reduced from 0.3
  
  // Higher multiplier for goalkeeper collisions for stronger clearances
  const speedMultiplier = isGoalkeeper ? 2.0 : 1.5;
  
  // Calculate new velocity with all factors combined
  let newVelocity = {
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * speedMultiplier,
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * speedMultiplier
  };
  
  // Add one final directional bias check for very dangerous own-goal situations
  const movingTowardsOwnGoal = (team === 'red' && newVelocity.x < 0) || 
                              (team === 'blue' && newVelocity.x > 0);
                             
  if (movingTowardsOwnGoal && Math.abs(newVelocity.x) > 3) {
    // Flip the x direction if headed strongly towards own goal
    newVelocity.x = -newVelocity.x;
    console.log(`Emergency direction correction applied for ${team} team!`);
  }
  
  return limitSpeed(newVelocity);
};

// Nueva función para detectar el fuera de juego
export const checkOffside = (
  player: Player,
  players: Player[],
  ball: Position,
  lastTouchTeam: 'red' | 'blue'
): boolean => {
  // No se aplica fuera de juego si el jugador es del equipo que no tocó la pelota por última vez
  if (player.team !== lastTouchTeam) {
    return false;
  }
  
  // No hay fuera de juego en el propio campo
  const isInOwnHalf = (player.team === 'red' && player.position.x < PITCH_WIDTH / 2) ||
                      (player.team === 'blue' && player.position.x > PITCH_WIDTH / 2);
  if (isInOwnHalf) {
    return false;
  }
  
  // Detectar la posición del penúltimo defensor del equipo contrario
  const opposingTeam = player.team === 'red' ? 'blue' : 'red';
  const opposingPlayers = players.filter(p => p.team === opposingTeam);
  
  // Incluir al portero y ordenar por posición X (para equipo rojo) o posición X inversa (para equipo azul)
  const sortedOpposingPlayers = [...opposingPlayers].sort((a, b) => {
    if (player.team === 'red') {
      return a.position.x - b.position.x; // Para el equipo rojo, ordenar de izquierda a derecha
    } else {
      return b.position.x - a.position.x; // Para el equipo azul, ordenar de derecha a izquierda
    }
  });
  
  // Si hay menos de 2 jugadores del equipo contrario, no hay fuera de juego
  if (sortedOpposingPlayers.length < 2) {
    return false;
  }
  
  // El penúltimo defensor es el segundo de la lista ordenada
  const penultimateDefender = sortedOpposingPlayers[1];
  
  // Comprobar si el jugador está más allá del penúltimo defensor
  if (player.team === 'red') {
    // Para el equipo rojo, fuera de juego si está más a la derecha que el penúltimo defensor
    return player.position.x > penultimateDefender.position.x;
  } else {
    // Para el equipo azul, fuera de juego si está más a la izquierda que el penúltimo defensor
    return player.position.x < penultimateDefender.position.x;
  }
};
