
import React from 'react';
import { Player } from '../../types/football';
import { syncAllPlayers } from '../../utils/modelLoader';
import { saveModel, getModelStats, compareModelPerformance } from '../../utils/neuralModelService';
import { toast } from 'sonner';

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

// Return a hook with sync functions instead of a React component
export const useModelSyncSystem = ({ players, setPlayers }: ModelSyncSystemProps) => {
  // Counter to control periodic synchronization
  const syncCounterRef = React.useRef(0);
  // Last sync time
  const lastSyncTimeRef = React.useRef(Date.now());
  // Reference to players for access in useEffect
  const playersRef = React.useRef(players);
  // Counter for learning stats reporting
  const learningReportCounterRef = React.useRef(0);

  React.useEffect(() => {
    playersRef.current = players;
  }, [players]);
  
  // Function to check and report neural network learning progress
  const checkLearningProgress = React.useCallback(async () => {
    try {
      // Get model stats
      const modelStats = await getModelStats();
      if (!modelStats.length) return;
      
      // Find models with highest training sessions
      const mostTrainedModel = modelStats.reduce((prev, curr) => 
        (curr.training_sessions > prev.training_sessions) ? curr : prev, 
        modelStats[0]
      );
      
      // Compare team performance
      const teamComparison = await compareModelPerformance('red', 'blue');
      
      // Report progress
      if (mostTrainedModel.training_sessions > 0) {
        toast(`Progreso de aprendizaje: ${mostTrainedModel.team} ${mostTrainedModel.role} (${mostTrainedModel.training_sessions} sesiones)`, {
          description: `Rendimiento: Red ${teamComparison.teamA} - Blue ${teamComparison.teamB}`
        });
        
        // Log detailed stats
        console.log("Estadísticas de aprendizaje:", {
          modelos: modelStats.length,
          sesionesMax: mostTrainedModel.training_sessions,
          comparación: teamComparison
        });
      }
    } catch (error) {
      console.error("Error al verificar progreso de aprendizaje:", error);
    }
  }, []);
  
  // Function to synchronize models with the server
  const syncModels = React.useCallback(async () => {
    const now = Date.now();
    // Sync only if at least 30 seconds have passed since last sync
    if (now - lastSyncTimeRef.current < 30000) return;
    
    try {
      console.log("Synchronizing models with server...");
      
      // Save current models for each player
      await Promise.all(playersRef.current
        .filter(p => p.role !== 'goalkeeper')
        .map(player => saveModel(player)
          .catch(err => console.error(`Error saving model for ${player.team} ${player.role} #${player.id}:`, err))
        )
      );
      
      // Get latest models from server
      const updatedPlayers = await syncAllPlayers(playersRef.current);
      
      // Update players with new models
      setPlayers(updatedPlayers);
      
      lastSyncTimeRef.current = now;
      console.log("Synchronization completed");
      
      // Check learning progress on every third sync
      learningReportCounterRef.current += 1;
      if (learningReportCounterRef.current >= 3) {
        learningReportCounterRef.current = 0;
        checkLearningProgress();
      }
    } catch (error) {
      console.error("Error during model synchronization:", error);
    }
  }, [setPlayers, checkLearningProgress]);

  const incrementSyncCounter = () => {
    syncCounterRef.current += 1;
    
    // Sync models every ~600 frames (10 seconds at 60fps)
    if (syncCounterRef.current >= 600) {
      syncCounterRef.current = 0;
      syncModels();
    }
  };

  return { syncModels, incrementSyncCounter, checkLearningProgress };
};
