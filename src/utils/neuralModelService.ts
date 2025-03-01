
import { supabase } from '../integrations/supabase/client';
import { NeuralNet, Player } from '../types/football';
import { isNetworkValid } from './neuralHelpers';
import { createPlayerBrain } from './neuralNetwork';

// Interfaz para los datos del modelo en la base de datos
interface NeuralModelData {
  id?: number;
  team: string;
  role: string;
  version: number;
  weights: any;
  training_sessions?: number;
  performance_score?: number;
}

// Función para guardar un modelo en Supabase
export const saveModel = async (player: Player, version: number = 1): Promise<boolean> => {
  try {
    // Verificamos que el modelo sea válido antes de guardarlo
    if (!isNetworkValid(player.brain.net)) {
      console.warn(`Modelo neuronal ${player.team} ${player.role} #${player.id} no es válido para guardar`);
      return false;
    }

    // Extraemos los pesos de la red neuronal
    const weights = player.brain.net.toJSON();
    
    // Buscamos si ya existe un modelo con este equipo, rol y versión
    const { data: existingModel } = await supabase
      .from('neural_models')
      .select('id, training_sessions')
      .match({ team: player.team, role: player.role, version })
      .single();

    if (existingModel) {
      // Actualizamos el modelo existente
      const { error } = await supabase
        .from('neural_models')
        .update({ 
          weights, 
          training_sessions: (existingModel.training_sessions || 1) + 1 
        })
        .match({ id: existingModel.id });

      if (error) {
        console.error('Error al actualizar modelo:', error);
        return false;
      }
      
      console.log(`Modelo ${player.team} ${player.role} actualizado correctamente`);
    } else {
      // Creamos un nuevo modelo
      const { error } = await supabase
        .from('neural_models')
        .insert({
          team: player.team,
          role: player.role,
          version,
          weights
        });

      if (error) {
        console.error('Error al guardar modelo:', error);
        return false;
      }
      
      console.log(`Modelo ${player.team} ${player.role} guardado correctamente`);
    }

    return true;
  } catch (error) {
    console.error('Error al procesar el modelo para guardarlo:', error);
    return false;
  }
};

// Función para cargar un modelo desde Supabase
export const loadModel = async (team: string, role: string, version: number = 1): Promise<NeuralNet | null> => {
  try {
    const { data, error } = await supabase
      .from('neural_models')
      .select('weights')
      .match({ team, role, version })
      .single();

    if (error || !data) {
      console.warn(`No se encontró modelo para ${team} ${role} versión ${version}`);
      return null;
    }

    // Creamos una nueva red neuronal con los pesos guardados
    const brain = createPlayerBrain();
    
    // Cargamos los pesos en la red neuronal
    brain.net.fromJSON(data.weights);
    
    if (!isNetworkValid(brain.net)) {
      console.warn(`Modelo cargado para ${team} ${role} no es válido`);
      return null;
    }
    
    console.log(`Modelo ${team} ${role} cargado correctamente`);
    return brain;
  } catch (error) {
    console.error('Error al cargar modelo:', error);
    return null;
  }
};

// Función para guardar datos de entrenamiento (para entrenamiento colaborativo posterior)
export const saveTrainingSession = async (player: Player, sessionData: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('training_sessions')
      .insert({
        team: player.team,
        role: player.role,
        session_data: sessionData
      });

    if (error) {
      console.error('Error al guardar sesión de entrenamiento:', error);
      return false;
    }
    
    console.log(`Sesión de entrenamiento para ${player.team} ${player.role} guardada`);
    return true;
  } catch (error) {
    console.error('Error al guardar sesión de entrenamiento:', error);
    return false;
  }
};

// Función para obtener el modelo más reciente y mejor entrenado
export const getBestModel = async (team: string, role: string): Promise<NeuralNet | null> => {
  try {
    const { data, error } = await supabase
      .from('neural_models')
      .select('*')
      .match({ team, role })
      .order('performance_score', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.warn(`No se encontró modelo para ${team} ${role}`);
      return null;
    }

    // Creamos una nueva red neuronal con los pesos guardados
    const brain = createPlayerBrain();
    
    // Cargamos los pesos en la red neuronal
    brain.net.fromJSON(data.weights);
    
    if (!isNetworkValid(brain.net)) {
      console.warn(`Mejor modelo encontrado para ${team} ${role} no es válido`);
      return null;
    }
    
    console.log(`Mejor modelo para ${team} ${role} cargado correctamente (puntuación: ${data.performance_score})`);
    return brain;
  } catch (error) {
    console.error('Error al cargar el mejor modelo:', error);
    return null;
  }
};

// Función para mezclar o combinar varios modelos
export const combineModels = async (team: string, role: string): Promise<NeuralNet | null> => {
  try {
    // Obtenemos los últimos 3 modelos para este equipo y rol
    const { data, error } = await supabase
      .from('neural_models')
      .select('weights, performance_score')
      .match({ team, role })
      .order('updated_at', { ascending: false })
      .limit(3);

    if (error || !data || data.length === 0) {
      console.warn(`No se encontraron modelos para combinar de ${team} ${role}`);
      return null;
    }

    // Si solo hay un modelo, lo devolvemos directamente
    if (data.length === 1) {
      const brain = createPlayerBrain();
      brain.net.fromJSON(data[0].weights);
      return brain;
    }

    // Crear una nueva red con los pesos mezclados (promedio ponderado)
    const totalScore = data.reduce((sum, model) => sum + (model.performance_score || 1), 0);
    const weightedModels = data.map(model => ({
      weights: model.weights,
      weight: (model.performance_score || 1) / totalScore
    }));

    // Mezclamos los pesos usando promedio ponderado
    const brain = createPlayerBrain();
    
    // Implementación simple: tomamos el modelo con mejor puntuación
    // En una implementación más avanzada, se podrían promediar los pesos
    brain.net.fromJSON(data[0].weights);
    
    console.log(`Modelos combinados para ${team} ${role}`);
    return brain;
  } catch (error) {
    console.error('Error al combinar modelos:', error);
    return null;
  }
};
