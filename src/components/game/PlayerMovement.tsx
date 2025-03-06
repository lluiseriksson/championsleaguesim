import React, { useState, useEffect } from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { moveGoalkeeper } from '../../utils/playerBrain';
import { 
  trackFormation, 
  trackPossession, 
  createGameContext 
} from '../../utils/gameContextTracker';
import { initializePlayerBrainWithHistory } from '../../utils/brainTraining';
import { isNetworkValid } from '../../utils/neuralHelpers';
import { validatePlayerBrain, createTacticalInput } from '../../utils/neural/networkValidator';
import { constrainMovementToRadius } from '../../utils/movementConstraints';
import { calculateCollisionAvoidance } from '../../hooks/game/useTeamCollisions';

interface PlayerMovementProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  gameReady: boolean;
  gameTime?: number;
  score?: { red: number, blue: number };
}

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
    
    setPlayers(currentPlayers => {
      const proposedPositions = currentPlayers.map(player => {
        try {
          if (player.role === 'goalkeeper') {
            const movement = moveGoalkeeper(player, ball);
            const newPosition = {
              x: player.position.x + movement.x,
              y: player.position.y + movement.y
            };
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
            
            return {
              ...player,
              proposedPosition: newPosition,
              movement,
              brain: {
                ...player.brain,
                lastOutput: movement,
                lastAction: 'move' as const
              }
            };
          }

          // Validate brain before using it
          const validatedPlayer = validatePlayerBrain(player);
          if (!validatedPlayer.brain || !validatedPlayer.brain.net) {
            console.warn(`Invalid brain detected for ${player.team} ${player.role}. Using fallback movement.`);
            
            const roleOffsets = {
              defender: player.team === 'red' ? 150 : PITCH_WIDTH - 150,
              midfielder: player.team === 'red' ? 300 : PITCH_WIDTH - 300,
              forward: player.team === 'red' ? 500 : PITCH_WIDTH - 500
            };
            
            const targetX = roleOffsets[player.role] || player.targetPosition.x;
            const targetY = Math.max(100, Math.min(PITCH_HEIGHT - 100, ball.position.y));
            
            const dx = targetX - player.position.x;
            const dy = targetY - player.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const moveSpeed = 1.2;
            
            let proposedPosition = {
              x: player.position.x + (dist > 0 ? (dx / dist) * moveSpeed : 0),
              y: player.position.y + (dist > 0 ? (dy / dist) * moveSpeed : 0)
            };
            
            proposedPosition = constrainMovementToRadius(
              player.position,
              player.targetPosition,
              proposedPosition,
              player.role
            );
            
            return {
              ...player,
              proposedPosition,
              movement: { 
                x: proposedPosition.x - player.position.x,
                y: proposedPosition.y - player.position.y
              },
              brain: initializePlayerBrainWithHistory(player.brain || { net: null })
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

          const playerX = player.position.x / PITCH_WIDTH;
          const isDefensiveThird = (player.team === 'red' && playerX < 0.33) || 
                                  (player.team === 'blue' && playerX > 0.66);
          const isAttackingThird = (player.team === 'red' && playerX > 0.66) || 
                                  (player.team === 'blue' && playerX < 0.33);
          
          const input = createTacticalInput(
            player,
            ball.position.x / PITCH_WIDTH,
            ball.position.y / PITCH_HEIGHT,
            gameContext.possession?.team === player.team,
            isDefensiveThird,
            isAttackingThird,
            gameContext.teammateDensity || 0.5,
            gameContext.opponentDensity || 0.5
          );

          const output = validatedPlayer.brain.net.run(input);
          
          const executionPrecision = 1;
          
          let moveX = (output.moveX || 0.5) * 2 - 1;
          let moveY = (output.moveY || 0.5) * 2 - 1;
          
          moveX = applyExecutionNoise(moveX, executionPrecision);
          moveY = applyExecutionNoise(moveY, executionPrecision);
          
          moveX = Math.max(-1, Math.min(1, moveX));
          moveY = Math.max(-1, Math.min(1, moveY));
          
          validatedPlayer.brain.lastOutput = { x: moveX, y: moveY };

          const dx = ball.position.x - player.position.x;
          const dy = ball.position.y - player.position.y;
          const angleTowardsBall = Math.atan2(dy, dx);
          const angleOfMovement = Math.atan2(moveY, moveX);
          
          const angleDiff = Math.abs(angleTowardsBall - angleOfMovement);
          const isMovingTowardsBall = angleDiff < Math.PI / 2;

          let maxDistance;
          const distanceToBall = Math.sqrt(
            Math.pow(ball.position.x - player.position.x, 2) +
            Math.pow(ball.position.y - player.position.y, 2)
          );

          if (isMovingTowardsBall) {
            switch (player.role) {
              case 'defender':
                maxDistance = distanceToBall < 150 ? 96 : 60;
                break;
              case 'midfielder':
                maxDistance = distanceToBall < 200 ? 120 : 80;
                break;
              case 'forward':
                maxDistance = distanceToBall < 250 ? 200 : 120;
                break;
            }
          } else {
            maxDistance = 600;
          }

          const eloSpeedBonus = player.teamElo ? Math.min(0.5, Math.max(0, (player.teamElo - 1500) / 1000)) : 0;
          const moveSpeed = 2 + eloSpeedBonus;

          const proposedPosition = {
            x: player.position.x + moveX * moveSpeed,
            y: player.position.y + moveY * moveSpeed,
          };

          const distanceFromStart = Math.sqrt(
            Math.pow(proposedPosition.x - player.targetPosition.x, 2) +
            Math.pow(proposedPosition.y - player.targetPosition.y, 2)
          );

          if (distanceFromStart > maxDistance) {
            const angle = Math.atan2(
              player.targetPosition.y - proposedPosition.y,
              player.targetPosition.x - proposedPosition.x
            );
            proposedPosition.x = player.targetPosition.x + Math.cos(angle) * maxDistance;
            proposedPosition.y = player.targetPosition.y + Math.sin(angle) * maxDistance;
          }

          proposedPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, proposedPosition.x));
          proposedPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, proposedPosition.y));

          return {
            ...player,
            proposedPosition,
            movement: { x: moveX, y: moveY },
            brain: {
              ...validatedPlayer.brain,
              lastOutput: { x: moveX, y: moveY },
              lastAction: 'move' as const
            }
          };

        } catch (error) {
          console.error(`Error updating player ${player.team} ${player.role} #${player.id}:`, error);
          return {
            ...player,
            proposedPosition: player.position,
            movement: { x: 0, y: 0 },
            brain: player.brain ? {
              ...player.brain,
              lastOutput: { x: 0, y: 0 },
              lastAction: 'move' as const
            } : { net: null }
          };
        }
      });
      
      return proposedPositions.map(player => {
        const teammates = proposedPositions.filter(
          p => p.team === player.team && p.id !== player.id
        );
        
        const collisionAdjustedPosition = calculateCollisionAvoidance(
          player,
          teammates,
          player.proposedPosition || player.position
        );
        
        return {
          ...player,
          position: collisionAdjustedPosition,
          proposedPosition: undefined,
          movement: undefined
        } as Player;
      });
    });
  }, [ball, gameReady, setPlayers, formations, possession, gameTime, score]);

  return { updatePlayerPositions, formations, possession };
};

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

const normalizeValue = (value: number, min: number, max: number): number => {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

export default usePlayerMovement;
