
import React from 'react';
import { Player, PITCH_WIDTH, PITCH_HEIGHT, KitType } from '../../types/football';
import { createPlayerBrain } from '../../utils/playerBrain';
import { initializePlayerBrain } from '../../utils/modelLoader';
import { getAwayTeamKit, teamKitColors } from '../../types/kits';

interface PlayerInitializerProps {
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setGameReady: React.Dispatch<React.SetStateAction<boolean>>;
}

// Transliterate Russian team names to Latin alphabet
const transliterateRussianName = (name: string): string => {
  // Special case for Greek team
  if (name === 'Ολυμπιακός') return 'Olympiakos';
  
  // Map of Cyrillic to Latin characters
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

  // Check if the name has Cyrillic characters
  const hasCyrillic = /[А-Яа-яЁё]/.test(name);
  
  if (!hasCyrillic) return name;
  
  // Transliterate character by character
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
        
        // Transliterate team names if they contain Russian characters
        const displayHomeTeamName = transliterateRussianName(homeTeamName);
        const displayAwayTeamName = transliterateRussianName(awayTeamName);
        
        // Determine the best away kit to use based on color similarity
        const awayTeamKitType = getAwayTeamKit(homeTeamName, awayTeamName);
        
        console.log(`Match: ${displayHomeTeamName} (home) vs ${displayAwayTeamName} (${awayTeamKitType})`);
        
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
            kitType: 'home' as KitType
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
            targetPosition: { x: pos.x, y: pos.y },
            teamName: awayTeamName,
            kitType: awayTeamKitType as KitType
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
