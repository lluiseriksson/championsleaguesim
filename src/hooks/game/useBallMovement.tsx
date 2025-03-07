import React from 'react';
import { Player, Ball, Position, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { handleBallPhysics } from './useBallPhysics';
import { useBallCollisionTracking } from './useBallCollisionTracking';
import { useBallGoalDetection } from './useBallGoalDetection';
import { 
  checkBallStuckInPlace, 
  applyRandomKick, 
  calculateBallSpeed 
} from './useBallInitialization';
import { forcePositionWithinRadiusBounds } from '../../utils/movementConstraints';

const FIELD_PADDING = {
  x: 12, // Minimum padding from edge of field
  goalX: 12, // Increased from 8 to 12 - Minimum distance from goal line (to prevent goalkeepers inside goals)
  y: 12  // Minimum padding from top/bottom edge
};

interface BallMovementProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
  tournamentMode?: boolean;
  eloAdvantageMultiplier?: number;
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch,
  tournamentMode = false,
  eloAdvantageMultiplier = 1.0
}: BallMovementProps) => {
  const { goalkeepers, fieldPlayers } = React.useMemo(() => ({
    goalkeepers: players.filter(p => p.role === 'goalkeeper'),
    fieldPlayers: players.filter(p => p.role !== 'goalkeeper')
  }), [players]);

  const { 
    lastCollisionTimeRef, 
    lastKickPositionRef, 
    noMovementTimeRef, 
    lastPositionRef 
  } = useBallCollisionTracking();
  
  const { handleGoalCheck } = useBallGoalDetection({ checkGoal, tournamentMode });

  const previousBallPositionRef = React.useRef<Position>({ ...ball.position });

  const updateBallPosition = React.useCallback(() => {
    setTimeout(() => {
      players.forEach(player => {
        // Apply position constraints based on role
        const fixedPosition = forcePositionWithinRadiusBounds(
          player.position,
          player.targetPosition,
          player.role,
          true
        );
        
        let finalPosition = {...fixedPosition};
        
        // Enhanced goalkeeper constraints to ensure they stay visible and not in goals
        if (player.role === 'goalkeeper') {
          if (finalPosition.x < FIELD_PADDING.goalX) {
            finalPosition.x = FIELD_PADDING.goalX;
          } else if (finalPosition.x > PITCH_WIDTH - FIELD_PADDING.goalX) {
            finalPosition.x = PITCH_WIDTH - FIELD_PADDING.goalX;
          }
        }
        
        if (finalPosition.x !== player.position.x || finalPosition.y !== player.position.y) {
          player.position = finalPosition;
        }
      });
    }, 0);
    
    setBall(currentBall => {
      const previousPosition = { ...currentBall.position };
      
      const currentSpeed = calculateBallSpeed(currentBall.velocity);
      
      const isStuck = checkBallStuckInPlace(
        currentBall.position, 
        lastPositionRef.current, 
        noMovementTimeRef
      );
      
      lastPositionRef.current = { ...currentBall.position };
      
      if (isStuck) {
        const kickedBall = applyRandomKick(currentBall, tournamentMode);
        return {
          ...kickedBall,
          previousPosition: previousPosition
        };
      }
      
      if (currentSpeed === 0) {
        const kickedBall = applyRandomKick(currentBall, tournamentMode);
        return {
          ...kickedBall,
          previousPosition: previousPosition
        };
      }
      
      const newPosition = {
        x: currentBall.position.x + currentBall.velocity.x,
        y: currentBall.position.y + currentBall.velocity.y
      };

      const { goalScored, updatedBall: ballAfterGoalCheck } = handleGoalCheck(currentBall, newPosition);
      if (goalScored) {
        return {
          ...ballAfterGoalCheck,
          previousPosition: previousPosition
        };
      }

      const ballAfterPhysics = handleBallPhysics(
        currentBall,
        newPosition,
        goalkeepers,
        fieldPlayers,
        onBallTouch,
        lastCollisionTimeRef,
        lastKickPositionRef
      );

      return {
        ...ballAfterPhysics,
        previousPosition: previousPosition
      };
    });
  }, [
    setBall, 
    goalkeepers, 
    fieldPlayers, 
    onBallTouch, 
    tournamentMode, 
    handleGoalCheck,
    players
  ]);

  return { updateBallPosition };
};
