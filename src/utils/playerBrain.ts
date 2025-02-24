
import * as brain from 'brain.js';
import { NeuralNet, Position } from '../types/football';
import { PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

export const createPlayerBrain = (): NeuralNet => {
  const net = new brain.NeuralNetwork<
    { ballX: number, ballY: number, playerX: number, playerY: number },
    { moveX: number, moveY: number }
  >({
    hiddenLayers: [16, 16], // Dos capas ocultas de 16 neuronas cada una
    activation: 'sigmoid', // Función de activación más suave para mejor aprendizaje
  });

  // Entrenamiento inicial con más variedad de situaciones
  const trainingData = [];
  for (let i = 0; i < 10; i++) {
    trainingData.push({
      input: {
        ballX: Math.random(),
        ballY: Math.random(),
        playerX: Math.random(),
        playerY: Math.random()
      },
      output: {
        moveX: Math.random() * 2 - 1,
        moveY: Math.random() * 2 - 1
      }
    });
  }

  net.train(trainingData, {
    iterations: 2000,
    errorThresh: 0.001, // Error más bajo para mejor precisión
    log: true, // Activamos el logging para ver el progreso
    logPeriod: 100 // Mostrar log cada 100 iteraciones
  });

  return {
    net,
    lastOutput: { x: 0, y: 0 },
  };
};

export const createUntrained = (): NeuralNet => {
  const net = new brain.NeuralNetwork<
    { ballX: number, ballY: number, playerX: number, playerY: number },
    { moveX: number, moveY: number }
  >({
    hiddenLayers: [16, 16],
    activation: 'sigmoid',
  });

  // Inicialización mínima con pesos aleatorios más diversos
  net.train([
    { 
      input: { ballX: 0.5, ballY: 0.5, playerX: 0.5, playerY: 0.5 }, 
      output: { moveX: 0.5, moveY: 0.5 } 
    }
  ], {
    iterations: 1,
    errorThresh: 0.05
  });

  return {
    net,
    lastOutput: { x: 0, y: 0 },
  };
};

export const updatePlayerBrain = (
  brain: NeuralNet, 
  isScoring: boolean, 
  ball: { position: Position },
  player: { position: Position }
) => {
  const normalizedInput = {
    ballX: ball.position.x / PITCH_WIDTH,
    ballY: ball.position.y / PITCH_HEIGHT,
    playerX: player.position.x / PITCH_WIDTH,
    playerY: player.position.y / PITCH_HEIGHT
  };

  // Tasa de aprendizaje más dinámica basada en el rendimiento
  const learningRate = isScoring ? 0.2 : 0.05;
  
  const targetOutput = isScoring ? {
    moveX: (ball.position.x - player.position.x) > 0 ? 1 : -1,
    moveY: (ball.position.y - player.position.y) > 0 ? 1 : -1
  } : {
    moveX: (player.position.x - ball.position.x) > 0 ? -1 : 1,
    moveY: (player.position.y - ball.position.y) > 0 ? -1 : 1
  };

  brain.net.train([{
    input: normalizedInput,
    output: targetOutput
  }], {
    iterations: 200, // Más iteraciones por actualización
    errorThresh: 0.01, // Error más bajo para mejor precisión
    learningRate,
    log: true,
    logPeriod: 50
  });

  // Obtener y mostrar los pesos de la red
  const weights = brain.net.weights;
  console.log('Pesos de la red:', {
    inputToHidden1: weights[0],
    hidden1ToHidden2: weights[1],
    hidden2ToOutput: weights[2]
  });

  return {
    net: brain.net,
    lastOutput: brain.lastOutput
  };
};
