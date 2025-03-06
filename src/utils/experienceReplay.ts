import { NeuralInput, NeuralOutput, ExperienceReplay, NeuralNet, SituationContext, Position, TeamContext } from '../types/football';
import { selectSpecializedNetwork, updateSpecializedNetworks } from './specializedNetworks';
import { createSituationContext } from './neuralHelpers';
import { calculateDistance } from './neuralCore';

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
  
  const totalPriority = priorities.reduce((sum, priority) => sum + priority, 0);
  const weights = priorities.map(priority => priority / totalPriority);
  
  let selectedIndices: number[] = [];
  
  if (specializationType) {
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      
      const relevantToSpecialization = isExperienceRelevantToSpecialization(
        input,
        specializationType
      );
      
      if (relevantToSpecialization) {
        selectedIndices.push(i);
      }
    }
    
    if (selectedIndices.length > sampleSize) {
      selectedIndices = selectedIndices
        .sort(() => Math.random() - 0.5)
        .slice(0, sampleSize);
    }
  } else {
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
      return false;
    default:
      return true;
  }
};

// Get the curriculum learning difficulty based on stage
export const getCurriculumDifficulty = (stage: number): {
  learningRate: number,
  batchSize: number,
  errorThreshold: number,
  rewardScale: number
} => {
  const normalizedStage = Math.max(0, Math.min(1, stage));
  
  const learningRate = 0.15 - (normalizedStage * 0.12);
  const batchSize = Math.floor(8 + (normalizedStage * 22));
  const errorThreshold = 0.015 - (normalizedStage * 0.013);
  const rewardScale = 1.0 + (normalizedStage * 1.5);
  
  return {
    learningRate,
    batchSize,
    errorThreshold,
    rewardScale
  };
};

// Update curriculum learning stage based on performance with improved progression
export const updateCurriculumStage = (brain: NeuralNet): number => {
  if (!brain.successRate) {
    return 0.1;
  }
  
  let stage = brain.learningStage || 0;
  
  if (brain.successRate.overall > 0.65) {
    stage += 0.08;
  } else if (brain.successRate.overall > 0.55) {
    stage += 0.05;
  } else if (brain.successRate.overall < 0.35) {
    stage -= 0.02;
  } else if (brain.successRate.overall < 0.25) {
    stage -= 0.04;
  }
  
  if (brain.specializedNetworks && brain.specializedNetworks.length > 0) {
    const avgSpecializedPerformance = brain.specializedNetworks.reduce(
      (sum, network) => sum + network.performance.overallSuccess, 
      0
    ) / brain.specializedNetworks.length;
    
    if (avgSpecializedPerformance > 0.7) {
      stage += 0.03;
    } else if (avgSpecializedPerformance > 0.6) {
      stage += 0.01;
    } else if (avgSpecializedPerformance < 0.4) {
      stage -= 0.01;
    } else if (avgSpecializedPerformance < 0.3) {
      stage -= 0.03;
    }
  }
  
  if (brain.actionHistory && brain.actionHistory.length > 20) {
    const recentActions = brain.actionHistory.slice(-20);
    const successCount = recentActions.filter(action => action.success).length;
    const successRate = successCount / 20;
    
    let oscillationCount = 0;
    for (let i = 1; i < recentActions.length; i++) {
      if (recentActions[i].success !== recentActions[i-1].success) {
        oscillationCount++;
      }
    }
    
    if (oscillationCount > 14) {
      stage -= 0.02;
    }
    
    if (successRate > 0.7 && oscillationCount < 6) {
      stage += 0.03;
    }
  }
  
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
    const dummyContext: TeamContext = {
      teammates: [],
      opponents: [],
      ownGoal: { x: 0, y: 0 },
      opponentGoal: { x: 0, y: 0 }
    };
    
    const situation = createSituationContext(input, dummyContext, playerPosition, ballPosition);
    
    const specializationType = selectSpecializedNetwork(brain, situation);
    
    if (brain.experienceReplay) {
      const { inputs, outputs } = sampleExperiences(
        brain.experienceReplay,
        10,
        specializationType
      );
      
      if (inputs.length > 0 && outputs.length > 0) {
        const specializedNetwork = brain.specializedNetworks.find(
          n => n.type === specializationType
        );
        
        if (specializedNetwork) {
          specializedNetwork.net.train(
            inputs.map((input, i) => ({ input, output: outputs[i] })),
            {
              iterations: 20,
              errorThresh: 0.01,
              learningRate: 0.05,
              logPeriod: 100
            }
          );
          
          console.log(`Trained specialized network: ${specializationType}`);
        }
      }
    }
    
    const success = reward > 0;
    return updateSpecializedNetworks(brain, 'move', success, situation);
  } catch (error) {
    console.warn('Error training specialized networks:', error);
    return brain;
  }
};

// New tactical reward functions

// Calculate reward based on maintaining proper formation position
export const calculateFormationReward = (
  player: Position,
  targetPosition: Position,
  role: string
): number => {
  const distance = calculateDistance(player, targetPosition);
  
  let optimalDistance = 50;
  switch(role) {
    case 'goalkeeper': optimalDistance = 30; break;
    case 'defender': optimalDistance = 80; break;
    case 'midfielder': optimalDistance = 120; break;
    case 'forward': optimalDistance = 150; break;
  }
  
  const formationDeviation = Math.max(0, distance - optimalDistance) / 100;
  return Math.max(0, 1 - (formationDeviation * formationDeviation));
};

// Calculate reward for creating or finding space
export const calculateSpaceCreationReward = (
  playerPosition: Position,
  teammatePositions: Position[],
  opponentPositions: Position[],
  role: string
): number => {
  let totalOpponentDistance = 0;
  opponentPositions.forEach(opponent => {
    totalOpponentDistance += calculateDistance(playerPosition, opponent);
  });
  
  const avgOpponentDistance = opponentPositions.length > 0 ? 
    totalOpponentDistance / opponentPositions.length : 200;
  
  let optimalSpacing = 100;
  let rewardScale = 1.0;
  
  switch(role) {
    case 'forward': 
      optimalSpacing = 150;
      rewardScale = 1.5;
      break;
    case 'midfielder': 
      optimalSpacing = 120;
      rewardScale = 1.2;
      break;
    case 'defender': 
      optimalSpacing = 80;
      rewardScale = 0.8;
      break;
    case 'goalkeeper': 
      return 0.5;
  }
  
  const normalizedSpace = Math.min(1.5, avgOpponentDistance / optimalSpacing);
  return Math.min(1, normalizedSpace * rewardScale);
};

// Calculate reward for strategic ball movement
export const calculateBallMovementReward = (
  ballPosition: Position,
  ballPreviousPosition: Position,
  ballVelocity: { x: number, y: number },
  playerTeam: 'red' | 'blue',
  opponentGoal: Position
): number => {
  const ballMovementDistance = calculateDistance(ballPosition, ballPreviousPosition);
  if (ballMovementDistance < 5) return 0;
  
  const dirToGoal = {
    x: opponentGoal.x - ballPreviousPosition.x,
    y: opponentGoal.y - ballPreviousPosition.y
  };
  
  const dirToGoalLength = Math.sqrt(dirToGoal.x * dirToGoal.x + dirToGoal.y * dirToGoal.y);
  if (dirToGoalLength === 0) return 0;
  
  const normalizedDirToGoal = {
    x: dirToGoal.x / dirToGoalLength,
    y: dirToGoal.y / dirToGoalLength
  };
  
  const ballVelocityLength = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y);
  if (ballVelocityLength === 0) return 0;
  
  const normalizedBallVelocity = {
    x: ballVelocity.x / ballVelocityLength,
    y: ballVelocity.y / ballVelocityLength
  };
  
  const dotProduct = normalizedDirToGoal.x * normalizedBallVelocity.x + 
                    normalizedDirToGoal.y * normalizedBallVelocity.y;
  
  return Math.max(0, (dotProduct + 1) / 2) * Math.min(1, ballMovementDistance / 50);
};

// Calculate reward for effective passing
export const calculatePassingReward = (
  startPosition: Position,
  endPosition: Position,
  teammatePositions: Position[],
  opponentPositions: Position[],
  opponentGoal: Position
): number => {
  const passDistance = calculateDistance(startPosition, endPosition);
  const distanceReward = Math.min(1, passDistance / 200);
  
  const initialDistanceToGoal = calculateDistance(startPosition, opponentGoal);
  const finalDistanceToGoal = calculateDistance(endPosition, opponentGoal);
  const progressionReward = Math.max(0, 
    Math.min(1, (initialDistanceToGoal - finalDistanceToGoal) / 100)
  );
  
  let bypassedOpponents = 0;
  for (const opponent of opponentPositions) {
    const passVector = {
      x: endPosition.x - startPosition.x,
      y: endPosition.y - startPosition.y
    };
    
    const startToOpponent = {
      x: opponent.x - startPosition.x,
      y: opponent.y - startPosition.y
    };
    
    const passLength = Math.sqrt(passVector.x * passVector.x + passVector.y * passVector.y);
    if (passLength === 0) continue;
    
    const normalizedPassVector = {
      x: passVector.x / passLength,
      y: passVector.y / passLength
    };
    
    const projection = startToOpponent.x * normalizedPassVector.x + 
                      startToOpponent.y * normalizedPassVector.y;
    
    if (projection >= 0 && projection <= passLength) {
      const perpX = startToOpponent.x - projection * normalizedPassVector.x;
      const perpY = startToOpponent.y - projection * normalizedPassVector.y;
      const perpDistance = Math.sqrt(perpX * perpX + perpY * perpY);
      
      if (perpDistance < 30) {
        bypassedOpponents++;
      }
    }
  }
  
  const riskReward = Math.min(1, bypassedOpponents * 0.25);
  
  return 0.3 * distanceReward + 0.4 * progressionReward + 0.3 * riskReward;
};

// Calculate combined tactical reward
export const calculateTacticalReward = (
  player: {
    position: Position,
    role: string,
    team: 'red' | 'blue',
    targetPosition: Position
  },
  ball: {
    position: Position,
    previousPosition: Position,
    velocity: { x: number, y: number }
  },
  context: TeamContext,
  action: 'move' | 'pass' | 'shoot' | 'intercept'
): number => {
  let tacticalReward = 0;
  
  const formationReward = calculateFormationReward(
    player.position, 
    player.targetPosition, 
    player.role
  );
  
  const spaceReward = calculateSpaceCreationReward(
    player.position,
    context.teammates,
    context.opponents,
    player.role
  );
  
  switch(action) {
    case 'move':
      tacticalReward = 0.6 * formationReward + 0.4 * spaceReward;
      break;
      
    case 'pass':
      const ballMovementReward = calculateBallMovementReward(
        ball.position,
        ball.previousPosition,
        ball.velocity,
        player.team,
        context.opponentGoal
      );
      
      const passingReward = calculatePassingReward(
        ball.previousPosition,
        ball.position,
        context.teammates,
        context.opponents,
        context.opponentGoal
      );
      
      tacticalReward = 0.2 * formationReward + 0.3 * spaceReward + 
                      0.2 * ballMovementReward + 0.3 * passingReward;
      break;
      
    case 'shoot':
      const shootingReward = calculateBallMovementReward(
        ball.position,
        ball.previousPosition,
        ball.velocity,
        player.team,
        context.opponentGoal
      );
      
      const distanceToGoal = calculateDistance(player.position, context.opponentGoal);
      const positionQuality = Math.max(0, 1 - distanceToGoal / 300);
      
      tacticalReward = 0.2 * formationReward + 0.2 * spaceReward + 
                      0.6 * (shootingReward + positionQuality) / 2;
      break;
      
    case 'intercept':
      const distanceToBall = calculateDistance(player.position, ball.position);
      const interceptionQuality = Math.max(0, 1 - distanceToBall / 100);
      
      tacticalReward = 0.3 * formationReward + 0.3 * spaceReward + 0.4 * interceptionQuality;
      break;
  }
  
  return tacticalReward;
};
