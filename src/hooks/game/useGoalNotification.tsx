
import React from 'react';
import { toast } from 'sonner';
import { Ball, PITCH_WIDTH, PITCH_HEIGHT } from '../../types/football';

interface GoalNotificationProps {
  tournamentMode?: boolean;
  totalGoalsRef: React.MutableRefObject<number>;
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  setScore?: React.Dispatch<React.SetStateAction<{red: number, blue: number}>>;
}

export const useGoalNotification = ({
  tournamentMode = false,
  totalGoalsRef,
  ball,
  setBall,
  setScore
}: GoalNotificationProps) => {
  
  const handleGoalScored = React.useCallback((scoringTeam: 'red' | 'blue') => {
    console.log(`Goal scored by team ${scoringTeam}`);
    
    // Increment the total goals counter
    totalGoalsRef.current += 1;
    
    // Update the score if setScore is provided
    if (setScore) {
      setScore(prevScore => ({
        ...prevScore,
        [scoringTeam]: prevScore[scoringTeam] + 1
      }));
      console.log(`Score updated for team ${scoringTeam}`);
    }
    
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
    
    // Reset ball position to center after goal with a random kick direction
    setBall({
      position: { x: PITCH_WIDTH/2, y: PITCH_HEIGHT/2 },
      velocity: { 
        // Random direction with stronger initial kick 
        x: (Math.random() * 6) - 3,
        y: (Math.random() * 6) - 3
      },
      // Reset bounce detection to prevent issues after goal
      bounceDetection: {
        consecutiveBounces: 0,
        lastBounceTime: 0,
        lastBounceSide: '',
        sideEffect: false
      }
    });
    
    return scoringTeam;
  }, [tournamentMode, totalGoalsRef, setBall, setScore]);
  
  return { handleGoalScored };
};
