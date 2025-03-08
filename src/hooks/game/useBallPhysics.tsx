
import { useCallback } from 'react';
import { Ball, Player, Position, BALL_RADIUS } from '../../types/football';
import { calculateDistance } from '../../utils/neuralCore';
import { 
  applyFriction,
  addRandomEffect,
  checkCollision,
  calculateNewVelocity,
  checkBoundaryCollision
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

      // Fixed: Call checkBoundaryCollision with the correct number of arguments
      const { position, velocity } = checkBoundaryCollision(
        newPosition, 
        prevBall.velocity,
        BALL_RADIUS
      );

      return {
        ...prevBall,
        position: position,
        velocity: velocity
      };
    });
  }, [setBall]);

  const handlePlayerBallCollision = useCallback((player: Player) => {
    setBall(prevBall => {
      const distance = calculateDistance(
        player.position.x,
        player.position.y,
        prevBall.position.x,
        prevBall.position.y
      );
      
      if (distance <= player.radius + BALL_RADIUS) {
        const playerVelocity = { x: 0, y: 0 };
        const newVelocity = calculateNewVelocity(
          prevBall.position,
          player.position,
          prevBall.velocity,
          player.role === 'goalkeeper'
        );
        
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
      const distance = calculateDistance(
        player.position.x,
        player.position.y,
        ball.position.x,
        ball.position.y
      );
      
      if (distance <= player.radius + BALL_RADIUS) {
        handlePlayerBallCollision(player);
      }
    });
  }, [players, ball, handlePlayerBallCollision]);

  const handleBallPhysics = useCallback((
    currentBall: Ball,
    newPosition: Position,
    goalkeepers: Player[],
    fieldPlayers: Player[],
    onBallTouch: (player: Player) => void,
    lastCollisionTimeRef: React.MutableRefObject<number>,
    lastKickPositionRef: React.MutableRefObject<Position>
  ) => {
    const newVelocity = applyFriction(currentBall.velocity, 0.98);
    
    let collidedWithPlayer = false;
    let updatedVelocity = { ...newVelocity };
    let updatedPosition = { ...newPosition };
    
    for (const player of [...goalkeepers, ...fieldPlayers]) {
      if (checkCollision(newPosition, player.position, player.role === 'goalkeeper', player.radius)) {
        collidedWithPlayer = true;
        onBallTouch(player);
        
        updatedVelocity = calculateNewVelocity(
          newPosition,
          player.position,
          newVelocity,
          player.role === 'goalkeeper'
        );
        
        const dx = newPosition.x - player.position.x;
        const dy = newPosition.y - player.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          const nx = dx / distance;
          const ny = dy / distance;
          const minDistance = player.radius + BALL_RADIUS + 1;
          
          updatedPosition = {
            x: player.position.x + nx * minDistance,
            y: player.position.y + ny * minDistance
          };
        }
        
        lastCollisionTimeRef.current = Date.now();
        lastKickPositionRef.current = { ...updatedPosition };
        
        break;
      }
    }
    
    if (!collidedWithPlayer) {
      // Fixed: Call checkBoundaryCollision with the correct number of arguments
      const boundary = checkBoundaryCollision(updatedPosition, updatedVelocity, BALL_RADIUS);
      updatedPosition = boundary.position;
      updatedVelocity = boundary.velocity;
    }
    
    return {
      ...currentBall,
      position: updatedPosition,
      velocity: updatedVelocity
    };
  }, []);

  return {
    detectCollisions,
    handlePlayerBallCollision,
    updateBallPhysics: updateBallPosition,
    handleBallPhysics
  };
};

export default useBallPhysics;
