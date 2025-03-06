import { NeuralInput, NeuralOutput, ExperienceReplay, NeuralNet } from '../types/football';

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
  sampleSize: number = 10
): { inputs: NeuralInput[], outputs: NeuralOutput[], weights: number[] } => {
  const { inputs, outputs, priorities } = experienceReplay;
  
  if (inputs.length === 0) {
    return { inputs: [], outputs: [], weights: [] };
  }
  
  // Calculate sampling weights based on priorities
  const totalPriority = priorities.reduce((sum, priority) => sum + priority, 0);
  const weights = priorities.map(priority => priority / totalPriority);
  
  // Select indices based on weights
  const selectedIndices: number[] = [];
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
  
  // Clamp to valid range
  return Math.max(0.1, Math.min(1.0, stage));
};
