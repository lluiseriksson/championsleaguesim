
import React from 'react';
import { Player } from '../../types/football';
import { saveModel } from '../../utils/neuralModelService';
import { logNeuralNetworkStatus } from '../../utils/neural/neuralTypes';
import { syncPlayerHistoricalData } from '../../utils/neural/historicalTraining';

interface ModelSaveOnExitProps {
  players: Player[];
  tournamentMode?: boolean;
  homeTeamLearning?: boolean;
  awayTeamLearning?: boolean;
}

export const useModelSaveOnExit = ({
  players,
  tournamentMode = false,
  homeTeamLearning = true,  // Default value is ignored when using ELO-based learning
  awayTeamLearning = false  // Default value is ignored when using ELO-based learning
}: ModelSaveOnExitProps) => {
  
  // Effect to save models on component unmount
  React.useEffect(() => {
    return () => {
      // Find the team with higher ELO rating
      const redTeamElo = players.find(p => p.team === 'red')?.teamElo || 1500;
      const blueTeamElo = players.find(p => p.team === 'blue')?.teamElo || 1500;
      
      // Determine which team should learn based on ELO
      const higherEloTeam = redTeamElo > blueTeamElo ? 'red' : 'blue';
      const lowerEloTeam = redTeamElo > blueTeamElo ? 'blue' : 'red';
      
      // Only higher ELO team should learn
      const higherEloTeamShouldLearn = true;
      const lowerEloTeamShouldLearn = false;
      
      // When unmounting, save current models (selectively in tournament mode)
      if (!tournamentMode) {
        players
          .filter(p => {
            // Filter based on ELO-based learning settings
            if (p.role === 'goalkeeper') return false;
            if (p.team === higherEloTeam && !higherEloTeamShouldLearn) return false;
            if (p.team === lowerEloTeam && !lowerEloTeamShouldLearn) return false;
            return true;
          })
          .forEach(player => {
            const isHigherEloTeam = player.team === higherEloTeam;
            const teamLabel = isHigherEloTeam ? 'Higher ELO Team' : 'Lower ELO Team';
            logNeuralNetworkStatus(player.team, player.role, player.id, `Saving ${teamLabel} model on exit`);
            
            // Save model to database
            saveModel(player)
              .catch(err => {
                console.error(`Error saving model on exit:`, err);
                logNeuralNetworkStatus(player.team, player.role, player.id, "Error saving model on exit", err);
              });
              
            // Save historical training data
            syncPlayerHistoricalData(player)
              .catch(err => {
                console.error(`Error saving historical data on exit:`, err);
              });
          });
      } else {
        // In tournament mode, completely disable model saving to prevent crashes
        console.log('Tournament mode: skipping model saving to prevent database overload');
        
        // Alternatively, save only a single model at most to minimize database load
        if (Math.random() < 0.05) { // 5% chance to save any model
          const randomPlayer = players.find(p => 
            p.role === 'forward' && 
            p.team === higherEloTeam // Only save higher ELO team models
          );
          
          if (randomPlayer) {
            const teamLabel = `Higher ELO Team (${randomPlayer.team})`;
            console.log(`Saving single random model in tournament mode (${teamLabel})`);
            logNeuralNetworkStatus(randomPlayer.team, randomPlayer.role, randomPlayer.id, "Saving random model in tournament mode");
            saveModel(randomPlayer)
              .catch(err => {
                console.error(`Error saving model in tournament:`, err);
                logNeuralNetworkStatus(randomPlayer.team, randomPlayer.role, randomPlayer.id, "Error saving tournament model", err);
              });
              
            // Still save historical data even in tournament mode
            syncPlayerHistoricalData(randomPlayer)
              .catch(err => {
                console.error(`Error saving tournament historical data:`, err);
              });
          }
        }
      }
    };
  }, [players, tournamentMode]);
};
