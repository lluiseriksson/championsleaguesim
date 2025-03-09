export type KitType = 'home' | 'away' | 'third' | 'special';

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

export function adjustGreenKitForPitchContrast(color: string): string {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  const isPitchGreen = 
    g > Math.max(r, b) && 
    g > 100 && 
    r < 80 && 
    b < 80;
    
  if (isPitchGreen) {
    const lightenedR = Math.min(255, r + 100);
    const lightenedG = Math.min(255, g + 70);
    const lightenedB = Math.min(255, b + 50);
    
    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  }
  
  return color;
}

export function isColorTooCloseToField(color: string): boolean {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  const pitchR = 42;
  const pitchG = 124;
  const pitchB = 53;
  
  const distance = Math.sqrt(
    Math.pow(r - pitchR, 2) * 0.3 + 
    Math.pow(g - pitchG, 2) * 0.6 + 
    Math.pow(b - pitchB, 2) * 0.1
  );
  
  return distance < 60;
}

export const goalkeeperKitOptions = {
  vividPurple: {
    primary: '#8B5CF6',
    secondary: '#D946EF',
    accent: '#FFFFFF'
  },
  brightOrange: {
    primary: '#F97316',
    secondary: '#0EA5E9',
    accent: '#FFFFFF'
  },
  neonGreen: {
    primary: '#4ADE80',
    secondary: '#2DD4BF',
    accent: '#000000'
  },
  hotPink: {
    primary: '#EC4899',
    secondary: '#F43F5E',
    accent: '#000000'
  },
  highVisYellow: {
    primary: '#FACC15',
    secondary: '#000000',
    accent: '#FFFFFF'
  },
  electricBlue: {
    primary: '#3B82F6',
    secondary: '#FFFFFF',
    accent: '#000000'
  }
};

let homeGoalkeeperKit: string | null = null;
let awayGoalkeeperKit: string | null = null;

export function resetUsedGoalkeeperKits(): void {
  homeGoalkeeperKit = null;
  awayGoalkeeperKit = null;
}

export function selectGoalkeeperKit(
  teamName: string,
  opposingTeamName: string | undefined,
  teamPrimaryColor: string,
  teamSecondaryColor: string,
  opposingTeamPrimaryColor?: string,
  isHomeTeam?: boolean
): TeamKitColors {
  const r = parseInt(teamPrimaryColor.slice(1, 3), 16);
  const g = parseInt(teamPrimaryColor.slice(3, 5), 16);
  const b = parseInt(teamPrimaryColor.slice(5, 7), 16);
  
  const kitOptions = Object.entries(goalkeeperKitOptions);
  let rankedKits: Array<{kit: TeamKitColors, distance: number, name: string}> = [];
  
  for (const [kitName, kit] of kitOptions) {
    const kitR = parseInt(kit.primary.slice(1, 3), 16);
    const kitG = parseInt(kit.primary.slice(3, 5), 16);
    const kitB = parseInt(kit.primary.slice(5, 7), 16);
    
    const distanceToTeam = Math.sqrt(
      Math.pow(r - kitR, 2) + 
      Math.pow(g - kitG, 2) + 
      Math.pow(b - kitB, 2)
    );
    
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
    
    rankedKits.push({ kit, distance: totalDistance, name: kitName });
  }
  
  rankedKits.sort((a, b) => b.distance - a.distance);
  
  if (isHomeTeam) {
    const bestKit = rankedKits[0];
    homeGoalkeeperKit = bestKit.name;
    
    console.log(`Selected home goalkeeper kit for ${teamName}: ${bestKit.kit.primary} (${bestKit.name})`);
    return bestKit.kit;
  } 
  else {
    if (homeGoalkeeperKit) {
      const availableKits = rankedKits.filter(k => k.name !== homeGoalkeeperKit);
      
      if (availableKits.length > 0) {
        const bestAwayKit = availableKits[0];
        awayGoalkeeperKit = bestAwayKit.name;
        
        console.log(`Selected away goalkeeper kit for ${teamName}: ${bestAwayKit.kit.primary} (${bestAwayKit.name})`);
        return bestAwayKit.kit;
      }
    }
    
    const secondBestKit = rankedKits.length > 1 ? rankedKits[1] : rankedKits[0];
    awayGoalkeeperKit = secondBestKit.name;
    
    console.log(`Selected away goalkeeper kit for ${teamName}: ${secondBestKit.kit.primary} (${secondBestKit.name})`);
    return secondBestKit.kit;
  }
}
