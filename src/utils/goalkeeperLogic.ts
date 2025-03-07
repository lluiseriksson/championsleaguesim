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
  const speedMultiplier = 0.90 - Math.max(0, -eloDifference) * 0.0004; // Increased from 0.85 to 0.90
  
  return speedMultiplier;
};

// Add a function to introduce randomness based on skill level
const addPositioningNoise = (value: number, playerElo?: number): number => {
  // Calculate noise level inversely related to ELO (better players have less noise)
  const baseNoise = 0.20; // Increased from 0.18 to 0.20
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
  const neuralNetworkChance = isWellPositioned ? 0.65 : 0.90; // Increased neural network usage (from 0.85/0.95)
  
  if (Math.random() < neuralNetworkChance) { // 35% chance when well positioned, 10% otherwise
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
      const positionInfluenceMultiplier = isWellPositioned ? 0.9 : 0.3; // Increased from 0.7 to 0.9
      const moveX = (output.moveX * 2 - 1) * positionInfluenceMultiplier; // Increased influence
      const moveY = (output.moveY * 2 - 1) * (isWellPositioned ? 1.0 : 0.5); // Increased from 0.8 to 1.0
      
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
    const returnSpeed = Math.min(distanceToGoalLine * 0.25, 3.0) * 1.5; // Increased from 0.2 to 0.25 and from 2.5 to 3.0
    moveX = Math.sign(goalLine - player.position.x) * returnSpeed;
    console.log(`GK ${player.team}: RETURNING TO GOAL LINE`);
  }
  
  // Second, always prioritize centering vertically if not centered
  if (distanceToCenter > 3) {
    const centeringSpeed = Math.min(distanceToCenter * 0.18, 2.0) * 1.4; // Increased from 0.15 to 0.18 and from 1.8 to 2.0
    moveY = Math.sign(goalCenter - player.position.y) * centeringSpeed;
    console.log(`GK ${player.team}: CENTERING VERTICALLY`);
  }
  
  // Once we're close to the ideal position (center of goal), then track the ball
  // Increase the range of when goalkeeper is considered in position
  const isNearIdealPosition = distanceToGoalLine <= 4 && distanceToCenter <= 12; // Increased from 3 to 4 and from 10 to 12
  
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
      ? ball.position.x < 80 && distanceToBall < 80  // Increased detection range from 70 to 80
      : ball.position.x > PITCH_WIDTH - 80 && distanceToBall < 80;
      
    // Only allow minimal forward movement when ball is extremely close
    if (ballIsVeryClose && ballMovingTowardGoal) {
      // Maximum forward movement is now very limited but slightly increased
      const maxAdvance = isLeftSide ? 50 : PITCH_WIDTH - 50; // Increased from 45 to 50
      
      // Calculate target X position (much closer to goal line)
      const targetX = isLeftSide 
        ? Math.min(ball.position.x - 20, maxAdvance)
        : Math.max(ball.position.x + 20, maxAdvance);
      
      // Check if goalkeeper is already ahead of the target position
      const isAheadOfTarget = (isLeftSide && player.position.x > targetX) || 
                           (!isLeftSide && player.position.x < targetX);
      
      if (isAheadOfTarget) {
        // If ahead of target, move back to goal line quickly
        moveX = isLeftSide ? -2.0 : 2.0; // Increased from 1.8 to 2.0
      } else {
        // Move forward cautiously - slightly increased
        moveX = Math.sign(targetX - player.position.x) * 0.7 * eloSpeedMultiplier; // Increased from 0.6 to 0.7
      }
    }
    
    // Calculate vertical movement to track the ball or expected ball position
    // If ball is moving fast, anticipate where it will go, with reduced error
    const isBallMovingFast = Math.abs(ball.velocity.y) > 3;
    // Reduced prediction error for better positioning
    const predictionError = Math.random() * 8 - 4; // Reduced error range from ±5 to ±4
    const targetY = isBallMovingFast ? expectedBallY + predictionError : ball.position.y;
    
    // MEJORADO: Reducimos el sesgo de centralización para ser más reactivo en los laterales
    const centeringBias = isLeftSide 
      ? (ball.position.x > 300 ? 0.20 : 0.12) // Reducido de 0.25 a 0.20 y de 0.15 a 0.12
      : (ball.position.x < PITCH_WIDTH - 300 ? 0.20 : 0.12); // Reducido para mayor reactividad lateral
    
    // Ajuste para pelota cercana a los laterales del arco
    const distanceFromGoalCenter = Math.abs(ball.position.y - goalCenter);
    const isBallNearGoalSide = distanceFromGoalCenter > GOAL_HEIGHT/3 && distanceFromGoalCenter < GOAL_HEIGHT*1.2;
    
    // Reducir aún más el sesgo de centralización cuando la pelota está cerca de los laterales del arco
    const ballSideBias = isBallNearGoalSide ? 0.08 : centeringBias; // Reducido de 0.10 a 0.08
    
    // NUEVO: Más agresivo hacia los laterales cuando la pelota está cerca del arco y en los laterales
    const isCloseToGoal = isLeftSide 
      ? ball.position.x < 150 // Aumentado de 140 a 150
      : ball.position.x > PITCH_WIDTH - 150;
      
    const finalCenteringBias = isCloseToGoal && isBallNearGoalSide ? 0.02 : ballSideBias; // Reducido de 0.03 a 0.02
    
    // Aplicamos el sesgo ajustado
    const centeredTargetY = targetY * (1 - finalCenteringBias) + goalCenter * finalCenteringBias;
    
    // Ampliamos el rango de movimiento en el eje Y para cubrir mejor los laterales
    const maxYDistance = GOAL_HEIGHT/2 + 40; // Increased from 30 to 40
    const limitedTargetY = Math.max(
      PITCH_HEIGHT/2 - maxYDistance,
      Math.min(PITCH_HEIGHT/2 + maxYDistance, centeredTargetY)
    );
    
    // MEJORADO: Aumentamos la velocidad de reacción para disparos laterales
    const yDifference = limitedTargetY - player.position.y;
    
    // Factor de velocidad vertical basado en la proximidad a los laterales del arco
    let verticalSpeedMultiplier = 1.5; // Increased from 1.3 to 1.5
    
    // Si la pelota va directo al centro, reducimos velocidad para evitar errores
    if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) < GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 1.0; // Increased from 0.9 to 1.0
    } 
    // Si la pelota va hacia los laterales, aumentamos velocidad
    else if (ballMovingTowardGoal && Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3) {
      verticalSpeedMultiplier = 1.8; // Increased from 1.6 to 1.8
      
      // Extra boost para pelotas muy cercanas a los laterales
      if (Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/2) {
        verticalSpeedMultiplier = 2.1; // Increased from 1.9 to 2.1
      }
    }
    
    // NUEVO: Factor de ajuste basado en la velocidad horizontal de la pelota
    const ballHorizontalVelocity = Math.abs(ball.velocity.x);
    if (ballHorizontalVelocity > 5 && ballMovingTowardGoal) {
      // Si la pelota viene rápido y directa, aumentamos más la reactividad
      verticalSpeedMultiplier *= 1.5; // Increased from 1.4 to 1.5
    }
    
    moveY = Math.sign(yDifference) * 
            Math.min(Math.abs(yDifference) * 0.18 * verticalSpeedMultiplier, 2.2) * // Increased from 0.16 to 0.18 and from 1.9 to 2.2
            eloSpeedMultiplier;
    
    // Bias suavizado hacia el centro cuando el portero está lejos
    if (Math.abs(player.position.y - goalCenter) > 35) { // Increased from 30 to 35
      const centeringCorrection = Math.sign(goalCenter - player.position.y) * 0.3; // Increased from 0.25 to 0.3
      moveY = moveY * 0.7 + centeringCorrection; // Changed from 0.75 to 0.7 to prioritize lateral movement
    }
    
    // Priorizar movimiento vertical cuando la pelota viene directamente al arco
    if (ballMovingTowardGoal && Math.abs(ball.position.x - player.position.x) < 130) { // Increased from 120 to 130
      // MEJORADO: Aumentamos prioridad para disparos laterales
      const isLateralShot = Math.abs(ball.position.y - PITCH_HEIGHT/2) > GOAL_HEIGHT/3;
      const verticalPriorityMultiplier = isLateralShot ? 1.3 : (0.9 + Math.random() * 0.2); // Increased from 1.2 to 1.3 and from 0.8 to 0.9
      moveY = moveY * verticalPriorityMultiplier * eloSpeedMultiplier;
    }
    
    // NUEVO: Log para disparos laterales
    if (isBallNearGoalSide && ballMovingTowardGoal && isCloseToGoal) {
      console.log(`GK ${player.team}: LATERAL SHOT RESPONSE - moveY: ${moveY.toFixed(2)}, bias: ${finalCenteringBias.toFixed(2)}`);
    }
    
    // MODIFICADO: Solo añadir micro-movimientos aleatorios si ya estamos bien posicionados
    // y no hay otro movimiento significativo
    if (Math.abs(moveX) < 0.2 && Math.abs(moveY) < 0.2) { // Increased threshold from 0.1 to 0.2
      // Try to use neural network again if we're idle
      if (player.brain) {
        const neuralMovement = useNeuralNetworkForGoalkeeper(player, ball, player.brain, true);
        if (neuralMovement) {
          // Add small random noise to neural output
          moveX = neuralMovement.x + (Math.random() - 0.5) * 0.2; // Increased from 0.1 to 0.2
          moveY = neuralMovement.y + (Math.random() - 0.5) * 0.2; // Increased from 0.1 to 0.2
          console.log(`GK ${player.team}: IDLE STATE NEURAL DECISION`);
        } else {
          // Fall back to micro-movements with slightly larger values
          moveX = (Math.random() - 0.5) * 0.6; // Increased from 0.4 to 0.6
          moveY = (Math.random() - 0.5) * 0.8; // Increased from 0.5 to 0.8
          console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT`);
        }
      } else {
        // No neural network, use random micro-movements
        moveX = (Math.random() - 0.5) * 0.6; // Increased from 0.4 to 0.6
        moveY = (Math.random() - 0.5) * 0.8; // Increased from 0.5 to 0.8
        console.log(`GK ${player.team}: ADDING MICRO-MOVEMENT (NO NEURAL)`);
      }
    }
  }
  
  // Agregar ruido mínimo final al movimiento - aumentado ligeramente
  moveX = addPositioningNoise(moveX, player.teamElo);
  moveY = addPositioningNoise(moveY, player.teamElo);
  
  // Reducimos la probabilidad de duda para movimientos más consistentes
  if (Math.random() < 0.03) { // Reducido de 0.04 a 0.03 (3% probabilidad de duda)
    moveX *= 0.8; // Increased from 0.7 to 0.8 to make hesitation less severe
    moveY *= 0.8; // Increased from 0.7 to 0.8
    console.log(`GK ${player.team}: HESITATION`);
  }
  
  // Forzar al portero a volver a la línea de gol si está demasiado lejos
  const maxDistanceFromGoalLine = 55; // Increased from 45 to 55
  if (Math.abs(player.position.x - goalLine) > maxDistanceFromGoalLine) {
    // Anular movimiento para volver a la línea de gol con urgencia
    moveX = Math.sign(goalLine - player.position.x) * 3.2; // Increased from 2.8 to 3.2
    console.log(`GK ${player.team}: EMERGENCY RETURN TO GOAL LINE`);
  }
  
  // Corrección extra para permanecer cerca del centro del arco cuando está inactivo
  const isIdle = Math.abs(moveX) < 0.2 && Math.abs(moveY) < 0.2;
  if (isIdle && Math.abs(player.position.y - goalCenter) > GOAL_HEIGHT/4) {
    moveY = Math.sign(goalCenter - player.position.y) * 0.7; // Increased from 0.6 to 0.7
    console.log(`GK ${player.team}: CENTER CORRECTION`);
  }
  
  // NUEVO: Asegurar un movimiento mínimo para evitar que el portero se vea estático
  if (Math.abs(moveX) < 0.08 && Math.abs(moveY) < 0.08) { // Reduced threshold from 0.05 to ensure more movement
    // Si el movimiento es muy pequeño, añadir un pequeño movimiento aleatorio
    moveX = (Math.random() - 0.5) * 0.5; // Increased from 0.3 to 0.5
    moveY = (Math.random() - 0.5) * 0.6; // Increased from 0.4 to 0.6
    console.log(`GK ${player.team}: FORCING MINIMUM MOVEMENT`);
  }
  
  // NUEVO: Ampliar movimientos muy pequeños para más visibilidad
  if (0.08 <= Math.abs(moveX) && Math.abs(moveX) < 0.15) {
    moveX *= 1.4; // Boost small movements
    console.log(`GK ${player.team}: BOOSTING SMALL X MOVEMENT`);
  }
  
  if (0.08 <= Math.abs(moveY) && Math.abs(moveY) < 0.15) {
    moveY *= 1.4; // Boost small movements
    console.log(`GK ${player.team}: BOOSTING SMALL Y MOVEMENT`);
  }
  
  console.log(`GK ${player.team}: movement (${moveX.toFixed(1)},${moveY.toFixed(1)}), distToCenter: ${distanceToCenter.toFixed(0)}, distToGoalLine: ${distanceToGoalLine.toFixed(0)}`);
  
  return { x: moveX, y: moveY };
};
