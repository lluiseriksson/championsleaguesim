
import { NeuralNet, Position, TeamContext, Player, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createPlayerBrain } from './neuralNetwork';

export { createPlayerBrain, createUntrained } from './neuralNetwork';

// FUNCIÓN AUXILIAR PARA MOVER PORTEROS
export const moveGoalkeeper = (
  player: Player,
  ball: { position: Position, velocity: Position }
) => {
  // Posición X fija según el equipo
  const fixedX = player.team === 'red' ? 40 : PITCH_WIDTH - 40;
  
  // Límites de la portería
  const goalCenterY = PITCH_HEIGHT / 2;
  const goalTop = goalCenterY - GOAL_HEIGHT / 2 + 20; // Margen de seguridad
  const goalBottom = goalCenterY + GOAL_HEIGHT / 2 - 20; // Margen de seguridad
  
  // Predecir la posición futura de la pelota
  // Multiplicador de predicción más alto cuando la pelota se acerca rápidamente
  const ballApproachingGoal = (player.team === 'red' && ball.velocity.x < -5) || 
                              (player.team === 'blue' && ball.velocity.x > 5);
  
  const predictionMultiplier = ballApproachingGoal ? 15 : 5;
  const predictedBallY = ball.position.y + (ball.velocity.y * predictionMultiplier);
  
  // Objetivo Y limitado a los límites de la portería
  const targetY = Math.max(goalTop, Math.min(goalBottom, predictedBallY));
  
  // Vector de movimiento
  const moveX = fixedX - player.position.x;
  const moveY = targetY - player.position.y;
  
  // Calcular velocidades (más altas para reacciones más rápidas)
  const xSpeed = Math.sign(moveX) * Math.min(Math.abs(moveX) * 0.5, 10); // Velocidad X aumentada
  let ySpeed = Math.sign(moveY) * Math.min(Math.abs(moveY) * 0.7, 12);   // Velocidad Y aumentada
  
  // Añadir un factor de anticipación proporcional a la velocidad Y de la pelota
  ySpeed += ball.velocity.y * 0.8; // Factor de anticipación aumentado
  
  return {
    x: xSpeed,
    y: ySpeed
  };
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

  // PORTEROS - AHORA CON RED NEURONAL QUE APRENDE DEL ALGORITMO DETERMINÍSTICO
  if (player.role === 'goalkeeper') {
    // Obtener el movimiento óptimo con el algoritmo determinístico
    const optimalMovement = moveGoalkeeper(player, ball);
    
    // Normalizar los valores para la red neuronal (entre 0 y 1)
    const normalizedMoveX = (optimalMovement.x / 20) + 0.5; // Convertir de [-10, 10] a [0, 1]
    const normalizedMoveY = (optimalMovement.y / 24) + 0.5; // Convertir de [-12, 12] a [0, 1]
    
    // Crear el objetivo de entrenamiento basado en el movimiento óptimo
    targetOutput = {
      moveX: normalizedMoveX,
      moveY: normalizedMoveY,
      shootBall: ball.position.x < 100 || ball.position.x > PITCH_WIDTH - 100 ? 1.0 : 0.0,
      passBall: 0.8,
      intercept: 0.8
    };
    
    // Entrenar la red con el objetivo
    brain.net.train([{
      input, 
      output: targetOutput
    }], {
      iterations: 200,
      errorThresh: 0.001,
      learningRate: 0.05,
      log: true,
      logPeriod: 50
    });
    
    // Ejecutar la red entrenada
    const output = brain.net.run(input);
    
    // Combinar el resultado de la red con el algoritmo determinístico
    // con ponderación gradual que favorece la red a medida que mejora
    
    // Calculamos un factor de confianza basado en la diferencia entre la red y el óptimo
    const xDiff = Math.abs((output.moveX * 2 - 1) * 10 - optimalMovement.x);
    const yDiff = Math.abs((output.moveY * 2 - 1) * 12 - optimalMovement.y);
    
    // Si la diferencia es pequeña, confiamos más en la red neuronal
    const confidenceFactor = Math.max(0, 0.5 - (xDiff + yDiff) / 30);
    
    // Combinamos los movimientos con ponderación
    const combinedX = optimalMovement.x * (1 - confidenceFactor) + 
                      ((output.moveX * 2 - 1) * 10) * confidenceFactor;
                      
    const combinedY = optimalMovement.y * (1 - confidenceFactor) + 
                      ((output.moveY * 2 - 1) * 12) * confidenceFactor;
    
    console.log(`Portero ${player.team} #${player.id} - Aprendizaje IA:`, {
      óptimo: optimalMovement,
      redNeuronal: { x: (output.moveX * 2 - 1) * 10, y: (output.moveY * 2 - 1) * 12 },
      confianza: confidenceFactor,
      movimientoFinal: { x: combinedX, y: combinedY }
    });
    
    return {
      net: brain.net,
      lastOutput: { 
        x: combinedX, 
        y: combinedY 
      },
      lastAction: output.shootBall > 0.7 ? 'shoot' :
                output.passBall > 0.7 ? 'pass' : 'move'
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
