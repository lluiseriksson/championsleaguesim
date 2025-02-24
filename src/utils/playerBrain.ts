
import * as brain from 'brain.js';
import { NeuralNet, Position, NeuralInput, NeuralOutput, TeamContext, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

const normalizePosition = (pos: Position): Position => ({
  x: pos.x / PITCH_WIDTH,
  y: pos.y / PITCH_HEIGHT
});

const calculateAngleAndDistance = (from: Position, to: Position) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    angle: Math.atan2(dy, dx) / Math.PI, // Normalize to [-1, 1]
    distance: Math.sqrt(dx * dx + dy * dy) / Math.sqrt(PITCH_WIDTH * PITCH_WIDTH + PITCH_HEIGHT * PITCH_HEIGHT)
  };
};

const getNearestEntity = (position: Position, entities: Position[]) => {
  let nearest = { distance: Infinity, angle: 0 };
  
  entities.forEach(entity => {
    const result = calculateAngleAndDistance(position, entity);
    if (result.distance < nearest.distance) {
      nearest = result;
    }
  });
  
  return nearest;
};

const createNeuralInput = (
  ball: { position: Position, velocity: Position },
  player: Position,
  context: TeamContext
): NeuralInput => {
  const normalizedBall = normalizePosition(ball.position);
  const normalizedPlayer = normalizePosition(player);
  const goalAngle = calculateAngleAndDistance(player, context.opponentGoal);
  const nearestTeammate = getNearestEntity(player, context.teammates);
  const nearestOpponent = getNearestEntity(player, context.opponents);
  
  const isInShootingRange = goalAngle.distance < 0.3 ? 1 : 0;
  const isInPassingRange = nearestTeammate.distance < 0.2 ? 1 : 0;
  const isDefendingRequired = nearestOpponent.distance < 0.15 ? 1 : 0;

  return {
    ballX: normalizedBall.x,
    ballY: normalizedBall.y,
    playerX: normalizedPlayer.x,
    playerY: normalizedPlayer.y,
    ballVelocityX: ball.velocity.x / 20,
    ballVelocityY: ball.velocity.y / 20,
    distanceToGoal: goalAngle.distance,
    angleToGoal: goalAngle.angle,
    nearestTeammateDistance: nearestTeammate.distance,
    nearestTeammateAngle: nearestTeammate.angle,
    nearestOpponentDistance: nearestOpponent.distance,
    nearestOpponentAngle: nearestOpponent.angle,
    isInShootingRange,
    isInPassingRange,
    isDefendingRequired
  };
};

export const createPlayerBrain = (): NeuralNet => {
  const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
    hiddenLayers: [32, 32, 16], // Tres capas ocultas más grandes
    activation: 'leaky-relu', // Mejor para redes profundas
    learningRate: 0.01,
  });

  // Entrenamiento inicial con situaciones diversas
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

  // Mínima inicialización
  const randomPosition = () => ({ 
    x: PITCH_WIDTH/2, 
    y: PITCH_HEIGHT/2 
  });

  const context: TeamContext = {
    teammates: [randomPosition()],
    opponents: [randomPosition()],
    ownGoal: { x: 0, y: PITCH_HEIGHT/2 },
    opponentGoal: { x: PITCH_WIDTH, y: PITCH_HEIGHT/2 }
  };

  const input = createNeuralInput(
    { position: randomPosition(), velocity: { x: 0, y: 0 } },
    randomPosition(),
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
    iterations: 1,
    errorThresh: 0.1
  });

  return {
    net,
    lastOutput: { x: 0, y: 0 }
  };
};

export const updatePlayerBrain = (
  brain: NeuralNet,
  isScoring: boolean,
  ball: { position: Position, velocity: Position },
  player: Player,
  context: TeamContext
) => {
  const input = createNeuralInput(ball, player.position, context);

  // Recompensas basadas en el rol y la situación
  const rewardMultiplier = isScoring ? 2 : 1;
  let targetOutput: NeuralOutput;

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
    targetOutput = {
      moveX: (player.position.x - ball.position.x) > 0 ? -0.3 : 0.3,
      moveY: (player.position.y - ball.position.y) > 0 ? -1 : 1,
      shootBall: 0.1,
      passBall: input.isInPassingRange * 2,
      intercept: 1
    };
  }

  // Aplicar el multiplicador de recompensa
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

  // Mostrar estado de la red
  const weights = brain.net.weights;
  console.log(`Red neuronal ${player.team} ${player.role} #${player.id}:`, {
    input,
    output: brain.net.run(input),
    targetOutput,
    weightsShape: {
      inputToHidden1: weights[0].length,
      hidden1ToHidden2: weights[1].length,
      hidden2ToHidden3: weights[2].length,
      hidden3ToOutput: weights[3].length
    }
  });

  return {
    net: brain.net,
    lastOutput: brain.lastOutput,
    lastAction: brain.lastAction
  };
};
