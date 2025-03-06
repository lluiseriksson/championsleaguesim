
import React, { useState, useRef } from 'react';
import { Player, Position } from '../../types/football';
import { saveModel } from '../../utils/neural/modelPersistence';
import { createExperienceReplay } from '../../utils/experienceReplay';
import { toast } from 'sonner';
import { validatePlayerBrain, enhanceTacticalNetworks } from '../../utils/neural/networkValidator';

// Interval between model synchronization (in frames)
const DEFAULT_SYNC_INTERVAL = 600; // 10 seconds at 60fps
const TOURNAMENT_SYNC_INTERVAL = 1200; // 20 seconds at 60fps

// Learning check interval (in frames)
const LEARNING_CHECK_INTERVAL = 1800; // 30 seconds at 60fps

interface ModelSyncSystemProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  tournamentMode?: boolean;
}

export const useModelSyncSystem = ({ 
  players, 
  setPlayers,
  tournamentMode = false
}: ModelSyncSystemProps) => {
  const syncCounter = useRef(0);
  const learningCheckCounter = useRef(0);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  
  // Increment frame counter for model synchronization
  const incrementSyncCounter = () => {
    syncCounter.current += 1;
    learningCheckCounter.current += 1;
  };
  
  // Save models to database and ensure network integrity
  const syncModels = React.useCallback(async () => {
    const syncInterval = tournamentMode ? TOURNAMENT_SYNC_INTERVAL : DEFAULT_SYNC_INTERVAL;
    
    if (syncCounter.current >= syncInterval) {
      const currentTime = Date.now();
      const timeSinceLastSync = currentTime - lastSyncTime;
      
      // Only sync if at least 5 seconds have passed (prevents rapid saving in case of frame spikes)
      if (timeSinceLastSync >= 5000) {
        console.log('Synchronizing neural models...');
        
        // Select a subset of players to save (to avoid too many DB operations)
        const playersToSync = players.filter((_, index) => index % 3 === syncCounter.current % 3);
        
        let syncCount = 0;
        for (const player of playersToSync) {
          try {
            // First validate and enhance the player's brain
            const enhancedPlayer = enhanceTacticalNetworks(validatePlayerBrain(player));
            
            // If the player was updated, update it in the state
            if (enhancedPlayer !== player) {
              setPlayers(currentPlayers => 
                currentPlayers.map(p => p.id === player.id ? enhancedPlayer : p)
              );
            }
            
            // Then save the model
            if (await saveModel(enhancedPlayer)) {
              syncCount++;
            }
          } catch (error) {
            console.error(`Error syncing model for ${player.team} ${player.role}:`, error);
          }
        }
        
        if (syncCount > 0 && !tournamentMode) {
          toast.success(`Synced ${syncCount} neural models`, {
            duration: 2000,
            position: 'bottom-right'
          });
        }
        
        setLastSyncTime(currentTime);
      }
      
      syncCounter.current = 0;
    }
  }, [players, setPlayers, tournamentMode, lastSyncTime]);
  
  // Check and enhance learning capabilities
  const checkLearningProgress = React.useCallback(() => {
    if (learningCheckCounter.current >= LEARNING_CHECK_INTERVAL) {
      console.log('Checking neural network learning progress...');
      
      let enhancedPlayers = 0;
      
      setPlayers(currentPlayers => 
        currentPlayers.map(player => {
          // Skip players that already have proper experience replay setup
          if (player.brain?.experienceReplay?.capacity > 0) {
            return player;
          }
          
          enhancedPlayers++;
          
          // Set up experience replay for players that don't have it
          return {
            ...player,
            brain: {
              ...player.brain,
              experienceReplay: player.brain?.experienceReplay || createExperienceReplay(100),
              learningStage: player.brain?.learningStage || 0.1,
              lastReward: player.brain?.lastReward || 0,
              cumulativeReward: player.brain?.cumulativeReward || 0
            }
          };
        })
      );
      
      if (enhancedPlayers > 0 && !tournamentMode) {
        toast.info(`Enhanced learning for ${enhancedPlayers} players`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      learningCheckCounter.current = 0;
    }
  }, [setPlayers, tournamentMode]);
  
  return { syncModels, incrementSyncCounter, checkLearningProgress };
};
