import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types/football';

interface PlayerSpriteProps {
  player: Player;
}

const PlayerSprite: React.FC<PlayerSpriteProps> = ({ player }) => {
  // Function to determine the player's background color based on role and team
  const getPlayerColor = (player: Player) => {
    const baseColor = player.team === 'red' ? 'bg-team-red' : 'bg-team-blue';
    
    // For goalkeepers, use a darker variant with a different shape
    if (player.role === 'goalkeeper') {
      return `${baseColor} opacity-90 border-2 border-white`;
    }
    
    // For field players, vary the appearance based on role
    switch (player.role) {
      case 'defender':
        return `${baseColor} opacity-80`;
      case 'midfielder':
        return `${baseColor} opacity-90`;
      case 'forward':
        return `${baseColor} opacity-100`;
      default:
        return baseColor;
    }
  };

  // Determine the size of the player based on role
  const getPlayerSize = (role: Player['role']) => {
    switch (role) {
      case 'goalkeeper':
        return 'w-7 h-7';
      case 'defender':
        return 'w-6 h-6';
      case 'midfielder':
        return 'w-6 h-6';
      case 'forward':
        return 'w-6 h-6';
      default:
        return 'w-6 h-6';
    }
  };

  // Determine the shape of the player based on role
  const getPlayerShape = (role: Player['role']) => {
    switch (role) {
      case 'goalkeeper':
        return 'rounded-lg';
      case 'defender':
        return 'rounded-full';
      case 'midfielder':
        return 'rounded-full';
      case 'forward':
        return 'rounded-full';
      default:
        return 'rounded-full';
    }
  };

  return (
    <motion.div
      key={player.id}
      className={`absolute ${getPlayerSize(player.role)} ${getPlayerShape(player.role)} ${getPlayerColor(player)} flex items-center justify-center shadow-md`}
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
    >
      {/* Add small indicators for midfielder and forward roles */}
      {player.role === 'midfielder' && (
        <div className="w-2 h-2 bg-white rounded-full opacity-70"></div>
      )}
      {player.role === 'forward' && (
        <div className="w-1 h-3 bg-white rounded-sm opacity-70"></div>
      )}
    </motion.div>
  );
};

export default PlayerSprite;
