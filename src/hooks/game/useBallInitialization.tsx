import React from 'react';
import { Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, Player } from '../../types/football';

// Helper to check if the ball is stuck in the same position
export const checkBallStuckInPlace = (
  currentPosition: Position,
  lastPosition: Position | null,
  noMovementTimeRef: React.MutableRefObject<number>
): boolean => {
  if (!lastPosition) return false;
  
  const dx = currentPosition.x - lastPosition.x;
  const dy = currentPosition.y - lastPosition.y;
  const positionDelta = Math.sqrt(dx * dx + dy * dy);
  
  if (positionDelta < 0.1) {
    noMovementTimeRef.current += 1;
    return noMovementTimeRef.current > 20;
  } else {
    noMovementTimeRef.current = 0;
    return false;
  }
};

// Helper to check if a velocity vector would direct the ball toward a goal
const isPointingTowardGoal = (position: Position, velocity: Position): boolean => {
  const leftGoalX = 0;
  const rightGoalX = PITCH_WIDTH;
  const goalY = PITCH_HEIGHT / 2;
  
  if (velocity.x < 0) {
    const angleToLeftGoal = Math.atan2(goalY - position.y, leftGoalX - position.x);
    const kickAngle = Math.atan2(velocity.y, velocity.x);
    const angleDifference = Math.abs(angleToLeftGoal - kickAngle);
    
    if (angleDifference < Math.PI / 8) {
      return true;
    }
  }
  
  if (velocity.x > 0) {
    const angleToRightGoal = Math.atan2(goalY - position.y, rightGoalX - position.x);
    const kickAngle = Math.atan2(velocity.y, velocity.x);
    const angleDifference = Math.abs(angleToRightGoal - kickAngle);
    
    if (angleDifference < Math.PI / 8) {
      return true;
    }
  }
  
  return false;
};

// Create a player F for random kicks
export const createPlayerF = (
  ballPosition: Position, 
  teamOverride?: 'red' | 'blue',
  isKickoff: boolean = false
): Player => {
  // For kickoff, position F in the center of the field
  // Otherwise, position F near the ball
  const position = isKickoff 
    ? { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 } 
    : {
        x: ballPosition.x + (Math.random() * 20) - 10,
        y: ballPosition.y + (Math.random() * 20) - 10
      };
  
  // Use the team override if provided, otherwise randomly assign a team
  const team = teamOverride || (Math.random() > 0.5 ? 'red' : 'blue');
  
  return {
    id: 99,
    position: position,
    velocity: { x: 0, y: 0 },
    team: team,
    kit: 'default',
    role: 'midfielder',
    radius: 15,
    brain: null,
    force: { x: 0, y: 0 },
    name: 'F',
    goals: 0,
    assists: 0,
    isVirtual: true,
    targetPosition: position // Use the same position as targetPosition
  };
};

// Apply a random kick to the ball while avoiding direct goal paths
export const applyRandomKick = (
  currentBall: Ball, 
  tournamentMode: boolean, 
  onBallTouch?: (player: Player) => void,
  kickingTeam?: 'red' | 'blue', // Add parameter for the team that should kick
  isKickoff: boolean = false // Add parameter to indicate if this is a kickoff
): Ball => {
  if (!tournamentMode) {
    console.log(`${isKickoff ? "Kickoff" : "Ball stuck in place or zero velocity"}, giving it a random kick from player F`);
  }
  
  const playerF = createPlayerF(currentBall.position, kickingTeam, isKickoff);
  
  if (onBallTouch) {
    onBallTouch(playerF);
  }
  
  let newVelocity = {
    x: (Math.random() * 7.2) - 3.6,
    y: (Math.random() * 7.2) - 3.6
  };
  
  let attempts = 0;
  while (isPointingTowardGoal(currentBall.position, newVelocity) && attempts < 5) {
    newVelocity = {
      x: (Math.random() * 7.2) - 3.6,
      y: (Math.random() * 7.2) - 3.6
    };
    attempts++;
  }
  
  if (isPointingTowardGoal(currentBall.position, newVelocity)) {
    newVelocity.y = (Math.random() * 3) - 1.5;
    const moveTowardCenter = currentBall.position.x < PITCH_WIDTH / 2 ? 1 : -1;
    newVelocity.x = Math.abs(newVelocity.x) * moveTowardCenter;
  }
  
  return {
    ...currentBall,
    position: currentBall.position,
    velocity: newVelocity,
    lastKickBy: playerF
  };
};

// Check current ball speed
export const calculateBallSpeed = (velocity: Position): number => {
  return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
};
