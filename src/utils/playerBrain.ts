
import { NeuralNet, Position, TeamContext, Player, PITCH_WIDTH } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createPlayerBrain } from './neuralNetwork';

export { createPlayerBrain, createUntrained } from './neuralNetwork';

// Constants
const GOALKEEPER_LINE_X = {
  red: 30,
  blue: PITCH_WIDTH - 30
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
    // Calcular la posición vertical óptima para el portero basada en la posición de la pelota
    const optimalY = context.ownGoal.y + (ball.position.y - context.ownGoal.y) * 0.95;
    
    // Factor de velocidad vertical basado en la distancia y velocidad del balón
    const verticalDistance = Math.abs(optimalY - player.position.y);
    const ballVerticalSpeed = Math.abs(ball.velocity.y);
    const verticalSpeedFactor = Math.min(1, (verticalDistance / 50) + (ballVerticalSpeed * 0.3));
    
    // Dirección vertical con ajuste por velocidad del balón
    const predictedBallY = ball.position.y + (ball.velocity.y * 10);
    const verticalDirection = (predictedBallY > player.position.y) ? 1 : -1;
    
    // Movimiento vertical más agresivo
    const verticalMovement = verticalDirection * (0.7 + verticalSpeedFactor * 0.5);

    // Posicionamiento horizontal más dinámico
    const goalLineX = GOALKEEPER_LINE_X[player.team];
    const horizontalDistance = Math.abs(goalLineX - player.position.x);
    
    // Ajustar posición horizontal basada en la cercanía del balón
    const ballToGoalDistance = Math.abs(ball.position.x - goalLineX);
    const maxAdvance = Math.min(50, ballToGoalDistance * 0.4); // Avance máximo proporcional a la distancia del balón
    
    const shouldAdvance = (player.team === 'red' && ball.position.x < PITCH_WIDTH / 3) ||
                         (player.team === 'blue' && ball.position.x > (PITCH_WIDTH * 2) / 3);
    
    const targetX = shouldAdvance ? 
      (player.team === 'red' ? goalLineX + maxAdvance : goalLineX - maxAdvance) :
      goalLineX;
    
    const horizontalDirection = targetX > player.position.x ? 1 : -1;
    const horizontalSpeedFactor = Math.min(1, horizontalDistance / 30);
    const horizontalMovement = horizontalDirection * horizontalSpeedFactor;

    // Ser más agresivo cuando el balón está cerca
    const distanceToBall = Math.sqrt(
      Math.pow(ball.position.x - player.position.x, 2) +
      Math.pow(ball.position.y - player.position.y, 2)
    );

    const isCloseAndDangerous = 
      distanceToBall < 120 && // Aumentado el rango de interceptación
      ((player.team === 'red' && ball.position.x < PITCH_WIDTH / 3) ||
       (player.team === 'blue' && ball.position.x > (PITCH_WIDTH * 2) / 3));

    if (isCloseAndDangerous) {
      // Movimiento más agresivo hacia el balón cuando está cerca
      const angleToInterceptBall = Math.atan2(
        ball.position.y + ball.velocity.y * 5 - player.position.y,
        ball.position.x + ball.velocity.x * 5 - player.position.x
      );
      
      targetOutput = {
        moveX: Math.cos(angleToInterceptBall),
        moveY: Math.sin(angleToInterceptBall),
        shootBall: 1,
        passBall: 0,
        intercept: 1
      };
    } else {
      // Comportamiento normal de posicionamiento mejorado
      targetOutput = {
        moveX: horizontalMovement,
        moveY: verticalMovement,
        shootBall: distanceToBall < 60 ? 1 : 0,
        passBall: input.isInPassingRange && distanceToBall < 80 ? 1 : 0,
        intercept: Math.min(1, (120 - distanceToBall) / 120)
      };
    }
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
