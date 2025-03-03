
import { Position, Player, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { limitSpeed } from '../ball/ballSpeed';

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
  
  // Calcular ángulo incidente
  const incidentAngle = Math.atan2(currentVelocity.y, currentVelocity.x);
  
  // Manejo especial para el portero - MEJORADO
  if (isGoalkeeper) {
    // Determinar qué portería está defendiendo
    const isLeftGoalkeeper = playerPosition.x < PITCH_WIDTH / 2;
    const centerY = PITCH_HEIGHT / 2;
    
    // ¿El balón se mueve hacia la portería?
    const ballMovingTowardsGoal = (isLeftGoalkeeper && currentVelocity.x < 0) || 
                                 (!isLeftGoalkeeper && currentVelocity.x > 0);
    
    if (ballMovingTowardsGoal) {
      // Calcular dirección de deflexión horizontal (lejos de la portería)
      const deflectionX = isLeftGoalkeeper ? 6.0 : -6.0; // Mayor potencia para despeje más fuerte
      
      // Calcular deflexión vertical para empujar la bola lejos del centro de la portería
      const verticalOffset = ballPosition.y - centerY;
      const verticalFactor = Math.sign(verticalOffset) * (1.0 + Math.min(Math.abs(verticalOffset) / 100, 1.5));
      
      // Mayor velocidad base para las paradas del portero
      const baseSpeed = 18; // Aumentado desde 14
      
      console.log(`¡PARADA del portero de equipo ${isLeftGoalkeeper ? 'rojo' : 'azul'}!`);
      
      return limitSpeed({
        x: deflectionX * baseSpeed * 0.8,
        y: verticalFactor * baseSpeed * 1.2
      });
    }
    
    // Cuando no está directamente parando, aún dirigir el balón hacia el lado correcto del campo
    // para prevenir autogoles del portero
    const teamDirection = isLeftGoalkeeper ? 1 : -1; // 1 para rojo (portero izquierdo), -1 para azul (portero derecho)
    
    return limitSpeed({
      x: Math.abs(currentVelocity.x) * teamDirection * 2.0,
      y: currentVelocity.y * 1.5
    });
  }

  // MEJORADO disparo direccional para jugadores de campo
  // Agregar lógica específica por equipo para hacer que la bola tienda a ir en la dirección correcta
  const team = playerPosition.x < PITCH_WIDTH / 2 ? 'red' : 'blue';
  const directionalBias = team === 'red' ? 0.3 : -0.3; // Positivo para equipo rojo, negativo para equipo azul
  
  // Para otros jugadores o cuando la bola no va hacia la portería
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;
  
  // Calcular velocidad de reflexión usando ángulo incidente con sesgo direccional
  const speed = Math.sqrt(
    currentVelocity.x * currentVelocity.x + 
    currentVelocity.y * currentVelocity.y
  );
  
  // Mayor velocidad base para todos los balones - nunca dejar que sea demasiado lento
  const adjustedSpeed = Math.max(8, speed * 1.5);  // Asegurar velocidad mínima de 8
  
  // Agregar sesgo direccional al ángulo de reflexión
  const reflectionAngle = angle + (angle - incidentAngle) * 0.8 + directionalBias;
  
  // Agregar variación aleatoria leve a la reflexión (reducida para comportamiento más predecible)
  const randomVariation = (Math.random() - 0.5) * 0.15; // Reducido desde 0.2
  
  // Mayor multiplicador para colisiones con el portero para despejes más fuertes
  const speedMultiplier = isGoalkeeper ? 2.2 : 1.7;
  
  // Calcular nueva velocidad con todos los factores combinados
  let newVelocity = {
    x: adjustedSpeed * Math.cos(reflectionAngle + randomVariation) * speedMultiplier,
    y: adjustedSpeed * Math.sin(reflectionAngle + randomVariation) * speedMultiplier
  };
  
  // Agregar una verificación final de sesgo direccional para situaciones muy peligrosas de autogol
  const movingTowardsOwnGoal = (team === 'red' && newVelocity.x < 0) || 
                              (team === 'blue' && newVelocity.x > 0);
                             
  if (movingTowardsOwnGoal && Math.abs(newVelocity.x) > 4) {
    // Invertir la dirección X si se dirige fuertemente hacia su propia portería
    newVelocity.x = -newVelocity.x * 1.2;
    console.log(`¡Corrección de emergencia de dirección aplicada para equipo ${team}!`);
  }
  
  return limitSpeed(newVelocity);
};
