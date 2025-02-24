
import * as brain from 'brain.js';
import { NeuralNet, Position, MAX_STAMINA, MATCH_DURATION } from '../types/football';
import { PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

export const createPlayerBrain = (): NeuralNet => {
  const net = new brain.NeuralNetwork<
    { 
      ballX: number, 
      ballY: number, 
      playerX: number, 
      playerY: number,
      stamina: number,
      timeLeft: number
    },
    { moveX: number, moveY: number }
  >({
    hiddenLayers: [6, 4],  // Aumentamos las capas ocultas para manejar más inputs
  });

  net.train([
    { 
      input: { 
        ballX: 0, ballY: 0, 
        playerX: 0, playerY: 0, 
        stamina: 1, timeLeft: 1 
      }, 
      output: { moveX: 1, moveY: 0 } 
    },
    { 
      input: { 
        ballX: 1, ballY: 1, 
        playerX: 0, playerY: 0, 
        stamina: 0.2, timeLeft: 0.5 
      }, 
      output: { moveX: 0.2, moveY: 0.2 } // Movimiento más conservador con poca estamina
    },
    { 
      input: { 
        ballX: 0.5, ballY: 0.5, 
        playerX: 0.5, playerY: 0.5, 
        stamina: 0.1, timeLeft: 0.1 
      }, 
      output: { moveX: 0, moveY: 0 } // Sin movimiento con muy poca estamina
    },
  ], {
    iterations: 2000,
    errorThresh: 0.005
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
  player: { position: Position, stamina: number },
  timeLeft: number
) => {
  const normalizedInput = {
    ballX: ball.position.x / PITCH_WIDTH,
    ballY: ball.position.y / PITCH_HEIGHT,
    playerX: player.position.x / PITCH_WIDTH,
    playerY: player.position.y / PITCH_HEIGHT,
    stamina: player.stamina / MAX_STAMINA,
    timeLeft: timeLeft / MATCH_DURATION
  };

  const learningRate = isScoring ? 0.3 : 0.1;
  
  // Ajustamos el output deseado basado en la estamina
  const staminaFactor = Math.max(0.2, player.stamina / MAX_STAMINA);
  const targetOutput = isScoring ? {
    moveX: ((ball.position.x - player.position.x) > 0 ? 1 : -1) * staminaFactor,
    moveY: ((ball.position.y - player.position.y) > 0 ? 1 : -1) * staminaFactor
  } : {
    moveX: ((player.position.x - ball.position.x) > 0 ? -1 : 1) * staminaFactor,
    moveY: ((player.position.y - ball.position.y) > 0 ? -1 : 1) * staminaFactor
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
