
import React from 'react';
import { Player, Ball, Position } from '../../types/football';
import { handleBallPhysics } from './useBallPhysics';
import { useBallCollisionTracking } from './useBallCollisionTracking';
import { useBallGoalDetection } from './useBallGoalDetection';
import { 
  checkBallStuckInPlace, 
  applyRandomKick, 
  calculateBallSpeed 
} from './useBallInitialization';

interface BallMovementProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
  tournamentMode?: boolean;
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch,
  tournamentMode = false
}: BallMovementProps) => {
  // Memoize player categorization
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  // Use collision tracking hook
  const { 
    lastCollisionTimeRef, 
    lastKickPositionRef, 
    noMovementTimeRef, 
    lastPositionRef 
  } = useBallCollisionTracking();
  
  // Use goal detection hook
  const { handleGoalCheck } = useBallGoalDetection({ checkGoal, tournamentMode });

  const updateBallPosition = React.useCallback(() => {
    setBall(currentBall => {
      // Check current ball speed
      const currentSpeed = calculateBallSpeed(currentBall.velocity);
      
      // Detect if ball is stuck in same position
      const isStuck = checkBallStuckInPlace(
        currentBall.position, 
        lastPositionRef.current, 
        noMovementTimeRef
      );
      
      // Update last position reference
      lastPositionRef.current = { ...currentBall.position };
      
      // If ball is stuck, give it a random kick
      if (isStuck) {
        return applyRandomKick(currentBall, tournamentMode);
      }
      
      // If ball has zero velocity (should only happen at game start/reset),
      // give it a small push in a random direction
      if (currentSpeed === 0) {
        return applyRandomKick(currentBall, tournamentMode);
      }
      
      // Calculate new position based on current velocity
      const newPosition = {
        x: currentBall.position.x + currentBall.velocity.x,
        y: currentBall.position.y + currentBall.velocity.y
      };

      // First check if a goal was scored
      const { goalScored, updatedBall } = handleGoalCheck(currentBall, newPosition);
      if (goalScored) {
        return updatedBall;
      }

      // Handle ball collisions and movement
      return handleBallPhysics(
        currentBall,
        newPosition,
        goalkeepers,
        fieldPlayers,
        onBallTouch,
        lastCollisionTimeRef,
        lastKickPositionRef
      );
    });
  }, [
    setBall, 
    goalkeepers, 
    fieldPlayers, 
    onBallTouch, 
    tournamentMode, 
    handleGoalCheck
  ]);

  return { updateBallPosition };
};
