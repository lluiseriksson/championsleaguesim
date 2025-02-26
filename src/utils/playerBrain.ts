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
    
    // CAMBIO RADICAL: El portero siempre intenta estar alineado con la pelota en Y
    const targetY = ball.position.y;
    const distanceToTarget = targetY - player.position.y;
    
    // Calcular la velocidad Y basada en la distancia a la pelota
    let moveY = Math.sign(distanceToTarget) * 12; // Velocidad base muy alta
    
    // Si estamos cerca del objetivo, ajustar la velocidad para no sobrepasarlo
    if (Math.abs(distanceToTarget) < 20) {
      moveY = distanceToTarget * 0.5;
    }
    
    // Evitar que el portero se salga de los límites de la portería
    if (player.position.y <= goalTop && moveY < 0) {
      moveY = 0;
    }
    if (player.position.y >= goalBottom && moveY > 0) {
      moveY = 0;
    }
    
    // Añadir un pequeño movimiento anticipatorio basado en la velocidad de la pelota
    moveY += ball.velocity.y * 2;
    
    targetOutput = {
      moveX: 0,
      moveY: moveY,
      shootBall: 1.0, // Siempre intentar despejar
      passBall: 1.0,  // Siempre intentar pasar
      intercept: 1.0   // Siempre intentar interceptar
    };

    // Corrección fuerte de posición X si se desvía
    if (Math.abs(player.position.x - fixedX) > 1) {
      targetOutput.moveX = player.position.x > fixedX ? -8 : 8; // Fuerza muy alta para corrección X
    }

    console.log('Estado del portero:', {
      team: player.team,
      position: player.position,
      targetY,
      distanceToTarget,
      moveY,
      ballPosition: ball.position,
      ballVelocity: ball.velocity
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
