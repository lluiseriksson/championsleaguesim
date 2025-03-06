import React, { useState, useEffect } from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { moveGoalkeeper } from '../../utils/playerBrain';
import { 
  trackFormation, 
  trackPossession, 
  createGameContext 
} from '../../utils/gameContextTracker';
import { initializePlayerBrainWithHistory } from '../../utils/brainTraining';
import { isStrategicMovement, calculateReceivingPositionQuality } from '../../utils/playerBrain';
import { isNetworkValid } from '../../utils/neuralHelpers';
import { validatePlayerBrain, createTacticalInput } from '../../utils/neural/networkValidator';
import { 
  analyzeSituation, 
  selectSpecializedNetwork, 
  getSpecializedNetwork,
  combineSpecializedOutputs
} from '../../utils/specializedNetworks';
import { calculateCollisionAvoidance } from '../../hooks/game/useTeamCollisions';
import * as brain from 'brain.js';
import { NeuralInput, NeuralOutput, SituationContext } from '../../types/football';

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
    
    setPlayers(currentPlayers => {
      const proposedPositions = currentPlayers.map(player => {
        try {
          if (player.role === 'goalkeeper') {
            const opposingTeamElo = currentPlayers
              .filter(p => p.team !== player.team)
              .reduce((sum, p) => sum + (p.teamElo || 2000), 0) / 
              currentPlayers.filter(p => p.team !== player.team).length;
              
            const movement = moveGoalkeeper(player, ball, opposingTeamElo);
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
          
          if (!player.brain || !player.brain.net || !isNetworkValid(player.brain.net)) {
            console.warn(`Invalid brain detected for ${player.team} ${player.role}. Using formation-based movement.`);
            
            const targetPosition = player.targetPosition;
            
            const dx = targetPosition.x - player.position.x;
            const dy = targetPosition.y - player.position.y;
            const distToTarget = Math.sqrt(dx*dx + dy*dy);
            
            const moveSpeed = distToTarget > 50 ? 1.5 : 0.7;
            const moveX = distToTarget > 5 ? (dx / distToTarget) * moveSpeed : 0;
            const moveY = distToTarget > 5 ? (dy / distToTarget) * moveSpeed : 0;
            
            const dxBall = ball.position.x - player.position.x;
            const dyBall = ball.position.y - player.position.y;
            const distToBall = Math.sqrt(dxBall*dxBall + dyBall*dyBall);
            
            const shouldChaseBall = distToBall < 80;
            
            let finalMoveX = moveX;
            let finalMoveY = moveY;
            
            if (shouldChaseBall) {
              const ballChasingWeight = Math.max(0, 1 - distToBall/100);
              finalMoveX = moveX * (1 - ballChasingWeight) + (dxBall / distToBall) * ballChasingWeight * 2;
              finalMoveY = moveY * (1 - ballChasingWeight) + (dyBall / distToBall) * ballChasingWeight * 2;
              
              const combinedMagnitude = Math.sqrt(finalMoveX*finalMoveX + finalMoveY*finalMoveY);
              if (combinedMagnitude > 1.5) {
                finalMoveX = (finalMoveX / combinedMagnitude) * 1.5;
                finalMoveY = (finalMoveY / combinedMagnitude) * 1.5;
              }
            }
            
            let proposedPosition = {
              x: player.position.x + finalMoveX,
              y: player.position.y + finalMoveY
            };
            
            proposedPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, proposedPosition.x));
            proposedPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, proposedPosition.y));
            
            return {
              ...player,
              proposedPosition,
              movement: { x: finalMoveX, y: finalMoveY },
              brain: {
                ...player.brain,
                lastOutput: { x: finalMoveX, y: finalMoveY },
                lastAction: 'move' as const
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
          
          const targetPosition = player.targetPosition;
          const distanceToFormationPosition = Math.sqrt(
            Math.pow(player.position.x - targetPosition.x, 2) +
            Math.pow(player.position.y - targetPosition.y, 2)
          );
          
          input.isInFormationPosition = Math.max(0, 1 - distanceToFormationPosition / 200);
          input.distanceFromFormationCenter = Math.min(1, distanceToFormationPosition / 300);
          
          const angleToFormationPosition = Math.atan2(
            targetPosition.y - player.position.y,
            targetPosition.x - player.position.x
          ) / Math.PI;
          
          const formationWeight = Math.min(1, distanceToFormationPosition / 100);
          
          input.gameTime = gameContext.gameTime;
          input.scoreDifferential = gameContext.scoreDifferential;
          input.momentum = player.brain.successRate?.overall || 0.5;
          input.possessionDuration = gameContext.possession?.team === player.team ? 
            Math.min(1, gameContext.possession.duration / 600) : 0;
          input.ballVelocityX = normalizeValue(ball.velocity.x, -20, 20);
          input.ballVelocityY = normalizeValue(ball.velocity.y, -20, 20);

          let output;
          if (player.brain.specializedNetworks && player.brain.specializedNetworks.length > 0) {
            const ownGoal = player.team === 'red' ? 
              { x: 0, y: PITCH_HEIGHT / 2 } : 
              { x: PITCH_WIDTH, y: PITCH_HEIGHT / 2 };
              
            const opponentGoal = player.team === 'red' ? 
              { x: PITCH_WIDTH, y: PITCH_HEIGHT / 2 } : 
              { x: 0, y: PITCH_HEIGHT / 2 };
            
            const hasTeamPossession = gameContext.possession?.team === player.team;
            
            const situation = analyzeSituation(
              player.position,
              ball.position,
              ownGoal,
              opponentGoal,
              hasTeamPossession,
              gameContext.teammateDensity || 0.5,
              gameContext.opponentDensity || 0.5,
              player.brain.actionHistory || []
            );
            
            const networkType = selectSpecializedNetwork(player.brain, situation);
            
            if (networkType !== player.brain.currentSpecialization) {
              console.log(`${player.team} ${player.role} #${player.id} switching from ${player.brain.currentSpecialization || 'none'} to ${networkType} network`);
              
              player.brain.currentSpecialization = networkType;
            }
            
            try {
              output = combineSpecializedOutputs(player.brain, situation, input);
            } catch (error) {
              console.warn(`Error using specialized networks: ${error.message}`);
              output = player.brain.net.run(input);
            }
          } else {
            output = player.brain.net.run(input);
          }
          
          const executionPrecision = calculateExecutionPrecision(player.teamElo);
          
          let moveX = (output.moveX || 0.5) * 2 - 1;
          let moveY = (output.moveY || 0.5) * 2 - 1;
          
          moveX = applyExecutionNoise(moveX, executionPrecision);
          moveY = applyExecutionNoise(moveY, executionPrecision);
          
          const formationDirX = targetPosition.x - player.position.x;
          const formationDirY = targetPosition.y - player.position.y;
          const formationDist = Math.sqrt(formationDirX*formationDirX + formationDirY*formationDirY);
          
          if (formationDist > 30) {
            const formationInfluence = Math.min(0.5, formationDist / 200);
            const normalizedFormationDirX = formationDist > 0 ? (formationDirX / formationDist) : 0;
            const normalizedFormationDirY = formationDist > 0 ? (formationDirY / formationDist) : 0;
            
            moveX = moveX * (1 - formationInfluence) + normalizedFormationDirX * formationInfluence;
            moveY = moveY * (1 - formationInfluence) + normalizedFormationDirY * formationInfluence;
          }
          
          moveX = Math.max(-1, Math.min(1, moveX));
          moveY = Math.max(-1, Math.min(1, moveY));
          
          player.brain.lastOutput = { x: moveX, y: moveY };

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

          if (player.teamElo && player.teamElo > 2200) {
            console.log(`High ELO player ${player.team} #${player.id} moved with precision ${executionPrecision.toFixed(2)} ${isMovingTowardsBall ? 'towards' : 'away from'} ball`);
          }

          return {
            ...player,
            proposedPosition,
            movement: { x: moveX, y: moveY },
            brain: {
              ...player.brain,
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
            brain: {
              ...player.brain,
              lastOutput: { x: 0, y: 0 },
              lastAction: 'move' as const
            }
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
          player.proposedPosition
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

const normalizeValue = (value: number, min: number, max: number): number => {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

export default usePlayerMovement;
