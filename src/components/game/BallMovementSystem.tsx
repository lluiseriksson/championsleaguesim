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
  // Function to handle collision between player and ball
  const handlePlayerBallCollision = React.useCallback((player: Player) => {
    setBall(prevBall => {
      // Calculate collision vector (direction from player to ball)
      const collisionVector = {
        x: prevBall.position.x - player.position.x,
        y: prevBall.position.y - player.position.y
      };
      
      // Normalize collision vector
      const distance = Math.sqrt(
        collisionVector.x * collisionVector.x + 
        collisionVector.y * collisionVector.y
      );
      
      if (distance === 0) return prevBall; // Avoid division by zero
      
      const normalizedCollision = {
        x: collisionVector.x / distance,
        y: collisionVector.y / distance
      };
      
      // Calculate player's impact on ball based on player attributes
      let impactStrength = 2; // Base impact strength
      
      // Adjust impact based on player role
      if (player.role === 'goalkeeper') {
        // Goalkeepers have stronger impact
        impactStrength = 3.0;
      } else {
        // Non-goalkeeper players have different impact strengths
        if (player.role === 'defender') {
          impactStrength = 2.5;
        } else if (player.role === 'midfielder') {
          impactStrength = 2.2;
        } else if (player.role === 'forward') {
          impactStrength = 2.0;
        }
      }
      
      // Calculate new velocity based on collision
      const playerVelocity = { x: 0, y: 0 }; // Players don't have velocity property
      
      const newVelocity = {
        x: normalizedCollision.x * impactStrength + playerVelocity.x * 0.3,
        y: normalizedCollision.y * impactStrength + playerVelocity.y * 0.3
      };
      
      // Ensure minimum separation to prevent sticking
      const separationDistance = player.radius + BALL_RADIUS;
      const newPosition = {
        x: player.position.x + normalizedCollision.x * separationDistance,
        y: player.position.y + normalizedCollision.y * separationDistance
      };
      
      // Call onBallTouch if provided
      if (onBallTouch) {
        onBallTouch(player);
      }
      
      // Record action if onAction callback is provided
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
  
  // Function to detect collisions between ball and players
  const detectCollisions = React.useCallback(() => {
    players.forEach(player => {
      // Calculate distance between player and ball
      const distance = calculateDistance(
        player.position.x,
        player.position.y,
        ball.position.x,
        ball.position.y
      );
      
      // Player radius + ball radius = collision threshold
      const collisionThreshold = player.radius + BALL_RADIUS;
      
      // Check if collision occurred
      if (distance < collisionThreshold) {
        handlePlayerBallCollision(player);
      }
    });
  }, [players, ball, handlePlayerBallCollision]);
  
  // Function to update ball position based on velocity
  const updateBallPosition = React.useCallback(() => {
    setBall(prevBall => {
      // Apply friction to slow the ball down
      const friction = 0.98;
      
      // Calculate new velocity with friction
      const newVelocity = {
        x: prevBall.velocity.x * friction,
        y: prevBall.velocity.y * friction
      };
      
      // Calculate new position based on velocity
      const newPosition = {
        x: prevBall.position.x + newVelocity.x,
        y: prevBall.position.y + newVelocity.y
      };
      
      // Check for goal if checkGoal function is provided
      if (checkGoal) {
        const scoringTeam = checkGoal(newPosition);
        if (scoringTeam) {
          // If goal was scored, return the ball with updated position
          // The actual ball reset will be handled by the checkGoal callback
          return prevBall;
        }
      }
      
      // Check for boundary collisions (pitch edges)
      const { position: boundedPosition, velocity: boundedVelocity } = 
        checkBoundaryCollision(newPosition, newVelocity, BALL_RADIUS);
      
      // Return updated ball state
      return {
        ...prevBall,
        position: boundedPosition,
        velocity: boundedVelocity
      };
    });
  }, [setBall, checkGoal]);
  
  // Main function to handle all ball physics in each frame
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

// Export both names for backward compatibility
export const useBallMovementSystem = useBallMovement;

export default useBallMovement;
