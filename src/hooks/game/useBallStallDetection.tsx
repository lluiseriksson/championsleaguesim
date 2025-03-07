import { useRef, useEffect } from 'react';
import { Ball, Position } from '../../types/football';
import { applyRandomKick } from '../../utils/gamePhysics';

interface BallStallDetectionProps {
  ball: Ball;
  setBall: React.Dispatch<React.SetStateAction<Ball>>;
  enabled?: boolean;
  stallThreshold?: number; // Frames to wait before considering ball stalled
}

/**
 * Hook to detect and recover from ball movement stalls
 */
export const useBallStallDetection = ({
  ball,
  setBall,
  enabled = true,
  stallThreshold = 60 // 1 second at 60fps
}: BallStallDetectionProps) => {
  const lastPositionRef = useRef<Position | null>(null);
  const stallCounterRef = useRef(0);
  const velocityHistoryRef = useRef<Position[]>([]);
  
  // Keep a history of recent velocities
  const trackVelocity = (velocity: Position) => {
    velocityHistoryRef.current.push({...velocity});
    if (velocityHistoryRef.current.length > 10) {
      velocityHistoryRef.current.shift();
    }
  };
  
  // Check if velocity is consistently very low
  const isVelocityStalled = () => {
    if (velocityHistoryRef.current.length < 5) return false;
    
    // Check if all recent velocities are very low
    return velocityHistoryRef.current.every(v => {
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      return speed < 0.1;
    });
  };
  
  // Detect if ball position hasn't changed significantly
  const checkStall = () => {
    if (!enabled || !ball) return;
    
    const currentPosition = ball.position;
    
    if (lastPositionRef.current) {
      const dx = currentPosition.x - lastPositionRef.current.x;
      const dy = currentPosition.y - lastPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Track velocity
      trackVelocity(ball.velocity);
      
      // If ball has barely moved
      if (distance < 0.2 || isVelocityStalled()) {
        stallCounterRef.current++;
        
        if (stallCounterRef.current >= stallThreshold) {
          console.warn(`Ball appears stalled for ${stallThreshold} frames - applying random kick`);
          
          // Reset the counter
          stallCounterRef.current = 0;
          
          // Apply a random kick to unstick the ball
          setBall(prev => ({
            ...prev,
            velocity: {
              x: (Math.random() - 0.5) * 10,
              y: (Math.random() - 0.5) * 10
            }
          }));
        }
      } else {
        // Ball is moving normally, reset counter
        stallCounterRef.current = 0;
      }
    }
    
    lastPositionRef.current = {...currentPosition};
  };
  
  // Set up the detector
  useEffect(() => {
    if (!enabled) return;
    
    const intervalId = setInterval(checkStall, 1000 / 60); // 60fps check
    
    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, ball]);
  
  return { checkStall };
};

export default useBallStallDetection;
