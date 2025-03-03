
import React from 'react';
import { motion } from 'framer-motion';
import { Ball as BallType } from '../types/football';

interface BallProps {
  ball: BallType;
}

const Ball: React.FC<BallProps> = ({ ball }) => {
  // Detect side effect for visual feedback
  const hasSideEffect = ball.bounceDetection?.sideEffect || false;
  
  // Add a pulsing effect to make ball possession changes more visible
  const pulseEffect = hasSideEffect ? 
    { scale: [1, 1.3, 1], opacity: [1, 0.8, 1] } : 
    { scale: 1, opacity: 1 };
  
  return (
    <motion.div
      className={`absolute w-3 h-3 bg-white rounded-full shadow-md ${hasSideEffect ? 'shadow-blue-500/50' : ''}`}
      animate={{
        x: ball.position.x,
        y: ball.position.y,
        rotate: ball.velocity.x * 20,
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
