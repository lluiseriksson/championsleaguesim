
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
};

export type TeamColors = {
  [key: string]: TeamKit;
};

export const teamKitColors: TeamColors = {
  "Liverpool": {
    home: { primary: "#C8102E", secondary: "#FFFFFF", accent: "#000000" },
    away: { primary: "#000000", secondary: "#F6F6F6", accent: "#C8102E" },
    third: { primary: "#C3C4BC", secondary: "#000000", accent: "#C8102E" }
  },
  "Arsenal": {
    home: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#000000" },
    away: { primary: "#DAA520", secondary: "#000000", accent: "#DAA520" },
    third: { primary: "#000080", secondary: "#FFFFFF", accent: "#000080" }
  },
  "Real Madrid": {
    home: { primary: "#FFFFFF", secondary: "#00579C", accent: "#FFFFFF" },
    away: { primary: "#7030A0", secondary: "#FFFFFF", accent: "#7030A0" },
    third: { primary: "#000000", secondary: "#EE7700", accent: "#000000" }
  },
  "Paris SG": {
    home: { primary: "#004165", secondary: "#EE0A64", accent: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#004165", accent: "#EE0A64" },
    third: { primary: "#000000", secondary: "#BEBEBE", accent: "#000000" }
  },
  "Inter": {
    home: { primary: "#0000CD", secondary: "#000000", accent: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#0000CD", accent: "#000000" },
    third: { primary: "#2F4F4F", secondary: "#FFFFFF", accent: "#2F4F4F" }
  },
  "Barcelona": {
    home: { primary: "#004D98", secondary: "#A50044", accent: "#FDEE21" },
    away: { primary: "#FFFFFF", secondary: "#004D98", accent: "#A50044" },
    third: { primary: "#65C6BB", secondary: "#000000", accent: "#65C6BB" }
  },
  "Man City": {
    home: { primary: "#6CABDD", secondary: "#FFFFFF", accent: "#6CABDD" },
    away: { primary: "#000000", secondary: "#6CABDD", accent: "#FFFFFF" },
    third: { primary: "#FDEE21", secondary: "#000000", accent: "#FDEE21" }
  },
  "Bayern": {
    home: { primary: "#DC000D", secondary: "#FFFFFF", accent: "#DC000D" },
    away: { primary: "#FFFFFF", secondary: "#DC000D", accent: "#000000" },
    third: { primary: "#000000", secondary: "#FFFFFF", accent: "#DC000D" }
  },
  "Leverkusen": {
    home: { primary: "#DC000D", secondary: "#000000", accent: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#DC000D", accent: "#000000" },
    third: { primary: "#808080", secondary: "#DC000D", accent: "#000000" }
  },
  "Atlético": {
    home: { primary: "#AB0520", secondary: "#FFFFFF", accent: "#002254" },
    away: { primary: "#002254", secondary: "#AB0520", accent: "#FFFFFF" },
    third: { primary: "#000000", secondary: "#F2F2F2", accent: "#000000" }
  },
  "Atalanta": {
    home: { primary: "#000080", secondary: "#000000", accent: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#000080", accent: "#000000" },
    third: { primary: "#808080", secondary: "#000080", accent: "#000000" }
  },
  "Chelsea": {
    home: { primary: "#034694", secondary: "#FFFFFF", accent: "#FFFF00" },
    away: { primary: "#FFFFFF", secondary: "#034694", accent: "#000000" },
    third: { primary: "#000000", secondary: "#034694", accent: "#FFFF00" }
  },
  "Juventus": {
    home: { primary: "#FFFFFF", secondary: "#000000", accent: "#FFFFFF" },
    away: { primary: "#000000", secondary: "#FFFFFF", accent: "#000000" },
    third: { primary: "#A50044", secondary: "#FFFFFF", accent: "#A50044" }
  },
  "Napoli": {
    home: { primary: "#007AB8", secondary: "#FFFFFF", accent: "#007AB8" },
    away: { primary: "#FFFFFF", secondary: "#007AB8", accent: "#000000" },
    third: { primary: "#000000", secondary: "#007AB8", accent: "#FFFFFF" }
  },
  "Newcastle": {
    home: { primary: "#000000", secondary: "#FFFFFF", accent: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#000000", accent: "#000000" },
    third: { primary: "#ADD8E6", secondary: "#000000", accent: "#FFFFFF" }
  },
  "Bilbao": {
    home: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#000000" },
    away: { primary: "#000000", secondary: "#FF0000", accent: "#FFFFFF" },
    third: { primary: "#008000", secondary: "#FFFFFF", accent: "#000000" }
  },
  "Aston Villa": {
    home: { primary: "#472677", secondary: "#C2E0FF", accent: "#472677" },
    away: { primary: "#C2E0FF", secondary: "#472677", accent: "#000000" },
    third: { primary: "#90EE90", secondary: "#472677", accent: "#000000" }
  },
  "Crystal Palace": {
    home: { primary: "#C41E3A", secondary: "#FFFFFF", accent: "#051937" },
    away: { primary: "#FFFFFF", secondary: "#C41E3A", accent: "#051937" },
    third: { primary: "#051937", secondary: "#C41E3A", accent: "#FFFFFF" }
  },
  "Lille": {
    home: { primary: "#C8102E", secondary: "#FFFFFF", accent: "#000000" },
    away: { primary: "#FFFFFF", secondary: "#C8102E", accent: "#000000" },
    third: { primary: "#0000CD", secondary: "#FFFFFF", accent: "#C8102E" }
  },
  "Bournemouth": {
    home: { primary: "#E62329", secondary: "#000000", accent: "#FFFFFF" },
    away: { primary: "#F5F5DC", secondary: "#E62329", accent: "#000000" },
    third: { primary: "#000000", secondary: "#E62329", accent: "#FFFFFF" }
  },
  "Tottenham": {
    home: { primary: "#FFFFFF", secondary: "#000000", accent: "#FFFFFF" },
    away: { primary: "#0E172A", secondary: "#FFFFFF", accent: "#000000" },
    third: { primary: "#008080", secondary: "#FFFFFF", accent: "#000000" }
  },
  "PSV": {
    home: { primary: "#ED7100", secondary: "#FFFFFF", accent: "#ED7100" },
    away: { primary: "#0000FF", secondary: "#FFFFFF", accent: "#ED7100" },
    third: { primary: "#000000", secondary: "#ED7100", accent: "#FFFFFF" }
  },
  "Lazio": {
    home: { primary: "#87CEFA", secondary: "#FFFFFF", accent: "#87CEFA" },
    away: { primary: "#000000", secondary: "#87CEFA", accent: "#FFFFFF" },
    third: { primary: "#000080", secondary: "#FFFFFF", accent: "#87CEFA" }
  },
  "Roma": {
    home: { primary: "#A52A2A", secondary: "#FFD700", accent: "#FFFFFF" },
    away: { primary: "#FFFFFF", secondary: "#A52A2A", accent: "#FFD700" },
    third: { primary: "#000000", secondary: "#FFD700", accent: "#FFFFFF" }
  },
  "Benfica": {
    home: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#FF0000" },
    away: { primary: "#FFFFFF", secondary: "#FF0000", accent: "#000000" },
    third: { primary: "#000000", secondary: "#FF0000", accent: "#FFFFFF" }
  },
  "Brighton": {
    home: { primary: "#0057B8", secondary: "#FFFFFF", accent: "#0057B8" },
    away: { primary: "#FDEE21", secondary: "#0057B8", accent: "#000000" },
    third: { primary: "#000000", secondary: "#0057B8", accent: "#FDEE21" }
  },
  "Forest": {
    home: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#000000" },
    away: { primary: "#FAF0E6", secondary: "#FF0000", accent: "#000000" },
    third: { primary: "#008000", secondary: "#FFFFFF", accent: "#000000" }
  },
  "Sporting": {
    home: { primary: "#008000", secondary: "#FFFFFF", accent: "#FFFF00" },
    away: { primary: "#FFFFFF", secondary: "#008000", accent: "#FFFF00" },
    third: { primary: "#000000", secondary: "#008000", accent: "#FFFF00" }
  },
  "Dortmund": {
    home: { primary: "#FFD700", secondary: "#000000", accent: "#FFFFFF" },
    away: { primary: "#000000", secondary: "#FFD700", accent: "#FFFFFF" },
    third: { primary: "#D3D3D3", secondary: "#000000", accent: "#FFD700" }
  }
};

// Function to get the best contrasting kit for away team
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    return 'away'; // Default to away kit if team not found
  }

  // Calculate color distance between home team's primary home kit and away team's kits
  const homeColor = parseHexColor(homeTeam.home.primary);
  const awayColor = parseHexColor(awayTeam.away.primary);
  const thirdColor = parseHexColor(awayTeam.third.primary);
  
  // Calculate color distances
  const homeToAwayDistance = getColorDistance(homeColor, awayColor);
  const homeToThirdDistance = getColorDistance(homeColor, thirdColor);
  
  // Choose the kit with the greatest color distance from home team's kit
  return homeToAwayDistance > homeToThirdDistance ? 'away' : 'third';
};

// Function to get team kit color based on the team name and kit type
export const getTeamKitColor = (teamName: string | undefined, kitType: KitType = 'home'): string => {
  if (!teamName || !teamKitColors[teamName]) {
    // Default fallback colors
    return kitType === 'home' ? '#FF0000' : 
           kitType === 'away' ? '#0000FF' : '#FFFFFF';
  }
  
  return teamKitColors[teamName][kitType].primary;
};

// Function to get all team kit colors for a specific kit type
export const getTeamKitColors = (teamName: string | undefined, kitType: KitType = 'home'): TeamKitColors => {
  if (!teamName || !teamKitColors[teamName]) {
    // Default fallback colors
    return {
      primary: kitType === 'home' ? '#FF0000' : kitType === 'away' ? '#0000FF' : '#FFFFFF',
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

// Helper function to parse hex color to RGB
function parseHexColor(hex: string): { r: number, g: number, b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return { r, g, b };
}

// Helper function to calculate color distance (Euclidean distance in RGB space)
function getColorDistance(color1: { r: number, g: number, b: number }, color2: { r: number, g: number, b: number }): number {
  return Math.sqrt(
    Math.pow(color2.r - color1.r, 2) +
    Math.pow(color2.g - color1.g, 2) +
    Math.pow(color2.b - color1.b, 2)
  );
}
