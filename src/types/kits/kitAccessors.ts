
import { KitType, TeamKitColors } from './kitTypes';
import { teamKitColors } from './teamColorsData';

// Function to get team kit color based on the team name and kit type
export const getTeamKitColor = (teamName: string | undefined, kitType: KitType = 'home'): string => {
  if (!teamName || !teamKitColors[teamName]) {
    // Default fallback colors
    return kitType === 'home' ? '#FF0000' :
           kitType === 'away' ? '#0000FF' : 
           kitType === 'third' ? '#FFFFFF' : '#00FF00';
  }

  // For special kit, we don't have a direct reference in teamKitColors
  // This would be handled by the customKit property on the Player instead
  if (kitType === 'special') {
    return '#00FF00'; // Default special kit color if not specified otherwise
  }

  return teamKitColors[teamName][kitType].primary;
};

// Function to get all team kit colors for a specific kit type
export const getTeamKitColors = (teamName: string | undefined, kitType: KitType = 'home'): TeamKitColors => {
  if (!teamName || !teamKitColors[teamName]) {
    // Default fallback colors
    return {
      primary: kitType === 'home' ? '#FF0000' : 
               kitType === 'away' ? '#0000FF' : 
               kitType === 'third' ? '#FFFFFF' : '#00FF00',
      secondary: '#FFFFFF',
      accent: '#000000'
    };
  }

  // For special kit, we don't have a direct reference in teamKitColors
  // This would be handled by the customKit property on the Player instead
  if (kitType === 'special') {
    return {
      primary: '#00FF00',
      secondary: '#FFFFFF',
      accent: '#000000'
    };
  }

  return teamKitColors[teamName][kitType];
};

// Function to get accent colors for team kit designs
export const getTeamAccentColors = (teamName: string, kitType: KitType): { accent1: string, accent2: string } => {
  const kitColors = getTeamKitColors(teamName, kitType);

  return {
    accent1: kitColors.secondary,
    accent2: kitColors.accent
  };
};
