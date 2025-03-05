
import { useEffect } from 'react';
import { Player } from '../../../types/football';
import { useMatchContext } from './MatchContext';
import { getAwayTeamKit } from '../../../types/kits';
import { getTeamElo, calculateStrengthMultiplier } from '../../../data/teamEloData';

export const useMatchInitialization = () => {
  const { 
    players, 
    setPlayers, 
    homeTeam, 
    awayTeam 
  } = useMatchContext();

  useEffect(() => {
    if (players.length === 0 && homeTeam && awayTeam) {
      console.log("Initializing players for match:", homeTeam, "vs", awayTeam);
      initializePlayers();
    }
  }, [homeTeam, awayTeam, players.length]);

  const initializePlayers = () => {
    const newPlayers: Player[] = [];
    
    const awayTeamKitType = getAwayTeamKit(homeTeam, awayTeam);
    console.log(`Tournament match: ${homeTeam} (home) vs ${awayTeam} (${awayTeamKitType})`);
    
    // Obtener ELO para cada equipo
    const homeTeamElo = getTeamElo(homeTeam);
    const awayTeamElo = getTeamElo(awayTeam);
    
    // Calcular multiplicadores de fuerza basados en ELO
    const homeTeamMultiplier = calculateStrengthMultiplier(homeTeamElo);
    const awayTeamMultiplier = calculateStrengthMultiplier(awayTeamElo);
    
    console.log(`Team strengths - ${homeTeam}: ${homeTeamMultiplier.toFixed(2)} (ELO: ${homeTeamElo}), ${awayTeam}: ${awayTeamMultiplier.toFixed(2)} (ELO: ${awayTeamElo})`);
    
    const redTeamPositions = [
      { x: 50, y: 600/2, role: 'goalkeeper' },
      { x: 150, y: 600/4, role: 'defender' },
      { x: 150, y: 600/2, role: 'defender' },
      { x: 150, y: (600*3)/4, role: 'defender' },
      { x: 300, y: 600/5, role: 'midfielder' },
      { x: 300, y: (600*2)/5, role: 'midfielder' },
      { x: 300, y: (600*3)/5, role: 'midfielder' },
      { x: 300, y: (600*4)/5, role: 'midfielder' },
      { x: 500, y: 600/4, role: 'forward' },
      { x: 500, y: 600/2, role: 'forward' },
      { x: 500, y: (600*3)/4, role: 'forward' },
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
        kitType: 'home',
        // Asignar el multiplicador de fuerza al jugador
        strengthMultiplier: homeTeamMultiplier
      });
    }
    
    const blueTeamPositions = [
      { x: 800 - 50, y: 600/2, role: 'goalkeeper' },
      { x: 800 - 150, y: 600/4, role: 'defender' },
      { x: 800 - 150, y: 600/2, role: 'defender' },
      { x: 800 - 150, y: (600*3)/4, role: 'defender' },
      { x: 800 - 300, y: 600/5, role: 'midfielder' },
      { x: 800 - 300, y: (600*2)/5, role: 'midfielder' },
      { x: 800 - 300, y: (600*3)/5, role: 'midfielder' },
      { x: 800 - 300, y: (600*4)/5, role: 'midfielder' },
      { x: 800 - 500, y: 600/4, role: 'forward' },
      { x: 800 - 500, y: 600/2, role: 'forward' },
      { x: 800 - 500, y: (600*3)/4, role: 'forward' },
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
        kitType: awayTeamKitType,
        // Asignar el multiplicador de fuerza al jugador
        strengthMultiplier: awayTeamMultiplier
      });
    }
    
    setPlayers(newPlayers);
  };

  return { initializePlayers };
};
