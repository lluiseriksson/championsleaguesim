import React, { useState, useEffect } from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, NeuralNet } from '../../types/football';
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

  const ensureCompleteBrain = (brain: Partial<NeuralNet> | null | { net: any }): NeuralNet => {
    if (!brain) {
      return {
        net: null,
        lastOutput: { x: 0, y: 0 },
        lastAction: 'move',
        actionHistory: [],
        successRate: { shoot: 0, pass: 0, intercept: 0, overall: 0 }
      };
    }
    
    if ('net' in brain && Object.keys(brain).length === 1) {
      const basicBrain: NeuralNet = {
        net: brain.net,
        lastOutput: { x: 0, y: 0 },
        lastAction: 'move',
        actionHistory: [],
        successRate: { shoot: 0, pass: 0, intercept: 0, overall: 0 }
      };
      return basicBrain;
    }
    
    const completeBrain = brain as Partial<NeuralNet>;
    return {
      net: completeBrain.net || null,
      lastOutput: completeBrain.lastOutput || { x: 0, y: 0 },
      lastAction: completeBrain.lastAction || 'move',
      actionHistory: completeBrain.actionHistory || [],
      successRate: completeBrain.successRate || { shoot: 0, pass: 0, intercept: 0, overall: 0 },
      experienceReplay: completeBrain.experienceReplay,
      learningStage: completeBrain.learningStage,
      lastReward: completeBrain.lastReward,
      cumulativeReward: completeBrain.cumulativeReward,
      specializedNetworks: completeBrain.specializedNetworks,
      selectorNetwork: completeBrain.selectorNetwork,
      metaNetwork: completeBrain.metaNetwork,
      currentSpecialization: completeBrain.currentSpecialization,
      lastSituationContext: completeBrain.lastSituationContext
    };
  };

  const useNeuralNetworkForPlayer = (player: Player, ball: Ball): { x: number, y: number } | null => {
    if (!player.brain || !player.brain.net) return null;
    
    try {
      if (!isNetworkValid(player.brain.net)) {
        return null;
      }
      
      const normalizedBallX = ball.position.x / PITCH_WIDTH;
      const normalizedBallY = ball.position.y / PITCH_HEIGHT;
      const normalizedPlayerX = player.position.x / PITCH_WIDTH;
      const normalizedPlayerY = player.position.y / PITCH_HEIGHT;
      
      const input = {
        ballX: normalizedBallX,
        ballY: normalizedBallY,
        playerX: normalizedPlayerX,
        playerY: normalizedPlayerY,
        distanceToGoal: 0.5,
        angleToGoal: 0,
        nearestTeammateDistance: 0.5,
        nearestTeammateAngle: 0,
        nearestOpponentDistance: 0.5,
        nearestOpponentAngle: 0,
        isInShootingRange: 0,
        isInPassingRange: 0,
        isDefendingRequired: player.role === 'defender' ? 1 : 0,
        distanceToOwnGoal: 0.5,
        angleToOwnGoal: 0,
        isFacingOwnGoal: 0,
        isDangerousPosition: 0,
        isBetweenBallAndOwnGoal: 0,
        teamElo: player.teamElo ? player.teamElo / 3000 : 0.5,
        eloAdvantage: 0,
        gameTime: gameTime / 90,
        scoreDifferential: 0,
        momentum: 0.5,
        formationCompactness: 0.5,
        formationWidth: 0.5,
        recentSuccessRate: 0.5,
        possessionDuration: 0,
        distanceFromFormationCenter: 0.5,
        isInFormationPosition: 1,
        teammateDensity: 0.5,
        opponentDensity: 0.5,
        shootingAngle: 0.5,
        shootingQuality: 0.5,
        zoneControl: 0.5,
        passingLanesQuality: 0.5,
        spaceCreation: 0.5,
        defensiveSupport: 0.5,
        pressureIndex: 0.5,
        tacticalRole: 0.5,
        supportPositioning: 0.5,
        pressingEfficiency: 0.5,
        coverShadow: 0.5,
        verticalSpacing: 0.5,
        horizontalSpacing: 0.5,
        territorialControl: 0.5,
        counterAttackPotential: 0.5,
        pressureResistance: 0.5,
        recoveryPosition: 0.5,
        transitionSpeed: 0.5,
        ballVelocityX: ball.velocity.x / 10,
        ballVelocityY: ball.velocity.y / 10
      };
      
      const output = player.brain.net.run(input);
      
      if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
        const moveX = (output.moveX * 2 - 1) * 3.0; 
        const moveY = (output.moveY * 2 - 1) * 3.0;
        
        return { x: moveX, y: moveY };
      }
    } catch (error) {
      console.log(`Error using neural network for ${player.team} ${player.role} #${player.id}:`, error);
    }
    
    return null;
  };

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
            
            const completeBrain = ensureCompleteBrain(player.brain);
            
            return {
              ...player,
              proposedPosition: newPosition,
              movement,
              brain: {
                ...completeBrain,
                lastOutput: movement,
                lastAction: 'move' as const
              }
            };
          }
          
          const neuralMovement = Math.random() > 0.3 ? useNeuralNetworkForPlayer(player, ball) : null;
          
          if (neuralMovement) {
            let newPosition = {
              x: player.position.x + neuralMovement.x,
              y: player.position.y + neuralMovement.y
            };
            
            newPosition = constrainMovementToRadius(
              player.position,
              player.targetPosition,
              newPosition,
              player.role
            );
            
            newPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, newPosition.x));
            newPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, newPosition.y));
            
            const completeBrain = ensureCompleteBrain(player.brain);
            
            return {
              ...player,
              proposedPosition: newPosition,
              movement: neuralMovement,
              brain: {
                ...completeBrain,
                lastOutput: neuralMovement,
                lastAction: 'move' as const
              }
            };
          }
          
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
          const moveSpeed = 1.8;
          
          let moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
          let moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
          
          if (Math.random() > 0.8) {
            moveX += (Math.random() - 0.5) * 0.5;
            moveY += (Math.random() - 0.5) * 0.5;
          }
          
          let proposedPosition = {
            x: player.position.x + moveX,
            y: player.position.y + moveY
          };
          
          proposedPosition = constrainMovementToRadius(
            player.position,
            player.targetPosition,
            proposedPosition,
            player.role
          );
          
          proposedPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, proposedPosition.x));
          proposedPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, proposedPosition.y));
          
          const completeBrain = ensureCompleteBrain(player.brain);
          
          return {
            ...player,
            proposedPosition,
            movement: { 
              x: moveX,
              y: moveY
            },
            brain: {
              ...completeBrain,
              lastOutput: { x: moveX, y: moveY },
              lastAction: 'move' as const
            }
          };
        } catch (error) {
          console.error(`Error updating player ${player.team} ${player.role} #${player.id}:`, error);
          
          const completeBrain = ensureCompleteBrain(player.brain);
          
          return {
            ...player,
            proposedPosition: player.position,
            movement: { x: 0, y: 0 },
            brain: {
              ...completeBrain,
              lastOutput: { x: 0, y: 0 },
              lastAction: 'move' as const
            }
          };
        }
      });
      
      const processedPlayers = proposedPositions.map(p => {
        const otherPlayers = proposedPositions.filter(
          otherPlayer => otherPlayer.id !== p.id
        );
        
        const collisionAdjustedPosition = calculateCollisionAvoidance(
          p,
          proposedPositions.filter(teammate => teammate.team === p.team && teammate.id !== p.id),
          p.proposedPosition || p.position,
          otherPlayers
        );
        
        const cleanPlayer = {
          ...p,
          position: collisionAdjustedPosition,
          brain: p.brain
        };
        
        const playerWithTempProps: any = cleanPlayer;
        delete playerWithTempProps.proposedPosition;
        delete playerWithTempProps.movement;
        
        return cleanPlayer as Player;
      });
      
      return processedPlayers;
    });
  }, [ball, gameReady, setPlayers, gameTime, score]);

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
