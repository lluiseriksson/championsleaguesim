
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

  const eloFactorsRef = React.useRef({
    red: 1.0,
    blue: 1.0
  });

  React.useEffect(() => {
    if (players.length > 0 && eloAdvantageMultiplier > 1) {
      const redPlayers = players.filter(p => p.team === 'red');
      const bluePlayers = players.filter(p => p.team === 'blue');
      
      const redElo = redPlayers.length > 0 && redPlayers[0].teamElo ? redPlayers[0].teamElo : 2000;
      const blueElo = bluePlayers.length > 0 && bluePlayers[0].teamElo ? bluePlayers[0].teamElo : 2000;
      
      // DRASTIC IMPROVEMENT: Increase ELO advantage multiplier significantly
      // Calculate a much more dramatic advantage based on ELO difference
      const eloDifference = Math.abs(redElo - blueElo);
      const dramaticMultiplier = Math.min(4.0, 1.0 + (eloDifference / 400)); // Much stronger scaling
      
      if (redElo > blueElo) {
        eloFactorsRef.current = {
          red: dramaticMultiplier,
          blue: 1.0 / Math.sqrt(dramaticMultiplier) // Disadvantage the lower ELO team
        };
      } else if (blueElo > redElo) {
        eloFactorsRef.current = {
          red: 1.0 / Math.sqrt(dramaticMultiplier), // Disadvantage the lower ELO team
          blue: dramaticMultiplier
        };
      } else {
        eloFactorsRef.current = {
          red: 1.0,
          blue: 1.0
        };
      }
      
      console.log(`DRAMATIC ELO advantage factors updated - Red: ${eloFactorsRef.current.red.toFixed(2)}, Blue: ${eloFactorsRef.current.blue.toFixed(2)}`);
    }
  }, [players, eloAdvantageMultiplier]);

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
        const eloFactor = player.team === 'red' ? eloFactorsRef.current.red : eloFactorsRef.current.blue;
        
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
        
        // DRASTIC IMPROVEMENT: Much stronger ELO-based movement advantages for field players
        if (player.role !== 'goalkeeper') {
          // Apply drastic speed and agility improvements based on ELO
          const speedBoost = eloFactor > 1.0 ? 
            Math.min(3.0, eloFactor * 1.8) : // Much higher max boost (3x instead of 1.5x)
            Math.max(0.6, eloFactor); // Low ELO teams move slower
            
          const dx = player.targetPosition.x - player.position.x;
          const dy = player.targetPosition.y - player.position.y;
          
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const moveSpeed = Math.min(distance, 4 * speedBoost); // Double base speed and apply boost
            
            if (distance > 0) {
              // Dramatically increase movement speed based on ELO
              finalPosition.x += (dx / distance) * moveSpeed * 0.25; // Increased from 0.2
              finalPosition.y += (dy / distance) * moveSpeed * 0.25; // Increased from 0.2
              
              // Add occasional "burst of speed" for high ELO teams
              if (eloFactor > 1.5 && Math.random() < 0.08) {
                finalPosition.x += (dx / distance) * moveSpeed * 0.15;
                finalPosition.y += (dy / distance) * moveSpeed * 0.15;
                console.log(`${player.team} player with high ELO advantage used speed burst!`);
              }
            }
          }
          
          // DRASTIC IMPROVEMENT: Better ball anticipation for high ELO teams
          // Players with high ELO will move toward where the ball is going to be
          if (eloFactor > 1.3 && ball.velocity.x !== 0 && ball.velocity.y !== 0) {
            const anticipationFactor = Math.min(0.8, (eloFactor - 1) * 0.6);
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
        eloFactorsRef.current
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
