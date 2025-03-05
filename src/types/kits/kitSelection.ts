import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { parseHexColor, getColorDistance } from './colorUtils';

// Function to check if two kit colors have any matching elements
const hasColorClash = (homeKit: TeamKit, awayKit: TeamKit): boolean => {
  const homeColors = [homeKit.primary, homeKit.secondary, homeKit.accent];
  const awayColors = [awayKit.primary, awayKit.secondary, awayKit.accent];
  
  // Check if any colors match or are too similar
  for (const homeColor of homeColors) {
    for (const awayColor of awayColors) {
      // Parse colors to RGB
      const homeRgb = parseHexColor(homeColor);
      const awayRgb = parseHexColor(awayColor);
      
      // Calculate color distance
      const colorDistance = getColorDistance(homeRgb, awayRgb);
      
      // If colors are too similar (distance is too small), consider it a clash
      if (colorDistance < 60) {
        return true;
      }
    }
  }
  
  return false;
};

// Function to generate a special kit that doesn't clash with home team colors
const generateSpecialKit = (awayTeamName: string, homeKit: TeamKit): TeamKit => {
  console.log(`Generating special kit for ${awayTeamName}`);
  
  // Get team identity colors (might be from historic kits or alternate colors)
  const teamIdentityColors = getTeamIdentityColors(awayTeamName);
  
  // Create a kit that doesn't clash with the home kit
  const homeColors = [homeKit.primary, homeKit.secondary, homeKit.accent];
  
  // Filter out colors that clash with the home kit
  const availableColors = teamIdentityColors.filter(color => {
    const colorRgb = parseHexColor(color);
    
    // Check if this color clashes with any home color
    for (const homeColor of homeColors) {
      const homeRgb = parseHexColor(homeColor);
      if (getColorDistance(colorRgb, homeRgb) < 60) {
        return false;
      }
    }
    
    return true;
  });
  
  // If we have enough non-clashing colors, use them
  // Otherwise, generate some random variations that don't clash
  const primary = availableColors[0] || generateNonClashingColor(homeColors, "#FF4B4B");
  const secondary = availableColors[1] || generateNonClashingColor(homeColors, "#4B4BFF");
  const accent = availableColors[2] || generateNonClashingColor(homeColors, "#FFFF4B");
  
  return {
    primary,
    secondary,
    accent
  };
};

// Utility function to generate a color that doesn't clash with home colors
const generateNonClashingColor = (homeColors: string[], baseColor: string): string => {
  let attempts = 0;
  let candidateColor = baseColor;
  
  while (attempts < 20) {
    // Check if candidate color clashes with any home color
    let isClashing = false;
    
    for (const homeColor of homeColors) {
      const homeRgb = parseHexColor(homeColor);
      const candidateRgb = parseHexColor(candidateColor);
      
      if (getColorDistance(candidateRgb, homeRgb) < 60) {
        isClashing = true;
        break;
      }
    }
    
    if (!isClashing) {
      return candidateColor;
    }
    
    // If it clashes, generate a variation
    const rgb = parseHexColor(candidateColor);
    candidateColor = `#${Math.floor(Math.max(0, Math.min(255, rgb.r + Math.random() * 100 - 50))).toString(16).padStart(2, '0')}${
      Math.floor(Math.max(0, Math.min(255, rgb.g + Math.random() * 100 - 50))).toString(16).padStart(2, '0')}${
      Math.floor(Math.max(0, Math.min(255, rgb.b + Math.random() * 100 - 50))).toString(16).padStart(2, '0')}`;
    
    attempts++;
  }
  
  // If we couldn't find a non-clashing color after 20 attempts, return a highly contrasting color
  return baseColor;
};

// Get a team's identity colors (these would ideally be from a database of historic/alternate colors)
const getTeamIdentityColors = (teamName: string): string[] => {
  // This is a simplified version - in a real app, you'd have more team identity colors
  // These would be historic or alternate colors associated with the team
  const identityColors: Record<string, string[]> = {
    "Liverpool": ["#C8102E", "#00B2A9", "#FFFFFF", "#31372B", "#EAFF04"],
    "Arsenal": ["#EF0107", "#FFFFFF", "#9C824A", "#023474", "#DB0007"],
    "Real Madrid": ["#FFFFFF", "#FCBF00", "#000000", "#1A36C2", "#094487"],
    "Barcelona": ["#A50044", "#004D98", "#FFED02", "#DB9A00", "#000000"],
    "Bayern": ["#DC052D", "#0066B2", "#FFFFFF", "#000000", "#EFB810"],
    "Inter": ["#0066B2", "#000000", "#FFFFFF", "#E5B932", "#7B868C"],
    // Add more teams as needed
  };
  
  // Return identity colors if available, otherwise return a set of default colors
  return identityColors[teamName] || ["#FF4B4B", "#4B4BFF", "#FFFF4B", "#4BFF4B", "#FF4BFF"];
};

// Function to get the best contrasting kit for away team
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): { kitType: KitType, customKit?: TeamKit } => {
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    return { kitType: 'away' }; // Default to away kit if team not found
  }

  // Home team always uses home kit
  const homeKit = homeTeam.home;
  
  // Check if away team's away kit clashes with home team's home kit
  const awayKitClashes = hasColorClash(homeKit, awayTeam.away);
  
  // If away kit doesn't clash, use it
  if (!awayKitClashes) {
    console.log(`Using away kit for ${awayTeamName} against ${homeTeamName}`);
    return { kitType: 'away' };
  }
  
  // Check if third kit exists and doesn't clash
  if (awayTeam.third && !hasColorClash(homeKit, awayTeam.third)) {
    console.log(`Using third kit for ${awayTeamName} against ${homeTeamName}`);
    return { kitType: 'third' };
  }
  
  // If both away and third kits clash, generate a special kit
  const specialKit = generateSpecialKit(awayTeamName, homeKit);
  console.log(`Using special kit for ${awayTeamName} against ${homeTeamName}`);
  return { 
    kitType: 'special', 
    customKit: specialKit 
  };
};
