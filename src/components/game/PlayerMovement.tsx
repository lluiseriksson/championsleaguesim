import React, { useState, useEffect } from 'react';
import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, NeuralNet, NeuralInput } from '../../types/football';
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
import { normalizeCoordinates, denormalizeCoordinates, normalizeVelocity } from '../../utils/gamePhysics';
import { createPlayerBrain } from '../../utils/neuralNetwork';

const createBasicTestInput = (): NeuralInput => {
  return {
    ballX: 0.5,
    ballY: 0.5,
    playerX: 0.5,
    playerY: 0.5,
    ballVelocityX: 0,
    ballVelocityY: 0,
    distanceToGoal: 0.5,
    angleToGoal: 0,
    nearestTeammateDistance: 0.5,
    nearestTeammateAngle: 0,
    nearestOpponentDistance: 0.5,
    nearestOpponentAngle: 0,
    isInShootingRange: 0,
    isInPassingRange: 0,
    isDefendingRequired: 0,
    distanceToOwnGoal: 0.5,
    angleToOwnGoal: 0,
    isFacingOwnGoal: 0,
    isDangerousPosition: 0,
    isBetweenBallAndOwnGoal: 0,
    teamElo: 0.5,
    eloAdvantage: 0,
    gameTime: 0.5,
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
};

interface PlayerMovementProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  ball: Ball;
  gameReady: boolean;
  gameTime?: number;
  score?: { red: number, blue: number };
  isLowPerformance?: boolean;
}

const usePlayerMovement = ({ 
  players, 
  setPlayers, 
  ball, 
  gameReady,
  gameTime = 0,
  score = { red: 0, blue: 0 },
  isLowPerformance = false
}: PlayerMovementProps) => {
  const [formations, setFormations] = useState({ redFormation: [], blueFormation: [] });
  const [possession, setPossession] = useState({ team: null, player: null, duration: 0 });
  const neuralNetworkCacheRef = React.useRef<Map<number, { timestamp: number, result: { x: number, y: number } | null }>>(new Map());

  useEffect(() => {
    if (gameReady && players.length > 0) {
      setPlayers(currentPlayers => 
        currentPlayers.map(player => {
          const validatedPlayer = validatePlayerBrain(player);
          
          if (!validatedPlayer.brain || !validatedPlayer.brain.net || !isNetworkValid(validatedPlayer.brain.net)) {
            console.log(`Re-initializing invalid brain for ${player.team} ${player.role} #${player.id}`);
            return {
              ...player,
              brain: createPlayerBrain()
            };
          }
          
          return {
            ...validatedPlayer,
            brain: initializePlayerBrainWithHistory(validatedPlayer.brain)
          };
        })
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

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cacheSize = neuralNetworkCacheRef.current.size;
      
      if (cacheSize > 50) {
        let deletedCount = 0;
        neuralNetworkCacheRef.current.forEach((value, key) => {
          if (now - value.timestamp > 2000) {
            neuralNetworkCacheRef.current.delete(key);
            deletedCount++;
          }
        });
        
        if (deletedCount > 0) {
          console.log(`Cleaned up ${deletedCount} neural network cache entries`);
        }
      }
    }, 5000);
    
    return () => clearInterval(cleanupInterval);
  }, []);

  const ensureCompleteBrain = (brain: Partial<NeuralNet> | null | { net: any }): NeuralNet => {
    if (!brain) {
      console.log("Creating new brain due to missing brain");
      return createPlayerBrain();
    }
    
    if ('net' in brain && Object.keys(brain).length === 1) {
      console.log("Creating complete brain from partial brain");
      const basicBrain: NeuralNet = {
        net: brain.net,
        lastOutput: { x: 0, y: 0 },
        lastAction: 'move',
        actionHistory: [],
        successRate: { shoot: 0, pass: 0, intercept: 0, overall: 0 }
      };
      return basicBrain;
    }
    
    if (!brain.net || typeof brain.net?.run !== 'function') {
      console.log("Fixing invalid neural network in brain");
      const newBrain = createPlayerBrain();
      return {
        ...newBrain,
        lastOutput: (brain as Partial<NeuralNet>).lastOutput || { x: 0, y: 0 },
        lastAction: (brain as Partial<NeuralNet>).lastAction || 'move',
        actionHistory: (brain as Partial<NeuralNet>).actionHistory || [],
        successRate: (brain as Partial<NeuralNet>).successRate || { shoot: 0, pass: 0, intercept: 0, overall: 0 }
      };
    }
    
    try {
      const testInput = createBasicTestInput();
      brain.net.run(testInput);
    } catch (error) {
      console.log("Neural network validation failed during runtime, creating new brain");
      const newBrain = createPlayerBrain();
      return {
        ...newBrain,
        lastOutput: (brain as Partial<NeuralNet>).lastOutput || { x: 0, y: 0 },
        lastAction: (brain as Partial<NeuralNet>).lastAction || 'move',
        actionHistory: (brain as Partial<NeuralNet>).actionHistory || [],
        successRate: (brain as Partial<NeuralNet>).successRate || { shoot: 0, pass: 0, intercept: 0, overall: 0 }
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
    const cacheKey = player.id;
    const cachedResult = neuralNetworkCacheRef.current.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < 500) {
      return cachedResult.result;
    }
    
    if (isLowPerformance && Math.random() > 0.4) {
      return null;
    }
    
    if (!player.brain || !player.brain.net) {
      setTimeout(() => {
        setPlayers(currentPlayers => 
          currentPlayers.map(p => p.id === player.id ? validatePlayerBrain(player) : p)
        );
      }, 100);
      return null;
    }
    
    try {
      if (!isNetworkValid(player.brain.net)) {
        setTimeout(() => {
          setPlayers(currentPlayers => 
            currentPlayers.map(p => p.id === player.id ? validatePlayerBrain(player) : p)
          );
        }, 100);
        return null;
      }
      
      const normalizedBallPosition = normalizeCoordinates(ball.position, player.team);
      const normalizedPlayerPosition = normalizeCoordinates(player.position, player.team);
      const normalizedBallVelocity = normalizeVelocity(ball.velocity, player.team);
      
      const normalizedBallX = normalizedBallPosition.x / PITCH_WIDTH;
      const normalizedBallY = normalizedBallPosition.y / PITCH_HEIGHT;
      const normalizedPlayerX = normalizedPlayerPosition.x / PITCH_WIDTH;
      const normalizedPlayerY = normalizedPlayerPosition.y / PITCH_HEIGHT;
      
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
        ballVelocityX: normalizedBallVelocity.x / 10,
        ballVelocityY: normalizedBallVelocity.y / 10
      };
      
      const output = player.brain.net.run(input);
      
      if (output && typeof output.moveX === 'number' && typeof output.moveY === 'number') {
        let moveXMultiplier = 3.0;
        let moveYMultiplier = 3.0;
        
        if (player.role === 'defender') {
          moveXMultiplier = 3.2;
          moveYMultiplier = 3.0;
        } else if (player.role === 'forward') {
          moveXMultiplier = 3.5;
          moveYMultiplier = 3.3;
        }
        
        let moveX = (output.moveX * 2 - 1) * moveXMultiplier;
        let moveY = (output.moveY * 2 - 1) * moveYMultiplier;
        
        if (player.team === 'blue') {
          moveX = -moveX;
        }
        
        const result = { x: moveX, y: moveY };
        
        neuralNetworkCacheRef.current.set(cacheKey, {
          timestamp: Date.now(),
          result
        });
        
        return result;
      }
    } catch (error) {
      console.log(`Error using neural network for ${player.team} ${player.role} #${player.id}:`, error);
      
      setTimeout(() => {
        setPlayers(currentPlayers => 
          currentPlayers.map(p => p.id === player.id ? validatePlayerBrain(player) : p)
        );
      }, 100);
    }
    
    neuralNetworkCacheRef.current.set(cacheKey, {
      timestamp: Date.now(),
      result: null
    });
    
    return null;
  };

  const applyNeuralFineTuning = (player: Player, basePosition: Position): Position => {
    if (player.role === 'goalkeeper') return basePosition;
    
    try {
      const neuralOutput = useNeuralNetworkForPlayer(player, ball);
      if (!neuralOutput) return basePosition;
      
      const fineAdjustmentFactor = 0.05;
      const fineX = neuralOutput.x * fineAdjustmentFactor;
      const fineY = neuralOutput.y * fineAdjustmentFactor;
      
      const adjustedPosition = {
        x: basePosition.x + fineX,
        y: basePosition.y + fineY
      };
      
      return constrainMovementToRadius(
        player.position,
        basePosition,
        adjustedPosition,
        player.role,
        true
      );
    } catch (error) {
      console.error(`Error applying neural fine-tuning for player ${player.id}:`, error);
      return basePosition;
    }
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
            
            if (player.team === 'red') {
              newPosition.x = Math.max(12, Math.min(75, newPosition.x)); // Keep red goalkeeper near left goal
            } else {
              newPosition.x = Math.max(PITCH_WIDTH - 75, Math.min(PITCH_WIDTH - 12, newPosition.x)); // Keep blue goalkeeper near right goal
            }
            
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
          
          const baseThreshold = isLowPerformance ? 0.7 : 0.6;
          const neuralNetworkThreshold = player.role === 'defender' ? baseThreshold - 0.05 : baseThreshold;
          
          const useNeuralNetwork = Math.random() > neuralNetworkThreshold;
          const neuralMovement = useNeuralNetwork ? useNeuralNetworkForPlayer(player, ball) : null;
          
          if (neuralMovement) {
            let scaledMovement = {
              x: neuralMovement.x * 0.3,
              y: neuralMovement.y * 0.3
            };
            
            let newPosition = {
              x: player.position.x + scaledMovement.x,
              y: player.position.y + scaledMovement.y
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
              movement: scaledMovement,
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
            targetX += (Math.random() - 0.5) * 40;
            targetY += (Math.random() - 0.5) * 60;
          }
          
          const dx = targetX - player.position.x;
          const dy = targetY - player.position.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          let moveSpeed = 1.8;
          if (player.role === 'defender') {
            moveSpeed = 2.0;
          } else if (player.role === 'forward') {
            moveSpeed = 2.2;
          }
          
          let moveX = dist > 0 ? (dx / dist) * moveSpeed : 0;
          let moveY = dist > 0 ? (dy / dist) * moveSpeed : 0;
          
          if (player.role === 'defender' && Math.random() > 0.7) {
            moveX += (Math.random() - 0.5) * 0.8;
            moveY += (Math.random() - 0.5) * 0.8;
          } else if (Math.random() > 0.8) {
            moveX += (Math.random() - 0.5) * 0.5;
            moveY += (Math.random() - 0.5) * 0.5;
          }
          
          let basePosition = {
            x: player.position.x + moveX,
            y: player.position.y + moveY
          };
          
          basePosition = constrainMovementToRadius(
            player.position,
            player.targetPosition,
            basePosition,
            player.role
          );
          
          const finalPosition = applyNeuralFineTuning(player, basePosition);
          
          finalPosition.x = Math.max(12, Math.min(PITCH_WIDTH - 12, finalPosition.x));
          finalPosition.y = Math.max(12, Math.min(PITCH_HEIGHT - 12, finalPosition.y));
          
          const completeBrain = ensureCompleteBrain(player.brain);
          
          return {
            ...player,
            proposedPosition: finalPosition,
            movement: { 
              x: finalPosition.x - player.position.x,
              y: finalPosition.y - player.position.y
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
  }, [ball, gameReady, setPlayers, gameTime, score, isLowPerformance]);

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
