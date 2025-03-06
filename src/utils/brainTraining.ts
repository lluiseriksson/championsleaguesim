
import { NeuralNet, Player, TeamContext, Ball } from '../types/football';
import { saveModel } from './neuralModelService';
import { calculateNetworkInputs } from './neuralInputs';
import { calculateDistance } from './neuralCore';
import { isNetworkValid } from './neuralHelpers';
import { recordActionOutcome } from './gameContextTracker';
import { 
  createExperienceReplay,
  addExperience,
  sampleExperiences,
  getCurriculumDifficulty,
  updateCurriculumStage
} from './experienceReplay';

// Enhanced reward parameters
const LEARNING_RATE = 0.08;
const GOAL_REWARD = 1.5;
const MISS_PENALTY = -0.8;
const LAST_TOUCH_GOAL_REWARD = 2.0;
const LAST_TOUCH_GOAL_PENALTY = -3.0;
const GOALKEEPER_MAX_PENALTY = -1.5;
const GOALKEEPER_MIN_PENALTY = -0.3;
const GOALKEEPER_DISTANCE_THRESHOLD = 50;
const OWN_GOAL_TEAM_PENALTY = -2.0;
const OWN_GOAL_PLAYER_PENALTY = -5.0;
const WRONG_DIRECTION_SHOT_PENALTY = -4.0;
const DELAYED_REWARD_DECAY = 0.9;
const PRIORITY_SCALE = 2.0;

export const updatePlayerBrain = (
  brain: NeuralNet, 
  scored: boolean, 
  ball: Ball, 
  player: Player, 
  context: TeamContext,
  isLastTouchBeforeGoal: boolean = false,
  isOwnGoal: boolean = false,
  gameContext: any = {}
): NeuralNet => {
  if (!brain.experienceReplay) {
    brain.experienceReplay = createExperienceReplay();
    brain.learningStage = 0.1; // Initial curriculum stage
    brain.cumulativeReward = 0;
  }

  let rewardFactor = scored ? GOAL_REWARD : MISS_PENALTY;

  if (isOwnGoal) {
    rewardFactor = OWN_GOAL_PLAYER_PENALTY;
    console.log(`SEVERE PENALTY: ${player.team} ${player.role} #${player.id} caused an own goal! Penalty: ${rewardFactor}`);
  }

  if (player.role === "goalkeeper") {
    if (!scored) {
      const distanceToBall = calculateDistance(player.position, ball.position);
      const distanceRatio = Math.min(1, distanceToBall / GOALKEEPER_DISTANCE_THRESHOLD);
      const scaledPenalty = GOALKEEPER_MIN_PENALTY + 
        (GOALKEEPER_MAX_PENALTY - GOALKEEPER_MIN_PENALTY) * distanceRatio;
      
      console.log(`${player.team} goalkeeper penalty: ${scaledPenalty.toFixed(2)} (distance: ${distanceToBall.toFixed(2)}px)`);
      
      rewardFactor = scaledPenalty;
      
      try {
        if (!isNetworkValid(brain.net)) {
          console.warn(`Cannot train invalid network for ${player.team} goalkeeper`);
          return brain;
        }
        
        const inputs = calculateNetworkInputs(ball, player, context);
        
        // Record action outcome for tracking
        const updatedBrain = recordActionOutcome(
          brain,
          'intercept',
          !scored,
          inputs
        );
        
        // Store experience in replay buffer with appropriate priority
        // Bad experiences (goals against) get higher priority for learning
        const priority = scored ? 1.0 : PRIORITY_SCALE;
        updatedBrain.experienceReplay = addExperience(
          updatedBrain.experienceReplay!,
          inputs,
          {
            moveX: 0,
            moveY: ball.position.y > player.position.y ? 1 : 0,
            shootBall: 0,
            passBall: 0,
            intercept: 1
          },
          rewardFactor,
          priority
        );
        
        // Update curriculum stage based on performance
        updatedBrain.learningStage = updateCurriculumStage(updatedBrain);
        
        // Get curriculum parameters for current stage
        const { 
          learningRate, 
          batchSize,
          errorThreshold
        } = getCurriculumDifficulty(updatedBrain.learningStage);
        
        // Apply delayed rewards if available
        let finalReward = rewardFactor;
        if (updatedBrain.lastReward) {
          finalReward += updatedBrain.lastReward * DELAYED_REWARD_DECAY;
        }
        updatedBrain.lastReward = finalReward;
        updatedBrain.cumulativeReward = (updatedBrain.cumulativeReward || 0) + finalReward;
        
        // Train on current experience
        updatedBrain.net.train([{
          input: inputs,
          output: {
            moveX: 0,
            moveY: ball.position.y > player.position.y ? 1 : 0,
            shootBall: 0,
            passBall: 0,
            intercept: 1
          }
        }], {
          iterations: isOwnGoal ? 5 : 2,
          errorThresh: errorThreshold,
          learningRate: learningRate * (2 - distanceRatio) * (isOwnGoal ? 1.5 : 1)
        });
        
        // Experience replay - train on past experiences if we have enough
        if (updatedBrain.experienceReplay!.inputs.length >= batchSize) {
          const { inputs: replayInputs, outputs: replayOutputs } = 
            sampleExperiences(updatedBrain.experienceReplay!, batchSize);
            
          // Create training data from experience replay
          const trainingData = replayInputs.map((input, idx) => ({
            input,
            output: replayOutputs[idx]
          }));
          
          // Train on replay experiences if we have enough
          if (trainingData.length > 0) {
            updatedBrain.net.train(trainingData, {
              iterations: 1,
              errorThresh: errorThreshold,
              learningRate: learningRate
            });
          }
        }
        
        if (Math.random() < 0.7) {
          saveModel(player).catch(error => 
            console.error(`Error saving goalkeeper model after goal:`, error)
          );
        }
        
        return updatedBrain;
      } catch (error) {
        console.error('Error training goalkeeper neural network:', error);
      }
      
      return brain;
    }
    
    return brain;
  }

  const lastOutput = brain.lastOutput;
  const lastAction = brain.lastAction;

  let wrongDirection = false;
  if (lastAction === 'shoot') {
    if (player.team === 'red' && lastOutput.x < 0) {
      wrongDirection = true;
      console.log(`WRONG DIRECTION: ${player.team} ${player.role} #${player.id} shot towards their own goal!`);
      rewardFactor = WRONG_DIRECTION_SHOT_PENALTY;
    }
    else if (player.team === 'blue' && lastOutput.x > 0) {
      wrongDirection = true;
      console.log(`WRONG DIRECTION: ${player.team} ${player.role} #${player.id} shot towards their own goal!`);
      rewardFactor = WRONG_DIRECTION_SHOT_PENALTY;
    }
  }

  if (scored && !wrongDirection) {
    if (lastAction === 'shoot') {
      rewardFactor *= 1.8;
    } else if (lastAction === 'pass' && player.team === 'red') {
      rewardFactor *= 1.5;
    }
    
    if (isLastTouchBeforeGoal) {
      rewardFactor += LAST_TOUCH_GOAL_REWARD;
      console.log(`${player.team} ${player.role} #${player.id} gets extra reward for last touch before goal!`);
    }
  } else {
    if (lastAction === 'pass' && calculateDistance(player.position, context.opponentGoal) > 300) {
      rewardFactor *= 0.5;
    }
    
    if (isLastTouchBeforeGoal) {
      if (isOwnGoal) {
        rewardFactor = OWN_GOAL_PLAYER_PENALTY;
        console.log(`${player.team} ${player.role} #${player.id} gets SEVERE penalty for own goal: ${rewardFactor}`);
      } else {
        rewardFactor += LAST_TOUCH_GOAL_PENALTY;
        console.log(`${player.team} ${player.role} #${player.id} gets penalty for last touch before opponent goal!`);
      }
    }
    
    if (isOwnGoal) {
      rewardFactor += OWN_GOAL_TEAM_PENALTY;
      console.log(`${player.team} ${player.role} #${player.id} gets team penalty for own goal situation: ${OWN_GOAL_TEAM_PENALTY}`);
    }
  }

  const trainOutput = {
    moveX: lastOutput.x,
    moveY: lastOutput.y,
    shootBall: lastAction === 'shoot' ? (scored && !isOwnGoal ? 1 : 0) : 0,
    passBall: lastAction === 'pass' ? (scored && !isOwnGoal ? 1 : 0) : 0,
    intercept: lastAction === 'intercept' ? (scored && !isOwnGoal ? 1 : 0) : 0
  };

  if (wrongDirection && lastAction === 'shoot') {
    trainOutput.shootBall = 0;
    trainOutput.moveX = player.team === 'red' ? 1 : -1;
    trainOutput.passBall = 1;
  }
  else if (isOwnGoal && lastAction === 'shoot') {
    trainOutput.shootBall = 0;
    trainOutput.moveX = player.team === 'red' ? 1 : 0;
    trainOutput.passBall = 1;
  }

  try {
    if (!isNetworkValid(brain.net)) {
      console.warn(`Cannot train invalid network for ${player.team} ${player.role}`);
      return brain;
    }
    
    const inputs = calculateNetworkInputs(ball, player, context);
    
    const success = scored && !isOwnGoal && !wrongDirection;
    const updatedBrain = recordActionOutcome(
      brain,
      lastAction || 'move',
      success,
      inputs
    );
    
    // Initialize experience replay if needed
    if (!updatedBrain.experienceReplay) {
      updatedBrain.experienceReplay = createExperienceReplay();
      updatedBrain.learningStage = 0.1;
      updatedBrain.cumulativeReward = 0;
    }
    
    // Update curriculum stage based on performance
    updatedBrain.learningStage = updateCurriculumStage(updatedBrain);
    
    // Get curriculum parameters for current stage
    const { 
      learningRate, 
      batchSize,
      errorThreshold,
      rewardScale 
    } = getCurriculumDifficulty(updatedBrain.learningStage);
    
    // Scale reward based on curriculum stage
    const scaledReward = rewardFactor * rewardScale;
    
    // Calculate priority for experience replay
    // Important events (goals, own goals, etc.) get higher priority
    let priority = 1.0;
    if (scored) priority = 1.5;
    if (isLastTouchBeforeGoal) priority = 2.0;
    if (wrongDirection) priority = 2.5;
    if (isOwnGoal) priority = 3.0;
    
    // Store experience in replay buffer
    updatedBrain.experienceReplay = addExperience(
      updatedBrain.experienceReplay,
      inputs,
      trainOutput,
      scaledReward,
      priority
    );
    
    // Apply delayed rewards
    let finalReward = scaledReward;
    if (updatedBrain.lastReward) {
      finalReward += updatedBrain.lastReward * DELAYED_REWARD_DECAY;
    }
    updatedBrain.lastReward = scaledReward;
    updatedBrain.cumulativeReward = (updatedBrain.cumulativeReward || 0) + finalReward;
    
    let dynamicLearningRate = learningRate;
    
    if (updatedBrain.successRate) {
      const actionType = lastAction as keyof typeof updatedBrain.successRate;
      if (actionType && updatedBrain.successRate[actionType] < 0.3) {
        dynamicLearningRate *= 1.5;
        console.log(`Boosting learning rate for ${player.team} ${player.role} due to poor ${actionType} performance`);
      }
    }
    
    const finalLearningRate = wrongDirection ? 
      dynamicLearningRate * 5 : 
      (isOwnGoal ? dynamicLearningRate * 3 : dynamicLearningRate);
    
    // Train on current experience
    updatedBrain.net.train([{
      input: inputs,
      output: trainOutput
    }], {
      iterations: wrongDirection ? 10 : (isOwnGoal ? 8 : 2),
      errorThresh: errorThreshold,
      learningRate: finalLearningRate
    });
    
    // Experience replay - train on past experiences if we have enough
    if (updatedBrain.experienceReplay.inputs.length >= batchSize) {
      const { inputs: replayInputs, outputs: replayOutputs } = 
        sampleExperiences(updatedBrain.experienceReplay, batchSize);
        
      // Create training data from experience replay
      const trainingData = replayInputs.map((input, idx) => ({
        input,
        output: replayOutputs[idx]
      }));
      
      // Train on replay experiences
      if (trainingData.length > 0) {
        updatedBrain.net.train(trainingData, {
          iterations: 1,
          errorThresh: errorThreshold,
          learningRate: dynamicLearningRate
        });
      }
    }
    
    const saveThreshold = wrongDirection || isOwnGoal ? 0.95 : 0.5;
    if (Math.random() < saveThreshold) {
      saveModel(player).catch(error => 
        console.error(`Error saving model after goal for ${player.team} ${player.role}:`, error)
      );
    }
    
    return updatedBrain;
  } catch (error) {
    console.error('Error training neural network:', error);
    return brain;
  }
};

export const initializePlayerBrainWithHistory = (brain: NeuralNet): NeuralNet => {
  if (!brain.actionHistory) {
    brain = {
      ...brain,
      actionHistory: [],
      successRate: {
        shoot: 0.5,
        pass: 0.5,
        intercept: 0.5,
        overall: 0.5
      }
    };
  }
  
  // Initialize experience replay and curriculum learning if not present
  if (!brain.experienceReplay) {
    brain = {
      ...brain,
      experienceReplay: createExperienceReplay(),
      learningStage: 0.1,
      lastReward: 0,
      cumulativeReward: 0
    };
  }
  
  return brain;
};
