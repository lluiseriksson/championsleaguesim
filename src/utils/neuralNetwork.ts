
import * as brain from 'brain.js';
import { NeuralNet, Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';
import { createNeuralInput, isNetworkValid } from './neuralHelpers';

export const createPlayerBrain = (): NeuralNet => {
  const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
    hiddenLayers: [32, 32, 16],
    activation: 'leaky-relu',
    learningRate: 0.01,
  });

  const trainingData = [];
  for (let i = 0; i < 50; i++) {
    const randomPosition = () => ({ 
      x: Math.random() * PITCH_WIDTH, 
      y: Math.random() * PITCH_HEIGHT 
    });
    
    const context: TeamContext = {
      teammates: Array(3).fill(null).map(randomPosition),
      opponents: Array(3).fill(null).map(randomPosition),
      ownGoal: { x: 0, y: PITCH_HEIGHT/2 },
      opponentGoal: { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 }
    };

    const ball = {
      position: randomPosition(),
      velocity: { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 }
    };

    const input = createNeuralInput(ball, randomPosition(), context);
    
    trainingData.push({
      input,
      output: {
        moveX: Math.random() * 2 - 1,
        moveY: Math.random() * 2 - 1,
        shootBall: Math.random(),
        passBall: Math.random(),
        intercept: Math.random()
      }
    });
  }

  net.train(trainingData, {
    iterations: 5000,
    errorThresh: 0.0001,
    log: true,
    logPeriod: 100
  });

  if (!isNetworkValid(net)) {
    console.warn("Red neuronal inválida después del entrenamiento inicial, reinicializando...");
    return createPlayerBrain();
  }

  return {
    net,
    lastOutput: { x: 0, y: 0 }
  };
};

export const createUntrained = (): NeuralNet => {
  const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
    hiddenLayers: [32, 32, 16],
    activation: 'leaky-relu',
    learningRate: 0.01,
  });

  const centerPosition = { 
    x: PITCH_WIDTH/2, 
    y: PITCH_HEIGHT/2 
  };

  const context: TeamContext = {
    teammates: [centerPosition],
    opponents: [centerPosition],
    ownGoal: { x: 0, y: PITCH_HEIGHT/2 },
    opponentGoal: { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 }
  };

  const input = createNeuralInput(
    { position: centerPosition, velocity: { x: 0, y: 0 } },
    centerPosition,
    context
  );

  net.train([{
    input,
    output: {
      moveX: 0,
      moveY: 0,
      shootBall: 0.5,
      passBall: 0.5,
      intercept: 0.5
    }
  }], {
    iterations: 100,
    errorThresh: 0.01
  });

  if (!isNetworkValid(net)) {
    console.warn("Red neuronal no entrenada inválida, reinicializando...");
    return createUntrained();
  }

  return {
    net,
    lastOutput: { x: 0, y: 0 }
  };
};
