
import { NeuralNet, Player, TeamContext, Ball } from '../../types/football';
import { saveModel } from '../neuralModelService';
import { calculateNetworkInputs } from '../neuralInputs';
import { calculateDistance } from '../neuralCore';
import { isNetworkValid } from '../neuralHelpers';

const LEARNING_RATE = 0.1;
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

export const updatePlayerBrain = (
  brain: NeuralNet, 
  scored: boolean, 
  ball: Ball, 
  player: Player, 
  context: TeamContext,
  isLastTouchBeforeGoal: boolean = false,
  isOwnGoal: boolean = false
): NeuralNet => {
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
        
        brain.net.train([{
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
          errorThresh: 0.01,
          learningRate: LEARNING_RATE * (2 - distanceRatio) * (isOwnGoal ? 1.5 : 1)
        });
        
        if (Math.random() < 0.7) {
          saveModel(player).catch(error => 
            console.error(`Error saving goalkeeper model after goal:`, error)
          );
        }
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
    
    brain.net.train([{
      input: inputs,
      output: trainOutput
    }], {
      iterations: wrongDirection ? 10 : (isOwnGoal ? 8 : 2),
      errorThresh: 0.01,
      learningRate: wrongDirection ? LEARNING_RATE * 5 : (isOwnGoal ? LEARNING_RATE * 3 : LEARNING_RATE)
    });
    
    const saveThreshold = wrongDirection || isOwnGoal ? 0.95 : 0.5;
    if (Math.random() < saveThreshold) {
      saveModel(player).catch(error => 
        console.error(`Error saving model after goal for ${player.team} ${player.role}:`, error)
      );
    }
  } catch (error) {
    console.error('Error training neural network:', error);
  }
  
  return brain;
};
