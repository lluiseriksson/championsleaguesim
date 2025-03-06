
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
    
    // Calculate player's distance from their assigned formation position
    const targetPosition = player.targetPosition;
    const distanceFromTarget = calculateDistance(player.position, targetPosition);
    
    // Position tolerance depends on role and team context
    let positionTolerance = 100;
    if (player.role === 'goalkeeper') positionTolerance = 50;
    else if (player.role === 'defender') positionTolerance = 80;
    else if (player.role === 'midfielder') positionTolerance = 120;
    else if (player.role === 'forward') positionTolerance = 150;
    
    // Increase tolerance when team has possession or player is in attacking third
    const teamHasPossession = teammates.some(teammate => 
      calculateDistance(teammate.position, { x: teammate.position.x, y: teammate.position.y }) < 30
    );
    
    const isInAttackingThird = (player.team === 'red' && player.position.x > 500) || 
                             (player.team === 'blue' && player.position.x < 300);
                             
    if (teamHasPossession) positionTolerance *= 1.5;
    if (isInAttackingThird) positionTolerance *= 1.8;
    
    const isInPosition = distanceFromTarget <= positionTolerance;
    
    // Calculate formation-based vertical and horizontal spacing
    // Find all players in the same horizontal line (same role)
    const sameRolePlayers = teammates.filter(t => t.role === player.role);
    let horizontalSpacing = 0;
    let verticalSpacing = 0;
    
    if (sameRolePlayers.length > 0) {
      const ySorted = [player, ...sameRolePlayers].sort((a, b) => a.position.y - b.position.y);
      
      // Calculate average y-distance between players in the same role
      let totalYDist = 0;
      for (let i = 1; i < ySorted.length; i++) {
        totalYDist += ySorted[i].position.y - ySorted[i-1].position.y;
      }
      horizontalSpacing = totalYDist / (ySorted.length - 1);
    }
    
    // Calculate vertical spacing between lines
    const roleOrder = ['goalkeeper', 'defender', 'midfielder', 'forward'];
    const playerRoleIndex = roleOrder.indexOf(player.role);
    
    if (playerRoleIndex > 0 && playerRoleIndex < roleOrder.length - 1) {
      const prevRolePlayers = teammates.filter(t => t.role === roleOrder[playerRoleIndex - 1]);
      const nextRolePlayers = teammates.filter(t => t.role === roleOrder[playerRoleIndex + 1]);
      
      if (prevRolePlayers.length > 0 && nextRolePlayers.length > 0) {
        const prevLineX = prevRolePlayers.reduce((sum, p) => sum + p.position.x, 0) / prevRolePlayers.length;
        const nextLineX = nextRolePlayers.reduce((sum, p) => sum + p.position.x, 0) / nextRolePlayers.length;
        const currentLineX = sameRolePlayers.reduce((sum, p) => sum + p.position.x, player.position.x) / (sameRolePlayers.length + 1);
        
        verticalSpacing = Math.min(
          Math.abs(currentLineX - prevLineX),
          Math.abs(nextLineX - currentLineX)
        );
      }
    }
    
    // Normalize spacing values
    horizontalSpacing = Math.min(1, horizontalSpacing / 150);
    verticalSpacing = Math.min(1, verticalSpacing / 200);
    
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
      scoreDiff: Math.min(1, Math.max(-1, scoreDiff / 3)),  // Normalize score differential
      horizontalSpacing,
      verticalSpacing
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
