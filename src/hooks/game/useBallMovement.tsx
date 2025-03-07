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
import { calculatePlayerAdvantage } from '../../utils/eloAdvantageSystem';

const FIELD_PADDING = {
  x: 12, // Minimum padding from edge of field
  goalX: 15, // Increased from 12 to 15 - Minimum distance from goal line
  y: 12  // Minimum padding from top/bottom edge
};

const MAX_GOALKEEPER_DISTANCE = 35; // New strict maximum

interface BallMovementProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
  tournamentMode?: boolean;
  teamAdvantageFactors?: { red: number, blue: number };
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players, 
  checkGoal, 
  onBallTouch,
  tournamentMode = false,
  teamAdvantageFactors = { red: 1.0, blue: 1.0 }
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
        // Get team advantage factor
        const teamAdvantage = player.team === 'red' ? 
          teamAdvantageFactors.red : 
          teamAdvantageFactors.blue;
        
        // Calculate player-specific advantage
        const playerAdvantage = calculatePlayerAdvantage(player, teamAdvantage);
        
        const fixedPosition = forcePositionWithinRadiusBounds(
          player.position,
          player.targetPosition,
          player.role,
          true
        );
        
        let finalPosition = {...fixedPosition};
        
        if (player.role === 'goalkeeper') {
          const isLeftSide = player.team === 'red';
          const goalLine = isLeftSide ? 30 : PITCH_WIDTH - 30;
          
          if (isLeftSide) {
            if (finalPosition.x > goalLine + MAX_GOALKEEPER_DISTANCE) {
              finalPosition.x = goalLine + MAX_GOALKEEPER_DISTANCE;
            }
            if (finalPosition.x < FIELD_PADDING.goalX) {
              finalPosition.x = FIELD_PADDING.goalX;
            }
          } else {
            if (finalPosition.x < goalLine - MAX_GOALKEEPER_DISTANCE) {
              finalPosition.x = goalLine - MAX_GOALKEEPER_DISTANCE;
            }
            if (finalPosition.x > PITCH_WIDTH - FIELD_PADDING.goalX) {
              finalPosition.x = PITCH_WIDTH - FIELD_PADDING.goalX;
            }
          }
          
          const goalCenterY = PITCH_HEIGHT / 2;
          const maxVerticalDistance = 60;
          
          finalPosition.y = Math.max(
            goalCenterY - maxVerticalDistance, 
            Math.min(goalCenterY + maxVerticalDistance, finalPosition.y)
          );
          
          if (finalPosition.x !== fixedPosition.x || finalPosition.y !== fixedPosition.y) {
            console.log(`GK ${player.team}: POSITION CONSTRAINED from (${fixedPosition.x.toFixed(1)},${fixedPosition.y.toFixed(1)}) to (${finalPosition.x.toFixed(1)},${finalPosition.y.toFixed(1)})`);
          }
        }
        
        // Apply standardized advantage-based movement improvements for field players
        if (player.role !== 'goalkeeper') {
          // Apply speed improvements based on player advantage
          const speedBoost = playerAdvantage > 1.0 ? 
            Math.min(2.5, playerAdvantage * 1.5) : // Decreased from 3.0 (less extreme)
            Math.max(0.7, playerAdvantage); // Increased min from 0.6 to 0.7
            
          const dx = player.targetPosition.x - player.position.x;
          const dy = player.targetPosition.y - player.position.y;
          
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const moveSpeed = Math.min(distance, 3.5 * speedBoost); // Slightly reduced from 4
            
            if (distance > 0) {
              // Apply movement speed based on advantage
              finalPosition.x += (dx / distance) * moveSpeed * 0.25;
              finalPosition.y += (dy / distance) * moveSpeed * 0.25;
              
              // Add occasional "burst of speed" for high advantage teams
              if (playerAdvantage > 1.5 && Math.random() < 0.08) {
                finalPosition.x += (dx / distance) * moveSpeed * 0.15;
                finalPosition.y += (dy / distance) * moveSpeed * 0.15;
                console.log(`${player.team} player with high advantage used speed burst!`);
              }
            }
          }
          
          // Better ball anticipation for high advantage teams
          if (playerAdvantage > 1.3 && ball.velocity.x !== 0 && ball.velocity.y !== 0) {
            const anticipationFactor = Math.min(0.8, (playerAdvantage - 1) * 0.6);
            const predictedBallX = ball.position.x + ball.velocity.x * 4 * anticipationFactor;
            const predictedBallY = ball.position.y + ball.velocity.y * 4 * anticipationFactor;
            
            // Move slightly toward the predicted ball position
            const toBallDx = predictedBallX - player.position.x;
            const toBallDy = predictedBallY - player.position.y;
            const ballDist = Math.sqrt(toBallDx * toBallDx + toBallDy * toBallDy);
            
            if (ballDist > 0 && ballDist < 200) {
              finalPosition.x += (toBallDx / ballDist) * 1.2 * anticipationFactor;
              finalPosition.y += (toBallDy / ballDist) * 1.2 * anticipationFactor;
            }
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
        lastKickPositionRef,
        teamAdvantageFactors
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
    players,
    teamAdvantageFactors
  ]);

  return { updateBallPosition };
};
