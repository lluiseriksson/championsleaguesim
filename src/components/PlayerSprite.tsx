
import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types/football';

interface PlayerSpriteProps {
  player: Player;
}

const PlayerSprite: React.FC<PlayerSpriteProps> = ({ player }) => {
  // Función para determinar el color del jugador basado en su equipo
  const getPlayerColor = (player: Player) => {
    // Colores base para cada equipo
    const teamColors = {
      red: 'bg-gradient-to-br from-red-500 to-red-700',
      blue: 'bg-gradient-to-br from-blue-500 to-blue-700'
    };
    
    return teamColors[player.team];
  };

  // Función para obtener una sutil indicación del rol (usando border en lugar de forma)
  const getRoleIndicator = (role: Player['role']) => {
    switch (role) {
      case 'goalkeeper':
        return 'border-2 border-white';
      case 'defender':
        return 'border border-white/50';
      case 'midfielder':
        return '';
      case 'forward':
        return '';
      default:
        return '';
    }
  };

  return (
    <motion.div
      key={player.id}
      className={`absolute w-8 h-8 rounded-full ${getPlayerColor(player)} ${getRoleIndicator(player.role)} 
                 flex items-center justify-center shadow-md`}
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
      {/* Pequeña letra para indicar el rol */}
      <span className="text-xs text-white font-bold">
        {player.role === 'goalkeeper' ? 'G' : 
         player.role === 'defender' ? 'D' : 
         player.role === 'midfielder' ? 'M' : 
         player.role === 'forward' ? 'F' : ''}
      </span>
    </motion.div>
  );
};

export default PlayerSprite;
