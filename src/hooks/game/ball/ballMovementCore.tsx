import React from 'react';
import { Player, Ball, Position } from '../../../types/football';
import { handleBallPhysics } from '../ballPhysicsUtils';
import { useBallStuckHandler } from './ballStuckHandler';
import { useBallCollisionTracker } from './ballCollisionTracker';
import { useOffsideHandler } from '../offside/offsideHandling';

interface BallMovementCoreProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  goalkeepers: Player[];
  fieldPlayers: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
}

export function useBallMovementCore({
  ball,
  setBall,
  players,
  goalkeepers,
  fieldPlayers,
  checkGoal,
  onBallTouch
}: BallMovementCoreProps) {
  // Ball stuck detection
  const { lastKickPositionRef, checkBallStuck, getRandomKickVelocity } = useBallStuckHandler();
  
  // Ball collision tracking
  const { lastCollisionTimeRef, lastTouchTeamRef, updateLastTouchTeam } = useBallCollisionTracker();
  
  // Offside handling
  const { 
    offsideDetectedRef, 
    freeKickInProgressRef, 
    freeKickTeamRef,
    freeKickPositionRef,
    freeKickTimeoutRef,
    checkOffsidePosition 
  } = useOffsideHandler({ setBall });

  // Main ball update function
  const updateBallPosition = React.useCallback(() => {
    // If a free kick is in progress, only allow the correct team to move the ball
    if (freeKickInProgressRef.current) {
      setBall(currentBall => {
        // Keep the ball stationary during free kick setup
        return {
          ...currentBall,
          position: freeKickPositionRef.current || currentBall.position,
          velocity: { x: 0, y: 0 }
        };
      });
      return;
    }
    
    setBall(currentBall => {
      // Check current ball speed
      const currentSpeed = Math.sqrt(
        currentBall.velocity.x * currentBall.velocity.x + 
        currentBall.velocity.y * currentBall.velocity.y
      );
      
      // Detect if ball is stuck in same position
      if (checkBallStuck(currentBall.position)) {
        return {
          ...currentBall,
          position: currentBall.position,
          velocity: getRandomKickVelocity()
        };
      }
      
      // If ball has zero velocity (should only happen at game start/reset),
      // give it a small push in a random direction
      if (currentSpeed === 0) {
        console.log("Ball has zero velocity, giving it an initial push");
        return {
          ...currentBall,
          position: currentBall.position,
          velocity: getRandomKickVelocity()
        };
      }
      
      // Calculate new position based on current velocity
      const newPosition = {
        x: currentBall.position.x + currentBall.velocity.x,
        y: currentBall.position.y + currentBall.velocity.y
      };

      // First check if a goal was scored
      const goalScored = checkGoal(newPosition);
      if (goalScored) {
        console.log(`Goal detected for team ${goalScored}`);
        // Reset offside state when a goal is scored
        offsideDetectedRef.current = false;
        if (freeKickTimeoutRef.current) {
          clearTimeout(freeKickTimeoutRef.current);
          freeKickTimeoutRef.current = null;
        }
        freeKickInProgressRef.current = false;
        
        // Reset ball position to center with a significant initial velocity
        return {
          ...currentBall,
          position: { x: 800 / 2, y: 500 / 2 },
          velocity: { 
            x: goalScored === 'red' ? 5 : -5, 
            y: (Math.random() - 0.5) * 5
          },
          bounceDetection: {
            consecutiveBounces: 0,
            lastBounceTime: 0,
            lastBounceSide: '',
            sideEffect: false
          }
        };
      }

      // Handle ball physics, with tracking of team touches and offside detection
      return handleBallPhysics(
        currentBall,
        newPosition,
        goalkeepers,
        fieldPlayers,
        (player) => {
          // If offside is currently active, only allow the correct team to touch the ball
          if (freeKickInProgressRef.current) {
            // If the touching player belongs to the team that gets the free kick, execute it
            if (player.team === freeKickTeamRef.current) {
              console.log(`Free kick being taken by ${player.team} player #${player.id}`);
              freeKickInProgressRef.current = false;
              
              // Clear any pending auto-execution
              if (freeKickTimeoutRef.current) {
                clearTimeout(freeKickTimeoutRef.current);
                freeKickTimeoutRef.current = null;
              }
              
              // Reset offside after a short delay
              setTimeout(() => {
                offsideDetectedRef.current = false;
              }, 500);
            } else {
              // If wrong team touches the ball during free kick, prevent it (by returning same ball)
              console.log(`Wrong team touched the ball during free kick! Player: ${player.team} #${player.id}`);
              return currentBall;
            }
          }
          
          // Skip offside checks during active offside situation
          if (offsideDetectedRef.current) {
            // Just register the touch and continue
            onBallTouch(player);
            return;
          }
          
          // Save the team that touched the ball
          updateLastTouchTeam(player);
          
          // Check for offside
          const isOffside = checkOffsidePosition(player, players, currentBall.position);
          if (isOffside) return; // Ball position will be set by executeOffisideFreeKick
          
          // If no offside, register the normal touch
          onBallTouch(player);
        },
        lastCollisionTimeRef,
        lastKickPositionRef
      );
    });
  }, [
    setBall, 
    checkGoal, 
    goalkeepers, 
    fieldPlayers, 
    onBallTouch, 
    players, 
    checkBallStuck, 
    getRandomKickVelocity, 
    updateLastTouchTeam, 
    checkOffsidePosition, 
    freeKickInProgressRef, 
    freeKickPositionRef, 
    freeKickTeamRef, 
    freeKickTimeoutRef, 
    offsideDetectedRef, 
    lastCollisionTimeRef, 
    lastKickPositionRef
  ]);

  return { updateBallPosition };
}
