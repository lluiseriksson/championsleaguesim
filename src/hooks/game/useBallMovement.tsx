
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

  // Create ELO advantage tracking for ball movement
  const eloFactorsRef = React.useRef({
    red: 1.0,
    blue: 1.0
  });

  // Update ELO factors when players or multiplier changes
  React.useEffect(() => {
    if (players.length > 0 && eloAdvantageMultiplier > 1) {
      const redPlayers = players.filter(p => p.team === 'red');
      const bluePlayers = players.filter(p => p.team === 'blue');
      
      const redElo = redPlayers.length > 0 && redPlayers[0].teamElo ? redPlayers[0].teamElo : 2000;
      const blueElo = bluePlayers.length > 0 && bluePlayers[0].teamElo ? bluePlayers[0].teamElo : 2000;
      
      if (redElo > blueElo) {
        eloFactorsRef.current = {
          red: eloAdvantageMultiplier,
          blue: 1.0
        };
      } else if (blueElo > redElo) {
        eloFactorsRef.current = {
          red: 1.0,
          blue: eloAdvantageMultiplier
        };
      } else {
        eloFactorsRef.current = {
          red: 1.0,
          blue: 1.0
        };
      }
      
      console.log(`ELO advantage factors updated - Red: ${eloFactorsRef.current.red.toFixed(2)}, Blue: ${eloFactorsRef.current.blue.toFixed(2)}`);
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
        // Apply ELO advantage to player movement
        const eloFactor = player.team === 'red' ? eloFactorsRef.current.red : eloFactorsRef.current.blue;
        
        // Apply position constraints based on role with ELO factor
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
        
        // Apply ELO advantage to movement speed if team has an advantage
        if (eloFactor > 1.0) {
          // Move faster toward target based on ELO advantage
          const speedBoost = Math.min(1.5, eloFactor);
          const dx = player.targetPosition.x - player.position.x;
          const dy = player.targetPosition.y - player.position.y;
          
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const moveSpeed = Math.min(distance, 2 * speedBoost); // Boost movement speed
            
            if (distance > 0) {
              finalPosition.x += (dx / distance) * moveSpeed * 0.2;
              finalPosition.y += (dy / distance) * moveSpeed * 0.2;
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

      // Pass ELO factors to handleBallPhysics for advantaged collision handling
      const ballAfterPhysics = handleBallPhysics(
        currentBall,
        newPosition,
        goalkeepers,
        fieldPlayers,
        onBallTouch,
        lastCollisionTimeRef,
        lastKickPositionRef,
        eloFactorsRef.current // Pass ELO advantage factors
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
