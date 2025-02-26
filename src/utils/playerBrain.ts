import { NeuralNet, Position, TeamContext, Player, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createPlayerBrain } from './neuralNetwork';

export { createPlayerBrain, createUntrained } from './neuralNetwork';

// Constantes optimizadas para porteros súper reactivos
const GOALKEEPER_CONFIG = {
  // Línea base más cerca de la portería para mejor cobertura
  BASE_X: {
    red: 40,
    blue: PITCH_WIDTH - 40
  },
  // Zona de acción mucho más amplia
  DANGER_ZONE: {
    red: PITCH_WIDTH / 2,
    blue: PITCH_WIDTH / 2
  },
  // Constantes de comportamiento
  VERTICAL_FOLLOW: 0.85,    // Qué tanto sigue el balón verticalmente
  INTERCEPT_DISTANCE: 200,  // Distancia a la que intenta interceptar
  MAX_ADVANCE: 250,         // Distancia máxima de avance
  ANTICIPATION: 35,         // Factor de anticipación de trayectoria
  REACTION_SPEED: 4.0       // Multiplicador de velocidad base
};

export const updatePlayerBrain = (
  brain: NeuralNet,
  isScoring: boolean,
  ball: { position: Position, velocity: Position },
  player: Player,
  context: TeamContext
): NeuralNet => {
  if (!isNetworkValid(brain.net)) {
    console.warn(`Red neuronal ${player.team} ${player.role} #${player.id} apagada, reinicializando...`);
    return createPlayerBrain();
  }

  const input = createNeuralInput(ball, player.position, context);
  const rewardMultiplier = isScoring ? 2 : 1;
  let targetOutput;

  if (player.role === 'goalkeeper') {
    // Cálculos básicos
    const ballSpeed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
    const ballDistance = Math.sqrt(
      Math.pow(ball.position.x - player.position.x, 2) +
      Math.pow(ball.position.y - player.position.y, 2)
    );

    // Determinar si el balón viene hacia la portería
    const ballMovingTowardsGoal = player.team === 'red' 
      ? ball.velocity.x < -1  // Umbral mínimo de velocidad
      : ball.velocity.x > 1;

    // Calcular zona de peligro dinámica basada en la velocidad del balón
    const dangerZone = player.team === 'red'
      ? GOALKEEPER_CONFIG.DANGER_ZONE.red + (ballSpeed * 20)
      : PITCH_WIDTH - GOALKEEPER_CONFIG.DANGER_ZONE.blue - (ballSpeed * 20);

    const isInDangerZone = player.team === 'red'
      ? ball.position.x < dangerZone
      : ball.position.x > dangerZone;

    // Predicción de posición futura del balón con anticipación variable
    const anticipationFactor = GOALKEEPER_CONFIG.ANTICIPATION * (ballMovingTowardsGoal ? 1.5 : 1);
    const predictedBall = {
      x: ball.position.x + (ball.velocity.x * anticipationFactor),
      y: ball.position.y + (ball.velocity.y * anticipationFactor)
    };

    // Calcular posición objetivo vertical con seguimiento agresivo
    let targetY;
    if (ballMovingTowardsGoal || isInDangerZone) {
      // Seguimiento directo con predicción cuando el balón es amenaza
      targetY = predictedBall.y;
    } else {
      // Posición de cobertura cuando el balón está lejos
      const centralY = PITCH_HEIGHT / 2;
      targetY = centralY + (ball.position.y - centralY) * GOALKEEPER_CONFIG.VERTICAL_FOLLOW;
    }

    // Calcular posición objetivo horizontal con avance agresivo
    let targetX;
    if (ballMovingTowardsGoal || isInDangerZone) {
      // Avance agresivo hacia el balón cuando es amenaza
      const maxAdvance = player.team === 'red'
        ? Math.min(GOALKEEPER_CONFIG.MAX_ADVANCE, predictedBall.x)
        : Math.max(PITCH_WIDTH - GOALKEEPER_CONFIG.MAX_ADVANCE, predictedBall.x);
      
      targetX = player.team === 'red'
        ? Math.max(GOALKEEPER_CONFIG.BASE_X.red, maxAdvance)
        : Math.min(GOALKEEPER_CONFIG.BASE_X.blue, maxAdvance);
    } else {
      // Posición base cuando no hay amenaza
      targetX = GOALKEEPER_CONFIG.BASE_X[player.team];
    }

    // Calcular vectores de movimiento con alta reactividad
    const dx = targetX - player.position.x;
    const dy = targetY - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalizar y aplicar velocidad base alta
    const baseSpeed = GOALKEEPER_CONFIG.REACTION_SPEED;
    const moveX = (dx / Math.max(distance, 1)) * baseSpeed;
    const moveY = (dy / Math.max(distance, 1)) * baseSpeed;

    // Factor de urgencia basado en la cercanía del balón y su velocidad
    const urgencyFactor = Math.min(2.0, 1 + (ballSpeed / 8) + (1 - ballDistance / 300));

    // Determinar si debe interceptar
    const shouldIntercept = (ballMovingTowardsGoal || isInDangerZone) && 
                          ballDistance < GOALKEEPER_CONFIG.INTERCEPT_DISTANCE;

    targetOutput = {
      moveX: moveX * urgencyFactor,
      moveY: moveY * urgencyFactor,
      shootBall: shouldIntercept ? 1 : 0,
      passBall: shouldIntercept ? 0 : (isInDangerZone ? 0.8 : 0),
      intercept: shouldIntercept ? 1 : (ballMovingTowardsGoal ? 0.7 : 0)
    };
  } else if (player.role === 'forward') {
    targetOutput = {
      moveX: (ball.position.x - player.position.x) > 0 ? 1 : -1,
      moveY: (ball.position.y - player.position.y) > 0 ? 1 : -1,
      shootBall: input.isInShootingRange,
      passBall: input.isInPassingRange,
      intercept: 0.2
    };
  } else if (player.role === 'midfielder') {
    targetOutput = {
      moveX: (ball.position.x - player.position.x) > 0 ? 0.8 : -0.8,
      moveY: (ball.position.y - player.position.y) > 0 ? 0.8 : -0.8,
      shootBall: input.isInShootingRange * 0.7,
      passBall: input.isInPassingRange * 1.2,
      intercept: 0.5
    };
  } else if (player.role === 'defender') {
    targetOutput = {
      moveX: (player.position.x - ball.position.x) > 0 ? -0.6 : 0.6,
      moveY: (player.position.y - ball.position.y) > 0 ? -0.6 : 0.6,
      shootBall: input.isInShootingRange * 0.3,
      passBall: input.isInPassingRange * 1.5,
      intercept: 0.8
    };
  }

  Object.keys(targetOutput).forEach(key => {
    targetOutput[key] *= rewardMultiplier;
  });

  brain.net.train([{
    input,
    output: targetOutput
  }], {
    iterations: 300,
    errorThresh: 0.001,
    learningRate: isScoring ? 0.1 : 0.03,
    log: true,
    logPeriod: 50
  });

  const currentOutput = brain.net.run(input);
  
  try {
    console.log(`Red neuronal ${player.team} ${player.role} #${player.id}:`, {
      input,
      output: currentOutput,
      targetOutput,
      weightsShape: brain.net.weights ? {
        inputToHidden1: brain.net.weights[0]?.length,
        hidden1ToHidden2: brain.net.weights[1]?.length,
        hidden2ToHidden3: brain.net.weights[2]?.length,
        hidden3ToOutput: brain.net.weights[3]?.length
      } : 'Red no entrenada'
    });
  } catch (error) {
    console.warn(`Error al acceder a los pesos de la red ${player.team} ${player.role} #${player.id}:`, error);
  }

  if (!isNetworkValid(brain.net)) {
    console.warn(`Red neuronal ${player.team} ${player.role} #${player.id} se volvió inválida después del entrenamiento, reinicializando...`);
    return createPlayerBrain();
  }

  return {
    net: brain.net,
    lastOutput: { 
      x: currentOutput.moveX || 0,
      y: currentOutput.moveY || 0
    },
    lastAction: currentOutput.shootBall > 0.7 ? 'shoot' :
                currentOutput.passBall > 0.7 ? 'pass' :
                currentOutput.intercept > 0.7 ? 'intercept' : 'move'
  };
};
