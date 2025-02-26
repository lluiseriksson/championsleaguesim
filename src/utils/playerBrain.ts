
import { NeuralNet, Position, TeamContext, Player, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createPlayerBrain } from './neuralNetwork';

export { createPlayerBrain, createUntrained } from './neuralNetwork';

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
    // Posición X absolutamente fija
    const fixedX = player.team === 'red' ? 40 : PITCH_WIDTH - 40;
    
    // Centro y límites de la portería
    const goalCenterY = PITCH_HEIGHT / 2;
    const goalTop = goalCenterY - GOAL_HEIGHT / 2;
    const goalBottom = goalCenterY + GOAL_HEIGHT / 2;
    
    // Calcular movimiento Y base
    let forceY = 0;
    
    // Múltiples factores para el movimiento Y
    const ballFactor = ball.position.y > player.position.y ? 1 : -1;
    const timeFactor = Math.sin(Date.now() / 150) * 2; // Oscilación más rápida y amplia
    const randomFactor = (Math.random() - 0.5) * 2; // Factor aleatorio para movimiento impredecible
    const velocityFactor = ball.velocity.y * 0.5; // Considerar la velocidad de la pelota
    
    // Combinar todos los factores
    forceY = ballFactor * 2 + timeFactor + randomFactor + velocityFactor;
    
    // Si está cerca de los límites, forzar dirección contraria con más fuerza
    const margin = 10;
    if (player.position.y < goalTop + margin) {
      forceY = 4; // Fuerza máxima hacia abajo
    } else if (player.position.y > goalBottom - margin) {
      forceY = -4; // Fuerza máxima hacia arriba
    }
    
    // Asegurarnos de que siempre haya algo de movimiento
    if (Math.abs(forceY) < 0.5) {
      forceY = timeFactor * 2;
    }
    
    targetOutput = {
      moveX: 0,
      moveY: forceY * 6, // Aumentado significativamente la velocidad
      shootBall: 0.1,
      passBall: 1.0,
      intercept: 1.0
    };

    // Corrección de posición X si es necesario
    if (Math.abs(player.position.x - fixedX) > 1) {
      targetOutput.moveX = player.position.x > fixedX ? -2 : 2; // Aumentada la fuerza de corrección
    }

    console.log('Estado del portero:', {
      team: player.team,
      position: player.position,
      targetX: fixedX,
      xDeviation: Math.abs(player.position.x - fixedX),
      goalLimits: { top: goalTop, center: goalCenterY, bottom: goalBottom },
      forceY,
      factors: {
        ball: ballFactor,
        time: timeFactor,
        random: randomFactor,
        velocity: velocityFactor
      },
      moveX: targetOutput.moveX,
      moveY: targetOutput.moveY,
      lastOutput: brain.lastOutput,
      ballY: ball.position.y
    });

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
