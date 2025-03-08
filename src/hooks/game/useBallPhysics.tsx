import { useCallback } from 'react';
import { Ball, Player, Position, BALL_RADIUS } from '../../types/football';
import { calculateDistance } from '../../utils/neuralCore';
import { useGoalkeeperReachAdjustment } from '../../components/game/BallMovementSystem';

interface BallPhysicsProps {
  ball: Ball;
  players: Player[];
  updateBallPosition: () => void;
}

export const useBallPhysics = ({ ball, players, updateBallPosition }: BallPhysicsProps) => {
  // Get the goalkeeper reach adjustment function
  const calculateEloGoalkeeperReachAdjustment = useGoalkeeperReachAdjustment();

  const detectCollisions = useCallback(() => {
    // No players or no ball movement, skip calculation
    if (!players.length || (ball.velocity.x === 0 && ball.velocity.y === 0)) {
      return;
    }
    
    for (const player of players) {
      const distanceToBall = calculateDistance(player.position, ball.position);
      
      // Goalkeeper has extra reach based on ELO
      let extraReach = 0;
      if (player.role === 'goalkeeper' && player.teamElo) {
        extraReach = calculateEloGoalkeeperReachAdjustment(player.teamElo);
      }
      
      // Check if player collides with ball
      const collisionThreshold = player.radius + BALL_RADIUS + extraReach;
      
      if (distanceToBall <= collisionThreshold) {
        // Handle collision logic here
        handlePlayerBallCollision(player);
        break; // Only one player can touch the ball at a time
      }
    }
  }, [ball, players, calculateEloGoalkeeperReachAdjustment]);

  const handlePlayerBallCollision = useCallback((player: Player) => {
    // Custom collision response logic
    if (player.role === 'goalkeeper') {
      // Goalkeepers can catch the ball
      if (Math.random() < 0.6) {
        // Calculate catch probability based on ELO
        let catchProbability = 0.6;
        
        if (player.teamElo) {
          // Higher ELO improves catching ability
          const eloBonus = calculateEloGoalkeeperReachAdjustment(player.teamElo);
          catchProbability += eloBonus / 10; // Convert reach bonus to probability bonus
        }
        
        if (Math.random() < catchProbability) {
          // Ball is caught and stopped
          stopBall();
        }
      }
    } else {
      // Regular players deflect the ball
      deflectBall(player);
    }
  }, [calculateEloGoalkeeperReachAdjustment]);

  const stopBall = useCallback(() => {
    // Logic to stop the ball
    // This is just a placeholder - actual implementation would update the ball state
    console.log('Ball stopped');
  }, []);

  const deflectBall = useCallback((player: Player) => {
    // Logic to deflect the ball based on player position and momentum
    // This is just a placeholder - actual implementation would update the ball state
    console.log(`Ball deflected by ${player.team} ${player.role}`);
  }, []);

  return {
    detectCollisions,
    handlePlayerBallCollision,
    updateBallPhysics: updateBallPosition
  };
};
