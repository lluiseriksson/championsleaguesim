import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types/football';
import { getTeamKitColor, getTeamKitColors, KitType } from '../types/kits';
import { adjustGreenKitForPitchContrast, isColorTooCloseToField, selectGoalkeeperKit } from '../types/kits/kitTypes';
import { parseHexColor } from '../types/kits/colorUtils';

interface PlayerSpriteProps {
  player: Player;
}

const PlayerSprite: React.FC<PlayerSpriteProps> = ({ player }) => {
  // Get player color based on team name and kit type, falling back to basic colors if not available
  const getPlayerColor = (player: Player) => {
    // If the player has a teamName and kitType, use the corresponding kit color
    if (player.teamName && player.kitType) {
      let kitColor = getTeamKitColor(player.teamName, player.kitType as KitType);
      
      // Adjust green colors to provide better contrast with the field
      if (isColorTooCloseToField(kitColor)) {
        kitColor = adjustGreenKitForPitchContrast(kitColor);
      }
      
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
        return '';
      case 'midfielder':
        return '';
      case 'forward':
        return '';
      default:
        return '';
    }
  };

  // Improved function to determine text color based on background color
  const getTextColor = (player: Player) => {
    // If the player has a teamName and kitType, check the color brightness
    if (player.teamName && player.kitType) {
      // For goalkeepers, we use a different color calculation since their kits are often inverted
      if (player.role === 'goalkeeper') {
        // For goalkeepers we prefer to use the secondary color which is usually more distinct
        const kitColors = getTeamKitColors(player.teamName, player.kitType as KitType);
        const hexColor = kitColors.secondary; // Use secondary color for checking goalkeeper text color
        
        // Parse the hex color to RGB
        const rgb = parseHexColor(hexColor);
        
        // Calculate the perceived brightness using the luminance formula
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        
        // Use black text on light backgrounds, white text on dark backgrounds
        return luminance > 0.5 ? 'text-black font-extrabold' : 'text-white font-extrabold';
      } else {
        // For field players, use the primary kit color
        const hexColor = getTeamKitColor(player.teamName, player.kitType as KitType);
        
        // Parse the hex color to RGB
        const rgb = parseHexColor(hexColor);
        
        // Calculate the perceived brightness using the luminance formula
        // This formula gives more weight to green as human eyes are more sensitive to it
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        
        // Use black text on light backgrounds, white text on dark backgrounds
        // Using a threshold of 0.5 for better contrast
        return luminance > 0.5 ? 'text-black font-extrabold' : 'text-white font-extrabold';
      }
    }
    
    // Default to white text for legacy gradient backgrounds
    return 'text-white font-extrabold';
  };
  
  // Get the kit colors for the player's team
  const getPlayerKitStyles = (player: Player) => {
    if (!player.teamName || !player.kitType) return {};
    
    // Get standard kit colors
    let kitColors = getTeamKitColors(player.teamName, player.kitType as KitType);
    
    // Check if primary color is too close to field and adjust if needed
    if (isColorTooCloseToField(kitColors.primary)) {
      kitColors.primary = adjustGreenKitForPitchContrast(kitColors.primary);
    }
    
    // Check if secondary color is too close to field and adjust if needed
    if (isColorTooCloseToField(kitColors.secondary)) {
      kitColors.secondary = adjustGreenKitForPitchContrast(kitColors.secondary);
    }
    
    // For goalkeepers, use the dynamic kit selection function
    if (player.role === 'goalkeeper') {
      // Determine the opposing team name
      let opposingTeamName;
      
      // Get a reference to all players
      const allPlayers = document.querySelectorAll('[data-team]');
      
      // Find a player from the opposing team
      for (let i = 0; i < allPlayers.length; i++) {
        const playerElement = allPlayers[i];
        const teamAttr = playerElement.getAttribute('data-team');
        if (teamAttr && teamAttr !== player.team) {
          opposingTeamName = playerElement.getAttribute('data-team-name');
          break;
        }
      }
      
      // Get opposing team primary color if available
      const opposingTeamPrimaryColor = opposingTeamName ? 
        getTeamKitColor(opposingTeamName, player.team === 'red' ? 'away' : 'home') : 
        undefined;
        
      // Select the best goalkeeper kit based on contrast with both teams
      // and ensuring home and away goalkeepers have different kits
      kitColors = selectGoalkeeperKit(
        player.teamName,
        opposingTeamName || undefined,
        kitColors.primary,
        kitColors.secondary,
        opposingTeamPrimaryColor,
        player.team === 'red' // Pass whether this is a home team goalkeeper
      );
    }
    
    // Create a dynamic style with the kit colors
    return {
      '--primary-color': kitColors.primary,
      '--secondary-color': kitColors.secondary,
      '--accent-color': kitColors.accent
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
      style={getPlayerKitStyles(player)}
      data-team={player.team}
      data-team-name={player.teamName}
    >
      {/* Team design showing the three kit colors with primary color taking 75% */}
      <div className="absolute inset-0 w-full h-full opacity-80">
        {player.teamName && player.kitType && (
          <>
            {/* Modified design: primary color takes 75%, accent stripe 5%, secondary color 20% */}
            <div className="absolute top-0 left-0 w-[75%] h-full" style={{backgroundColor: 'var(--primary-color)'}}></div>
            <div className="absolute top-0 left-[75%] w-[5%] h-full" style={{backgroundColor: 'var(--accent-color)'}}></div>
            <div className="absolute top-0 right-0 w-[20%] h-full" style={{backgroundColor: 'var(--secondary-color)'}}></div>
          </>
        )}
      </div>
      
      {/* Small letter to indicate the role with improved contrast */}
      <span className={`relative z-10 text-[10px] ${getTextColor(player)} drop-shadow-sm`}>
        {player.role === 'goalkeeper' ? 'G' : 
         player.role === 'defender' ? 'D' : 
         player.role === 'midfielder' ? 'M' : 
         player.role === 'forward' ? 'F' : ''}
      </span>
    </motion.div>
  );
};

export default PlayerSprite;
