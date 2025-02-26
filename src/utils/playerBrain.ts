
import { NeuralNet, Position, TeamContext, Player, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
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
    // Replicamos la lógica del defensor pero ajustada para portero
    const baseX = player.team === 'red' ? 40 : PITCH_WIDTH - 40;
    const maxAdvanceX = player.team === 'red' ? 150 : PITCH_WIDTH - 150;
    
    // Calcular la distancia al balón
    const ballDistance = Math.sqrt(
      Math.pow(ball.position.x - player.position.x, 2) +
      Math.pow(ball.position.y - player.position.y, 2)
    );

    // Determinar si el balón viene hacia la portería
    const ballMovingTowardsGoal = player.team === 'red' 
      ? ball.velocity.x < -1
      : ball.velocity.x > 1;

    // Calcular movimiento en X
    let moveX;
    if (ballMovingTowardsGoal && ballDistance < 200) {
      // Si el balón viene hacia la portería, moverse más agresivamente
      moveX = (ball.position.x - player.position.x) > 0 ? 0.8 : -0.8;
      
      // Limitar el avance
      if (player.team === 'red' && player.position.x > maxAdvanceX) {
        moveX = -1;
      } else if (player.team === 'blue' && player.position.x < maxAdvanceX) {
        moveX = 1;
      }
    } else {
      // Volver a la posición base
      moveX = player.position.x < baseX ? 0.6 : -0.6;
    }

    // Movimiento en Y: seguir directamente al balón
    const moveY = (ball.position.y - player.position.y) > 0 ? 0.8 : -0.8;

    targetOutput = {
      moveX: moveX,
      moveY: moveY,
      shootBall: input.isInShootingRange * 0.8,
      passBall: input.isInPassingRange * 1.2,
      intercept: ballMovingTowardsGoal ? 1.0 : 0.8
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
