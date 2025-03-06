
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
  const validationInProgressRef = useRef(false);
  
  // Perform initial neural network check when component loads
  useEffect(() => {
    if (!initialCheckDone && players.length > 0 && !validationInProgressRef.current) {
      console.log("Performing initial neural network check...");
      validationInProgressRef.current = true;
      
      // Count valid neural networks
      let validCount = 0;
      let invalidCount = 0;
      let missingCount = 0;
      
      // Analyze the state of neural networks
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
        
        // We'll update players one by one to avoid overwhelming the system
        const fixPlayerNetworks = (index: number) => {
          if (index >= players.length) {
            // All players processed
            setInitialCheckDone(true);
            validationInProgressRef.current = false;
            
            toast.info(`Fixed ${invalidCount + missingCount} neural networks`, {
              duration: 3000,
              position: 'bottom-right'
            });
            return;
          }
          
          const player = players[index];
          let updatedPlayer = player;
          
          // If player has no brain or invalid brain, create a new one
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            console.log(`Creating new brain for ${player.team} ${player.role} #${player.id}`);
            updatedPlayer = {
              ...player,
              brain: createPlayerBrain()
            };
          } else {
            updatedPlayer = validatePlayerBrain(player);
          }
          
          // Only update if the player was actually modified
          if (updatedPlayer !== player) {
            setPlayers(currentPlayers => 
              currentPlayers.map(p => p.id === player.id ? updatedPlayer : p)
            );
          }
          
          // Process the next player after a small delay
          setTimeout(() => fixPlayerNetworks(index + 1), 50);
        };
        
        // Start processing players one by one
        fixPlayerNetworks(0);
      } else {
        // If all networks are valid, we're done
        setInitialCheckDone(true);
        validationInProgressRef.current = false;
      }
    }
  }, [players, setPlayers, initialCheckDone]);
  
  // Increment frame counter for model synchronization
  const incrementSyncCounter = () => {
    syncCounter.current += 1;
    learningCheckCounter.current += 1;
  };
  
  const syncModels = React.useCallback(async () => {
    const syncInterval = tournamentMode ? TOURNAMENT_SYNC_INTERVAL : DEFAULT_SYNC_INTERVAL;
    
    if (syncCounter.current >= syncInterval && !validationInProgressRef.current) {
      const currentTime = Date.now();
      const timeSinceLastSync = currentTime - lastSyncTime;
      
      if (timeSinceLastSync >= 5000) {
        console.log('Synchronizing neural models...');
        
        // Instead of processing multiple players at once, just pick one
        const randomIndex = Math.floor(Math.random() * players.length);
        const playerToSync = players[randomIndex];
        
        try {
          const validatedPlayer = validatePlayerBrain(playerToSync);
          
          if (validatedPlayer !== playerToSync) {
            console.log(`Validated and fixed player ${playerToSync.team} ${playerToSync.role} #${playerToSync.id}`);
            setPlayers(currentPlayers => 
              currentPlayers.map(p => p.id === playerToSync.id ? validatedPlayer : p)
            );
          }
          
          const success = await saveModel(validatedPlayer);
          if (success && !tournamentMode) {
            toast.success(`Synced neural model for player #${playerToSync.id}`, {
              duration: 2000,
              position: 'bottom-right'
            });
          }
        } catch (error) {
          console.error(`Error syncing model for ${playerToSync.team} ${playerToSync.role}:`, error);
        }
        
        setLastSyncTime(currentTime);
      }
      
      syncCounter.current = 0;
    }
  }, [players, setPlayers, tournamentMode, lastSyncTime]);
  
  const checkLearningProgress = React.useCallback(() => {
    if (learningCheckCounter.current >= LEARNING_CHECK_INTERVAL && !validationInProgressRef.current) {
      console.log('Checking neural network learning progress...');
      
      // Pick one random player to enhance rather than processing all at once
      const randomIndex = Math.floor(Math.random() * players.length);
      const playerToCheck = players[randomIndex];
      let updatedPlayer = playerToCheck;
      
      // Create experience replay if missing
      if (!playerToCheck.brain?.experienceReplay?.capacity) {
        updatedPlayer = {
          ...playerToCheck,
          brain: {
            ...playerToCheck.brain,
            experienceReplay: playerToCheck.brain?.experienceReplay || createExperienceReplay(100),
            learningStage: playerToCheck.brain?.learningStage || 0.1,
            lastReward: playerToCheck.brain?.lastReward || 0,
            cumulativeReward: playerToCheck.brain?.cumulativeReward || 0
          }
        };
        
        if (!tournamentMode) {
          toast.info(`Enhanced learning for player #${playerToCheck.id}`, {
            duration: 3000,
            position: 'bottom-right'
          });
        }
      }
      
      // Fix invalid neural networks
      if (!playerToCheck.brain || !playerToCheck.brain.net || typeof playerToCheck.brain.net.run !== 'function') {
        console.log(`Creating new neural network for ${playerToCheck.team} ${playerToCheck.role} #${playerToCheck.id}`);
        updatedPlayer = {
          ...playerToCheck,
          brain: createPlayerBrain()
        };
        
        toast.success(`Fixed neural network for player #${playerToCheck.id}`, {
          duration: 3000,
          position: 'bottom-right'
        });
      }
      
      // Update the player if changes were made
      if (updatedPlayer !== playerToCheck) {
        setPlayers(currentPlayers => 
          currentPlayers.map(p => p.id === playerToCheck.id ? updatedPlayer : p)
        );
      }
      
      learningCheckCounter.current = 0;
    }
  }, [setPlayers, tournamentMode, players]);
  
  return { syncModels, incrementSyncCounter, checkLearningProgress };
};
