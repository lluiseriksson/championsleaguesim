
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
    
    // Show goal notification less frequently in tournament mode
    if (!tournamentMode || totalGoalsRef.current % 250 === 0) {
      toast(`${totalGoalsRef.current} goals played!`, {
        description: "Neural networks continue learning...",
      });
    }
    
    // Reset ball position to center after goal
    setBall(prev => ({
      ...prev,
      position: { x: 800/2, y: 500/2 },
      velocity: { 
        x: Math.random() * 2 - 1, 
        y: Math.random() * 2 - 1 
      }
    }));
    
    return scoringTeam;
  }, [tournamentMode, totalGoalsRef, setBall]);
  
  return { handleGoalScored };
};
