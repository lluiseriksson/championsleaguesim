
import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types/football';

interface PlayerSpriteProps {
  player: Player;
}

const PlayerSprite: React.FC<PlayerSpriteProps> = ({ player }) => {
  return (
    <motion.div
      key={player.id}
      className={`absolute w-6 h-6 rounded-full ${
        player.team === 'red' ? 'bg-team-red' : 'bg-team-blue'
      }`}
      animate={{
        x: player.position.x,
        y: player.position.y,
      }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 100,
        mass: 0.8
      }}
      initial={false}
    />
  );
};

export default PlayerSprite;
