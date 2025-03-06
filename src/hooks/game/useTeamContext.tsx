import React from 'react';
import { Player, Position, Score } from '../../types/football';
import { calculateDistance } from '../../utils/neuralCore';
import { normalizeCoordinates } from '../../utils/gamePhysics';

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
    
    // Normalize all positions to the red team's perspective
    const normalizedPlayerPositions = players.map(p => ({
      ...p, 
      normalizedPosition: normalizeCoordinates(p.position, player.team)
    }));
    
    // Get normalized teammate and opponent positions
    const normalizedTeammates = normalizedPlayerPositions
      .filter(p => p.team === player.team && p.id !== player.id)
      .map(p => p.normalizedPosition);
    
    const normalizedOpponents = normalizedPlayerPositions
      .filter(p => p.team !== player.team)
      .map(p => p.normalizedPosition);
    
    // For backward compatibility, keep the original position arrays too
    const teammatePositions = teammates.map(p => p.position);
    const opponentPositions = opponents.map(p => p.position);
    
    // Calculate team formation metrics
    let formationCenter = { x: 0, y: 0 };
    let formationCompactness = 0;
    let formationWidth = 0;
    
    if (teammatePositions.length > 0) {
      // Calculate team's center of mass using normalized positions
      const normalizedPlayerPosition = normalizeCoordinates(player.position, player.team);
      let totalX = normalizedPlayerPosition.x;
      let totalY = normalizedPlayerPosition.y;
      
      normalizedTeammates.forEach(pos => {
        totalX += pos.x;
        totalY += pos.y;
      });
      
      formationCenter.x = totalX / (normalizedTeammates.length + 1);
      formationCenter.y = totalY / (normalizedTeammates.length + 1);
      
      // Calculate formation compactness (average distance from center)
      let totalDistanceFromCenter = calculateDistance(normalizedPlayerPosition, formationCenter);
      let maxX = normalizedPlayerPosition.x;
      let minX = normalizedPlayerPosition.x;
      let maxY = normalizedPlayerPosition.y;
      let minY = normalizedPlayerPosition.y;
      
      normalizedTeammates.forEach(pos => {
        totalDistanceFromCenter += calculateDistance(pos, formationCenter);
        maxX = Math.max(maxX, pos.x);
        minX = Math.min(minX, pos.x);
        maxY = Math.max(maxY, pos.y);
        minY = Math.min(minY, pos.y);
      });
      
      formationCompactness = totalDistanceFromCenter / (normalizedTeammates.length + 1);
      formationWidth = Math.max(maxX - minX, maxY - minY);
    }
    
    // Calculate player's distance from formation center using normalized position
    const normalizedPlayerPosition = normalizeCoordinates(player.position, player.team);
    const distanceFromCenter = calculateDistance(normalizedPlayerPosition, formationCenter);
    const normalizedDistanceFromCenter = Math.min(1, distanceFromCenter / 200);
    
    // Determine if player is in their expected position based on role
    let isInPosition = true;
    const normalizedTargetPosition = normalizeCoordinates(player.targetPosition, player.team);
    const distanceFromTarget = calculateDistance(normalizedPlayerPosition, normalizedTargetPosition);
    
    // Position tolerance depends on role
    let positionTolerance = 100;
    if (player.role === 'goalkeeper') positionTolerance = 50;
    else if (player.role === 'defender') positionTolerance = 80;
    else if (player.role === 'midfielder') positionTolerance = 120;
    else if (player.role === 'forward') positionTolerance = 150;
    
    isInPosition = distanceFromTarget <= positionTolerance;
    
    // Calculate density of players in the area using normalized positions
    let teammateDensity = 0;
    let opponentDensity = 0;
    const densityRadius = 150;
    
    normalizedTeammates.forEach(pos => {
      const distance = calculateDistance(normalizedPlayerPosition, pos);
      if (distance < densityRadius) {
        // Closer teammates contribute more to density
        teammateDensity += 1 - (distance / densityRadius);
      }
    });
    
    normalizedOpponents.forEach(pos => {
      const distance = calculateDistance(normalizedPlayerPosition, pos);
      if (distance < densityRadius) {
        // Closer opponents contribute more to density
        opponentDensity += 1 - (distance / densityRadius);
      }
    });
    
    // Normalize densities (0-1)
    teammateDensity = Math.min(1, teammateDensity / 3);  // Assume max 3 close teammates
    opponentDensity = Math.min(1, opponentDensity / 3);  // Assume max 3 close opponents
    
    // Calculate possession duration (for backward compatibility, using original positions)
    const possessionState = players.find(p => 
      calculateDistance(p.position, { x: p.position.x, y: p.position.y }) < 30
    );
    const possessionTeam = possessionState?.team;
    const possessionDuration = possessionTeam === player.team ? 0.5 : 0;
    
    // Game context
    const scoreDiff = score ? 
      (player.team === 'red' ? score.red - score.blue : score.blue - score.red) : 0;
    const normalizedGameTime = gameTime ? gameTime / 3600 : 0.5;  // Assuming full game is 60 seconds

    // Use normalized team context for goals (always at the same side from player perspective)
    const ownGoal = { x: 0, y: 500/2 };
    const opponentGoal = { x: 800, y: 500/2 };

    return {
      // For compatibility, include original positions
      teammates: teammatePositions,
      opponents: opponentPositions,
      // Normalized perspective positions (always from red team's view)
      normalizedTeammates: normalizedTeammates,
      normalizedOpponents: normalizedOpponents,
      // Goals are always at a fixed position in the normalized space
      ownGoal,
      opponentGoal,
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
