
import { NeuralNet, Player, TeamContext, Ball } from '../types/football';
import { saveModel } from './neuralModelService';
import { calculateNetworkInputs } from './neuralInputs';
import { calculateDistance } from './neuralCore';
import { isNetworkValid } from './neuralHelpers';

const LEARNING_RATE = 0.03;
const GOAL_REWARD = 1.0;
const MISS_PENALTY = -0.5;
const LAST_TOUCH_GOAL_REWARD = 1.5; // Recompensa adicional por ser el último en tocar antes de un gol favorable
const LAST_TOUCH_GOAL_PENALTY = -1.2; // Penalización por ser el último en tocar antes de un gol del rival
const GOALKEEPER_MAX_PENALTY = -1.0; // Penalización máxima para el portero cuando está lejos del balón
const GOALKEEPER_MIN_PENALTY = -0.2; // Penalización mínima para el portero cuando está cerca del balón
const GOALKEEPER_DISTANCE_THRESHOLD = 50; // Distancia en píxeles que se considera "cerca" del balón

// Updates the player's brain based on game results
export const updatePlayerBrain = (
  brain: NeuralNet, 
  scored: boolean, 
  ball: Ball, 
  player: Player, 
  context: TeamContext,
  isLastTouchBeforeGoal: boolean = false
): NeuralNet => {
  // Inicializamos el factor de recompensa base
  let rewardFactor = scored ? GOAL_REWARD : MISS_PENALTY;
  
  // Lógica especial para porteros
  if (player.role === "goalkeeper") {
    // Solo aplicamos penalización al portero del equipo que recibió el gol
    if (!scored) {
      // Calculamos la distancia entre el portero y el balón en el momento del gol
      const distanceToBall = calculateDistance(player.position, ball.position);
      
      // Ajustamos la penalización basada en la distancia - menos penalización si estaba cerca
      // ya que significa que intentó detener el balón pero no pudo
      const distanceRatio = Math.min(1, distanceToBall / GOALKEEPER_DISTANCE_THRESHOLD);
      const scaledPenalty = GOALKEEPER_MIN_PENALTY + 
        (GOALKEEPER_MAX_PENALTY - GOALKEEPER_MIN_PENALTY) * distanceRatio;
      
      console.log(`${player.team} goalkeeper penalty: ${scaledPenalty.toFixed(2)} (distance: ${distanceToBall.toFixed(2)}px)`);
      
      // Aplicamos la penalización ajustada
      rewardFactor = scaledPenalty;
      
      // Actualizamos el cerebro del portero, aunque use lógica predefinida
      // para que vaya aprendiendo patrones cuando sufre goles
      try {
        if (!isNetworkValid(brain.net)) {
          console.warn(`Cannot train invalid network for ${player.team} goalkeeper`);
          return brain;
        }
        
        const inputs = calculateNetworkInputs(ball, player, context);
        
        // Si el portero recibió un gol, intentamos entrenar para mejorar su posicionamiento
        brain.net.train([{
          input: inputs,
          output: {
            moveX: 0, // El movimiento X del portero debe ser mínimo (se queda en la línea)
            moveY: ball.position.y > player.position.y ? 1 : 0, // Debería haberse movido hacia el balón
            shootBall: 0,
            passBall: 0,
            intercept: 1 // Debería haber intentado interceptar
          }
        }], {
          iterations: 1,
          errorThresh: 0.01,
          learningRate: LEARNING_RATE * (2 - distanceRatio) // Mayor tasa de aprendizaje cuando estaba cerca
        });
        
        // Guardamos el modelo del portero ocasionalmente para preservar el aprendizaje
        if (Math.random() < 0.3) {
          saveModel(player).catch(error => 
            console.error(`Error al guardar modelo del portero después de gol:`, error)
          );
        }
      } catch (error) {
        console.error('Error al entrenar la red neuronal del portero:', error);
      }
      
      return brain;
    }
    
    // Si el equipo del portero marcó, no aplicamos cambios a su cerebro
    return brain;
  }
  
  // Data from the last action for reinforcement
  const lastOutput = brain.lastOutput;
  const lastAction = brain.lastAction;
  
  // Adjust reward based on the action taken and the result
  if (scored) {
    // If scored, positively reinforce the action that led to the goal
    if (lastAction === 'shoot') {
      rewardFactor *= 1.5; // Extra reinforcement for shooting and scoring
    } else if (lastAction === 'pass' && player.team === 'red') {
      rewardFactor *= 1.2; // Reinforcement for passing that led to a goal (for red team)
    }
    
    // Additional reward if this player was the last to touch the ball before scoring
    if (isLastTouchBeforeGoal) {
      rewardFactor += LAST_TOUCH_GOAL_REWARD;
      console.log(`${player.team} ${player.role} #${player.id} gets extra reward for last touch before goal!`);
    }
  } else {
    // If not scored, penalize less if sensible decisions were made
    if (lastAction === 'pass' && calculateDistance(player.position, context.opponentGoal) > 300) {
      rewardFactor *= 0.5; // Lower penalty for passing when far from the goal
    }
    
    // Additional penalty if this player was the last to touch before opponent scored
    if (isLastTouchBeforeGoal) {
      rewardFactor += LAST_TOUCH_GOAL_PENALTY;
      console.log(`${player.team} ${player.role} #${player.id} gets penalty for last touch before opponent goal!`);
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
    // First verify if the network is valid
    if (!isNetworkValid(brain.net)) {
      console.warn(`Cannot train invalid network for ${player.team} ${player.role}`);
      return brain;
    }
    
    const inputs = calculateNetworkInputs(ball, player, context);
    
    brain.net.train([{
      input: inputs,
      output: trainOutput
    }], {
      iterations: 1,
      errorThresh: 0.01,
      learningRate: LEARNING_RATE
    });
    
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
