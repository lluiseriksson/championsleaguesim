
import React from 'react';
import { Ball, Position, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';

interface BallGoalDetectionProps {
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  tournamentMode?: boolean;
}

export const useBallGoalDetection = ({ 
  checkGoal, 
  tournamentMode = false 
}: BallGoalDetectionProps) => {
  
  const handleGoalCheck = React.useCallback((
    currentBall: Ball, 
    newPosition: Position
  ): { goalScored: 'red' | 'blue' | null; updatedBall: Ball } => {
    // Check if a goal was scored
    const goalScored = checkGoal(newPosition);
    
    if (goalScored) {
      // Log less in tournament mode to reduce memory usage
      if (!tournamentMode) {
        console.log(`Goal detected for team ${goalScored}`);
      }
      
      // Reset ball position to center with a significant initial velocity
      const updatedBall = {
        ...currentBall,
        position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
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
      
      return { goalScored, updatedBall };
    }
    
    return { goalScored: null, updatedBall: currentBall };
  }, [checkGoal, tournamentMode]);
  
  return { handleGoalCheck };
};
