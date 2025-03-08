
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
  homeTeamLearning = true,
  awayTeamLearning = false
}: ModelSaveOnExitProps) => {
  
  // Determine which team has the higher ELO
  React.useEffect(() => {
    // First, get the team ELO ratings
    const redTeamPlayer = players.find(p => p.team === 'red' && p.teamElo !== undefined);
    const blueTeamPlayer = players.find(p => p.team === 'blue' && p.teamElo !== undefined);
    
    if (redTeamPlayer?.teamElo && blueTeamPlayer?.teamElo) {
      const redTeamElo = redTeamPlayer.teamElo;
      const blueTeamElo = blueTeamPlayer.teamElo;
      
      // Determine which team should learn based on ELO
      const higherEloTeam = redTeamElo > blueTeamElo ? 'red' : 'blue';
      
      console.log(`Team ELO comparison: Red=${redTeamElo}, Blue=${blueTeamElo}`);
      console.log(`Higher ELO team (${higherEloTeam}) will learn in this match`);
    }
  }, [players]);
  
  // Effect to save models on component unmount
  React.useEffect(() => {
    return () => {
      // When unmounting, determine which team has higher ELO and should be learning
      const redTeamPlayer = players.find(p => p.team === 'red' && p.teamElo !== undefined);
      const blueTeamPlayer = players.find(p => p.team === 'blue' && p.teamElo !== undefined);
      
      if (redTeamPlayer?.teamElo && blueTeamPlayer?.teamElo) {
        const redTeamElo = redTeamPlayer.teamElo;
        const blueTeamElo = blueTeamPlayer.teamElo;
        
        // Determine which team should learn based on ELO
        const shouldRedTeamLearn = redTeamElo > blueTeamElo;
        const shouldBlueTeamLearn = !shouldRedTeamLearn;
        
        if (!tournamentMode) {
          players
            .filter(p => {
              // Filter based on which team should learn (higher ELO team)
              if (p.role === 'goalkeeper') return false;
              if (p.team === 'red' && !shouldRedTeamLearn) return false;
              if (p.team === 'blue' && !shouldBlueTeamLearn) return false;
              return true;
            })
            .forEach(player => {
              const teamLabel = `${player.team} Team (Higher ELO)`;
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
            const higherEloTeam = shouldRedTeamLearn ? 'red' : 'blue';
            
            const randomPlayer = players.find(p => 
              p.role === 'forward' && p.team === higherEloTeam
            );
            
            if (randomPlayer) {
              const teamLabel = `${randomPlayer.team} Team (Higher ELO)`;
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
      }
    };
  }, [players, tournamentMode]);
};
