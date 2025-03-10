
import { Position, Player } from '../types/football';
import { calculateDistance } from './neuralCore';
import { logEloAdjustmentDetails } from './neural/neuralTypes';

// Reduced radius limits to constrain player movement
const ROLE_RADIUS_LIMITS = {
  goalkeeper: 70,    // Reduced from 90
  defender: 150,     // Reduced from 210
  midfielder: 140,   // Reduced from 200
  forward: 180       // Reduced from 270
};

// Significantly reduced neural adjustment radius
const NEURAL_ADJUSTMENT_RADIUS = 8; // Reduced from 20

// Apply ELO-based adjustment to movement constraint radius - FIXED IMPLEMENTATION
const applyEloRadiusAdjustment = (
  baseRadius: number,
  player: Player,
  allPlayers?: Player[]
): number => {
  if (!allPlayers || !player.teamElo) return baseRadius;
  
  // Find opponent team's ELO
  const opponentTeam = player.team === 'red' ? 'blue' : 'red';
  const opponentPlayer = allPlayers.find(p => p.team === opponentTeam && p.teamElo !== undefined);
  
  if (!opponentPlayer?.teamElo) return baseRadius;
  
  // Calculate ELO difference - give advantage to higher-rated team
  const eloDifference = player.teamElo - opponentPlayer.teamElo;
  
  // CRITICAL FIX: Higher ELO should get bonus, lower ELO should get penalty
  // Previous implementation had reversed logic
  if (eloDifference <= 0) {
    // Apply a penalty for lower-rated team (reduced from 35% to 31.5%)
    const cappedNegativeDifference = Math.max(eloDifference, -500);
    const radiusPenalty = (cappedNegativeDifference / 500) * 0.315; // Reduced by 10% from 0.35
    
    const adjustedRadius = baseRadius * (1 + radiusPenalty);
    
    // Log significant adjustments for debugging
    if (Math.abs(adjustedRadius - baseRadius) > 10) {
      logEloAdjustmentDetails(
        "movement radius", 
        player.team, 
        player.teamElo, 
        opponentPlayer.teamElo, 
        adjustedRadius - baseRadius
      );
    }
    
    return adjustedRadius;
  }
  
  // Cap at 500 ELO difference for higher-rated team
  const cappedDifference = Math.min(eloDifference, 500);
  
  // Calculate radius bonus (reduced from 40% to 36% boost for higher-rated team)
  const radiusBonus = (cappedDifference / 500) * 0.36; // Reduced by 10% from 0.40
  
  const adjustedRadius = baseRadius * (1 + radiusBonus);
  
  // Log significant adjustments for debugging
  if (Math.abs(adjustedRadius - baseRadius) > 10) {
    logEloAdjustmentDetails(
      "movement radius", 
      player.team, 
      player.teamElo, 
      opponentPlayer.teamElo, 
      adjustedRadius - baseRadius
    );
  }
  
  return adjustedRadius;
};

export const constrainMovementToRadius = (
  currentPosition: Position,
  targetPosition: Position,
  proposedPosition: Position,
  role: Player['role'],
  isNeuralNetworkAdjustment: boolean = false,
  player?: Player,
  allPlayers?: Player[]
): Position => {
  // Add small randomization to radius limits (reduced from previous implementation)
  const baseMaxRadius = ROLE_RADIUS_LIMITS[role];
  const randomFactor = 1 + (Math.random() * 0.1 - 0.05); // ±5% randomization, reduced from ±10%
  
  // Less freedom for forwards in attacking position
  const isForwardInAttackingPosition = role === 'forward' && 
    ((currentPosition.x > 500 && proposedPosition.x > 450) || 
     (currentPosition.x < 300 && proposedPosition.x < 350));
  
  // Minimal extra radius for neural network adjustments
  const extraRadius = isNeuralNetworkAdjustment ? NEURAL_ADJUSTMENT_RADIUS : 0;
  
  // Tighter radius constraints overall
  let maxRadius = isForwardInAttackingPosition 
    ? (baseMaxRadius * 1.15 * randomFactor) + extraRadius // Reduced from 1.3
    : (baseMaxRadius * randomFactor) + extraRadius;
  
  // Apply ELO-based radius adjustment if player and allPlayers are provided
  if (player && allPlayers) {
    maxRadius = applyEloRadiusAdjustment(maxRadius, player, allPlayers);
  }
  
  // Calculate distance from tactical position
  const distanceFromTarget = calculateDistance(proposedPosition, targetPosition);
  
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

// Calculate the quality of a passing lane between two positions
export const isPassingLaneOpen = (
  requester: Position,
  passer: Position,
  allPlayers: Player[]
): number => {
  const passingVector = {
    x: requester.x - passer.x,
    y: requester.y - passer.y
  };
  
  const distance = calculateDistance(requester, passer);
  
  // Skip if positions are the same to prevent division by zero
  if (distance < 1) return 0;
  
  const passingAngle = Math.atan2(passingVector.y, passingVector.x);
  
  // Calculate a passing lane quality score (0-1)
  let laneQuality = 1.0;
  
  // Check for obstacles in the passing lane
  for (const player of allPlayers) {
    // Skip if player position is not defined
    if (!player.position) continue;
    
    // Skip the passer
    if (player.position.x === passer.x && player.position.y === passer.y) continue;
    
    // Skip the requester
    if (player.position.x === requester.x && player.position.y === requester.y) continue;
    
    // Calculate vector from passer to this player
    const toPlayerVector = {
      x: player.position.x - passer.x,
      y: player.position.y - passer.y
    };
    
    const playerDistance = calculateDistance(passer, player.position);
    
    // If this player is further than the requester, they aren't in the way
    if (playerDistance > distance) continue;
    
    // Calculate angle to this player
    const playerAngle = Math.atan2(toPlayerVector.y, toPlayerVector.x);
    
    // Calculate angular difference (how directly in the path they are)
    let angleDiff = Math.abs(passingAngle - playerAngle);
    // Ensure we get the smallest angle difference
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    // If player is close to passing lane, reduce quality
    if (angleDiff < Math.PI / 4 && playerDistance < distance) {
      const blockFactor = 1 - (angleDiff / (Math.PI / 4));
      const distanceRatio = playerDistance / distance;
      
      // Players directly in path reduce quality more
      laneQuality *= (distanceRatio + (1 - blockFactor) * (1 - distanceRatio));
    }
  }
  
  return laneQuality;
};
