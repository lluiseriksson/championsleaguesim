
import * as brain from 'brain.js';
import { NeuralNet, NeuralInput, NeuralOutput } from '../types/football';

// Create a new player brain (neural network)
export const createPlayerBrain = (): NeuralNet => {
  return {
    net: new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
      hiddenLayers: [16, 8],
      activation: 'sigmoid'
    }),
    lastOutput: { x: 0, y: 0 }
  };
};

// Normalize value to range between 0 and 1
export const normalizeValue = (value: number, min: number, max: number): number => {
  return (value - min) / (max - min);
};

// Calculate distance between two positions
export const calculateDistance = (pos1: { x: number, y: number }, pos2: { x: number, y: number }): number => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};
