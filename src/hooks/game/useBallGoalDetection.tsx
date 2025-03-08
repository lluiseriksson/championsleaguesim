
import React from 'react';
import { Ball, Position, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';
import { applyRandomKick } from './useBallInitialization';

interface BallGoalDetectionProps {
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  tournamentMode?: boolean;
  onBallTouch?: (player: any) => void;
}

export const useBallGoalDetection = ({ 
  checkGoal, 
  tournamentMode = false,
  onBallTouch
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
      
      // Determine which team should do the kickoff (opposite of scoring team)
      const kickoffTeam = goalScored === 'red' ? 'blue' : 'red';
      
      // Reset ball position to center with a significant initial velocity
      // Apply a random kick with the kickoff team (the team that received the goal)
      let updatedBall = {
        ...currentBall,
        position: { x: PITCH_WIDTH / 2, y: PITCH_HEIGHT / 2 },
        velocity: { x: 0, y: 0 }, // Initially zero velocity
        bounceDetection: {
          consecutiveBounces: 0,
          lastBounceTime: 0,
          lastBounceSide: '',
          sideEffect: false
        }
      };
      
      // Apply a kick with the team that received the goal
      updatedBall = applyRandomKick(updatedBall, tournamentMode, onBallTouch, kickoffTeam);
      
      if (!tournamentMode) {
        console.log(`Kickoff being taken by team ${kickoffTeam} after goal by team ${goalScored}`);
      }
      
      return { goalScored, updatedBall };
    }
    
    return { goalScored: null, updatedBall: currentBall };
  }, [checkGoal, tournamentMode, onBallTouch]);
  
  return { handleGoalCheck };
};
