
import React from 'react';
import { motion } from 'framer-motion';
import { Ball as BallType } from '../types/football';

interface BallProps {
  ball: BallType;
}

const Ball: React.FC<BallProps> = ({ ball }) => {
  return (
    <motion.div
      className="absolute w-3 h-3 bg-white rounded-full shadow-md"
      animate={{
        x: ball.position.x,
        y: ball.position.y,
        rotate: ball.velocity.x * 20,
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
