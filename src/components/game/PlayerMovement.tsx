import React, { useState, useEffect } from 'react';
import { Player, Ball, PITCH_WIDTH, PITCH_HEIGHT, NeuralNet } from '../../types/football';
import { moveGoalkeeper } from '../../utils/goalkeeperLogic';
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
import { createPlayerBrain } from '../../utils/neuralNetwork';
import { createExperienceReplay } from '../../utils/experienceReplay';

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
  const [lastMovementTime, setLastMovementTime] = useState(Date.now());
  const [brainInitialized, setBrainInitialized] = useState(false);

  useEffect(() => {
    if (gameReady && players.length > 0 && !brainInitialized) {
      console.log("Initializing player brains for all players...");
      
      setPlayers(currentPlayers => 
        currentPlayers.map(player => {
          let playerWithBrain = player;
          
          if (!player.brain || !player.brain.net || typeof player.brain.net.run !== 'function') {
            console.log(`Creating new brain for ${player.team} ${player.role} #${player.id}`);
            playerWithBrain = {
              ...player,
              brain: createPlayerBrain()
            };
          } else {
            playerWithBrain = validatePlayerBrain(player);
          }
          
          return {
            ...playerWithBrain,
            brain: initializePlayerBrainWithHistory(playerWithBrain.brain)
          };
        })
      );
      
      setBrainInitialized(true);
    }
  }, [gameReady, setPlayers, players, brainInitialized]);

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
      console.log("Creating default brain for player with no brain");
      return createPlayerBrain();
    }
    
    if ('net' in brain && Object.keys(brain).length === 1) {
      console.log("Expanding basic brain to full structure");
      return {
        net: brain.net,
        lastOutput: { x: 0, y: 0 },
        lastAction: 'move',
        actionHistory: [],
        successRate: { shoot: 0, pass: 0, intercept: 0, overall: 0 },
        experienceReplay: createExperienceReplay(),
        learningStage: 0.1,
        lastReward: 0,
        cumulativeReward: 0
      };
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
    if (!player.brain || !player.brain.net) {
      console.log(`No neural network for ${player.team} ${player.role} #${player.id}`);
      return null;
    }
    
    try {
      if (!isNetworkValid(player.brain.net)) {
        console.warn(`Invalid network for ${player.team} ${player.role} #${player.id}`);
        return null;
      }
      
      console.log(`Using neural network for ${player.team} ${player.role} #${player.id}`);
      
      const normalizedBallX = ball.position.x / PITCH_WIDTH;
      const normalizedBallY = ball.position.y / PITCH_HEIGHT;
      const normalizedPlayerX = player.position.x / PITCH_WIDTH;
      const normalizedPlayerY = player.position.y / PITCH_HEIGHT;
      
      const input = {
        ballX: normalizedBallX,
        ballY: normalizedBallY,
        playerX: normalizedPlayerX,
        playerY: normalizedPlayerY,
        ballVelocityX: ball.velocity.x / 10,
        ballVelocityY: ball.velocity.y / 10,
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
        transitionSpeed: 0.5
      };
      
      const output = player.brain.net.run(input);
      
      if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
        let moveXMultiplier = 3.0;
        let moveYMultiplier = 3.0;
        
        if (player.role === 'defender') {
          moveXMultiplier = 3.5;
          moveYMultiplier = 3.2;
        }
        
        const currentTime = Date.now();
        if (currentTime - lastMovementTime > 3000) {
          console.log("Players seem stuck, increasing movement multiplier");
          moveXMultiplier *= 1.5;
          moveYMultiplier *= 1.5;
          setLastMovementTime(currentTime);
        }
        
        const moveX = (output.moveX * 2 - 1) * moveXMultiplier; 
        const moveY = (output.moveY * 2 - 1) * moveYMultiplier;
        
        return { x: moveX, y: moveY };
      } else {
        console.warn(`Invalid output from neural network for ${player.team} ${player.role} #${player.id}: ${JSON.stringify(output)}`);
      }
    } catch (error) {
      console.error(`Error using neural network for ${player.team} ${player.role} #${player.id}:`, error);
    }
    
    return null;
  };

  const updatePlayerPositions = React.useCallback(() => {
    if (!gameReady) {
      console.log("Game not ready, skipping player position updates");
      return;
    }
    
    console.log("Updating player positions...");
    
    setPlayers(currentPlayers => {
      const proposedPositions = currentPlayers.map(player => {
        try {
          if (player.role === 'goalkeeper') {
            console.log(`Moving goalkeeper ${player.team} #${player.id}`);
            
            const opposingTeam = player.team === 'red' ? 'blue' : 'red';
            const opposingTeamPlayer = currentPlayers.find(p => p.team === opposingTeam);
            const opposingTeamElo = opposingTeamPlayer?.teamElo;
            
            const movement = moveGoalkeeper(player, ball, opposingTeamElo);
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
          
          const neuralNetworkThreshold = player.role === 'defender' ? 0.45 : 0.5;
          const useNeuralNetwork = Math.random() > neuralNetworkThreshold;
          
          console.log(`${player.team} ${player.role} #${player.id} - Using neural network: ${useNeuralNetwork}`);
          
          const neuralMovement = useNeuralNetwork ? useNeuralNetworkForPlayer(player, ball) : null;
          
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
          
          let targetX = roleOffsets[player.role] || player.targetPosition.x;
          let targetY = Math.max(100, Math.min(PITCH_HEIGHT - 100, ball.position.y));
          
          const defensiveThirdWidth = PITCH_WIDTH / 3;
          const isInDefensiveThird = (player.team === 'red' && ball.position.x < defensiveThirdWidth) || 
                                    (player.team === 'blue' && ball.position.x > PITCH_WIDTH - defensiveThirdWidth);
          
          if (isInDefensiveThird) {
            const forwardOffset = player.team === 'red' ? 50 : -50;
            targetX += forwardOffset;
            
            const ballYRelativeToCenter = (ball.position.y - PITCH_HEIGHT/2) / 2;
            targetY = ball.position.y - ballYRelativeToCenter;
          } else {
            targetX += (Math.random() - 0.5) * 25;
            targetY += (Math.random() - 0.5) * 35;
          }
          
          const dx = targetX - player.position.x;
          const dy = targetY - player.position.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          let moveSpeed = 2.4;
          if (player.role === 'defender') {
            moveSpeed = 2.6;
          }
          
          let moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
          let moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
          
          if (player.role === 'defender' && Math.random() > 0.8) {
            moveX += (Math.random() - 0.5) * 0.6;
            moveY += (Math.random() - 0.5) * 0.6;
          } else if (Math.random() > 0.85) {
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
  }, [ball, gameReady, setPlayers, gameTime, score, lastMovementTime]);

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
