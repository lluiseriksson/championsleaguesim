
import React from 'react';
import { toast } from 'sonner';
import { Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';

interface GoalNotificationProps {
  tournamentMode?: boolean;
  totalGoalsRef: React.MutableRefObject<number>;
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
}

export const useGoalNotification = ({
  tournamentMode = false,
  totalGoalsRef,
  ball,
  setBall
}: GoalNotificationProps) => {
  
  const handleGoalScored = React.useCallback((scoringTeam: 'red' | 'blue') => {
    console.log(`Goal scored by team ${scoringTeam}`);
    
    // Increment the total goals counter
    totalGoalsRef.current += 1;
    
    // Show goal notification less frequently in tournament mode
    if (!tournamentMode || totalGoalsRef.current % 250 === 0) {
      toast(`${totalGoalsRef.current} goals played!`, {
        description: "Neural networks continue learning...",
      });
    } else {
      // Show basic goal notification for regular mode
      if (!tournamentMode) {
        toast(`Goal by team ${scoringTeam.toUpperCase()}!`, {
          description: `Total: ${totalGoalsRef.current} goals`,
        });
      }
    }
    
    // IMPROVED: Reset ball position to center after goal with stronger velocity
    // to prevent it from getting stuck in the goal
    setBall(prev => ({
      ...prev,
      position: { x: PITCH_WIDTH/2, y: PITCH_HEIGHT/2 },
      velocity: { 
        // Strong initial kick toward the team that conceded
        x: scoringTeam === 'red' ? -3 : 3, 
        y: (Math.random() * 2 - 1) * 2 
      },
      // Reset bounce detection to prevent issues after goal
      bounceDetection: {
        consecutiveBounces: 0,
        lastBounceTime: 0,
        lastBounceSide: '',
        sideEffect: false
      }
    }));
    
    return scoringTeam;
  }, [tournamentMode, totalGoalsRef, setBall]);
  
  return { handleGoalScored };
};
