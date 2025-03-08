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
  updateCurriculumStage,
  calculateTacticalReward
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
const STRATEGIC_POSITION_REWARD = 0.6;
const OPEN_SPACE_REWARD = 0.4;
const TACTICAL_REWARD_SCALE = 0.8;

// New specific reward parameters
const ON_TARGET_SHOT_REWARD = 1.2;
const SHOT_OFF_TARGET_PENALTY = -0.8;
const SUCCESSFUL_PASS_REWARD = 0.9;
const BALL_LOSS_PENALTY = -1.0;
const AUTO_GOAL_SEVERE_PENALTY = -6.0;

// NEW: Direction-based rewards and penalties
const BACKWARD_PASS_PENALTY = -0.7;
const BACKWARD_SHOT_PENALTY = -1.5;
const FORWARD_PASS_REWARD = 0.5;
const LATERAL_PASS_MODIFIER = 0.0; // Neutral

// Reward positioning when the player creates space or finds open positions
const calculatePositioningReward = (player: Player, context: TeamContext): number => {
  let reward = 0;
  
  // Calculate average distance to teammates
  let avgTeammateDistance = 0;
  if (context.teammates.length > 0) {
    let totalDistance = 0;
    for (const teammate of context.teammates) {
      totalDistance += calculateDistance(player.position, teammate);
    }
    avgTeammateDistance = totalDistance / context.teammates.length;
  }
  
  // Reward players who maintain good spacing with teammates (not too close)
  if (avgTeammateDistance > 100) {
    reward += OPEN_SPACE_REWARD * Math.min(1, (avgTeammateDistance - 100) / 200);
  }
  
  // Extra reward for attackers who find space in advanced positions
  if (player.role === 'forward' && player.team === 'red' && player.position.x > 500) {
    reward += STRATEGIC_POSITION_REWARD * 0.5;
  } else if (player.role === 'forward' && player.team === 'blue' && player.position.x < 300) {
    reward += STRATEGIC_POSITION_REWARD * 0.5;
  }
  
  // Reward midfielders for supporting positions
  if (player.role === 'midfielder') {
    // For red team moving forward, for blue team moving backward
    const isInSupportPosition = (player.team === 'red' && player.position.x > 400) || 
                               (player.team === 'blue' && player.position.x < 400);
    if (isInSupportPosition) {
      reward += STRATEGIC_POSITION_REWARD * 0.3;
    }
  }
  
  return reward;
};

// NEW: Calculate direction-based reward
const calculateDirectionReward = (
  player: Player, 
  moveDirection: { x: number, y: number }
): number => {
  // For "home" team (red team), forward is positive x direction
  // For "away" team (blue team), forward is negative x direction
  const isHomeTeam = player.team === 'red';
  const isForwardDirection = isHomeTeam ? moveDirection.x > 0 : moveDirection.x < 0;
  const isBackwardDirection = isHomeTeam ? moveDirection.x < 0 : moveDirection.x > 0;
  const isLateralDirection = Math.abs(moveDirection.x) < 0.3 && Math.abs(moveDirection.y) > 0.7;
  
  if (isBackwardDirection) {
    const actionPenalty = player.brain.lastAction === 'shoot' ? 
      BACKWARD_SHOT_PENALTY : BACKWARD_PASS_PENALTY;
    
    console.log(`${player.team} ${player.role} #${player.id} penalized for moving backward: ${actionPenalty}`);
    return actionPenalty;
  } else if (isForwardDirection) {
    return FORWARD_PASS_REWARD;
  } else if (isLateralDirection) {
    return LATERAL_PASS_MODIFIER;
  }
  
  return 0;
};

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

  // Add positional rewards
  if (!scored && !isOwnGoal) {
    rewardFactor += calculatePositioningReward(player, context);
  }
  
  // Add direction-based rewards/penalties if we have movement data
  if (brain.lastOutput && (brain.lastAction === 'pass' || brain.lastAction === 'shoot' || brain.lastAction === 'move')) {
    const directionReward = calculateDirectionReward(player, {
      x: brain.lastOutput.x,
      y: brain.lastOutput.y
    });
    rewardFactor += directionReward;
  }

  // Add tactical rewards
  if (brain.lastAction && ball.previousPosition) {
    // Create ball object with velocity and previous position
    const ballWithDetails = {
      position: ball.position,
      previousPosition: ball.previousPosition,
      velocity: ball.velocity || { x: 0, y: 0 }
    };
    
    // Calculate tactical reward based on player's action and situation
    const tacticalReward = calculateTacticalReward(
      player,
      ballWithDetails,
      context,
      brain.lastAction as 'move' | 'pass' | 'shoot' | 'intercept'
    );
    
    // Add weighted tactical reward to total reward
    rewardFactor += TACTICAL_REWARD_SCALE * tacticalReward;
  }

  // NEW: Check if shot was on-target or off-target
  if (brain.lastAction === 'shoot' && !scored) {
    // Check if shot was heading toward the goal
    const goalY = context.opponentGoal.y;
    const goalHalfHeight = 100; // Approximation of GOAL_HEIGHT/2
    
    // Calculate the shot trajectory
    const shotVectorX = ball.velocity.x;
    const shotVectorY = ball.velocity.y;
    
    // For a shot to be on target, it needs to be heading toward the goal
    // and have a trajectory that would intersect with the goal line
    let onTarget = false;
    
    // Red team shoots right, blue team shoots left
    const isRightward = shotVectorX > 0;
    const isHeadingTowardsCorrectDirection = 
      (player.team === 'red' && isRightward) || 
      (player.team === 'blue' && !isRightward);
    
    if (isHeadingTowardsCorrectDirection) {
      // Simple trajectory calculation
      const interceptY = player.position.y + shotVectorY * (Math.abs((context.opponentGoal.x - player.position.x) / shotVectorX));
      onTarget = Math.abs(interceptY - goalY) < goalHalfHeight;
      
      if (onTarget) {
        console.log(`${player.team} ${player.role} #${player.id} shot ON TARGET! Reward: ${ON_TARGET_SHOT_REWARD}`);
        rewardFactor += ON_TARGET_SHOT_REWARD;
      } else {
        console.log(`${player.team} ${player.role} #${player.id} shot OFF TARGET. Penalty: ${SHOT_OFF_TARGET_PENALTY}`);
        rewardFactor += SHOT_OFF_TARGET_PENALTY;
      }
    } else {
      // Shooting in the wrong direction (toward own goal or sideline)
      console.log(`${player.team} ${player.role} #${player.id} shot in WRONG DIRECTION! Severe penalty!`);
      rewardFactor += WRONG_DIRECTION_SHOT_PENALTY;
    }
  }
  
  // NEW: Reward for successful passes to teammates
  if (brain.lastAction === 'pass' && !isOwnGoal) {
    const passDestinationIsTeammate = brain.lastPassOutcome?.success === true;
    if (passDestinationIsTeammate) {
      console.log(`${player.team} ${player.role} #${player.id} made a SUCCESSFUL PASS! Reward: ${SUCCESSFUL_PASS_REWARD}`);
      rewardFactor += SUCCESSFUL_PASS_REWARD;
    } else {
      // Penalize giving the ball to an opponent
      console.log(`${player.team} ${player.role} #${player.id} LOST POSSESSION! Penalty: ${BALL_LOSS_PENALTY}`);
      rewardFactor += BALL_LOSS_PENALTY;
    }
  }

  // Increase own goal penalty
  if (isOwnGoal) {
    rewardFactor = AUTO_GOAL_SEVERE_PENALTY;
    console.log(`SEVERE PENALTY: ${player.team} ${player.role} #${player.id} caused an own goal! Penalty: ${rewardFactor}`);
  }

  if (player.role === "goalkeeper") {
    if (!scored) {
      const distanceToBall = calculateDistance(player.position, ball.position);
      const distanceRatio = Math.min(1, distanceToBall / GOALKEEPER_DISTANCE_THRESHOLD);
      const scaledPenalty = GOALKEEPER_MIN_PENALTY + 
        (GOALKEEPER_MAX_PENALTY - GOALKEEPER_MIN_PENALTY) * distanceRatio;
      
      // Goalkeeper intercept success reward
      const didSaveShot = distanceToBall < 30 && brain.lastAction === 'intercept';
      if (didSaveShot) {
        // Provide a positive reward for successful shot saves
        const saveReward = 1.0;
        rewardFactor = saveReward;
      } else {
        console.log(`${player.team} goalkeeper penalty: ${scaledPenalty.toFixed(2)} (distance: ${distanceToBall.toFixed(2)}px)`);
        rewardFactor = scaledPenalty;
      }
      
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
