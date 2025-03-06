
import React from 'react';
import { Player, Position, Score } from '../../types/football';
import { calculateDistance } from '../../utils/neuralCore';

interface UseTeamContextProps {
  players: Player[];
  score?: Score;
  gameTime?: number;
}

export const useTeamContext = ({ players, score, gameTime }: UseTeamContextProps) => {
  // Memoize team context to avoid unnecessary recalculations
  const getTeamContext = React.useCallback((player: Player) => {
    const teammates = players.filter(p => p.team === player.team && p.id !== player.id);
    const opponents = players.filter(p => p.team !== player.team);
    
    const teammatePositions = teammates.map(p => p.position);
    const opponentPositions = opponents.map(p => p.position);
    
    // Calculate team formation metrics
    let formationCenter = { x: 0, y: 0 };
    let formationCompactness = 0;
    let formationWidth = 0;
    
    if (teammatePositions.length > 0) {
      // Calculate team's center of mass
      let totalX = player.position.x;
      let totalY = player.position.y;
      
      teammatePositions.forEach(pos => {
        totalX += pos.x;
        totalY += pos.y;
      });
      
      formationCenter.x = totalX / (teammatePositions.length + 1);
      formationCenter.y = totalY / (teammatePositions.length + 1);
      
      // Calculate formation compactness (average distance from center)
      let totalDistanceFromCenter = calculateDistance(player.position, formationCenter);
      let maxX = player.position.x;
      let minX = player.position.x;
      let maxY = player.position.y;
      let minY = player.position.y;
      
      teammatePositions.forEach(pos => {
        totalDistanceFromCenter += calculateDistance(pos, formationCenter);
        maxX = Math.max(maxX, pos.x);
        minX = Math.min(minX, pos.x);
        maxY = Math.max(maxY, pos.y);
        minY = Math.min(minY, pos.y);
      });
      
      formationCompactness = totalDistanceFromCenter / (teammatePositions.length + 1);
      formationWidth = Math.max(maxX - minX, maxY - minY);
    }
    
    // Calculate player's distance from formation center
    const distanceFromCenter = calculateDistance(player.position, formationCenter);
    const normalizedDistanceFromCenter = Math.min(1, distanceFromCenter / 200);
    
    // Determine if player is in their expected position based on role
    let isInPosition = true;
    const targetX = player.targetPosition.x;
    const targetY = player.targetPosition.y;
    const distanceFromTarget = calculateDistance(player.position, player.targetPosition);
    
    // Position tolerance depends on role
    let positionTolerance = 100;
    if (player.role === 'goalkeeper') positionTolerance = 50;
    else if (player.role === 'defender') positionTolerance = 80;
    else if (player.role === 'midfielder') positionTolerance = 120;
    else if (player.role === 'forward') positionTolerance = 150;
    
    isInPosition = distanceFromTarget <= positionTolerance;
    
    // Calculate density of players in the area
    let teammateDensity = 0;
    let opponentDensity = 0;
    const densityRadius = 150;
    
    teammatePositions.forEach(pos => {
      const distance = calculateDistance(player.position, pos);
      if (distance < densityRadius) {
        // Closer teammates contribute more to density
        teammateDensity += 1 - (distance / densityRadius);
      }
    });
    
    opponentPositions.forEach(pos => {
      const distance = calculateDistance(player.position, pos);
      if (distance < densityRadius) {
        // Closer opponents contribute more to density
        opponentDensity += 1 - (distance / densityRadius);
      }
    });
    
    // Normalize densities (0-1)
    teammateDensity = Math.min(1, teammateDensity / 3);  // Assume max 3 close teammates
    opponentDensity = Math.min(1, opponentDensity / 3);  // Assume max 3 close opponents
    
    // Calculate possession duration
    const possessionState = players.find(p => 
      calculateDistance(p.position, { x: p.position.x, y: p.position.y }) < 30
    );
    const possessionTeam = possessionState?.team;
    const possessionDuration = possessionTeam === player.team ? 0.5 : 0;
    
    // Game context
    const scoreDiff = score ? 
      (player.team === 'red' ? score.red - score.blue : score.blue - score.red) : 0;
    const normalizedGameTime = gameTime ? gameTime / 3600 : 0.5;  // Assuming full game is 60 seconds

    return {
      teammates: teammatePositions,
      opponents: opponentPositions,
      ownGoal: player.team === 'red' ? { x: 0, y: 500/2 } : { x: 800, y: 500/2 },
      opponentGoal: player.team === 'red' ? { x: 800, y: 500/2 } : { x: 0, y: 500/2 },
      formationCompactness: Math.min(1, formationCompactness / 200),
      formationWidth: Math.min(1, formationWidth / 800),
      distanceFromCenter: normalizedDistanceFromCenter,
      isInPosition,
      teammateDensity,
      opponentDensity,
      possessionDuration,
      gameTime: normalizedGameTime,
      scoreDiff: Math.min(1, Math.max(-1, scoreDiff / 3))  // Normalize score differential
    };
  }, [players, score, gameTime]);
  
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
  
  // Calculate score context
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
  
  // Get normalized game time
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
