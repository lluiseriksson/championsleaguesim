
import React from 'react';
import { Player, Position } from '../../types/football';

interface UseTeamContextProps {
  players: Player[];
}

export const useTeamContext = ({ players }: UseTeamContextProps) => {
  // Memoize team context to avoid unnecessary recalculations
  const getTeamContext = React.useCallback((player: Player) => ({
    teammates: players.filter(p => p.team === player.team && p.id !== player.id).map(p => p.position),
    opponents: players.filter(p => p.team !== player.team).map(p => p.position),
    ownGoal: player.team === 'red' ? { x: 0, y: 500/2 } : { x: 800, y: 500/2 },
    opponentGoal: player.team === 'red' ? { x: 800, y: 500/2 } : { x: 0, y: 500/2 }
  }), [players]);
  
  return { getTeamContext };
};
