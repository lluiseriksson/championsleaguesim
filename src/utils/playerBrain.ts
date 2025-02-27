
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

    // Calcular punto de interceptación predictivo
    const predictedBallY = ball.position.y + (ball.velocity.y * 10);
    const targetY = Math.max(goalTop + 10, Math.min(goalBottom - 10, predictedBallY));
    
    // Calcular distancia al punto objetivo
    const distanceToTarget = targetY - player.position.y;
    
    // Velocidad base muy alta para movimientos rápidos
    let moveY = Math.sign(distanceToTarget) * 15;
    
    // Ajuste de velocidad basado en la distancia
    if (Math.abs(distanceToTarget) < 30) {
      moveY = distanceToTarget * 0.8;
    }
    
    // Factor de anticipación basado en la velocidad de la pelota
    const anticipationFactor = ball.velocity.y * 3;
    moveY += anticipationFactor;
    
    // Límites de velocidad seguros
    moveY = Math.max(-20, Math.min(20, moveY));
    
    targetOutput = {
      moveX: 0,
      moveY: moveY,
      shootBall: 1.0,
      passBall: 1.0,
      intercept: 1.0
    };

    // Corrección X agresiva
    if (Math.abs(player.position.x - fixedX) > 1) {
      targetOutput.moveX = player.position.x > fixedX ? -12 : 12;
    }

    console.log('Estado del portero:', {
      team: player.team,
      position: player.position,
      predictedBallY,
      targetY,
      distanceToTarget,
      moveY,
      anticipationFactor,
      ballData: {
        position: ball.position,
        velocity: ball.velocity
      }
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
