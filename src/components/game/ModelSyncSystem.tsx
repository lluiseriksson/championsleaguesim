
import React from 'react';
import { Player } from '../../types/football';
import { syncAllPlayers } from '../../utils/modelLoader';
import { saveModel } from '../../utils/neuralModelService';

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

export const ModelSyncSystem: React.FC<ModelSyncSystemProps> = ({ players, setPlayers }) => {
  // Counter to control periodic synchronization
  const syncCounterRef = React.useRef(0);
  // Last sync time
  const lastSyncTimeRef = React.useRef(Date.now());
  // Reference to players for access in useEffect
  const playersRef = React.useRef(players);

  React.useEffect(() => {
    playersRef.current = players;
  }, [players]);
  
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
    } catch (error) {
      console.error("Error during model synchronization:", error);
    }
  }, [setPlayers]);

  const incrementSyncCounter = () => {
    syncCounterRef.current += 1;
    
    // Sync models every ~600 frames (10 seconds at 60fps)
    if (syncCounterRef.current >= 600) {
      syncCounterRef.current = 0;
      syncModels();
    }
  };

  return { syncModels, incrementSyncCounter };
};
