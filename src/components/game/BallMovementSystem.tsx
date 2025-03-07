
import React, { useCallback, useRef } from 'react';
import { Ball, Player, Position } from '../../types/football';
import { handleBallPhysics } from '../../hooks/game/useBallPhysics';
import { useBallStallDetection } from '../../hooks/game/useBallStallDetection';
import { useBallGoalDetection } from '../../hooks/game/useBallGoalDetection';
import { useBallCollisionTracking } from '../../hooks/game/useBallCollisionTracking';
import { checkBallStuckInPlace, applyRandomKick, calculateBallSpeed } from '../../hooks/game/useBallInitialization';
import { useGoalNotification } from '../../hooks/game/useGoalNotification';

interface BallMovementSystemProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  players: Player[];
  checkGoal: (position: Position) => 'red' | 'blue' | null;
  onBallTouch: (player: Player) => void;
  tournamentMode?: boolean;
  teamAdvantageFactors?: { red: number, blue: number };
}

export const useBallMovementSystem = ({
  ball,
  setBall,
  players,
  checkGoal,
  onBallTouch,
  tournamentMode = false,
  teamAdvantageFactors = { red: 1.0, blue: 1.0 }
}: BallMovementSystemProps) => {
  // Refs to track ball state
  const lastPositionRef = useRef<Position | null>(null);
  const noMovementTimeRef = useRef<number>(0);
  const stallDetectionRef = useRef<number>(0);
  const lastKickPositionRef = useRef<Position | null>(null);
  const totalGoalsRef = useRef<number>(0);
  
  // Goal notification with celebration and reset
  const { handleGoalScored, checkAndResetBall, isInGoalCelebrationRef } = useGoalNotification({
    tournamentMode,
    totalGoalsRef,
    ball,
    setBall
  });
  
  // Goal detection system
  const { handleGoalCheck, nearMissRef, trackGoalkeeperTouch } = useBallGoalDetection({ 
    checkGoal, 
    tournamentMode 
  });
  
  // Ball stall detection
  const { checkStall } = useBallStallDetection({ 
    setBall, 
    tournamentMode 
  });
  
  // Ball collision tracking
  const { lastCollisionTimeRef } = useBallCollisionTracking();
  
  // Enhanced ball touch handler that can identify goalkeeper touches
  const handleBallTouch = useCallback((player: Player) => {
    // Call the original onBallTouch function
    onBallTouch(player);
    
    // If the player is a goalkeeper, track the touch for goal detection prevention
    if (player.role === 'goalkeeper') {
      trackGoalkeeperTouch(player.team);
    }
  }, [onBallTouch, trackGoalkeeperTouch]);
  
  // Main function to update ball position based on its velocity
  const updateBallPosition = useCallback(() => {
    // First check if we need to reset the ball after goal celebration
    if (isInGoalCelebrationRef.current) {
      const resetPerformed = checkAndResetBall();
      if (resetPerformed) {
        return null; // Ball was reset, no need to continue with physics
      }
    }
    
    // Don't update if no velocity
    if (!ball.velocity) return;
    
    let { x: vx, y: vy } = ball.velocity;
    
    // Ball position update with physics
    const newPosition = {
      x: ball.position.x + vx,
      y: ball.position.y + vy
    };
    
    // Check for stalled ball (extremely low velocity)
    const ballSpeed = calculateBallSpeed(ball.velocity);
    if (ballSpeed < 0.5) {
      stallDetectionRef.current += 1;
      
      // Apply random kick if ball has been stalled for too long
      if (stallDetectionRef.current > 120) { // ~2 seconds at 60fps
        setBall(prev => applyRandomKick(prev, tournamentMode));
        stallDetectionRef.current = 0;
        return;
      }
    } else {
      stallDetectionRef.current = 0;
    }
    
    // Separate goalkeepers from field players
    const goalkeepers = players.filter(p => p.role === 'goalkeeper');
    const fieldPlayers = players.filter(p => p.role !== 'goalkeeper');
    
    // Handle ball physics (boundaries, player collisions)
    const updatedBall = handleBallPhysics(
      ball,
      newPosition,
      goalkeepers,
      fieldPlayers,
      handleBallTouch, // Use enhanced handler that can track goalkeeper touches
      lastCollisionTimeRef,
      lastKickPositionRef,
      teamAdvantageFactors
    );
    
    // Save the current position for stuck detection
    lastPositionRef.current = { ...ball.position };
    
    // First check if the ball is stuck in place
    const ballIsStuck = checkBallStuckInPlace(
      updatedBall.position, 
      lastPositionRef.current,
      noMovementTimeRef
    );
    
    if (ballIsStuck) {
      setBall(prev => applyRandomKick(prev, tournamentMode));
      return;
    }
    
    // Then check for stalled ball (very low velocity for a long time)
    if (checkStall(updatedBall, ball)) {
      return; // Ball was stalled and has been reset
    }
    
    // Finally check for goals
    const { goalScored, updatedBall: ballAfterGoalCheck } = handleGoalCheck(
      updatedBall, 
      updatedBall.position
    );
    
    // If a goal was scored, handle the goal notification and celebration
    if (goalScored) {
      handleGoalScored(goalScored);
    }
    
    setBall(prev => ({
      ...prev,
      position: ballAfterGoalCheck.position,
      velocity: ballAfterGoalCheck.velocity,
      bounceDetection: ballAfterGoalCheck.bounceDetection,
      previousPosition: prev.position // Save previous position for trajectory analysis
    }));
    
    return goalScored;
  }, [
    ball,
    setBall,
    players,
    onBallTouch,
    checkStall,
    handleGoalCheck,
    trackGoalkeeperTouch,
    handleBallTouch,
    lastCollisionTimeRef,
    tournamentMode,
    teamAdvantageFactors,
    handleGoalScored,
    checkAndResetBall,
    isInGoalCelebrationRef
  ]);

  return { updateBallPosition };
};
