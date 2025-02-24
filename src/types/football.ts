
import * as brain from 'brain.js';

export interface Position {
  x: number;
  y: number;
}

export interface NeuralNet {
  net: brain.NeuralNetwork<{ ballX: number, ballY: number, playerX: number, playerY: number }, { moveX: number, moveY: number }>;
  lastOutput: { x: number; y: number };
}

export interface Player {
  id: number;
  position: Position;
  role: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  team: 'red' | 'blue';
  brain: NeuralNet;
  targetPosition: Position;
}

export interface Ball {
  position: Position;
  velocity: Position;
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
