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
