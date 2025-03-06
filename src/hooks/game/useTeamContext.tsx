
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
    
    // Determine if player is in their expected position based on role and tacticalId
    let isInPosition = true;
    
    // Use tacticalId and positionPreference to determine more specific target positions
    let targetY = player.targetPosition.y;
    
    // Adjust target Y based on position preference if available
    if (player.positionPreference) {
      const pitchWidth = 600; // Height of the pitch
      switch (player.positionPreference) {
        case 'left':
          targetY = pitchWidth * 0.25;
          break;
        case 'center':
          targetY = pitchWidth * 0.5;
          break;
        case 'right':
          targetY = pitchWidth * 0.75;
          break;
      }
    }
    
    const targetX = player.targetPosition.x;
    const distanceFromTarget = calculateDistance(
      player.position, 
      { x: targetX, y: targetY }
    );
    
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
    
    // Determine team's tactical phase based on ball position and player positions
    const ownGoalPos = player.team === 'red' ? { x: 0, y: 500/2 } : { x: 800, y: 500/2 };
    const opponentGoalPos = player.team === 'red' ? { x: 800, y: 500/2 } : { x: 0, y: 500/2 };
    
    // Find the ball (assume first player has access to ball reference)
    const ballPos = players[0]?.brain?.lastOutput ? 
      { x: players[0].position.x + players[0].brain.lastOutput.x * 50, 
        y: players[0].position.y + players[0].brain.lastOutput.y * 50 } : 
      { x: 400, y: 300 };
      
    // Determine tactical phase
    let tacticalPhase: 'buildup' | 'attack' | 'defense' | 'transition' = 'buildup';
    
    const ballToOwnGoalDist = calculateDistance(ballPos, ownGoalPos);
    const ballToOpponentGoalDist = calculateDistance(ballPos, opponentGoalPos);
    
    // Check which team has more players near the ball
    const teamPlayerNearBall = teammates.filter(p => 
      calculateDistance(p.position, ballPos) < 100
    ).length + (calculateDistance(player.position, ballPos) < 100 ? 1 : 0);
    
    const opponentPlayerNearBall = opponents.filter(p => 
      calculateDistance(p.position, ballPos) < 100
    ).length;
    
    const hasTeamPossession = teamPlayerNearBall > opponentPlayerNearBall;
    
    if (hasTeamPossession) {
      if (ballToOpponentGoalDist < 250) {
        tacticalPhase = 'attack';
      } else if (ballToOwnGoalDist < 250) {
        tacticalPhase = 'buildup';
      } else {
        tacticalPhase = 'transition';
      }
    } else {
      if (ballToOwnGoalDist < 250) {
        tacticalPhase = 'defense';
      } else {
        tacticalPhase = 'transition';
      }
    }
    
    // Determine formation shape based on player distribution
    let attackingPlayerCount = 0;
    let defendingPlayerCount = 0;
    let midfieldPlayerCount = 0;
    
    // Function to determine which third a position is in
    const getThird = (pos: Position, team: 'red' | 'blue') => {
      if (team === 'red') {
        if (pos.x < 267) return 'defensive';
        if (pos.x > 533) return 'attacking';
        return 'midfield';
      } else {
        if (pos.x > 533) return 'defensive';
        if (pos.x < 267) return 'attacking';
        return 'midfield';
      }
    };
    
    // Count the player themselves
    const playerThird = getThird(player.position, player.team);
    if (playerThird === 'attacking') attackingPlayerCount++;
    else if (playerThird === 'defensive') defendingPlayerCount++;
    else midfieldPlayerCount++;
    
    // Count teammates
    teammates.forEach(teammate => {
      const third = getThird(teammate.position, teammate.team);
      if (third === 'attacking') attackingPlayerCount++;
      else if (third === 'defensive') defendingPlayerCount++;
      else midfieldPlayerCount++;
    });
    
    // Determine formation shape based on player distribution
    let formationShape: 'defensive' | 'balanced' | 'attacking' = 'balanced';
    
    const totalPlayers = attackingPlayerCount + defendingPlayerCount + midfieldPlayerCount;
    const attackingRatio = attackingPlayerCount / totalPlayers;
    const defendingRatio = defendingPlayerCount / totalPlayers;
    
    if (defendingRatio > 0.45) formationShape = 'defensive';
    else if (attackingRatio > 0.4) formationShape = 'attacking';
    else formationShape = 'balanced';
    
    // Calculate team pressure - how much the team is pressing
    let teamPressure = 0;
    
    // Team pressure is higher when multiple players are close to the ball
    const pressureRadius = 200;
    let playersInPressureZone = 0;
    
    teammates.forEach(teammate => {
      const distToBall = calculateDistance(teammate.position, ballPos);
      if (distToBall < pressureRadius) {
        playersInPressureZone++;
        teamPressure += (pressureRadius - distToBall) / pressureRadius;
      }
    });
    
    // Normalize team pressure (0-1)
    teamPressure = Math.min(1, teamPressure / 3);
    
    // Calculate defensive line height - how high the defensive line is positioned
    const defensivePositions = teammates
      .filter(p => p.role === 'defender')
      .map(p => p.position);
    
    if (player.role === 'defender') {
      defensivePositions.push(player.position);
    }
    
    let defensiveLine = 0.5; // Default mid-line
    
    if (defensivePositions.length > 0) {
      // For red team, higher X means higher defensive line
      // For blue team, lower X means higher defensive line
      const avgDefensiveX = defensivePositions.reduce((sum, pos) => sum + pos.x, 0) / 
                            defensivePositions.length;
      
      if (player.team === 'red') {
        defensiveLine = avgDefensiveX / 800; // Normalize to 0-1
      } else {
        defensiveLine = 1 - (avgDefensiveX / 800); // Invert for blue team
      }
    }
    
    // Calculate possession state and duration
    const ballDistThreshold = 30;
    const possessionPlayer = players.find(p => 
      calculateDistance(p.position, ballPos) < ballDistThreshold
    );
    const possessionTeam = possessionPlayer?.team;
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
      // New tactical context features
      formationShape,
      tacticalPhase,
      teamPressure,
      defensiveLine
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
