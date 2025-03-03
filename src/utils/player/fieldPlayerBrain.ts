
import { NeuralNet } from '../../types/football';
import { createUntrained } from '../neuralNetwork';

// Create a player brain for neural network-based movement
export const createPlayerBrain = (): NeuralNet => {
  return createUntrained();
};
