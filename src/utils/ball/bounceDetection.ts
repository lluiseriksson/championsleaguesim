
import { Ball } from '../../types/football';

// Helper function to track consecutive bounces
export const handleBounceTracking = (bounceDetection: Ball['bounceDetection'], side: string) => {
  if (!bounceDetection) return;
  
  const currentTime = Date.now();
  
  if (bounceDetection.lastBounceSide === side && 
      currentTime - bounceDetection.lastBounceTime < 1000) {
    bounceDetection.consecutiveBounces += 1;
    
    if (bounceDetection.consecutiveBounces > 3) {
      // Trigger side effect flag for visual indication when ball is bouncing too much
      bounceDetection.sideEffect = true;
    }
  } else {
    bounceDetection.consecutiveBounces = 1;
  }
  
  bounceDetection.lastBounceTime = currentTime;
  bounceDetection.lastBounceSide = side;
};

// Create initial bounce detection state
export const createInitialBounceDetection = (): NonNullable<Ball['bounceDetection']> => ({
  consecutiveBounces: 0,
  lastBounceTime: 0,
  lastBounceSide: '',
  sideEffect: false
});
