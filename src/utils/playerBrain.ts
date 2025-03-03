
import { NeuralNet, Player, TeamContext, Ball } from '../types/football';

// Re-export all functions from their respective files
export { createPlayerBrain, normalizeValue, calculateDistance } from './neuralCore';
export { moveGoalkeeper } from './player/goalkeeperBrain';
export { calculateNetworkInputs } from './neuralInputs';
export { updatePlayerBrain } from './brainTraining';
export { 
  normalizePosition, 
  calculateAngleAndDistance, 
  getNearestEntity, 
  createNeuralInput, 
  isNetworkValid 
} from './neuralHelpers';

// Any additional shared logic can be placed here
