
import { useState, useEffect } from 'react';
import { Player, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { getAwayTeamKit } from '../../types/kits';
import { transliterateRussianName } from '../../utils/transliteration';

interface UseTournamentPlayersProps {
  homeTeam: string;
  awayTeam: string;
}

export const useTournamentPlayers = ({ homeTeam, awayTeam }: UseTournamentPlayersProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  
  useEffect(() => {
    if (homeTeam && awayTeam) {
      const displayHomeTeam = transliterateRussianName(homeTeam);
      const displayAwayTeam = transliterateRussianName(awayTeam);
      console.log("Initializing players for match:", displayHomeTeam, "vs", displayAwayTeam);
      initializePlayers();
    }
    
    return () => {
      console.log("Tournament match component unmounting, cleaning up resources");
      setPlayers([]);
    };
  }, [homeTeam, awayTeam]);
  
  const initializePlayers = () => {
    const newPlayers: Player[] = [];
    
    const awayTeamKitType = getAwayTeamKit(homeTeam, awayTeam);
    const displayHomeTeam = transliterateRussianName(homeTeam);
    const displayAwayTeam = transliterateRussianName(awayTeam);
    console.log(`Tournament match: ${displayHomeTeam} (home) vs ${displayAwayTeam} (${awayTeamKitType})`);
    
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
      
      newPlayers.push({
        id: i + 1,
        position: { x: pos.x, y: pos.y },
        role: role,
        team: 'red',
        brain: {
          net: null as any,
          lastOutput: { x: 0, y: 0 },
          lastAction: 'move'
        },
        targetPosition: { x: pos.x, y: pos.y },
        teamName: homeTeam,
        kitType: 'home'
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
      
      newPlayers.push({
        id: i + 12,
        position: { x: pos.x, y: pos.y },
        role: role,
        team: 'blue',
        brain: {
          net: null as any,
          lastOutput: { x: 0, y: 0 },
          lastAction: 'move'
        },
        targetPosition: { x: pos.x, y: pos.y },
        teamName: awayTeam,
        kitType: awayTeamKitType
      });
    }
    
    setPlayers(newPlayers);
  };
  
  return { players, setPlayers };
};
