
import React from 'react';
import { Ball, Player, Position, BALL_RADIUS } from '../../types/football';
import { calculateDistance } from '../../utils/neuralCore';
import { 
  simulateBounce,
  calculateRebound,
  updatePosition,
  checkBoundaryCollision,
} from '../../utils/gamePhysics';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal?: (position: Position) => 'red' | 'blue' | null;
  onBallTouch?: (player: Player) => void;
  tournamentMode?: boolean;
  onAction?: (player: Player, actionType: string, success: boolean) => void;
}

export const useBallMovement = ({ 
  ball, 
  setBall, 
  players,
  checkGoal,
  onBallTouch,
  tournamentMode = false,
  onAction
}: BallMovementSystemProps) => {
  const handlePlayerBallCollision = React.useCallback((player: Player) => {
    setBall(prevBall => {
      const collisionVector = {
        x: prevBall.position.x - player.position.x,
        y: prevBall.position.y - player.position.y
      };
      
      const distance = Math.sqrt(
        collisionVector.x * collisionVector.x + 
        collisionVector.y * collisionVector.y
      );
      
      if (distance === 0) return prevBall;
      
      const normalizedCollision = {
        x: collisionVector.x / distance,
        y: collisionVector.y / distance
      };
      
      let impactStrength = 2;
      
      if (player.role === 'goalkeeper') {
        impactStrength = 3.0;
      } else {
        if (player.role === 'defender') {
          impactStrength = 2.5;
        } else if (player.role === 'midfielder') {
          impactStrength = 2.2;
        } else if (player.role === 'forward') {
          impactStrength = 2.0;
        }
      }
      
      const playerVelocity = { x: 0, y: 0 };
      
      const newVelocity = {
        x: normalizedCollision.x * impactStrength + playerVelocity.x * 0.3,
        y: normalizedCollision.y * impactStrength + playerVelocity.y * 0.3
      };
      
      const separationDistance = player.radius + BALL_RADIUS;
      const newPosition = {
        x: player.position.x + normalizedCollision.x * separationDistance,
        y: player.position.y + normalizedCollision.y * separationDistance
      };
      
      if (onBallTouch) {
        onBallTouch(player);
      }
      
      if (onAction) {
        onAction(player, 'ballTouch', true);
      }
      
      return {
        ...prevBall,
        position: newPosition,
        velocity: newVelocity,
        lastTouchedBy: player.id
      };
    });
  }, [setBall, onBallTouch, onAction]);
  
  const detectCollisions = React.useCallback(() => {
    players.forEach(player => {
      const distance = calculateDistance(
        player.position.x,
        player.position.y,
        ball.position.x,
        ball.position.y
      );
      
      const collisionThreshold = player.radius + BALL_RADIUS;
      
      if (distance < collisionThreshold) {
        handlePlayerBallCollision(player);
      }
    });
  }, [players, ball, handlePlayerBallCollision]);
  
  const updateBallPosition = React.useCallback(() => {
    setBall(prevBall => {
      const friction = 0.98;
      
      const newVelocity = {
        x: prevBall.velocity.x * friction,
        y: prevBall.velocity.y * friction
      };
      
      const newPosition = {
        x: prevBall.position.x + newVelocity.x,
        y: prevBall.position.y + newVelocity.y
      };
      
      if (checkGoal) {
        const scoringTeam = checkGoal(newPosition);
        if (scoringTeam) {
          return prevBall;
        }
      }
      
      // Fixed: Passing only position and velocity to checkBoundaryCollision,
      // and BALL_RADIUS as it's needed by the function
      const { position: boundedPosition, velocity: boundedVelocity } = 
        checkBoundaryCollision(newPosition, newVelocity, BALL_RADIUS);
      
      return {
        ...prevBall,
        position: boundedPosition,
        velocity: boundedVelocity
      };
    });
  }, [setBall, checkGoal]);
  
  const handleBallPhysics = React.useCallback(() => {
    detectCollisions();
    updateBallPosition();
  }, [detectCollisions, updateBallPosition]);
  
  return {
    detectCollisions,
    handlePlayerBallCollision,
    updateBallPosition,
    handleBallPhysics
  };
};

export const useBallMovementSystem = useBallMovement;

export default useBallMovement;
