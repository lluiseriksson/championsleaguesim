
import { NeuralNet, Position, TeamContext, Player, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';
import { createPlayerBrain } from './neuralNetwork';
import { saveModel, saveTrainingSession } from './neuralModelService';

export { createPlayerBrain, createUntrained } from './neuralNetwork';

// Contador para controlar la frecuencia de guardado
let updateCounter = 0;
const SAVE_FREQUENCY = 50; // Guardar cada 50 actualizaciones

// FUNCIÓN ESPECÍFICA PARA MOVER PORTEROS - COMPLETAMENTE DETERMINÍSTICA, SIN IA
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

  // PORTEROS - LÓGICA COMPLETAMENTE NUEVA Y DETERMINÍSTICA
  if (player.role === 'goalkeeper') {
    // Usar algoritmo directo sin red neuronal para porteros
    const movement = moveGoalkeeper(player, ball);
    
    targetOutput = {
      moveX: movement.x,
      moveY: movement.y,
      shootBall: 1.0,
      passBall: 0.8,
      intercept: 0.8
    };
    
    console.log(`Portero ${player.team} #${player.id} - Movimiento calculado:`, {
      position: player.position,
      targetMovement: movement,
      ballData: ball
    });
    
    // Para porteros, solo quiero que estén en su posición y detengan la pelota
    // No necesitamos una red neuronal compleja para esto
    return {
      net: brain.net,
      lastOutput: movement,
      lastAction: 'move'
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

  // Registrar datos de entrenamiento periódicamente
  updateCounter++;
  if (updateCounter % SAVE_FREQUENCY === 0 && player.role !== 'goalkeeper') {
    // Guardamos datos de entrenamiento para análisis posterior
    saveTrainingSession(player, {
      input,
      output: targetOutput,
      isScoring,
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }

  // Entrenar la red neuronal
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

  // Guardar modelo entrenado periódicamente
  if (isScoring && player.role !== 'goalkeeper') {
    // Siempre guardar el modelo cuando hay un gol
    saveModel(player).catch(console.error);
  } else if (updateCounter % (SAVE_FREQUENCY * 10) === 0 && player.role !== 'goalkeeper') {
    // Guardar periódicamente incluso sin goles
    saveModel(player).catch(console.error);
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
