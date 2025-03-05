
import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types/football';
import { getTeamKitColor, getTeamAccentColors } from '../types/teamKits';

interface PlayerSpriteProps {
  player: Player;
}

const PlayerSprite: React.FC<PlayerSpriteProps> = ({ player }) => {
  // Get player color based on team name and kit type, falling back to basic colors if not available
  const getPlayerColor = (player: Player) => {
    // If the player has a teamName and kitType, use the corresponding kit color
    if (player.teamName && player.kitType) {
      const kitColor = getTeamKitColor(player.teamName, player.kitType);
      return `bg-[${kitColor}]`;
    }
    
    // Legacy fallback for teams without name/kit specification
    const teamColors = {
      red: 'bg-gradient-to-br from-red-500 to-red-700',
      blue: 'bg-gradient-to-br from-blue-500 to-blue-700'
    };
    
    return teamColors[player.team];
  };

  // Function to get a subtle indication of the role (using border)
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

  // Determine if we need a light or dark text color based on the player color
  const getTextColor = (player: Player) => {
    // If the player has a teamName and kitType, check the color brightness
    if (player.teamName && player.kitType) {
      const hexColor = getTeamKitColor(player.teamName, player.kitType);
      
      // Simple brightness formula (adjust as needed)
      // Convert hex to RGB and calculate brightness
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      // Formula to determine perceived brightness
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      // Use white text on dark backgrounds, black text on light backgrounds
      return brightness > 125 ? 'text-black' : 'text-white';
    }
    
    // Default to white text for legacy gradient backgrounds
    return 'text-white';
  };
  
  // Get accent colors for the player's team design
  const getPlayerAccentStyles = (player: Player) => {
    if (!player.teamName || !player.kitType) return '';
    
    const { accent1, accent2 } = getTeamAccentColors(player.teamName, player.kitType);
    
    // Create a dynamic style with the accent colors
    return {
      '--accent1': accent1,
      '--accent2': accent2
    } as React.CSSProperties;
  };

  return (
    <motion.div
      key={player.id}
      className={`absolute w-6 h-6 rounded-full ${getPlayerColor(player)} ${getRoleIndicator(player.role)} 
                flex items-center justify-center shadow-md overflow-hidden`}
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
      style={getPlayerAccentStyles(player)}
    >
      {/* Team design pattern/stripes using accent colors */}
      <div className="absolute inset-0 w-full h-full opacity-70">
        {player.teamName && player.kitType && (
          <>
            <div className="absolute top-0 left-0 w-1/3 h-full" style={{backgroundColor: 'var(--accent1)'}}></div>
            <div className="absolute top-0 right-0 w-1/3 h-full" style={{backgroundColor: 'var(--accent2)'}}></div>
          </>
        )}
      </div>
      
      {/* Small letter to indicate the role */}
      <span className={`relative z-10 text-[8px] font-bold ${getTextColor(player)}`}>
        {player.role === 'goalkeeper' ? 'G' : 
         player.role === 'defender' ? 'D' : 
         player.role === 'midfielder' ? 'M' : 
         player.role === 'forward' ? 'F' : ''}
      </span>
    </motion.div>
  );
};

export default PlayerSprite;
