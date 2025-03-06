
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
        // In tournament mode, completely disable model saving to prevent crashes
        console.log('Tournament mode: skipping model saving to prevent database overload');
        
        // Alternatively, save only a single model at most to minimize database load
        if (Math.random() < 0.05) { // 5% chance to save any model
          const randomPlayer = players.find(p => 
            p.role === 'forward' && p.team === 'red'
          );
          
          if (randomPlayer) {
            console.log(`Saving single random model in tournament mode`);
            saveModel(randomPlayer)
              .catch(err => console.error(`Error saving model in tournament:`, err));
          }
        }
      }
    };
  }, [players, tournamentMode]);
};
