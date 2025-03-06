import { NeuralInput, NeuralOutput, ExperienceReplay, NeuralNet, SituationContext, Position } from '../types/football';
import { selectSpecializedNetwork, updateSpecializedNetworks } from './specializedNetworks';
import { createSituationContext } from './neuralHelpers';

// Initialize an experience replay buffer
export const createExperienceReplay = (capacity: number = 100): ExperienceReplay => {
  return {
    inputs: [],
    outputs: [],
    rewards: [],
    priorities: [],
    timestamps: [],
    capacity,
    currentIndex: 0
  };
};

// Add an experience to the replay buffer
export const addExperience = (
  experienceReplay: ExperienceReplay,
  input: NeuralInput,
  output: NeuralOutput,
  reward: number,
  priority: number = 1.0
): ExperienceReplay => {
  const { inputs, outputs, rewards, priorities, timestamps, capacity, currentIndex } = experienceReplay;
  
  // If we haven't reached capacity yet, just push
  if (inputs.length < capacity) {
    return {
      inputs: [...inputs, input],
      outputs: [...outputs, output],
      rewards: [...rewards, reward],
      priorities: [...priorities, priority],
      timestamps: [...timestamps, Date.now()],
      capacity,
      currentIndex: currentIndex + 1
    };
  }
  
  // Otherwise, replace at the current index (circular buffer)
  const newInputs = [...inputs];
  const newOutputs = [...outputs];
  const newRewards = [...rewards];
  const newPriorities = [...priorities];
  const newTimestamps = [...timestamps];
  
  newInputs[currentIndex] = input;
  newOutputs[currentIndex] = output;
  newRewards[currentIndex] = reward;
  newPriorities[currentIndex] = priority;
  newTimestamps[currentIndex] = Date.now();
  
  return {
    inputs: newInputs,
    outputs: newOutputs,
    rewards: newRewards,
    priorities: newPriorities,
    timestamps: newTimestamps,
    capacity,
    currentIndex: (currentIndex + 1) % capacity
  };
};

// Sample experiences for training based on priorities
export const sampleExperiences = (
  experienceReplay: ExperienceReplay,
  sampleSize: number = 10,
  specializationType?: string
): { inputs: NeuralInput[], outputs: NeuralOutput[], weights: number[] } => {
  const { inputs, outputs, priorities } = experienceReplay;
  
  if (inputs.length === 0) {
    return { inputs: [], outputs: [], weights: [] };
  }
  
  // Calculate sampling weights based on priorities
  const totalPriority = priorities.reduce((sum, priority) => sum + priority, 0);
  const weights = priorities.map(priority => priority / totalPriority);
  
  // Filter by specialization if requested
  let selectedIndices: number[] = [];
  
  if (specializationType) {
    // For specialized training, select related experiences
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      
      // Create a situation context to determine if this experience is relevant
      // to the specialization we're training
      const relevantToSpecialization = isExperienceRelevantToSpecialization(
        input,
        specializationType
      );
      
      if (relevantToSpecialization) {
        selectedIndices.push(i);
      }
    }
    
    // If we have too many samples, select a random subset
    if (selectedIndices.length > sampleSize) {
      selectedIndices = selectedIndices
        .sort(() => Math.random() - 0.5)
        .slice(0, sampleSize);
    }
  } else {
    // Without specialization, use original priority-based sampling
    for (let i = 0; i < Math.min(sampleSize, inputs.length); i++) {
      const random = Math.random();
      let cumulativeWeight = 0;
      
      for (let j = 0; j < weights.length; j++) {
        cumulativeWeight += weights[j];
        if (random <= cumulativeWeight) {
          selectedIndices.push(j);
          break;
        }
      }
    }
  }
  
  // Extract the selected experiences
  const sampledInputs = selectedIndices.map(index => inputs[index]);
  const sampledOutputs = selectedIndices.map(index => outputs[index]);
  const sampledWeights = selectedIndices.map(index => weights[index]);
  
  return { 
    inputs: sampledInputs, 
    outputs: sampledOutputs,
    weights: sampledWeights
  };
};

// Determine if an experience is relevant to a specific specialization
const isExperienceRelevantToSpecialization = (
  input: NeuralInput,
  specializationType: string
): boolean => {
  // Simple rules to determine relevance
  switch (specializationType) {
    case 'attacking':
      return input.playerX > 0.6 && input.isInShootingRange > 0.5;
    case 'defending':
      return input.playerX < 0.4 && input.isDefendingRequired > 0.5;
    case 'possession':
      return input.isInPassingRange > 0.5 && input.nearestTeammateDistance < 0.3;
    case 'transition':
      return Math.abs(input.ballVelocityX) > 0.3 || Math.abs(input.ballVelocityY) > 0.3;
    case 'setpiece':
      // Would need more context about set pieces
      return false;
    default:
      return true; // General is always relevant
  }
};

// Get the curriculum learning difficulty based on stage
export const getCurriculumDifficulty = (stage: number): {
  learningRate: number,
  batchSize: number,
  errorThreshold: number,
  rewardScale: number
} => {
  // Ensure stage is between 0 and 1
  const normalizedStage = Math.max(0, Math.min(1, stage));
  
  // Learning rate decreases as stage increases (more fine-tuning)
  const learningRate = 0.1 - (normalizedStage * 0.08);
  
  // Batch size increases as stage increases (more complex patterns)
  const batchSize = Math.floor(5 + (normalizedStage * 15));
  
  // Error threshold decreases as stage increases (higher precision)
  const errorThreshold = 0.01 - (normalizedStage * 0.008);
  
  // Reward scale increases as stage increases (more ambitious goals)
  const rewardScale = 1.0 + normalizedStage;
  
  return {
    learningRate,
    batchSize,
    errorThreshold,
    rewardScale
  };
};

// Update curriculum learning stage based on performance
export const updateCurriculumStage = (brain: NeuralNet): number => {
  if (!brain.successRate) {
    return 0.1; // Default starting stage
  }
  
  // Calculate stage based on overall success rate
  // We want to progress gradually but not too quickly
  let stage = brain.learningStage || 0;
  
  // Increase stage if doing well
  if (brain.successRate.overall > 0.6) {
    stage += 0.05;
  }
  // Decrease stage if doing poorly
  else if (brain.successRate.overall < 0.3) {
    stage -= 0.03;
  }
  
  // If using specialized networks, adjust based on their performance too
  if (brain.specializedNetworks && brain.specializedNetworks.length > 0) {
    const avgSpecializedPerformance = brain.specializedNetworks.reduce(
      (sum, network) => sum + network.performance.overallSuccess, 
      0
    ) / brain.specializedNetworks.length;
    
    if (avgSpecializedPerformance > 0.7) {
      stage += 0.02;
    } else if (avgSpecializedPerformance < 0.4) {
      stage -= 0.02;
    }
  }
  
  // Clamp to valid range
  return Math.max(0.1, Math.min(1.0, stage));
};

// Add training for specialized networks
export const trainSpecializedNetworks = (
  brain: NeuralNet,
  input: NeuralInput,
  output: NeuralOutput,
  reward: number,
  playerPosition: Position,
  ballPosition: Position
): NeuralNet => {
  if (!brain.specializedNetworks || brain.specializedNetworks.length === 0) {
    return brain;
  }
  
  try {
    // Create a situation context to update the right networks
    const dummyContext: TeamContext = {
      teammates: [],
      opponents: [],
      ownGoal: { x: 0, y: 0 },
      opponentGoal: { x: 0, y: 0 }
    };
    
    const situation = createSituationContext(input, dummyContext, playerPosition, ballPosition);
    
    // Determine which specialized network to use
    const specializationType = selectSpecializedNetwork(brain, situation);
    
    // Get samples focused on this specialization for more targeted training
    if (brain.experienceReplay) {
      const { inputs, outputs } = sampleExperiences(
        brain.experienceReplay,
        10, // Small batch size for incremental learning
        specializationType
      );
      
      if (inputs.length > 0 && outputs.length > 0) {
        // Find the right specialized network to train
        const specializedNetwork = brain.specializedNetworks.find(
          n => n.type === specializationType
        );
        
        if (specializedNetwork) {
          // Train the specialized network
          specializedNetwork.net.train(
            inputs.map((input, i) => ({ input, output: outputs[i] })),
            {
              iterations: 20, // Quick adaptive training
              errorThresh: 0.01,
              learningRate: 0.05,
              logPeriod: 100
            }
          );
          
          console.log(`Trained specialized network: ${specializationType}`);
        }
      }
    }
    
    // Update network performance based on reward
    const success = reward > 0;
    return updateSpecializedNetworks(brain, 'move', success, situation);
    
  } catch (error) {
    console.warn('Error training specialized networks:', error);
    return brain;
  }
};
