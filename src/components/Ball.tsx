
import React from 'react';
import { motion } from 'framer-motion';
import { Ball as BallType } from '../types/football';

interface BallProps {
  ball: BallType;
}

const Ball: React.FC<BallProps> = ({ ball }) => {
  // Detect side effect for visual feedback
  const hasSideEffect = ball.bounceDetection?.sideEffect || false;
  
  // Calculate ball speed for visual effects
  const ballSpeed = Math.sqrt(
    ball.velocity.x * ball.velocity.x + 
    ball.velocity.y * ball.velocity.y
  );
  
  // Spin effect based on velocity
  const spinFactor = ballSpeed * 5;
  
  // Add a pulsing effect to make ball possession changes more visible
  const pulseEffect = hasSideEffect ? 
    { scale: [1, 1.2, 1], opacity: [1, 0.8, 1] } : 
    { scale: 1, opacity: 1 };
  
  return (
    <motion.div
      className={`absolute w-3 h-3 bg-white rounded-full shadow-md ${
        hasSideEffect ? 'shadow-blue-500/50' : 
        ballSpeed > 8 ? 'shadow-orange-500/30' : ''
      }`}
      animate={{
        x: ball.position.x,
        y: ball.position.y,
        rotate: ball.velocity.x * spinFactor,
        ...pulseEffect
      }}
      transition={{
        type: "tween",
        duration: 0.016,
        ease: "linear"
      }}
      initial={false}
    />
  );
};

export default Ball;
