
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
  gameEnded?: boolean;
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch,
  tournamentMode = false,
  gameEnded = false
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
  const { handleGoalCheck } = useBallGoalDetection({ 
    checkGoal, 
    tournamentMode,
    onBallTouch 
  });

  // Reference to store previous ball position for tracking
  const previousBallPositionRef = React.useRef<Position>({ ...ball.position });
  
  // Reference for max velocity to limit ball speed
  const maxBallVelocityRef = React.useRef<number>(21.5);

  // Log when gameEnded changes
  React.useEffect(() => {
    console.log(`useBallMovement - gameEnded changed to: ${gameEnded}`);
  }, [gameEnded]);

  const updateBallPosition = React.useCallback(() => {
    // IMPORTANT: Don't check gameEnded here to ensure ball still moves even if game is ended
    // We'll let the gameLoop handle stopping all movements instead
    
    setBall(currentBall => {
      // Store current position as previous before updating
      const previousPosition = { ...currentBall.position };
      
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
      
      // If ball is stuck, give it a random kick and simulate player touch
      if (isStuck) {
        const kickedBall = applyRandomKick(currentBall, tournamentMode, onBallTouch, undefined, false);
        return {
          ...kickedBall,
          previousPosition: previousPosition
        };
      }
      
      // If ball has zero velocity (should only happen at game start/reset),
      // give it a small push in a random direction
      if (currentSpeed === 0) {
        const kickedBall = applyRandomKick(currentBall, tournamentMode, onBallTouch, undefined, false);
        return {
          ...kickedBall,
          previousPosition: previousPosition
        };
      }
      
      // Ensure ball velocity doesn't exceed max speed
      let velocityX = currentBall.velocity.x;
      let velocityY = currentBall.velocity.y;
      const velocityMagnitude = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      
      if (velocityMagnitude > maxBallVelocityRef.current) {
        const scaleFactor = maxBallVelocityRef.current / velocityMagnitude;
        velocityX *= scaleFactor;
        velocityY *= scaleFactor;
      }
      
      // Calculate new position based on current velocity
      const newPosition = {
        x: currentBall.position.x + velocityX,
        y: currentBall.position.y + velocityY
      };

      // First check if a goal was scored
      const { goalScored, updatedBall: ballAfterGoalCheck } = handleGoalCheck(
        { ...currentBall, velocity: { x: velocityX, y: velocityY } }, 
        newPosition
      );
      
      if (goalScored) {
        return {
          ...ballAfterGoalCheck,
          previousPosition: previousPosition
        };
      }

      // Handle ball collisions and movement
      const ballAfterPhysics = handleBallPhysics(
        { ...currentBall, velocity: { x: velocityX, y: velocityY } },
        newPosition,
        goalkeepers,
        fieldPlayers,
        onBallTouch,
        lastCollisionTimeRef,
        lastKickPositionRef
      );

      // Add the previous position to the updated ball
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
    handleGoalCheck
  ]);  // Removed gameEnded from dependencies to ensure ball movement continues

  return { updateBallPosition };
};
