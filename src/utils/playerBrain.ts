import { NeuralNet, Position, TeamContext, Player, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createPlayerBrain } from './neuralNetwork';

export { createPlayerBrain, createUntrained } from './neuralNetwork';

// Constantes para el portero
const GOALKEEPER_CONFIG = {
  BASE_LINE: {
    red: 80,
    blue: PITCH_WIDTH - 80
  },
  MAX_ADVANCE: {
    red: 180,
    blue: PITCH_WIDTH - 180
  },
  ACTIVE_ZONE: PITCH_WIDTH / 3,
  VERTICAL_RANGE: PITCH_HEIGHT / 2
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
    // Determinar si el balón está en zona de peligro
    const isInDangerZone = player.team === 'red' 
      ? ball.position.x < GOALKEEPER_CONFIG.ACTIVE_ZONE
      : ball.position.x > PITCH_WIDTH - GOALKEEPER_CONFIG.ACTIVE_ZONE;

    // Calcular la línea base del portero
    const baseLine = GOALKEEPER_CONFIG.BASE_LINE[player.team];
    
    // Predicción de la trayectoria del balón
    const predictedPosition = {
      x: ball.position.x + ball.velocity.x * 20,
      y: ball.position.y + ball.velocity.y * 20
    };

    // Calcular posición vertical objetivo
    const targetY = (() => {
      if (isInDangerZone) {
        // Si el balón está cerca, seguirlo más directamente
        return predictedPosition.y;
      } else {
        // Si está lejos, mantener posición central con ligero seguimiento
        const centralY = PITCH_HEIGHT / 2;
        return centralY + (ball.position.y - centralY) * 0.3;
      }
    })();

    // Calcular posición horizontal objetivo
    const targetX = (() => {
      if (isInDangerZone) {
        // Avanzar hacia el balón cuando está cerca
        const advanceDistance = player.team === 'red'
          ? Math.min(GOALKEEPER_CONFIG.MAX_ADVANCE.red, predictedPosition.x)
          : Math.max(GOALKEEPER_CONFIG.MAX_ADVANCE.blue, predictedPosition.x);
        return advanceDistance;
      } else {
        // Mantener posición base cuando el balón está lejos
        return baseLine;
      }
    })();

    // Calcular direcciones de movimiento
    const moveX = (targetX - player.position.x) / 30;
    const moveY = (targetY - player.position.y) / 30;

    // Normalizar velocidades
    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    const normalizedMoveX = magnitude > 1 ? moveX / magnitude : moveX;
    const normalizedMoveY = magnitude > 1 ? moveY / magnitude : moveY;

    // Determinar si debe interceptar
    const distanceToBall = Math.sqrt(
      Math.pow(ball.position.x - player.position.x, 2) +
      Math.pow(ball.position.y - player.position.y, 2)
    );

    const shouldIntercept = isInDangerZone && distanceToBall < 100;

    targetOutput = {
      moveX: normalizedMoveX * (shouldIntercept ? 1.5 : 1),
      moveY: normalizedMoveY * (shouldIntercept ? 1.5 : 1),
      shootBall: shouldIntercept ? 1 : 0,
      passBall: shouldIntercept ? 0 : (isInDangerZone ? 0.5 : 0),
      intercept: shouldIntercept ? 1 : 0
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
