import { useCallback } from 'react';
import { Ball, Player, Position, BALL_RADIUS } from '../../types/football';
import { calculateDistance } from '../../utils/neuralCore';
import { 
  simulateBounce,
  calculateRebound,
  updatePosition,
  checkBoundaryCollision,
} from '../../utils/gamePhysics';

interface BallPhysicsProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
}

export const useBallPhysics = ({ ball, setBall, players }: BallPhysicsProps) => {
  const updateBallPosition = useCallback(() => {
    setBall(prevBall => {
      let newPosition = {
        x: prevBall.position.x + prevBall.velocity.x,
        y: prevBall.position.y + prevBall.velocity.y
      };

      // Check for collisions with the boundaries
      const { x, y, velocityX, velocityY } = checkBoundaryCollision(
        newPosition.x, 
        newPosition.y, 
        prevBall.velocity.x, 
        prevBall.velocity.y,
        BALL_RADIUS, // Ball radius
        800, // Pitch width
        600  // Pitch height
      );

      newPosition = { x, y };

      return {
        ...prevBall,
        position: newPosition,
        velocity: { x: velocityX, y: velocityY }
      };
    });
  }, [setBall]);

  const handlePlayerBallCollision = useCallback((player: Player) => {
    setBall(prevBall => {
      const distance = calculateDistance(player.position, prevBall.position);
      if (distance <= player.size + BALL_RADIUS) {
        const newVelocity = calculateRebound(player.position, player.velocity, prevBall.position, prevBall.velocity);
        return {
          ...prevBall,
          velocity: newVelocity
        };
      }
      return prevBall;
    });
  }, [setBall]);

  const detectCollisions = useCallback(() => {
    players.forEach(player => {
      const distance = calculateDistance(player.position, ball.position);
      if (distance <= player.size + BALL_RADIUS) {
        handlePlayerBallCollision(player);
      }
    });
  }, [players, ball, handlePlayerBallCollision]);

  // Add the handleBallPhysics function to fix the import error
  const handleBallPhysics = useCallback(() => {
    detectCollisions();
    updateBallPosition();
  }, [detectCollisions, updateBallPosition]);

  return {
    detectCollisions,
    handlePlayerBallCollision,
    updateBallPhysics: updateBallPosition,
    handleBallPhysics // Export the function
  };
};

// Export the handleBallPhysics function to fix the import error in useBallMovement.tsx
export { useBallPhysics };
