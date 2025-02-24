
import { NeuralNet, Position, TeamContext, Player } from '../types/football';
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

  if (player.role === 'forward') {
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
  } else { // goalkeeper
    // Calcular la distancia a la portería
    const distanceToGoal = Math.sqrt(
      Math.pow(player.position.x - context.ownGoal.x, 2) +
      Math.pow(player.position.y - context.ownGoal.y, 2)
    );

    // Calcular si el balón se dirige hacia la portería
    const ballMovingTowardsGoal = (
      player.team === 'red' && ball.velocity.x < 0 ||
      player.team === 'blue' && ball.velocity.x > 0
    );

    // Calcular la posición vertical óptima para el portero basada en la posición de la pelota
    const optimalY = context.ownGoal.y + (ball.position.y - context.ownGoal.y) * 0.7;
    const verticalAdjustment = (optimalY - player.position.y) / 100;

    // Determinar si el portero debe ser más agresivo
    const shouldBeAggressive = 
      distanceToGoal < 150 && // Aumentamos el rango de acción
      ballMovingTowardsGoal && // Balón se acerca
      Math.abs(ball.position.y - context.ownGoal.y) < 120; // Aumentamos el rango vertical

    // Calcular la distancia máxima que el portero puede alejarse de la portería
    const maxXDistance = player.team === 'red' ? 80 : -80;
    const currentXOffset = player.position.x - context.ownGoal.x;
    const xAdjustment = (shouldBeAggressive && Math.abs(currentXOffset) < Math.abs(maxXDistance)) ? 
      (ball.position.x - player.position.x) / 100 : 
      -currentXOffset / 50;

    targetOutput = {
      moveX: shouldBeAggressive 
        ? (ball.position.x - player.position.x) > 0 ? 0.9 : -0.9
        : Math.max(-1, Math.min(1, xAdjustment)),
      moveY: shouldBeAggressive
        ? (ball.position.y - player.position.y) > 0 ? 1 : -1
        : Math.max(-1, Math.min(1, verticalAdjustment * 2)),
      shootBall: shouldBeAggressive ? 1 : 0.3,
      passBall: input.isInPassingRange * (shouldBeAggressive ? 0.3 : 1.5),
      intercept: shouldBeAggressive ? 1 : 0.7
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
