export type KitType = 'home' | 'away' | 'third';

export type TeamKitColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TeamKit = {
  home: TeamKitColors;
  away: TeamKitColors;
  third: TeamKitColors;
  goalkeeper: TeamKitColors;
};

export type TeamColors = {
  [key: string]: TeamKit;
};

// Function to adjust green kits to improve contrast with the pitch
export function adjustGreenKitForPitchContrast(color: string): string {
  // Parse the hex color to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // Check if the color is in the "green" range
  // The pitch color is approximately #2a7c35 (RGB: 42, 124, 53)
  // We need to detect if this color is too close to the pitch color
  const isPitchGreen = 
    g > Math.max(r, b) && // Green is dominant
    g > 100 &&            // Green is reasonably high
    r < 80 &&             // Red is low (typical for greens)
    b < 80;               // Blue is low (typical for greens)
    
  if (isPitchGreen) {
    // Options to adjust the green kit:
    
    // 1. Lighten the color significantly
    const lightenedR = Math.min(255, r + 100);
    const lightenedG = Math.min(255, g + 70);
    const lightenedB = Math.min(255, b + 50);
    
    // Convert back to hex
    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  }
  
  // If not a pitch-like green, return the original color
  return color;
}

// Function to check if a color is too close to the pitch color
export function isColorTooCloseToField(color: string): boolean {
  // Parse the hex color to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // The pitch color is approximately #2a7c35 (RGB: 42, 124, 53)
  const pitchR = 42;
  const pitchG = 124;
  const pitchB = 53;
  
  // Calculate the color distance using a weighted euclidean distance
  // Giving more weight to green channel differences
  const distance = Math.sqrt(
    Math.pow(r - pitchR, 2) * 0.3 + 
    Math.pow(g - pitchG, 2) * 0.6 + 
    Math.pow(b - pitchB, 2) * 0.1
  );
  
  // Return true if the color is too close to the pitch color
  return distance < 60;
}

// Goalkeeper kit options for high visibility
export const goalkeeperKitOptions = {
  vividPurple: {
    primary: '#8B5CF6', // Vivid purple
    secondary: '#D946EF', // Magenta pink
    accent: '#FFFFFF'
  },
  brightOrange: {
    primary: '#F97316', // Bright orange
    secondary: '#0EA5E9', // Ocean blue
    accent: '#FFFFFF'
  },
  neonGreen: {
    primary: '#4ADE80', // Neon green
    secondary: '#2DD4BF', // Teal
    accent: '#000000'
  },
  hotPink: {
    primary: '#EC4899', // Hot pink
    secondary: '#F43F5E', // Rose
    accent: '#000000'
  }
};

// Function to select the best goalkeeper kit based on team colors
export function selectGoalkeeperKit(
  teamName: string,
  opposingTeamName: string | undefined,
  teamPrimaryColor: string,
  teamSecondaryColor: string,
  opposingTeamPrimaryColor?: string
): TeamKitColors {
  // Parse the team's colors
  const r = parseInt(teamPrimaryColor.slice(1, 3), 16);
  const g = parseInt(teamPrimaryColor.slice(3, 5), 16);
  const b = parseInt(teamPrimaryColor.slice(5, 7), 16);
  
  // Get an array of all goalkeeper kit options
  const kitOptions = Object.values(goalkeeperKitOptions);
  let bestKit = kitOptions[0];
  let maxDistance = 0;
  
  // Find the kit with maximum color distance from both teams
  for (const kit of kitOptions) {
    // Parse the kit primary color
    const kitR = parseInt(kit.primary.slice(1, 3), 16);
    const kitG = parseInt(kit.primary.slice(3, 5), 16);
    const kitB = parseInt(kit.primary.slice(5, 7), 16);
    
    // Calculate distance to home team color
    const distanceToTeam = Math.sqrt(
      Math.pow(r - kitR, 2) + 
      Math.pow(g - kitG, 2) + 
      Math.pow(b - kitB, 2)
    );
    
    // Add distance to opposing team if available
    let totalDistance = distanceToTeam;
    if (opposingTeamPrimaryColor) {
      const oppR = parseInt(opposingTeamPrimaryColor.slice(1, 3), 16);
      const oppG = parseInt(opposingTeamPrimaryColor.slice(3, 5), 16);
      const oppB = parseInt(opposingTeamPrimaryColor.slice(5, 7), 16);
      
      const distanceToOpponent = Math.sqrt(
        Math.pow(oppR - kitR, 2) + 
        Math.pow(oppG - kitG, 2) + 
        Math.pow(oppB - kitB, 2)
      );
      
      totalDistance += distanceToOpponent;
    }
    
    // Update best kit if this one has better distance
    if (totalDistance > maxDistance) {
      maxDistance = totalDistance;
      bestKit = kit;
    }
  }
  
  // Add some logging for diagnostics
  console.log(`Selected goalkeeper kit for ${teamName}: ${bestKit.primary}`);
  
  return bestKit;
}
