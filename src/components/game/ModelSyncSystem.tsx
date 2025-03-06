
import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../../types/football';
import { saveModel } from '../../utils/neural/modelPersistence';
import { createExperienceReplay } from '../../utils/experienceReplay';
import { toast } from 'sonner';
import { validatePlayerBrain } from '../../utils/neural/networkValidator';
import { createPlayerBrain } from '../../utils/playerBrain';

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
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
  // Perform initial neural network check when component loads
  useEffect(() => {
    if (!initialCheckDone && players.length > 0) {
      console.log("Performing initial neural network check...");
      
      // Count valid neural networks
      let validCount = 0;
      let invalidCount = 0;
      let missingCount = 0;
      
      players.forEach(player => {
        if (player.brain && player.brain.net) {
          try {
            // Just a simple validation check
            if (typeof player.brain.net.run === 'function') {
              validCount++;
            } else {
              invalidCount++;
              console.warn(`Invalid neural network for ${player.team} ${player.role} #${player.id}: missing run function`);
            }
          } catch (error) {
            invalidCount++;
            console.error(`Error validating neural network for ${player.team} ${player.role} #${player.id}:`, error);
          }
        } else {
          missingCount++;
          console.warn(`Missing neural network for ${player.team} ${player.role} #${player.id}`);
        }
      });
      
      console.log(`Neural network check complete: ${validCount} valid, ${invalidCount} invalid, ${missingCount} missing`);
      
      // If we have invalid or missing networks, run validation on all players
      if (invalidCount > 0 || missingCount > 0) {
        console.log("Validating and fixing neural networks...");
        
        setPlayers(currentPlayers => 
          currentPlayers.map(player => {
            // If player has no brain or invalid brain, create a new one
            if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
              console.log(`Creating new brain for ${player.team} ${player.role} #${player.id}`);
              return {
                ...player,
                brain: createPlayerBrain()
              };
            }
            return validatePlayerBrain(player);
          })
        );
        
        toast.info(`Fixed ${invalidCount + missingCount} neural networks`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      setInitialCheckDone(true);
    }
  }, [players, setPlayers, initialCheckDone]);
  
  // Increment frame counter for model synchronization
  const incrementSyncCounter = () => {
    syncCounter.current += 1;
    learningCheckCounter.current += 1;
  };
  
  const syncModels = React.useCallback(async () => {
    const syncInterval = tournamentMode ? TOURNAMENT_SYNC_INTERVAL : DEFAULT_SYNC_INTERVAL;
    
    if (syncCounter.current >= syncInterval) {
      const currentTime = Date.now();
      const timeSinceLastSync = currentTime - lastSyncTime;
      
      if (timeSinceLastSync >= 5000) {
        console.log('Synchronizing neural models...');
        
        const playersToSync = players.filter((_, index) => index % 3 === syncCounter.current % 3);
        
        let syncCount = 0;
        let errorCount = 0;
        
        for (const player of playersToSync) {
          try {
            const validatedPlayer = validatePlayerBrain(player);
            
            if (validatedPlayer !== player) {
              console.log(`Validated and fixed player ${player.team} ${player.role} #${player.id}`);
              setPlayers(currentPlayers => 
                currentPlayers.map(p => p.id === player.id ? validatedPlayer : p)
              );
            }
            
            if (await saveModel(validatedPlayer)) {
              syncCount++;
            }
          } catch (error) {
            errorCount++;
            console.error(`Error syncing model for ${player.team} ${player.role}:`, error);
          }
        }
        
        if (syncCount > 0 && !tournamentMode) {
          toast.success(`Synced ${syncCount} neural models`, {
            duration: 2000,
            position: 'bottom-right'
          });
        }
        
        if (errorCount > 0) {
          console.warn(`Encountered ${errorCount} errors while syncing models`);
        }
        
        setLastSyncTime(currentTime);
      }
      
      syncCounter.current = 0;
    }
  }, [players, setPlayers, tournamentMode, lastSyncTime]);
  
  const checkLearningProgress = React.useCallback(() => {
    if (learningCheckCounter.current >= LEARNING_CHECK_INTERVAL) {
      console.log('Checking neural network learning progress...');
      
      let enhancedPlayers = 0;
      let fixedPlayers = 0;
      
      setPlayers(currentPlayers => 
        currentPlayers.map(player => {
          // Create experience replay if missing
          if (!player.brain?.experienceReplay?.capacity) {
            enhancedPlayers++;
            
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
          }
          
          // Fix invalid neural networks
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            fixedPlayers++;
            console.log(`Creating new neural network for ${player.team} ${player.role} #${player.id}`);
            return {
              ...player,
              brain: createPlayerBrain()
            };
          }
          
          return player;
        })
      );
      
      if (enhancedPlayers > 0 && !tournamentMode) {
        toast.info(`Enhanced learning for ${enhancedPlayers} players`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      if (fixedPlayers > 0) {
        console.log(`Fixed ${fixedPlayers} invalid neural networks`);
        toast.success(`Fixed ${fixedPlayers} neural networks`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      learningCheckCounter.current = 0;
    }
  }, [setPlayers, tournamentMode]);
  
  return { syncModels, incrementSyncCounter, checkLearningProgress };
};
