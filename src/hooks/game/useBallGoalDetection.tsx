
import React from 'react';
import { Ball, Position, PITCH_WIDTH, PITCH_HEIGHT, GOAL_HEIGHT } from '../../types/football';

interface BallGoalDetectionProps {
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  tournamentMode?: boolean;
}

export const useBallGoalDetection = ({ 
  checkGoal, 
  tournamentMode = false 
}: BallGoalDetectionProps) => {
  
  // NEW: Track if ball was close to goal for near miss detection
  const nearMissRef = React.useRef<{
    detected: boolean;
    team: 'red' | 'blue' | null;
    timestamp: number;
  }>({
    detected: false,
    team: null,
    timestamp: 0
  });
  
  // Calculate if a shot was a near miss
  const checkNearMiss = React.useCallback((position: Position, velocity: Position): boolean => {
    // Don't detect near misses too frequently
    const now = Date.now();
    if (now - nearMissRef.current.timestamp < 2000) {
      return false;
    }
    
    const goalY = PITCH_HEIGHT / 2;
    const goalTop = goalY - GOAL_HEIGHT / 2;
    const goalBottom = goalY + GOAL_HEIGHT / 2;
    
    // Check left goal (blue team scores)
    if (position.x <= 30 && position.x > 0 && 
        position.y >= goalTop - 20 && position.y <= goalBottom + 20) {
      // Close to left goal but not a goal, and moving left
      if (velocity.x < 0 && Math.abs(position.y - goalY) <= GOAL_HEIGHT) {
        nearMissRef.current = {
          detected: true,
          team: 'blue',
          timestamp: now
        };
        if (!tournamentMode) {
          console.log("NEAR MISS: Almost a goal for Blue team!");
        }
        return true;
      }
    }
    
    // Check right goal (red team scores)
    if (position.x >= PITCH_WIDTH - 30 && position.x < PITCH_WIDTH && 
        position.y >= goalTop - 20 && position.y <= goalBottom + 20) {
      // Close to right goal but not a goal, and moving right
      if (velocity.x > 0 && Math.abs(position.y - goalY) <= GOAL_HEIGHT) {
        nearMissRef.current = {
          detected: true,
          team: 'red',
          timestamp: now
        };
        if (!tournamentMode) {
          console.log("NEAR MISS: Almost a goal for Red team!");
        }
        return true;
      }
    }
    
    return false;
  }, [tournamentMode]);
  
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
    
    // If no goal, check for near miss if ball has velocity
    if (currentBall.velocity && 
        (Math.abs(currentBall.velocity.x) > 1 || Math.abs(currentBall.velocity.y) > 1)) {
      checkNearMiss(newPosition, currentBall.velocity);
    }
    
    return { goalScored: null, updatedBall: currentBall };
  }, [checkGoal, checkNearMiss, tournamentMode]);
  
  return { handleGoalCheck, nearMissRef };
};
