import React, { useState, useEffect } from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { moveGoalkeeper } from '../../utils/playerBrain';
import { 
  trackFormation, 
  trackPossession, 
  createGameContext 
} from '../../utils/gameContextTracker';
import { initializePlayerBrainWithHistory } from '../../utils/brainTraining';

interface PlayerMovementProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  gameReady: boolean;
  gameTime?: number;
  score?: { red: number, blue: number };
}

const calculateExecutionPrecision = (teamElo?: number): number => {
  if (!teamElo) return 1.0;
  
  const basePrecision = 0.7;
  const eloPrecisionBonus = Math.max(0, (teamElo - 1500) / 100) * 0.02;
  const precision = Math.min(0.98, basePrecision + eloPrecisionBonus);
  
  return precision;
};

const applyExecutionNoise = (value: number, precision: number): number => {
  const noiseAmplitude = 1 - precision;
  const noise = (Math.random() * 2 - 1) * noiseAmplitude;
  return value + noise;
};

const usePlayerMovement = ({ 
  players, 
  setPlayers, 
  ball, 
  gameReady,
  gameTime = 0,
  score = { red: 0, blue: 0 }
}: PlayerMovementProps) => {
  const [formations, setFormations] = useState({ redFormation: [], blueFormation: [] });
  const [possession, setPossession] = useState({ team: null, player: null, duration: 0 });
  
  useEffect(() => {
    if (gameReady && players.length > 0) {
      setPlayers(currentPlayers => 
        currentPlayers.map(player => ({
          ...player,
          brain: initializePlayerBrainWithHistory(player.brain)
        }))
      );
    }
  }, [gameReady, setPlayers]);
  
  useEffect(() => {
    if (gameReady && players.length > 0) {
      setFormations(trackFormation(players));
    }
  }, [players, gameReady]);
  
  useEffect(() => {
    if (gameReady) {
      setPossession(prev => trackPossession(ball, players, prev));
    }
  }, [ball, players, gameReady]);

  const updatePlayerPositions = React.useCallback(() => {
    if (!gameReady) return;
    
    setPlayers(currentPlayers => 
      currentPlayers.map(player => {
        try {
          const opposingTeamElo = currentPlayers
            .filter(p => p.team !== player.team)
            .reduce((sum, p) => sum + (p.teamElo || 2000), 0) / 
            currentPlayers.filter(p => p.team !== player.team).length;
            
          if (player.role === 'goalkeeper') {
            const movement = moveGoalkeeper(player, ball, opposingTeamElo);
            const newPosition = {
              x: player.position.x + movement.x,
              y: player.position.y + movement.y
            };
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
            return {
              ...player,
              position: newPosition,
              brain: {
                ...player.brain,
                lastOutput: movement,
                lastAction: 'move'
              }
            };
          }
          
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            console.warn(`Invalid brain for ${player.team} ${player.role} #${player.id}, using fallback movement`);
            const dx = ball.position.x - player.position.x;
            const dy = ball.position.y - player.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const moveSpeed = 1.5;
            const moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
            const moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
            
            const newPosition = {
              x: player.position.x + moveX,
              y: player.position.y + moveY
            };
            
            let maxDistance = 150;
            const distanceToBall = Math.sqrt(
              Math.pow(ball.position.x - player.position.x, 2) +
              Math.pow(ball.position.y - player.position.y, 2)
            );
            
            switch (player.role) {
              case 'defender': 
                maxDistance = distanceToBall < 150 ? 300 : 150;
                break;
              case 'midfielder': 
                maxDistance = distanceToBall < 200 ? 300 : 150;
                break;
              case 'forward': 
                maxDistance = distanceToBall < 250 ? 300 : 150;
                break;
            }
            
            const distanceFromStart = Math.sqrt(
              Math.pow(newPosition.x - player.targetPosition.x, 2) +
              Math.pow(newPosition.y - player.targetPosition.y, 2)
            );
            
            if (distanceFromStart > maxDistance) {
              const angle = Math.atan2(
                player.targetPosition.y - newPosition.y,
                player.targetPosition.x - newPosition.x
              );
              newPosition.x = player.targetPosition.x - Math.cos(angle) * maxDistance;
              newPosition.y = player.targetPosition.y - Math.sin(angle) * maxDistance;
            }
            
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
            
            return {
              ...player,
              position: newPosition,
              brain: {
                ...player.brain,
                lastOutput: { x: moveX, y: moveY },
                lastAction: 'move'
              }
            };
          }
          
          const gameContext = createGameContext(
            gameTime,
            3600,
            score,
            player.team,
            possession,
            formations,
            player
          );
          
          const input = {
            ballX: ball.position.x / PITCH_WIDTH,
            ballY: ball.position.y / PITCH_HEIGHT,
            playerX: player.position.x / PITCH_WIDTH,
            playerY: player.position.y / PITCH_HEIGHT,
            ballVelocityX: ball.velocity.x / 20,
            ballVelocityY: ball.velocity.y / 20,
            distanceToGoal: 0.5,
            angleToGoal: 0,
            nearestTeammateDistance: 0.5,
            nearestTeammateAngle: 0,
            nearestOpponentDistance: 0.5,
            nearestOpponentAngle: 0,
            isInShootingRange: 0,
            isInPassingRange: 0,
            isDefendingRequired: 0,
            teamElo: player.teamElo ? player.teamElo / 3000 : 0.5,
            eloAdvantage: 0.5,
            gameTime: gameContext.gameTime,
            scoreDifferential: gameContext.scoreDifferential,
            momentum: player.brain.successRate?.overall || 0.5,
            formationCompactness: 0.5,
            formationWidth: 0.5,
            recentSuccessRate: player.brain.successRate?.overall || 0.5,
            possessionDuration: gameContext.possession?.team === player.team ? 
              Math.min(1, gameContext.possession.duration / 600) : 0,
            distanceFromFormationCenter: 0.5,
            isInFormationPosition: 0.5,
            teammateDensity: 0.5,
            opponentDensity: 0.5
          };

          const output = player.brain.net.run(input);
          
          const executionPrecision = calculateExecutionPrecision(player.teamElo);
          
          let moveX = (output.moveX || 0.5) * 2 - 1;
          let moveY = (output.moveY || 0.5) * 2 - 1;
          
          moveX = applyExecutionNoise(moveX, executionPrecision);
          moveY = applyExecutionNoise(moveY, executionPrecision);
          
          moveX = Math.max(-1, Math.min(1, moveX));
          moveY = Math.max(-1, Math.min(1, moveY));
          
          player.brain.lastOutput = { x: moveX, y: moveY };

          let maxDistance = 150;
          const distanceToBall = Math.sqrt(
            Math.pow(ball.position.x - player.position.x, 2) +
            Math.pow(ball.position.y - player.position.y, 2)
          );

          switch (player.role) {
            case 'defender':
              maxDistance = distanceToBall < 150 ? 300 : 150;
              break;
            case 'midfielder':
              maxDistance = distanceToBall < 200 ? 300 : 150;
              break;
            case 'forward':
              maxDistance = distanceToBall < 250 ? 300 : 150;
              break;
          }

          const eloSpeedBonus = player.teamElo ? Math.min(0.5, Math.max(0, (player.teamElo - 1500) / 1000)) : 0;
          const moveSpeed = 2 + eloSpeedBonus;

          const newPosition = {
            x: player.position.x + moveX * moveSpeed,
            y: player.position.y + moveY * moveSpeed,
          };

          const distanceFromStart = Math.sqrt(
            Math.pow(newPosition.x - player.targetPosition.x, 2) +
            Math.pow(newPosition.y - player.targetPosition.y, 2)
          );

          if (distanceFromStart > maxDistance) {
            const angle = Math.atan2(
              player.targetPosition.y - newPosition.y,
              player.targetPosition.x - newPosition.x
            );
            newPosition.x = player.targetPosition.x + Math.cos(angle) * maxDistance;
            newPosition.y = player.targetPosition.y + Math.sin(angle) * maxDistance;
          }

          newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
          newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));

          if (player.teamElo && player.teamElo > 2200) {
            console.log(`High ELO player ${player.team} #${player.id} moved with precision ${executionPrecision.toFixed(2)}`);
          }

          return {
            ...player,
            position: newPosition,
          };
        } catch (error) {
          console.error(`Error updating player ${player.team} ${player.role} #${player.id}:`, error);
          return player;
        }
      })
    );
  }, [ball, gameReady, setPlayers, formations, possession, gameTime, score]);

  return { updatePlayerPositions, formations, possession };
};

export default usePlayerMovement;
