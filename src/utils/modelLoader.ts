
import { loadModel, getBestModel, combineModels } from './neuralModelService';
import { NeuralNet, Player } from '../types/football';
import { createPlayerBrain } from './neuralNetwork';

// Función para inicializar un jugador con modelo preentrenado o nuevo
export const initializePlayerBrain = async (team: string, role: string): Promise<NeuralNet> => {
  try {
    // Intentar cargar el mejor modelo disponible
    const bestModel = await getBestModel(team, role);
    if (bestModel) {
      console.log(`Cargado modelo optimizado para ${team} ${role}`);
      return bestModel;
    }
    
    // Si no hay modelo "mejor", intentar combinar modelos existentes
    const combinedModel = await combineModels(team, role);
    if (combinedModel) {
      console.log(`Cargado modelo combinado para ${team} ${role}`);
      return combinedModel;
    }
    
    // Si no hay modelos combinados, intentar cargar la última versión
    const latestModel = await loadModel(team, role, 1);
    if (latestModel) {
      console.log(`Cargado último modelo para ${team} ${role}`);
      return latestModel;
    }
    
    // Si no hay modelos disponibles, crear uno nuevo
    console.log(`Creando nuevo modelo para ${team} ${role}`);
    return createPlayerBrain();
  } catch (error) {
    console.error(`Error al inicializar cerebro para ${team} ${role}:`, error);
    return createPlayerBrain();
  }
};

// Función para actualizar un jugador con el último modelo disponible
export const updatePlayerWithLatestModel = async (player: Player): Promise<Player> => {
  try {
    // Intentar cargar el mejor modelo disponible
    const bestModel = await getBestModel(player.team, player.role);
    if (bestModel) {
      console.log(`Actualizado ${player.team} ${player.role} #${player.id} con el mejor modelo`);
      return {
        ...player,
        brain: bestModel
      };
    }
    
    // Si no hay cambios, devolver el jugador sin modificar
    return player;
  } catch (error) {
    console.error(`Error al actualizar jugador ${player.team} ${player.role} #${player.id}:`, error);
    return player;
  }
};

// Función para sincronizar todos los jugadores con los últimos modelos
export const syncAllPlayers = async (players: Player[]): Promise<Player[]> => {
  // Crear un array de promesas para actualizar cada jugador
  const updatePromises = players.map(player => 
    player.role !== 'goalkeeper' ? updatePlayerWithLatestModel(player) : Promise.resolve(player)
  );
  
  // Esperar a que todas las promesas se resuelvan
  return Promise.all(updatePromises);
};
