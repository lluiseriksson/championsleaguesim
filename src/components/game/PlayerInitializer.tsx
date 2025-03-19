
import React from 'react';
import { Player, PITCH_WIDTH, PITCH_HEIGHT, KitType, PLAYER_RADIUS } from '../../types/football';
import { createPlayerBrain } from '../../utils/playerBrain';
import { initializePlayerBrain } from '../../utils/modelLoader';
import { getAwayTeamKit } from '../../types/kits';
import { teamKitColors } from '../../types/kits/teamColorsData';
import { resetUsedGoalkeeperKits } from '../../types/kits/kitTypes';

interface PlayerInitializerProps {
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setGameReady: React.Dispatch<React.SetStateAction<boolean>>;
}

const transliterateRussianName = (name: string): string => {
  if (name === 'Ολυμπιακός') return 'Olympiakos';
  if (name === 'FC København') return 'FC Copenhagen';
  
  const cyrillicToLatin: Record<string, string> = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  const hasCyrillic = /[А-Яа-яЁё]/.test(name);
  
  if (!hasCyrillic) return name;
  
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    result += cyrillicToLatin[char] || char;
  }
  
  return result;
};

const PlayerInitializer: React.FC<PlayerInitializerProps> = ({ setPlayers, setGameReady }) => {
  React.useEffect(() => {
    const loadPlayers = async () => {
      try {
        resetUsedGoalkeeperKits();
        
        const initialPlayers: Player[] = [];
        
        const teamNames = Object.keys(teamKitColors);
        const homeTeamIndex = Math.floor(Math.random() * teamNames.length);
        let awayTeamIndex;
        do {
          awayTeamIndex = Math.floor(Math.random() * teamNames.length);
        } while (awayTeamIndex === homeTeamIndex);
        
        const homeTeamName = teamNames[homeTeamIndex];
        const awayTeamName = teamNames[awayTeamIndex];
        
        const displayHomeTeamName = transliterateRussianName(homeTeamName);
        const displayAwayTeamName = transliterateRussianName(awayTeamName);
        
        const awayTeamKitType = getAwayTeamKit(homeTeamName, awayTeamName);
        
        console.log(`Match: ${displayHomeTeamName} (home) vs ${displayAwayTeamName} (${awayTeamKitType})`);
        
        const redTeamPositions = [
          { x: 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
          { x: 150, y: PITCH_HEIGHT/4, role: 'defender' },
          { x: 150, y: PITCH_HEIGHT/2, role: 'defender' },
          { x: 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
          { x: 300, y: PITCH_HEIGHT/5, role: 'midfielder' },
          { x: 300, y: (PITCH_HEIGHT*2)/5, role: 'midfielder' },
          { x: 300, y: (PITCH_HEIGHT*3)/5, role: 'midfielder' },
          { x: 300, y: (PITCH_HEIGHT*4)/5, role: 'midfielder' },
          { x: 500, y: PITCH_HEIGHT/4, role: 'forward' },
          { x: 500, y: PITCH_HEIGHT/2, role: 'forward' },
          { x: 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
        ];
        
        for (let i = 0; i < redTeamPositions.length; i++) {
          const pos = redTeamPositions[i];
          const role = pos.role as Player['role'];
          const position = { x: pos.x, y: pos.y };
          
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
            position: position,
            velocity: { x: 0, y: 0 },
            force: { x: 0, y: 0 },
            role: role,
            team: 'red',
            brain: brain,
            targetPosition: position,
            teamName: homeTeamName,
            kitType: 'home' as KitType,
            kit: 'default',
            name: `Red${i+1}`,
            goals: 0,
            assists: 0,
            radius: PLAYER_RADIUS
          });
        }

        const blueTeamPositions = [
          { x: PITCH_WIDTH - 50, y: PITCH_HEIGHT/2, role: 'goalkeeper' },
          { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/4, role: 'defender' },
          { x: PITCH_WIDTH - 150, y: PITCH_HEIGHT/2, role: 'defender' },
          { x: PITCH_WIDTH - 150, y: (PITCH_HEIGHT*3)/4, role: 'defender' },
          { x: PITCH_WIDTH - 300, y: PITCH_HEIGHT/5, role: 'midfielder' },
          { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*2)/5, role: 'midfielder' },
          { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*3)/5, role: 'midfielder' },
          { x: PITCH_WIDTH - 300, y: (PITCH_HEIGHT*4)/5, role: 'midfielder' },
          { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/4, role: 'forward' },
          { x: PITCH_WIDTH - 500, y: PITCH_HEIGHT/2, role: 'forward' },
          { x: PITCH_WIDTH - 500, y: (PITCH_HEIGHT*3)/4, role: 'forward' },
        ];
        
        for (let i = 0; i < blueTeamPositions.length; i++) {
          const pos = blueTeamPositions[i];
          const role = pos.role as Player['role'];
          const position = { x: pos.x, y: pos.y };
          
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
            id: i + 12,
            position: position,
            velocity: { x: 0, y: 0 },
            force: { x: 0, y: 0 },
            role: role,
            team: 'blue',
            brain: brain,
            targetPosition: position,
            teamName: awayTeamName,
            kitType: awayTeamKitType as KitType,
            kit: 'default',
            name: `Blue${i+1}`,
            goals: 0,
            assists: 0,
            radius: PLAYER_RADIUS
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
