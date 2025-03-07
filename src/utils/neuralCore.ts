
import * as brain from 'brain.js';
import { NeuralNet, NeuralInput, NeuralOutput, Position, Player, PITCH_WIDTH, PITCH_HEIGHT } from '../types/football';

// Create a new player brain (neural network)
export const createPlayerBrain = (): NeuralNet => {
  return {
    net: new brain.NeuralNetwork<NeuralInput, NeuralOutput>({
      hiddenLayers: [16, 8],
      activation: 'sigmoid'
    }),
    lastOutput: { x: 0, y: 0 }
  };
};

// Normalize value to range between 0 and 1
export const normalizeValue = (value: number, min: number, max: number): number => {
  return (value - min) / (max - min);
};

// Calculate distance between two positions
export const calculateDistance = (pos1: { x: number, y: number }, pos2: { x: number, y: number }): number => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Normalize coordinates based on team orientation
export const normalizeCoordinates = (position: Position, team: 'red' | 'blue'): Position => {
  if (team === 'red') {
    return { 
      x: position.x, 
      y: position.y 
    };
  } else {
    return { 
      x: PITCH_WIDTH - position.x, 
      y: PITCH_HEIGHT - position.y 
    };
  }
};

// Normalize velocity based on team orientation
export const normalizeVelocity = (velocity: { x: number, y: number }, team: 'red' | 'blue'): { x: number, y: number } => {
  if (team === 'red') {
    return { 
      x: velocity.x, 
      y: velocity.y 
    };
  } else {
    return { 
      x: -velocity.x, 
      y: -velocity.y 
    };
  }
};

// Constrain player movement within a radius of their target position
export const constrainMovementToRadius = (
  currentPosition: Position,
  targetPosition: Position,
  proposedPosition: Position,
  role: Player['role'],
  isNeuralNetworkAdjustment: boolean = false
): Position => {
  // Role-specific radius limits
  const roleRadiusLimits = {
    goalkeeper: 70,
    defender: 150,
    midfielder: 140,
    forward: 180
  };
  
  // Base max radius from target position
  const baseMaxRadius = roleRadiusLimits[role];
  const randomFactor = 1 + (Math.random() * 0.1 - 0.05); // ±5% randomization
  
  // Check if forward is in attacking position
  const isForwardInAttackingPosition = role === 'forward' && 
    ((currentPosition.x > 500 && proposedPosition.x > 450) || 
     (currentPosition.x < 300 && proposedPosition.x < 350));
  
  // Add extra radius for neural network adjustments
  const extraRadius = isNeuralNetworkAdjustment ? 8 : 0;
  
  // Calculate final max radius
  const maxRadius = isForwardInAttackingPosition 
    ? (baseMaxRadius * 1.15 * randomFactor) + extraRadius
    : (baseMaxRadius * randomFactor) + extraRadius;
  
  // Calculate distance from tactical position
  const distanceFromTarget = calculateDistance(proposedPosition, targetPosition);
  
  // If within radius, allow the move
  if (distanceFromTarget <= maxRadius) {
    return proposedPosition;
  }
  
  // If outside radius, constrain to the radius boundary
  const angle = Math.atan2(
    proposedPosition.y - targetPosition.y,
    proposedPosition.x - targetPosition.x
  );
  
  return {
    x: targetPosition.x + Math.cos(angle) * maxRadius,
    y: targetPosition.y + Math.sin(angle) * maxRadius
  };
};

// Calculate collision avoidance for players
export const calculateCollisionAvoidance = (
  player: Player,
  teammates: Player[],
  proposedPosition: Position,
  otherPlayers: Player[]
): Position => {
  const minPlayerDistance = 24; // Minimum distance between players
  let adjustedPosition = { ...proposedPosition };
  
  // Check for potential collisions with teammates
  for (const otherPlayer of otherPlayers) {
    if (!otherPlayer.position) continue;
    
    const distance = calculateDistance(adjustedPosition, otherPlayer.position);
    
    if (distance < minPlayerDistance) {
      const collisionVector = {
        x: adjustedPosition.x - otherPlayer.position.x,
        y: adjustedPosition.y - otherPlayer.position.y
      };
      
      // Normalize collision vector
      const vectorLength = Math.sqrt(collisionVector.x * collisionVector.x + collisionVector.y * collisionVector.y) || 1;
      const normalizedVector = {
        x: collisionVector.x / vectorLength,
        y: collisionVector.y / vectorLength
      };
      
      // Apply stronger repulsion for very close players
      const repulsionStrength = (minPlayerDistance - distance) * 0.5;
      adjustedPosition.x += normalizedVector.x * repulsionStrength;
      adjustedPosition.y += normalizedVector.y * repulsionStrength;
    }
  }
  
  return adjustedPosition;
};
