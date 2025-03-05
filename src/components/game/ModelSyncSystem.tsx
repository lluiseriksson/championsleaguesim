
import React from 'react';
import { Player } from '../../types/football';
import { syncAllPlayers } from '../../utils/modelLoader';
import { saveModel, getModelStats, compareModelPerformance } from '../../utils/neuralModelService';
import { toast } from 'sonner';

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournamentMode?: boolean;
}

// Return a hook with sync functions instead of a React component
export const useModelSyncSystem = ({ 
  players, 
  setPlayers, 
  tournamentMode = false 
}: ModelSyncSystemProps) => {
  // Counter to control periodic synchronization
  const syncCounterRef = React.useRef(0);
  // Last sync time
  const lastSyncTimeRef = React.useRef(Date.now());
  // Reference to players for access in useEffect
  const playersRef = React.useRef(players);
  // Counter for learning stats reporting
  const learningReportCounterRef = React.useRef(0);
  // Error count tracking to prevent log flooding
  const syncErrorCountRef = React.useRef(0);

  React.useEffect(() => {
    playersRef.current = players;
  }, [players]);
  
  // Function to check and report neural network learning progress
  const checkLearningProgress = React.useCallback(async () => {
    // Skip in tournament mode to reduce memory usage
    if (tournamentMode) return;
    
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
  }, [tournamentMode]);
  
  // Function to synchronize models with the server
  const syncModels = React.useCallback(async () => {
    // Skip frequent syncs in tournament mode to reduce memory usage
    if (tournamentMode && Math.random() > 0.2) return; // Only sync ~20% of the time in tournament
    
    const now = Date.now();
    // Sync only if at least 30 seconds have passed since last sync
    if (now - lastSyncTimeRef.current < 30000) return;
    
    try {
      console.log("Synchronizing models with server...");
      
      // In tournament mode, be more selective about which models to save
      const playersToSave = tournamentMode 
        ? playersRef.current.filter(p => 
            p.role !== 'goalkeeper' && 
            Math.random() < 0.3) // Only save ~30% of models in tournament mode
        : playersRef.current.filter(p => p.role !== 'goalkeeper');
      
      // Save current models for selected players
      await Promise.all(playersToSave.map(player => 
        saveModel(player)
          .catch(err => {
            // Limit error logging to prevent console flooding
            if (syncErrorCountRef.current < 5) {
              console.error(`Error saving model for ${player.team} ${player.role} #${player.id}:`, err);
              syncErrorCountRef.current++;
            } else if (syncErrorCountRef.current === 5) {
              console.error("Too many sync errors, suppressing further messages");
              syncErrorCountRef.current++;
            }
          })
      ));
      
      // In tournament mode, don't load models to save memory
      if (!tournamentMode) {
        // Get latest models from server
        const updatedPlayers = await syncAllPlayers(playersRef.current);
        
        // Update players with new models
        setPlayers(updatedPlayers);
      }
      
      lastSyncTimeRef.current = now;
      console.log("Synchronization completed");
      
      // Check learning progress less frequently in tournament mode
      if (!tournamentMode) {
        learningReportCounterRef.current += 1;
        if (learningReportCounterRef.current >= 3) {
          learningReportCounterRef.current = 0;
          checkLearningProgress();
        }
      }
    } catch (error) {
      console.error("Error during model synchronization:", error);
    }
  }, [setPlayers, checkLearningProgress, tournamentMode]);

  const incrementSyncCounter = () => {
    syncCounterRef.current += 1;
    
    // Sync models less frequently in tournament mode
    const syncInterval = tournamentMode ? 1200 : 600; // ~20 sec in tournament vs ~10 sec normal
    
    if (syncCounterRef.current >= syncInterval) {
      syncCounterRef.current = 0;
      syncModels();
    }
  };

  // Reset error counter periodically
  React.useEffect(() => {
    const resetInterval = setInterval(() => {
      syncErrorCountRef.current = 0;
    }, 60000); // Reset error counter every minute
    
    return () => clearInterval(resetInterval);
  }, []);

  return { syncModels, incrementSyncCounter, checkLearningProgress };
};
