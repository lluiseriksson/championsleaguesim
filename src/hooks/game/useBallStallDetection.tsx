
import React, { useCallback, useRef } from 'react';
import { Ball } from '../../types/football';
import { calculateBallSpeed, applyRandomKick } from './useBallInitialization';

export interface BallStallDetectionProps {
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  tournamentMode?: boolean;
}

export const useBallStallDetection = ({ 
  setBall,
  tournamentMode = false
}: BallStallDetectionProps) => {
  // Stall detection system
  const stallTimeRef = useRef<number>(0);
  const stallLastSpeedRef = useRef<number>(0);
  
  // Function to check if ball is stalled (very low velocity for a long time)
  const checkStall = useCallback((currentBall: Ball, previousBall: Ball): boolean => {
    const currentSpeed = calculateBallSpeed(currentBall.velocity);
    const previousSpeed = stallLastSpeedRef.current;
    
    // Update speed reference
    stallLastSpeedRef.current = currentSpeed;
    
    // No stall if significant movement
    if (currentSpeed > 1.2) {
      stallTimeRef.current = 0;
      return false;
    }
    
    // Check for persistent low speed
    if (currentSpeed < 1.2 && Math.abs(currentSpeed - previousSpeed) < 0.3) {
      stallTimeRef.current++;
      
      // If stalled for ~3 seconds (180 frames at 60fps)
      if (stallTimeRef.current > 180) {
        // Apply random kick to get out of stall
        if (!tournamentMode) {
          console.log("Ball stalled for too long, applying random kick");
        }
        
        setBall(prev => applyRandomKick(prev, tournamentMode));
        stallTimeRef.current = 0;
        return true;
      }
    } else {
      // Reset if there's variation in speed
      stallTimeRef.current = 0;
    }
    
    return false;
  }, [setBall, tournamentMode]);
  
  return { checkStall };
};
