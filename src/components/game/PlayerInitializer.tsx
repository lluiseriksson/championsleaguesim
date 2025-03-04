
import React from 'react';
import { Player, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { createPlayerBrain } from '../../utils/playerBrain';
import { initializePlayerBrain } from '../../utils/modelLoader';

interface PlayerInitializerProps {
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setGameReady: React.Dispatch<React.SetStateAction<boolean>>;
}

const PlayerInitializer: React.FC<PlayerInitializerProps> = ({ setPlayers, setGameReady }) => {
  React.useEffect(() => {
    const loadPlayers = async () => {
      try {
        const initialPlayers: Player[] = [];
        
        // Initialize red team players with 3-4-3 formation
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
            targetPosition: { x: pos.x, y: pos.y }
          });
        }

        // Initialize blue team players with 3-4-3 formation
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
            id: i + 11,
            position: { x: pos.x, y: pos.y },
            role: role,
            team: 'blue',
            brain: brain,
            targetPosition: { x: pos.x, y: pos.y }
          });
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
