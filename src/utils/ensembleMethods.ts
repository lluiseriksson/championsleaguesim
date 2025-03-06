
import * as brain from 'brain.js';
import { NeuralNet, NeuralInput, NeuralOutput } from '../types/football';
import { createPlayerBrain } from './neuralNetwork';
import { isNetworkValid } from './neuralHelpers';

// Create ensemble of neural networks (different architectures/parameters)
export const createEnsemble = (count: number = 3): NeuralNet[] => {
  const networks: NeuralNet[] = [];
  
  // Base network with standard configuration
  const baseNet = createPlayerBrain();
  networks.push(baseNet);
  
  // Add networks with different configurations
  for (let i = 1; i < count; i++) {
    try {
      const net = new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
        hiddenLayers: i === 1 ? [32, 16] : [16, 16, 8], // Different architectures
        activation: i === 1 ? 'sigmoid' : 'leaky-relu', // Different activation functions
        learningRate: 0.05 + (i * 0.02),
        momentum: 0.1 + (i * 0.05),
        binaryThresh: 0.5,
        errorThresh: 0.005
      });
      
      // Initialize with some basic training data
      net.train([{
        input: createDefaultInput(),
        output: createDefaultOutput()
      }], { iterations: 100 });
      
      if (isNetworkValid(net)) {
        networks.push({
          net,
          lastOutput: { x: 0, y: 0 },
          successRate: {
            shoot: 0.5,
            pass: 0.5,
            intercept: 0.5,
            overall: 0.5
          }
        });
      }
    } catch (error) {
      console.error(`Error creating ensemble network ${i}:`, error);
    }
  }
  
  return networks;
};

// Create a default input for initialization
const createDefaultInput = (): NeuralInput => ({
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
  teamElo: 0.5,
  eloAdvantage: 0,
  gameTime: 0.5,
  scoreDifferential: 0,
  momentum: 0.5,
  formationCompactness: 0.5,
  formationWidth: 0.5,
  recentSuccessRate: 0.5,
  possessionDuration: 0,
  distanceFromFormationCenter: 0.5,
  isInFormationPosition: 1,
  teammateDensity: 0.5,
  opponentDensity: 0.5
});

// Create a default output for initialization
const createDefaultOutput = (): NeuralOutput => ({
  moveX: 0.5,
  moveY: 0.5,
  shootBall: 0.2,
  passBall: 0.2,
  intercept: 0.2
});

// Get weighted prediction from ensemble
export const getEnsemblePrediction = (
  networks: NeuralNet[],
  input: NeuralInput,
  weights?: number[]
): NeuralOutput => {
  if (networks.length === 0) {
    return createDefaultOutput();
  }
  
  if (networks.length === 1) {
    return networks[0].net.run(input);
  }
  
  // Use equal weights if none provided
  const netWeights = weights || networks.map(() => 1 / networks.length);
  
  // Get predictions from all networks
  const predictions = networks
    .filter(n => isNetworkValid(n.net))
    .map(n => n.net.run(input));
  
  if (predictions.length === 0) {
    return createDefaultOutput();
  }
  
  // Calculate weighted average
  const result: NeuralOutput = {
    moveX: 0,
    moveY: 0,
    shootBall: 0,
    passBall: 0,
    intercept: 0
  };
  
  // Normalize weights to sum to 1
  const totalWeight = netWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = netWeights.map(w => w / totalWeight);
  
  // Calculate weighted sum
  predictions.forEach((pred, i) => {
    const weight = normalizedWeights[i] || 0;
    result.moveX += pred.moveX * weight;
    result.moveY += pred.moveY * weight;
    result.shootBall += pred.shootBall * weight;
    result.passBall += pred.passBall * weight;
    result.intercept += pred.intercept * weight;
  });
  
  return result;
};

// Update ensemble weights based on performance (not implemented yet)
export const updateEnsembleWeights = (
  networks: NeuralNet[],
  successRates: number[]
): number[] => {
  // Simple version: weights proportional to success rates
  const totalSuccess = successRates.reduce((sum, rate) => sum + rate, 0);
  
  if (totalSuccess <= 0) {
    // Equal weights if no success data
    return networks.map(() => 1 / networks.length);
  }
  
  // Weight by success rate
  return successRates.map(rate => rate / totalSuccess);
};
