
import * as brain from 'brain.js';
import { NeuralNet, NeuralInput, NeuralOutput, NetworkSpecialization } from '../types/football';
import { isNetworkValid } from './neuralHelpers';

// Ensemble method: Simple averaging of multiple network outputs
export const averageEnsembleOutput = (
  networks: brain.NeuralNetwork<NeuralInput, NeuralOutput>[],
  input: NeuralInput
): NeuralOutput => {
  try {
    const validNetworks = networks.filter(isNetworkValid);
    
    if (validNetworks.length === 0) {
      throw new Error('No valid networks found for ensemble averaging');
    }
    
    const outputs = validNetworks.map(net => net.run(input));
    
    const result: NeuralOutput = {
      moveX: 0,
      moveY: 0,
      shootBall: 0,
      passBall: 0,
      intercept: 0
    };
    
    outputs.forEach(output => {
      result.moveX += output.moveX / outputs.length;
      result.moveY += output.moveY / outputs.length;
      result.shootBall += output.shootBall / outputs.length;
      result.passBall += output.passBall / outputs.length;
      result.intercept += output.intercept / outputs.length;
    });
    
    return result;
  } catch (error) {
    console.warn('Error in ensemble averaging:', error);
    return {
      moveX: 0.5,
      moveY: 0.5,
      shootBall: 0,
      passBall: 0,
      intercept: 0
    };
  }
};

// Ensemble method: Weighted voting based on network performance
export const weightedEnsembleOutput = (
  networks: Array<{ net: brain.NeuralNetwork<NeuralInput, NeuralOutput>, weight: number }>,
  input: NeuralInput
): NeuralOutput => {
  try {
    const validNetworks = networks.filter(n => isNetworkValid(n.net));
    
    if (validNetworks.length === 0) {
      throw new Error('No valid networks found for weighted ensemble');
    }
    
    const totalWeight = validNetworks.reduce((sum, network) => sum + network.weight, 0);
    
    if (totalWeight === 0) {
      throw new Error('Total weight is zero for weighted ensemble');
    }
    
    const result: NeuralOutput = {
      moveX: 0,
      moveY: 0,
      shootBall: 0,
      passBall: 0,
      intercept: 0
    };
    
    validNetworks.forEach(network => {
      const output = network.net.run({
        ...input,
        // Ensure player identity parameters are included
        playerId: input.playerId || 0.5,
        playerRoleEncoding: input.playerRoleEncoding || 0.5,
        playerTeamId: input.playerTeamId || 0.5,
        playerPositionalRole: input.playerPositionalRole || 0.5
      });
      
      const normalizedWeight = network.weight / totalWeight;
      
      result.moveX += output.moveX * normalizedWeight;
      result.moveY += output.moveY * normalizedWeight;
      result.shootBall += output.shootBall * normalizedWeight;
      result.passBall += output.passBall * normalizedWeight;
      result.intercept += output.intercept * normalizedWeight;
    });
    
    return result;
  } catch (error) {
    console.warn('Error in weighted ensemble:', error);
    return {
      moveX: 0.5,
      moveY: 0.5,
      shootBall: 0,
      passBall: 0,
      intercept: 0
    };
  }
};

// Create a shared neural network interface
export const createSharedNeuralInterface = (
  baseNetwork: NeuralNet, 
  useSharedParameters: boolean = true
): NeuralNet => {
  return {
    ...baseNetwork,
    sharedParameters: useSharedParameters
  };
};
