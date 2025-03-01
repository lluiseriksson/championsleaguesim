import { NeuralNet, Player, TeamContext, Ball } from '../types/football';
import { saveModel } from './neuralModelService';
import { calculateNetworkInputs } from './neuralInputs';
import { calculateDistance } from './neuralCore';

const LEARNING_RATE = 0.03;
const GOAL_REWARD = 1.0;
const MISS_PENALTY = -0.5;

// Updates the player's brain based on game results
export const updatePlayerBrain = (brain: NeuralNet, scored: boolean, ball: Ball, player: Player, context: TeamContext): NeuralNet => {
  // No updates for goalkeepers, as they use predefined logic
  if (player.role === "goalkeeper") {
    return brain;
  }
  
  // Data from the last action for reinforcement
  const lastOutput = brain.lastOutput;
  const lastAction = brain.lastAction;
  
  // Base reward factor
  let rewardFactor = scored ? GOAL_REWARD : MISS_PENALTY;
  
  // Adjust reward based on the action taken and the result
  if (scored) {
    // If scored, positively reinforce the action that led to the goal
    if (lastAction === 'shoot') {
      rewardFactor *= 1.5; // Extra reinforcement for shooting and scoring
    } else if (lastAction === 'pass' && player.team === 'red') {
      rewardFactor *= 1.2; // Reinforcement for passing that led to a goal (for red team)
    }
  } else {
    // If not scored, penalize less if sensible decisions were made
    if (lastAction === 'pass' && calculateDistance(player.position, context.opponentGoal) > 300) {
      rewardFactor *= 0.5; // Lower penalty for passing when far from the goal
    }
  }
  
  // Modify the last output as a training signal
  const trainOutput = {
    moveX: lastOutput.x,
    moveY: lastOutput.y,
    shootBall: lastAction === 'shoot' ? (scored ? 1 : 0) : 0,
    passBall: lastAction === 'pass' ? (scored ? 1 : 0) : 0,
    intercept: lastAction === 'intercept' ? (scored ? 1 : 0) : 0
  };
  
  // Train the network with the last inputs and the reinforced signal
  try {
    const inputs = calculateNetworkInputs(ball, player, context);
    
    // If goalkeeper, don't train
    if (player.role !== "goalkeeper") {
      brain.net.train([{
        input: inputs,
        output: trainOutput
      }], {
        iterations: 1,
        errorThresh: 0.01,
        learningRate: LEARNING_RATE
      });
    }
    
    // Every 50 goals, save the model to the server for collaborative training
    if (scored && Math.random() < 0.2) {
      saveModel(player).catch(error => 
        console.error(`Error al guardar modelo después de gol para ${player.team} ${player.role}:`, error)
      );
    }
  } catch (error) {
    console.error('Error al entrenar la red neuronal:', error);
  }
  
  return brain;
};
