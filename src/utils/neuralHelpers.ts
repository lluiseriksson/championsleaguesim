
import * as brain from 'brain.js';
import { NeuralInput, NeuralOutput, NeuralNet, Position, Player, Ball, TeamContext } from '../types/football';
import { calculateNetworkInputs } from './neuralInputs';

// Normaliza coordenadas para que estén dentro del rango 0-1
export const normalizePosition = (pos: Position, width: number, height: number): Position => {
  return {
    x: pos.x / width,
    y: pos.y / height
  };
};

// Calcula ángulo y distancia entre dos puntos
export const calculateAngleAndDistance = (from: Position, to: Position): { angle: number, distance: number } => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    angle: Math.atan2(dy, dx),
    distance: Math.sqrt(dx * dx + dy * dy)
  };
};

// Encuentra la entidad más cercana entre un grupo de posiciones
export function getNearestEntity(position: Position, entities: Position[]): { position: Position, distance: number } | null {
  if (entities.length === 0) return null;
  
  let nearestEntity = entities[0];
  let minDistance = Math.sqrt(
    Math.pow(position.x - entities[0].x, 2) + 
    Math.pow(position.y - entities[0].y, 2)
  );
  
  for (let i = 1; i < entities.length; i++) {
    const distance = Math.sqrt(
      Math.pow(position.x - entities[i].x, 2) + 
      Math.pow(position.y - entities[i].y, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestEntity = entities[i];
    }
  }
  
  return { position: nearestEntity, distance: minDistance };
}

// Función para crear una entrada de red neuronal con datos normalizados
export function createNeuralInput(player: Player, ball: Ball, context: TeamContext): NeuralInput {
  return calculateNetworkInputs(ball, player, context);
}

// Verifica si una red neuronal es válida
export function isNetworkValid(net: brain.NeuralNetwork<NeuralInput, NeuralOutput>): boolean {
  try {
    // Creamos una entrada de prueba con valores aleatorios
    const testInput: NeuralInput = {
      ballX: 0.5,
      ballY: 0.5,
      playerX: 0.5,
      playerY: 0.5,
      ballVelocityX: 0,
      ballVelocityY: 0,
      distanceToGoal: 0.5,
      angleToGoal: 0,
      nearestTeammateDistance: 0.5,
      nearestTeammateAngle: 0,
      nearestOpponentDistance: 0.5,
      nearestOpponentAngle: 0,
      isInShootingRange: 0,
      isInPassingRange: 0,
      isDefendingRequired: 0,
      distanceToOwnGoal: 0.5,
      angleToOwnGoal: 0,
      isFacingOwnGoal: 0,
      isDangerousPosition: 0,
      isBetweenBallAndOwnGoal: 0,
      strengthMultiplier: 0.9
    };
    
    // Intentamos realizar una predicción
    const output = net.run(testInput);
    
    // Verificamos que la salida tenga todos los campos necesarios
    return (
      typeof output.moveX === 'number' &&
      typeof output.moveY === 'number' &&
      typeof output.shootBall === 'number' &&
      typeof output.passBall === 'number' &&
      typeof output.intercept === 'number' &&
      !isNaN(output.moveX) &&
      !isNaN(output.moveY) &&
      !isNaN(output.shootBall) &&
      !isNaN(output.passBall) &&
      !isNaN(output.intercept)
    );
  } catch (error) {
    console.error("Error validating network:", error);
    return false;
  }
}
