import { NeuralNet, Player, TeamContext, Ball, Position, NeuralInput, NeuralOutput } from '../types/football';
import { saveModel } from './neuralModelService';
import { calculateAngleAndDistance, normalizePosition } from './neuralHelpers';
import * as brain from 'brain.js';

const LEARNING_RATE = 0.03;
const GOAL_REWARD = 1.0;
const MISS_PENALTY = -0.5;

// Helper functions that were previously imported
const calculateDistance = (pos1: Position, pos2: Position): number => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const normalizeValue = (value: number, min: number, max: number): number => {
  return (value - min) / (max - min);
};

// Add the missing createPlayerBrain function
export const createPlayerBrain = (): NeuralNet => {
  return {
    net: new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
      hiddenLayers: [16, 8],
      activation: 'sigmoid'
    }),
    lastOutput: { x: 0, y: 0 }
  };
};

// Add the moveGoalkeeper function
export const moveGoalkeeper = (player: Player, ball: Ball): { x: number, y: number } => {
  // Simple goalkeeper algorithm - focus on vertical movement to block the ball
  const moveX = 0; // Keep x position fixed near the goal line
  
  // Calculate vertical movement to track the ball
  let moveY = 0;
  const ballYDifference = ball.position.y - player.position.y;
  
  // Move toward the ball's vertical position, but slower than regular players
  if (Math.abs(ballYDifference) > 10) {
    moveY = Math.sign(ballYDifference) * 1.5;
  }
  
  return { x: moveX, y: moveY };
};

// Calcula las entradas para la red neuronal
export const calculateNetworkInputs = (ball: Ball, player: Player, context: TeamContext) => {
  // Normalizar valores para la red neuronal (entre 0 y 1)
  const normalizedBallX = normalizeValue(ball.position.x, 0, 800);
  const normalizedBallY = normalizeValue(ball.position.y, 0, 600);
  const normalizedPlayerX = normalizeValue(player.position.x, 0, 800);
  const normalizedPlayerY = normalizeValue(player.position.y, 0, 600);
  
  // Calcular distancias y ángulos
  const distanceToGoal = calculateDistance(player.position, context.opponentGoal);
  const normalizedDistanceToGoal = normalizeValue(distanceToGoal, 0, 1000);
  
  const angleToGoal = Math.atan2(
    context.opponentGoal.y - player.position.y,
    context.opponentGoal.x - player.position.x
  );
  const normalizedAngleToGoal = normalizeValue(angleToGoal, -Math.PI, Math.PI);
  
  // Encontrar compañero más cercano
  let nearestTeammateDistance = 1000;
  let nearestTeammateAngle = 0;
  
  if (context.teammates.length > 0) {
    for (const teammate of context.teammates) {
      const distance = calculateDistance(player.position, teammate);
      if (distance < nearestTeammateDistance) {
        nearestTeammateDistance = distance;
        nearestTeammateAngle = Math.atan2(
          teammate.y - player.position.y, 
          teammate.x - player.position.x
        );
      }
    }
  }
  
  const normalizedTeammateDistance = normalizeValue(nearestTeammateDistance, 0, 1000);
  const normalizedTeammateAngle = normalizeValue(nearestTeammateAngle, -Math.PI, Math.PI);
  
  // Encontrar oponente más cercano
  let nearestOpponentDistance = 1000;
  let nearestOpponentAngle = 0;
  
  if (context.opponents.length > 0) {
    for (const opponent of context.opponents) {
      const distance = calculateDistance(player.position, opponent);
      if (distance < nearestOpponentDistance) {
        nearestOpponentDistance = distance;
        nearestOpponentAngle = Math.atan2(
          opponent.y - player.position.y, 
          opponent.x - player.position.x
        );
      }
    }
  }
  
  const normalizedOpponentDistance = normalizeValue(nearestOpponentDistance, 0, 1000);
  const normalizedOpponentAngle = normalizeValue(nearestOpponentAngle, -Math.PI, Math.PI);
  
  // Flags para situaciones especiales
  const distanceToBall = calculateDistance(player.position, ball.position);
  const isInShootingRange = distanceToBall < 100 && distanceToGoal < 300 ? 1 : 0;
  const isInPassingRange = distanceToBall < 80 && nearestTeammateDistance < 200 ? 1 : 0;
  
  // Comprobación si debe defender (oponente cerca de nuestra portería con balón)
  const ballToOwnGoalDistance = calculateDistance(ball.position, context.ownGoal);
  const isDefendingRequired = ballToOwnGoalDistance < 300 ? 1 : 0;
  
  return {
    ballX: normalizedBallX,
    ballY: normalizedBallY,
    playerX: normalizedPlayerX,
    playerY: normalizedPlayerY,
    ballVelocityX: normalizeValue(ball.velocity.x, -20, 20),
    ballVelocityY: normalizeValue(ball.velocity.y, -20, 20),
    distanceToGoal: normalizedDistanceToGoal,
    angleToGoal: normalizedAngleToGoal,
    nearestTeammateDistance: normalizedTeammateDistance,
    nearestTeammateAngle: normalizedTeammateAngle,
    nearestOpponentDistance: normalizedOpponentDistance,
    nearestOpponentAngle: normalizedOpponentAngle,
    isInShootingRange,
    isInPassingRange,
    isDefendingRequired
  };
};

// Actualiza el cerebro del jugador en función del resultado
export const updatePlayerBrain = (brain: NeuralNet, scored: boolean, ball: Ball, player: Player, context: TeamContext): NeuralNet => {
  // No actualizar cerebros de porteros, ya que usan lógica predefinida
  if (player.role === "goalkeeper") {
    return brain;
  }
  
  // Datos de la última acción para el refuerzo
  const lastOutput = brain.lastOutput;
  const lastAction = brain.lastAction;
  
  // Factor de recompensa base
  let rewardFactor = scored ? GOAL_REWARD : MISS_PENALTY;
  
  // Ajustar recompensa según la acción tomada y el resultado
  if (scored) {
    // Si marcó, reforzar positivamente la acción que llevó al gol
    if (lastAction === 'shoot') {
      rewardFactor *= 1.5; // Refuerzo extra por disparar y marcar
    } else if (lastAction === 'pass' && player.team === 'red') {
      rewardFactor *= 1.2; // Refuerzo por pase que llevó a gol (para equipo rojo)
    }
  } else {
    // Si no marcó, penalizar menos si tomó decisiones sensatas
    if (lastAction === 'pass' && calculateDistance(player.position, context.opponentGoal) > 300) {
      rewardFactor *= 0.5; // Menor penalización por pasar cuando está lejos de la portería
    }
  }
  
  // Modificamos el último output como señal de entrenamiento
  const trainOutput = {
    moveX: lastOutput.x,
    moveY: lastOutput.y,
    shootBall: lastAction === 'shoot' ? (scored ? 1 : 0) : 0,
    passBall: lastAction === 'pass' ? (scored ? 1 : 0) : 0,
    intercept: lastAction === 'intercept' ? (scored ? 1 : 0) : 0
  };
  
  // Entrenamos la red con los últimos inputs y la señal reforzada
  try {
    const inputs = calculateNetworkInputs(ball, player, context);
    
    // Si es portero, no entrenar
    if (player.role !== "goalkeeper") {
      brain.net.train([{
        input: inputs,
        output: trainOutput
      }], {
        iterations: 1,
        errorThresh: 0.01,
        learningRate: LEARNING_RATE
      });
    }
    
    // Cada 50 goles, guardar el modelo en el servidor para entrenamiento colaborativo
    if (scored && Math.random() < 0.2) {
      saveModel(player).catch(error => 
        console.error(`Error al guardar modelo después de gol para ${player.team} ${player.role}:`, error)
      );
    }
  } catch (error) {
    console.error('Error al entrenar la red neuronal:', error);
  }
  
  return brain;
};
