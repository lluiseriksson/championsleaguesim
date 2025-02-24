
import * as brain from 'brain.js';
import { NeuralNet, Position } from '../types/football';
import { PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

export const createPlayerBrain = (): NeuralNet => {
  const net = new brain.NeuralNetwork<
    { ballX: number, ballY: number, playerX: number, playerY: number },
    { moveX: number, moveY: number }
  >({
    hiddenLayers: [4],
  });

  net.train([
    { input: { ballX: 0, ballY: 0, playerX: 0, playerY: 0 }, output: { moveX: 1, moveY: 0 } },
    { input: { ballX: 1, ballY: 1, playerX: 0, playerY: 0 }, output: { moveX: 1, moveY: 1 } },
    { input: { ballX: 0, ballY: 1, playerX: 1, playerY: 0 }, output: { moveX: -1, moveY: 1 } },
  ], {
    iterations: 1000,
    errorThresh: 0.005
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
    hiddenLayers: [4],
  });

  // Solo inicializamos la red sin entrenarla
  net.train([
    { input: { ballX: 0.5, ballY: 0.5, playerX: 0.5, playerY: 0.5 }, output: { moveX: 0.5, moveY: 0.5 } }
  ], {
    iterations: 1,
    errorThresh: 1
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

  const learningRate = isScoring ? 0.3 : 0.1;
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
    iterations: 100,
    errorThresh: 0.05,
    learningRate
  });

  return {
    net: brain.net,
    lastOutput: brain.lastOutput
  };
};
