import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT, NeuralNet } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Calculate goalkeeper speed multiplier based on team ELO difference
const calculateGoalkeeperSpeedMultiplier = (playerElo?: number, opposingTeamElo?: number): number => {
  // Default to 1.0 if ELOs are not available
  if (!playerElo || !opposingTeamElo) return 1.0;
  
  // Calculate ELO difference (capped at ±1000 to prevent extreme values)
  const eloDifference = Math.min(Math.max(playerElo - opposingTeamElo, -1000), 1000);
  
  // For each ELO point difference, we adjust by 0.1% (0.001)
  // Increase base multiplier to make movements more noticeable
  const speedMultiplier = 0.85 - Math.max(0, -eloDifference) * 0.0004;
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.18; // Increased slightly for more movement
  const eloBonus = playerElo ? Math.min(0.10, Math.max(0, (playerElo - 1500) / 5000)) : 0;
  const noiseLevel = baseNoise - eloBonus;
  
  // Generate random noise
  const noise = (Math.random() * 2 - 1) * noiseLevel;
  
  return value + noise;
};

// Increased chance of using neural network for goalkeeper from 5% to 15% when well positioned
const useNeuralNetworkForGoalkeeper = (
  player: Player, 
  ball: Ball, 
  brain: NeuralNet,
  isWellPositioned: boolean
): { x: number, y: number } | null => {
  // Use neural network more often when goalkeeper is well positioned
  // Otherwise keep original 5% chance
  const neuralNetworkChance = isWellPositioned ? 0.85 : 0.95;
  
  if (Math.random() < neuralNetworkChance) { // 15% chance when well positioned, 5% otherwise
    return null;
  }
  
  if (!isNetworkValid(brain.net)) {
    return null;
  }

  try {
    // Simple input for goalkeeper
    const input = {
      ballX: ball.position.x / PITCH_WIDTH,
      ballY: ball.position.y / PITCH_HEIGHT,
      playerX: player.position.x / PITCH_WIDTH,
      playerY: player.position.y / PITCH_HEIGHT,
      ballVelocityX: ball.velocity.x / 20,
      ballVelocityY: ball.velocity.y / 20,
      distanceToGoal: 0.5, // Not important for goalkeeper
      angleToGoal: 0,
      nearestTeammateDistance: 0.5,
      nearestTeammateAngle: 0,
      nearestOpponentDistance: 0.5,
      nearestOpponentAngle: 0,
      isInShootingRange: 0,
      isInPassingRange: 0,
      isDefendingRequired: 1, // Always 1 for goalkeepers
      teamElo: player.teamElo ? player.teamElo / 3000 : 0.5,
      eloAdvantage: 0.5,
      gameTime: 0.5,
      scoreDifferential: 0,
      momentum: 0.5,
      formationCompactness: 0.5,
      formationWidth: 0.5,
      recentSuccessRate: 0.5,
      possessionDuration: 0,
      distanceFromFormationCenter: 0.5,
      isInFormationPosition: 1,
      teammateDensity: 0.5,
      opponentDensity: 0.5
    };

    // Get network output
    const output = brain.net.run(input);
    
    // Use the neural network output with enhanced influence when well positioned
    if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
      // Increase neural network influence when goalkeeper is well-positioned
      const positionInfluenceMultiplier = isWellPositioned ? 0.7 : 0.2;
      const moveX = (output.moveX * 2 - 1) * positionInfluenceMultiplier; // Increased from 0.2
      const moveY = (output.moveY * 2 - 1) * (isWellPositioned ? 0.8 : 0.4); // Increased from 0.4
      
      console.log(`GK ${player.team}: USING NEURAL NETWORK - influence: ${positionInfluenceMultiplier.toFixed(1)}`);
      return { x: moveX, y: moveY };
    }
  } catch (error) {
    console.log("Error using neural network for goalkeeper:", error);
  }
  
  return null;
};

// Specialized movement logic for goalkeepers
export const moveGoalkeeper = (player: Player, ball: Ball, opposingTeamElo?: number): { x: number, y: number } => {
  // Define goal position constants
  const isLeftSide = player.team === 'red';
  const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
  const goalCenter = PITCH_HEIGHT / 2;
  
  // IMPORTANT: Always start by calculating movement to return to center first
  let moveX = 0;
  let moveY = 0;
  
  // Calculate current distance from optimal position (goal center)
  const distanceToGoalLine = Math.abs(player.position.x - goalLine);
  const distanceToCenter = Math.abs(player.position.y - goalCenter);
  
  // First, always prioritize returning to goal line if not there
  if (distanceToGoalLine > 3) {
    const returnSpeed = Math.min(distanceToGoalLine * 0.2, 2.5) * 1.4; // Increased speed to return to goal line
    moveX = Math.sign(goalLine - player.position.x) * returnSpeed;
    console.log(`GK ${player.team}: RETURNING TO GOAL LINE`);
  }
  
  // Second, always prioritize centering vertically if not centered
  if (distanceToCenter > 3) {
    const centeringSpeed = Math.min(distanceToCenter * 0.15, 1.8) * 1.3; // Increased centering speed
    moveY = Math.sign(goalCenter - player.position.y) * centeringSpeed;
    console.log(`GK ${player.team}: CENTERING VERTICALLY`);
  }
  
  // Once we're close to the ideal position (center of goal), then track the ball
  const isNearIdealPosition = distanceToGoalLine <= 3 && distanceToCenter <= 10;
  
  if (isNearIdealPosition) {
    // First try to use neural network with increased frequency when well positioned
    if (player.brain) {
      const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain, true);
      if (neuralMovement) {
        // Add minimal randomness to neural network output
        return {
          x: addPositioningNoise(neuralMovement.x, player.teamElo),
          y: addPositioningNoise(neuralMovement.y, player.teamElo)
        };
      }
    }
    
    // Calculate distance to ball
    const dx = ball.position.x - player.position.x;
    const dy = ball.position.y - player.position.y;
    const distanceToBall = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate if ball is moving toward goal
    const ballMovingTowardGoal = 
      (isLeftSide && ball.velocity.x < -1) || 
      (!isLeftSide && ball.velocity.x > 1);
    
    // Calculate expected ball position based on trajectory
    const expectedBallY = ball.position.y + (ball.velocity.y * 10);
    
    // Apply ELO-based speed multiplier
    const eloSpeedMultiplier = calculateGoalkeeperSpeedMultiplier(player.teamElo, opposingTeamElo);
    
    // FIXED: Greatly reduce goalkeeper forward movement and ensure they return to goal line
    const ballIsVeryClose = isLeftSide 
      ? ball.position.x < 70 && distanceToBall < 70  // Increased detection range
      : ball.position.x > PITCH_WIDTH - 70 && distanceToBall < 70;
      
    // Only allow minimal forward movement when ball is extremely close
    if (ballIsVeryClose && ballMovingTowardGoal) {
      // Maximum forward movement is now very limited but slightly increased
      const maxAdvance = isLeftSide ? 45 : PITCH_WIDTH - 45; // Increased from 40
      
      // Calculate target X position (much closer to goal line)
      const targetX = isLeftSide 
        ? Math.min(ball.position.x - 20, maxAdvance)
        : Math.max(ball.position.x + 20, maxAdvance);
      
      // Check if goalkeeper is already ahead of the target position
      const isAheadOfTarget = (isLeftSide && player.position.x > targetX) || 
                           (!isLeftSide && player.position.x < targetX);
      
      if (isAheadOfTarget) {
        // If ahead of target, move back to goal line quickly
        moveX = isLeftSide ? -1.8 : 1.8; // Increased return speed
      } else {
        // Move forward cautiously - slightly increased
        moveX = Math.sign(targetX - player.position.x) * 0.6 * eloSpeedMultiplier;
      }
    }
    
    // Calculate vertical movement to track the ball or expected ball position
    // If ball is moving fast, anticipate where it will go, with reduced error
    const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
    // Reduced prediction error for better positioning
    const predictionError = Math.random() * 10 - 5; // Reduced error range from ±10 to ±5
    const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
    
    // MEJORADO: Reducimos el sesgo de centralización para ser más reactivo en los laterales
    const centeringBias = isLeftSide 
      ? (ball.position.x > 300 ? 0.25 : 0.15) // Reducido de 0.3 a 0.25 y de 0.2 a 0.15
      : (ball.position.x < PITCH_WIDTH - 300 ? 0.25 : 0.15); // Reducido para mayor reactividad lateral
    
    // Ajuste para pelota cercana a los laterales del arco
    const distanceFromGoalCenter = Math.abs(ball.position.y - goalCenter);
    const isBallNearGoalSide = distanceFromGoalCenter > GOAL_HEIGHT/3 && distanceFromGoalCenter < GOAL_HEIGHT*1.2;
    
    // Reducir aún más el sesgo de centralización cuando la pelota está cerca de los laterales del arco
    const ballSideBias = isBallNearGoalSide ? 0.10 : centeringBias; // Reducido de 0.15 a 0.10
    
    // NUEVO: Más agresivo hacia los laterales cuando la pelota está cerca del arco y en los laterales
    const isCloseToGoal = isLeftSide 
      ? ball.position.x < 140 // Aumentado de 120 a 140
      : ball.position.x > PITCH_WIDTH - 140;
      
    const finalCenteringBias = isCloseToGoal && isBallNearGoalSide ? 0.03 : ballSideBias; // Reducido de 0.05 a 0.03
    
    // Aplicamos el sesgo ajustado
    const centeredTargetY = targetY * (1 - finalCenteringBias) + goalCenter * finalCenteringBias;
    
    // Ampliamos el rango de movimiento en el eje Y para cubrir mejor los laterales
    const maxYDistance = GOAL_HEIGHT/2 + 30; // Aumentado de 25 a 30
    const limitedTargetY = Math.max(
      PITCH_HEIGHT/2 - maxYDistance,
      Math.min(PITCH_HEIGHT/2 + maxYDistance, centeredTargetY)
    );
    
    // MEJORADO: Aumentamos la velocidad de reacción para disparos laterales
    const yDifference = limitedTargetY - player.position.y;
    
    // Factor de velocidad vertical basado en la proximidad a los laterales del arco
    let verticalSpeedMultiplier = 1.3; // Aumentado base de 1.2 a 1.3
    
    // Si la pelota va directo al centro, reducimos velocidad para evitar errores
    if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 0.9; // Mantenido en 0.9
    } 
    // Si la pelota va hacia los laterales, aumentamos velocidad
    else if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 1.6; // Aumentado de 1.5 a 1.6 para mayor reactividad lateral
      
      // Extra boost para pelotas muy cercanas a los laterales
      if (Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/2) {
        verticalSpeedMultiplier = 1.9; // Aumentado de 1.8 a 1.9 para los extremos
      }
    }
    
    // NUEVO: Factor de ajuste basado en la velocidad horizontal de la pelota
    const ballHorizontalVelocity = Math.abs(ball.velocity.x);
    if (ballHorizontalVelocity > 5 && ballMovingTowardGoal) {
      // Si la pelota viene rápido y directa, aumentamos más la reactividad
      verticalSpeedMultiplier *= 1.4; // Aumentado de 1.3 a 1.4
    }
    
    moveY = Math.sign(yDifference) * 
            Math.min(Math.abs(yDifference) * 0.16 * verticalSpeedMultiplier, 1.9) * // Aumentado de 0.15 a 0.16 y de 1.8 a 1.9
            eloSpeedMultiplier;
    
    // Bias suavizado hacia el centro cuando el portero está lejos
    if (Math.abs(player.position.y - goalCenter) > 30) { // Mantenido en 30
      const centeringCorrection = Math.sign(goalCenter - player.position.y) * 0.25; // Mantenido en 0.25
      moveY = moveY * 0.75 + centeringCorrection; // Mantenido en 0.75
    }
    
    // Priorizar movimiento vertical cuando la pelota viene directamente al arco
    if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 120) { // Mantenido en 120
      // MEJORADO: Aumentamos prioridad para disparos laterales
      const isLateralShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3;
      const verticalPriorityMultiplier = isLateralShot ? 1.2 : (0.8 + Math.random() * 0.2); // Aumentado de 1.1 a 1.2
      moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
    }
    
    // NUEVO: Log para disparos laterales
    if (isBallNearGoalSide && ballMovingTowardGoal && isCloseToGoal) {
      console.log(`GK ${player.team}: LATERAL SHOT RESPONSE - moveY: ${moveY.toFixed(2)}, bias: ${finalCenteringBias.toFixed(2)}`);
    }
    
    // MODIFICADO: Solo añadir micro-movimientos aleatorios si ya estamos bien posicionados
    // y no hay otro movimiento significativo
    if (Math.abs(moveX) < 0.1 && Math.abs(moveY) < 0.1) {
      // Try to use neural network again if we're idle
      if (player.brain) {
        const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain, true);
        if (neuralMovement) {
          // Add small random noise to neural output
          moveX = neuralMovement.x + (Math.random() - 0.5) * 0.1;
          moveY = neuralMovement.y + (Math.random() - 0.5) * 0.1;
          console.log(`GK ${player.team}: IDLE STATE NEURAL DECISION`);
        } else {
          // Fall back to micro-movements with slightly larger values
          moveX = (Math.random() - 0.5) * 0.4;
          moveY = (Math.random() - 0.5) * 0.5;
          console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT`);
        }
      } else {
        // No neural network, use random micro-movements
        moveX = (Math.random() - 0.5) * 0.4;
        moveY = (Math.random() - 0.5) * 0.5;
        console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT (NO NEURAL)`);
      }
    }
  }
  
  // Agregar ruido mínimo final al movimiento - aumentado ligeramente
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Reducimos la probabilidad de duda para movimientos más consistentes
  if (Math.random() < 0.04) { // Reducido de 0.05 a 0.04 (4% probabilidad de duda)
    moveX *= 0.7; 
    moveY *= 0.7;
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  // Forzar al portero a volver a la línea de gol si está demasiado lejos
  const maxDistanceFromGoalLine = 45;
  if (Math.abs(player.position.x - goalLine) > maxDistanceFromGoalLine) {
    // Anular movimiento para volver a la línea de gol con urgencia
    moveX = Math.sign(goalLine - player.position.x) * 2.8; // Mantenido en 2.8
    console.log(`GK ${player.team}: EMERGENCY RETURN TO GOAL LINE`);
  }
  
  // Corrección extra para permanecer cerca del centro del arco cuando está inactivo
  const isIdle = Math.abs(moveX) < 0.2 && Math.abs(moveY) < 0.2;
  if (isIdle && Math.abs(player.position.y - goalCenter) > GOAL_HEIGHT/4) {
    moveY = Math.sign(goalCenter - player.position.y) * 0.6; // Mantenido en 0.6
    console.log(`GK ${player.team}: CENTER CORRECTION`);
  }
  
  // NUEVO: Asegurar un movimiento mínimo para evitar que el portero se vea estático
  if (Math.abs(moveX) < 0.05 && Math.abs(moveY) < 0.05) {
    // Si el movimiento es muy pequeño, añadir un pequeño movimiento aleatorio
    moveX = (Math.random() - 0.5) * 0.3;
    moveY = (Math.random() - 0.5) * 0.4;
    console.log(`GK ${player.team}: FORCING MINIMUM MOVEMENT`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), distToCenter: ${distanceToCenter.toFixed(0)}, distToGoalLine: ${distanceToGoalLine.toFixed(0)}`);
  
  return { x: moveX, y: moveY };
};
