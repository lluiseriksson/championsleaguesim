
import React from 'react';
import { toast } from 'sonner';
import { Ball } from '../../types/football';

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
    
    // Reset ball position to center after goal
    setBall(prev => ({
      ...prev,
      position: { x: 800/2, y: 500/2 },
      velocity: { 
        x: scoringTeam === 'red' ? -1 : 1, // Fix: Ensure ball moves toward the team that conceded
        y: Math.random() * 2 - 1 
      }
    }));
    
    return scoringTeam;
  }, [tournamentMode, totalGoalsRef, setBall]);
  
  return { handleGoalScored };
};
