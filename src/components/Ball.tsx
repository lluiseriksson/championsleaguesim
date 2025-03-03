
import React from 'react';
import { motion } from 'framer-motion';
import { Ball as BallType } from '../types/football';

interface BallProps {
  ball: BallType;
}

const Ball: React.FC<BallProps> = ({ ball }) => {
  // Detect side effect for visual feedback
  const hasSideEffect = ball.bounceDetection?.sideEffect || false;
  
  return (
    <motion.div
      className={`absolute w-4 h-4 bg-white rounded-full shadow-md ${hasSideEffect ? 'shadow-blue-500/50' : ''}`}
      animate={{
        x: ball.position.x,
        y: ball.position.y,
        rotate: ball.velocity.x * 20,
        scale: hasSideEffect ? [1, 1.2, 1] : 1,
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
