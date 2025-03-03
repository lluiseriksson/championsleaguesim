
import React from 'react';
import { Ball, Player, PITCH_WIDTH, PITCH_HEIGHT, BALL_RADIUS } from '../../types/football';
import { canInteractWithBall, handleBallPlayerCollision, processBallBounce } from '../../utils/ball/playerInteraction';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: { x: number; y: number }) => string | null;
  onBallTouch?: (player: Player) => void;
}

export const useBallMovementSystem = ({
  ball,
  setBall,
  players,
  checkGoal,
  onBallTouch
}: BallMovementSystemProps) => {
  
  // Track which player last touched the ball
  const lastTouchPlayerRef = React.useRef<Player | null>(null);
  
  // Update ball position based on physics
  const updateBallPosition = React.useCallback(() => {
    setBall(prevBall => {
      try {
        let newBall = { ...prevBall };
        
        // First, apply velocity to position
        newBall.position = {
          x: prevBall.position.x + prevBall.velocity.x,
          y: prevBall.position.y + prevBall.velocity.y
        };
        
        // Check for goals before any collision or bounce processing
        const scoringTeam = checkGoal(newBall.position);
        if (scoringTeam) {
          return newBall; // If there's a goal, don't process further physics
        }
        
        // Process bounces against walls
        newBall = processBallBounce(newBall);
        
        // Process collisions with players
        for (const player of players) {
          if (canInteractWithBall(player, newBall)) {
            const ballAfterCollision = handleBallPlayerCollision(newBall, player);
            
            // Only count as a touch if the ball's trajectory changes significantly
            const velocityChangeMagnitude = Math.sqrt(
              Math.pow(ballAfterCollision.velocity.x - newBall.velocity.x, 2) +
              Math.pow(ballAfterCollision.velocity.y - newBall.velocity.y, 2)
            );
            
            if (velocityChangeMagnitude > 0.1) {
              // If player different from last touch, notify
              if (lastTouchPlayerRef.current?.id !== player.id && onBallTouch) {
                onBallTouch(player);
                lastTouchPlayerRef.current = player;
              }
            }
            
            newBall = ballAfterCollision;
          }
        }
        
        // Apply gradual deceleration to simulate friction
        newBall.velocity = {
          x: newBall.velocity.x * 0.98,
          y: newBall.velocity.y * 0.98
        };
        
        // Ensure minimum speed if ball is moving
        const speed = Math.sqrt(
          newBall.velocity.x * newBall.velocity.x + 
          newBall.velocity.y * newBall.velocity.y
        );
        
        if (speed > 0 && speed < 0.1) {
          // If ball is moving very slowly, maintain a minimum speed
          const minSpeed = 0.1;
          const ratio = minSpeed / speed;
          newBall.velocity.x *= ratio;
          newBall.velocity.y *= ratio;
        }
        
        // Final position bounds check
        newBall.position.x = Math.max(BALL_RADIUS, Math.min(PITCH_WIDTH - BALL_RADIUS, newBall.position.x));
        newBall.position.y = Math.max(BALL_RADIUS, Math.min(PITCH_HEIGHT - BALL_RADIUS, newBall.position.y));
        
        return newBall;
      } catch (error) {
        console.error('Error in updateBallPosition:', error);
        return prevBall;
      }
    });
  }, [ball, players, setBall, checkGoal, onBallTouch]);

  return { updateBallPosition };
};
