
import React from 'react';
import { Player } from '../../types/football';
import { saveModel } from '../../utils/neuralModelService';

interface ModelSaveOnExitProps {
  players: Player[];
  tournamentMode?: boolean;
}

export const useModelSaveOnExit = ({
  players,
  tournamentMode = false
}: ModelSaveOnExitProps) => {
  
  // Effect to save models on component unmount
  React.useEffect(() => {
    return () => {
      // When unmounting, save current models (selectively in tournament mode)
      if (!tournamentMode) {
        players
          .filter(p => p.role !== 'goalkeeper')
          .forEach(player => {
            saveModel(player)
              .catch(err => console.error(`Error saving model on exit:`, err));
          });
      } else {
        // In tournament mode, only save a few key players to reduce API calls
        const keyPlayers = players.filter(p => 
          p.role !== 'goalkeeper' && 
          (p.role === 'forward' || Math.random() < 0.1) // Only save forwards and ~10% of others
        );
        
        if (keyPlayers.length > 0) {
          console.log(`Saving ${keyPlayers.length} key players on tournament match exit`);
          keyPlayers.forEach(player => {
            saveModel(player)
              .catch(err => console.error(`Error saving model on tournament exit:`, err));
          });
        }
      }
    };
  }, [players, tournamentMode]);
};
