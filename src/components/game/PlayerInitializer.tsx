
import React from 'react';
import { Player, PITCH_WIDTH, PITCH_HEIGHT, KitType } from '../../types/football';
import { createPlayerBrain } from '../../utils/playerBrain';
import { initializePlayerBrain } from '../../utils/modelLoader';
import { getAwayTeamKit, teamKitColors } from '../../types/kits';
import { getTeamElo, calculateStrengthMultiplier } from '../../data/teamEloData';

interface PlayerInitializerProps {
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setGameReady: React.Dispatch<React.SetStateAction<boolean>>;
}

const PlayerInitializer: React.FC<PlayerInitializerProps> = ({ setPlayers, setGameReady }) => {
  React.useEffect(() => {
    const loadPlayers = async () => {
      try {
        console.log("Starting player initialization...");
        const initialPlayers: Player[] = [];
        
        // Get random team names from the available teams
        const teamNames = Object.keys(teamKitColors);
        const homeTeamIndex = Math.floor(Math.random() * teamNames.length);
        let awayTeamIndex;
        do {
          awayTeamIndex = Math.floor(Math.random() * teamNames.length);
        } while (awayTeamIndex === homeTeamIndex);
        
        const homeTeamName = teamNames[homeTeamIndex];
        const awayTeamName = teamNames[awayTeamIndex];
        
        // Determine the best away kit to use based on color similarity
        const awayTeamKitType = getAwayTeamKit(homeTeamName, awayTeamName);
        
        // Get ELO ratings and calculate strength multipliers
        const homeTeamElo = getTeamElo(homeTeamName);
        const awayTeamElo = getTeamElo(awayTeamName);
        
        const homeTeamMultiplier = calculateStrengthMultiplier(homeTeamElo);
        const awayTeamMultiplier = calculateStrengthMultiplier(awayTeamElo);
        
        console.log(`Match: ${homeTeamName} (ELO: ${homeTeamElo}, Strength: ${homeTeamMultiplier.toFixed(2)}) vs ${awayTeamName} (ELO: ${awayTeamElo}, Strength: ${awayTeamMultiplier.toFixed(2)})`);
        
        // Initialize red team players (home team) with 3-4-3 formation
        const redTeamPositions = [
          { x: 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
          // 3 defenders
          { x: 150, y: PITCH_HEIGHT/4, role: 'defender' },
          { x: 150, y: PITCH_HEIGHT/2, role: 'defender' },
          { x: 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
          // 4 midfielders
          { x: 300, y: PITCH_HEIGHT/5, role: 'midfielder' },
          { x: 300, y: (PITCH_HEIGHT*2)/5, role: 'midfielder' },
          { x: 300, y: (PITCH_HEIGHT*3)/5, role: 'midfielder' },
          { x: 300, y: (PITCH_HEIGHT*4)/5, role: 'midfielder' },
          // 3 forwards
          { x: 500, y: PITCH_HEIGHT/4, role: 'forward' },
          { x: 500, y: PITCH_HEIGHT/2, role: 'forward' },
          { x: 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
        ];
        
        // Create home team players
        for (let i = 0; i < redTeamPositions.length; i++) {
          const pos = redTeamPositions[i];
          const role = pos.role as Player['role'];
          
          let brain;
          if (role === 'goalkeeper') {
            brain = createPlayerBrain();
          } else {
            try {
              brain = await initializePlayerBrain('red', role);
            } catch (error) {
              console.error(`Error loading brain for red ${role}:`, error);
              brain = createPlayerBrain();
            }
          }
          
          initialPlayers.push({
            id: i + 1,
            position: { x: pos.x, y: pos.y },
            role: role,
            team: 'red',
            brain: brain,
            targetPosition: { x: pos.x, y: pos.y },
            teamName: homeTeamName,
            kitType: 'home' as KitType,
            strengthMultiplier: homeTeamMultiplier
          });
        }

        // Initialize blue team players (away team) with 3-4-3 formation
        const blueTeamPositions = [
          { x: PITCH_WIDTH - 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
          // 3 defenders
          { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/4, role: 'defender' },
          { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/2, role: 'defender' },
          { x: PITCH_WIDTH - 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
          // 4 midfielders
          { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/5, role: 'midfielder' },
          { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*2)/5, role: 'midfielder' },
          { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*3)/5, role: 'midfielder' },
          { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*4)/5, role: 'midfielder' },
          // 3 forwards
          { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/4, role: 'forward' },
          { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/2, role: 'forward' },
          { x: PITCH_WIDTH - 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
        ];
        
        // Create away team players
        for (let i = 0; i < blueTeamPositions.length; i++) {
          const pos = blueTeamPositions[i];
          const role = pos.role as Player['role'];
          
          let brain;
          if (role === 'goalkeeper') {
            brain = createPlayerBrain();
          } else {
            try {
              brain = await initializePlayerBrain('blue', role);
            } catch (error) {
              console.error(`Error loading brain for blue ${role}:`, error);
              brain = createPlayerBrain();
            }
          }
          
          initialPlayers.push({
            id: i + 12, // Cambié de 11 a 12 para asegurar IDs únicos
            position: { x: pos.x, y: pos.y },
            role: role,
            team: 'blue',
            brain: brain,
            targetPosition: { x: pos.x, y: pos.y },
            teamName: awayTeamName,
            kitType: awayTeamKitType as KitType,
            strengthMultiplier: awayTeamMultiplier
          });
        }

        console.log("Initialized players:", initialPlayers.length);
        
        // Verificar los jugadores inicializados
        if (initialPlayers.length === 0) {
          console.error("No se inicializaron jugadores");
          return;
        }
        
        setPlayers(initialPlayers);
        console.log("Game initialized successfully with", initialPlayers.length, "players");
        setGameReady(true);
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    };
    
    loadPlayers();
  }, [setPlayers, setGameReady]);

  return null;
};

export default PlayerInitializer;
