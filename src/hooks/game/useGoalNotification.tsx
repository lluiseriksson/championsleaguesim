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
  
  // Add a ref to track when the goal celebration is complete
  const goalCelebrationTimeRef = React.useRef<number>(0);
  const celebrationDuration = 1000; // 1 second celebration time
  const isInGoalCelebrationRef = React.useRef<boolean>(false);
  
  const handleGoalScored = React.useCallback((scoringTeam: 'red' | 'blue') => {
    console.log(`Goal scored by team ${scoringTeam}`);
    
    // Mark the start of goal celebration
    goalCelebrationTimeRef.current = Date.now();
    isInGoalCelebrationRef.current = true;
    
    // Immediately stop the ball's movement but keep it where it is for the celebration
    setBall(currentBall => ({
      ...currentBall,
      velocity: { x: 0, y: 0 }, // Stop the ball completely
      // Don't change position yet - let it stay in the goal for the celebration
      bounceDetection: {
        consecutiveBounces: 0,
        lastBounceTime: 0,
        lastBounceSide: '',
        sideEffect: false
      }
    }));
    
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
    
    // Return the scoring team immediately (the ball reset will happen after celebration)
    return scoringTeam;
  }, [tournamentMode, totalGoalsRef, setBall, setScore]);
  
  // Add a new function to check if celebration is over and reset ball position
  const checkAndResetBall = React.useCallback(() => {
    if (!isInGoalCelebrationRef.current) {
      return false; // No celebration in progress
    }
    
    const currentTime = Date.now();
    const celebrationElapsed = currentTime - goalCelebrationTimeRef.current;
    
    // If celebration time has passed, reset the ball to center
    if (celebrationElapsed >= celebrationDuration) {
      console.log("Goal celebration complete, resetting ball to center");
      
      // Reset ball position to center after goal with a random kick direction
      setBall({
        position: { x: PITCH_WIDTH/2, y: PITCH_HEIGHT/2 },
        velocity: { 
          // Random direction with stronger initial kick
          x: (Math.random() >= 0.5 ? 1 : -1) * (5 + Math.random() * 5),
          y: (Math.random() >= 0.5 ? 1 : -1) * (5 + Math.random() * 5)
        },
        // Reset bounce detection
        bounceDetection: {
          consecutiveBounces: 0,
          lastBounceTime: 0,
          lastBounceSide: '',
          sideEffect: false
        }
      });
      
      // End the celebration period
      isInGoalCelebrationRef.current = false;
      return true; // Ball was reset
    }
    
    return false; // Celebration still in progress
  }, [setBall]);
  
  return { handleGoalScored, checkAndResetBall, isInGoalCelebrationRef };
};
