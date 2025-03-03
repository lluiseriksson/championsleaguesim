import * as brain from 'brain.js';

export interface Position {
  x: number;
  y: number;
}

export interface TeamContext {
  teammates: Position[];
  opponents: Position[];
  ownGoal: Position;
  opponentGoal: Position;
}

// Cambiamos NeuralInput para que cumpla con INeuralNetworkData
export interface NeuralInput {
  [key: string]: number; // Añadimos index signature
  ballX: number;
  ballY: number;
  playerX: number;
  playerY: number;
  ballVelocityX: number;
  ballVelocityY: number;
  distanceToGoal: number;
  angleToGoal: number;
  nearestTeammateDistance: number;
  nearestTeammateAngle: number;
  nearestOpponentDistance: number;
  nearestOpponentAngle: number;
  isInShootingRange: number;
  isInPassingRange: number;
  isDefendingRequired: number;
  // Añadimos campos para mejor prevención de autogoles
  distanceToOwnGoal: number;
  angleToOwnGoal: number;
  isFacingOwnGoal: number;
  isDangerousPosition: number;
  isBetweenBallAndOwnGoal: number;
}

// Cambiamos NeuralOutput para que cumpla con INeuralNetworkData
export interface NeuralOutput {
  [key: string]: number; // Añadimos index signature
  moveX: number;
  moveY: number;
  shootBall: number;
  passBall: number;
  intercept: number;
}

export interface NeuralNet {
  net: brain.NeuralNetwork<NeuralInput, NeuralOutput>;
  lastOutput: { x: number; y: number };
  lastAction?: 'move' | 'shoot' | 'pass' | 'intercept';
  targetPlayer?: Player; // Add the targetPlayer property
}

export interface Player {
  id: number;
  position: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team: 'red' | 'blue';
  brain: NeuralNet;
  targetPosition: Position;
}

// Added bounceDetection property to Ball interface
export interface Ball {
  position: Position;
  velocity: Position;
  bounceDetection?: {
    consecutiveBounces: number;
    lastBounceTime: number;
    lastBounceSide: string;
    sideEffect: boolean;
  };
}

export interface Score {
  red: number;
  blue: number;
}

export const PITCH_WIDTH = 800;
export const PITCH_HEIGHT = 600;
export const GOAL_WIDTH = 120;
export const GOAL_HEIGHT = 160;
export const PLAYER_RADIUS = 12;
export const BALL_RADIUS = 6;
export const PLAYER_SPEED = 2;
export const SHOOT_POWER = 15;
export const PASS_POWER = 8;
