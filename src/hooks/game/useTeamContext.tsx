
import React from 'react';
import { Player, Position, Score } from '../../types/football';

interface UseTeamContextProps {
  players: Player[];
  score?: Score;
  gameTime?: number;
}

export const useTeamContext = ({ players, score, gameTime }: UseTeamContextProps) => {
  // Memoize team context to avoid unnecessary recalculations
  const getTeamContext = React.useCallback((player: Player) => {
    const context = {
      teammates: players.filter(p => p.team === player.team && p.id !== player.id).map(p => p.position),
      opponents: players.filter(p => p.team !== player.team).map(p => p.position),
      ownGoal: player.team === 'red' ? { x: 0, y: 500/2 } : { x: 800, y: 500/2 },
      opponentGoal: player.team === 'red' ? { x: 800, y: 500/2 } : { x: 0, y: 500/2 }
    };
    
    return context;
  }, [players]);
  
  // Calculate team formations
  const getFormations = React.useCallback(() => {
    const redTeam = players.filter(p => p.team === 'red');
    const blueTeam = players.filter(p => p.team === 'blue');
    
    const redPositions = redTeam.map(p => p.position);
    const bluePositions = blueTeam.map(p => p.position);
    
    return {
      red: redPositions,
      blue: bluePositions
    };
  }, [players]);
  
  // Calculate score context (like whether a team is leading/trailing)
  const getScoreContext = React.useCallback(() => {
    if (!score) return { leading: null, differential: 0 };
    
    const differential = score.red - score.blue;
    const leading = differential > 0 ? 'red' : (differential < 0 ? 'blue' : null);
    
    return {
      leading,
      differential: Math.abs(differential),
      redScore: score.red,
      blueScore: score.blue
    };
  }, [score]);
  
  // Get normalized game time (0-1)
  const getNormalizedGameTime = React.useCallback(() => {
    if (!gameTime) return 0.5;
    
    // Assuming full game is 60 seconds (3600 frames at 60fps)
    return Math.min(1, gameTime / 3600);
  }, [gameTime]);
  
  return { 
    getTeamContext,
    getFormations,
    getScoreContext,
    getNormalizedGameTime
  };
};
