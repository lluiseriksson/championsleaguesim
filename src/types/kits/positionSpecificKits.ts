
import { teamKitColors } from './teamColorsData';
import { KitType, TeamKit, TeamKitColors } from './kitTypes';
import { 
  getColorDistance, 
  parseHexColor, 
  areColorsSufficientlyDifferent,
  getEnhancedColorDistance
} from './colorUtils';

// Define positions we need to check
export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';

// Interface for results of position-specific kit selection
export interface KitSelectionResult {
  awayTeamKitType: KitType;  // Main kit type for outfield players
  positionSpecificKits?: Record<PlayerPosition, KitType>; // Optional overrides for specific positions
  needsSpecialKit: boolean;  // Indicates if a special fourth kit is needed
  conflictDescription?: string; // Explanation of conflicts for debugging
}

// Cache for kit selection results to avoid recalculations
const positionKitCache: Record<string, KitSelectionResult> = {};

// Teams with known dark kit conflicts (e.g., black vs black)
const darkKitConflictTeams: [string, string][] = [
  ['RB Leipzig', 'Rangers'],
  ['RB Leipzig', 'Braga'],
  ['AC Milan', 'Athletic Bilbao'],
  ['Brest', 'Krasnodar'] // Adding Brest vs Krasnodar as they have similar red kits
];

// Check if teams have a known dark kit conflict
const hasDarkKitConflict = (team1: string, team2: string): boolean => {
  return darkKitConflictTeams.some(
    ([a, b]) => (a === team1 && b === team2) || (a === team2 && b === team1)
  );
};

/**
 * Determines the optimal kit selection for the away team based on position-specific color conflicts
 * with the home team.
 * 
 * Home team always uses their primary kit. Away team selects the most distinct kit to avoid conflicts.
 * 
 * @param homeTeamName - Name of the home team
 * @param awayTeamName - Name of the away team
 * @returns Kit selection result with decision on which kit the away team should use
 */
export function getPositionSpecificKits(
  homeTeamName: string, 
  awayTeamName: string
): KitSelectionResult {
  // Check cache first
  const cacheKey = `${homeTeamName}:${awayTeamName}`;
  if (positionKitCache[cacheKey]) {
    return positionKitCache[cacheKey];
  }

  // Get team kits
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    return { 
      awayTeamKitType: 'away', 
      needsSpecialKit: false 
    };
  }
  
  // Check for known dark kit conflicts
  if (hasDarkKitConflict(homeTeamName, awayTeamName)) {
    console.log(`Known kit conflict between ${homeTeamName} and ${awayTeamName}`);
    // For known conflicts, use the third kit as it's usually designed for maximum contrast
    return {
      awayTeamKitType: 'third',
      needsSpecialKit: false,
      conflictDescription: `Known kit conflict between ${homeTeamName} and ${awayTeamName}. Using third kit.`
    };
  }

  // Extract home team colors for each position
  const homeGkColors = homeTeam.goalkeeper;
  const homeOutfieldColors = homeTeam.home;

  // Extract away team options - check both away and third kits
  const awayKitColors = awayTeam.away;
  const thirdKitColors = awayTeam.third;
  const awayGkColors = awayTeam.goalkeeper;

  // Track conflicts for each position - define with all required kit types
  const positionConflicts: Record<PlayerPosition, Record<KitType, number>> = {
    goalkeeper: { home: 0, away: 0, third: 0, special: 0 },
    defender: { home: 0, away: 0, third: 0, special: 0 },
    midfielder: { home: 0, away: 0, third: 0, special: 0 },
    forward: { home: 0, away: 0, third: 0, special: 0 }
  };

  // Check goalkeeper conflicts (highest priority)
  // Away GK vs Home outfield
  if (!areColorsSufficientlyDifferent(homeOutfieldColors.primary, awayGkColors.primary)) {
    positionConflicts.goalkeeper.away += 2;
  }
  
  // Third GK vs Home outfield
  if (!areColorsSufficientlyDifferent(homeOutfieldColors.primary, awayGkColors.primary)) {
    positionConflicts.goalkeeper.third += 2;
  }

  // Check outfield players conflicts
  // Away kit vs Home GK
  if (!areColorsSufficientlyDifferent(homeGkColors.primary, awayKitColors.primary)) {
    positionConflicts.defender.away += 1;
    positionConflicts.midfielder.away += 1;
    positionConflicts.forward.away += 1;
  }
  
  // Third kit vs Home GK
  if (!areColorsSufficientlyDifferent(homeGkColors.primary, thirdKitColors.primary)) {
    positionConflicts.defender.third += 1;
    positionConflicts.midfielder.third += 1;
    positionConflicts.forward.third += 1;
  }

  // Away kit vs Home outfield
  if (!areColorsSufficientlyDifferent(homeOutfieldColors.primary, awayKitColors.primary)) {
    positionConflicts.defender.away += 2;
    positionConflicts.midfielder.away += 2;
    positionConflicts.forward.away += 2;
  }
  
  // Third kit vs Home outfield
  if (!areColorsSufficientlyDifferent(homeOutfieldColors.primary, thirdKitColors.primary)) {
    positionConflicts.defender.third += 2;
    positionConflicts.midfielder.third += 2;
    positionConflicts.forward.third += 2;
  }

  // Calculate distances for more nuanced decisions
  const homeOutfieldRgb = parseHexColor(homeOutfieldColors.primary);
  const homeGkRgb = parseHexColor(homeGkColors.primary);
  const awayKitRgb = parseHexColor(awayKitColors.primary);
  const thirdKitRgb = parseHexColor(thirdKitColors.primary);
  
  const awayVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, awayKitRgb);
  const thirdVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, thirdKitRgb);
  const awayVsGkDistance = getEnhancedColorDistance(homeGkRgb, awayKitRgb);
  const thirdVsGkDistance = getEnhancedColorDistance(homeGkRgb, thirdKitRgb);

  // For debugging
  console.log(`${homeTeamName} (home) vs ${awayTeamName} (away) kit distances:`);
  console.log(`Home primary: ${homeOutfieldColors.primary}`);
  console.log(`Away kit: ${awayKitColors.primary}, distance: ${awayVsHomeDistance.toFixed(0)}`);
  console.log(`Third kit: ${thirdKitColors.primary}, distance: ${thirdVsHomeDistance.toFixed(0)}`);

  // Determine the best overall kit for outfield players
  let mainKitType: KitType = 'away';
  let needsSpecialKit = false;
  
  // Calculate aggregate conflict scores
  const awayConflictScore = 
    positionConflicts.defender.away + 
    positionConflicts.midfielder.away + 
    positionConflicts.forward.away;
    
  const thirdConflictScore = 
    positionConflicts.defender.third + 
    positionConflicts.midfielder.third + 
    positionConflicts.forward.third;
  
  // If the away kit has fewer conflicts, use it
  if (awayConflictScore < thirdConflictScore) {
    mainKitType = 'away';
  } 
  // If the third kit has fewer conflicts, use it
  else if (thirdConflictScore < awayConflictScore) {
    mainKitType = 'third';
  }
  // If conflicts are equal, use the kit with better color distance
  else {
    // Combine distances, giving more weight to outfield player distinction
    const totalAwayDistance = awayVsHomeDistance * 1.5 + awayVsGkDistance;
    const totalThirdDistance = thirdVsHomeDistance * 1.5 + thirdVsGkDistance;
    
    // Choose the kit with the greater distance (more distinct)
    mainKitType = totalThirdDistance > totalAwayDistance ? 'third' : 'away';
    
    console.log(`Kit distances - Away total: ${totalAwayDistance.toFixed(0)}, Third total: ${totalThirdDistance.toFixed(0)}`);
    console.log(`Selected ${mainKitType} kit for ${awayTeamName} based on better contrast`);
  }
  
  // Check if we need position-specific overrides
  const positionSpecificKits: Record<PlayerPosition, KitType> = {
    goalkeeper: 'away', // Default GK kit
    defender: mainKitType,
    midfielder: mainKitType,
    forward: mainKitType
  };
  
  // Special case: If all options have significant conflicts
  if (awayConflictScore > 3 && thirdConflictScore > 3) {
    needsSpecialKit = true;
    console.log(`Both away and third kits have significant conflicts, marking need for special kit`);
  }
  
  // Build conflict description for debugging
  const conflictDescription = `
    Home team: ${homeTeamName} (Outfield: ${homeOutfieldColors.primary}, GK: ${homeGkColors.primary})
    Away team: ${awayTeamName}
    Away kit conflicts: ${awayConflictScore} (distance: ${awayVsHomeDistance.toFixed(0)})
    Third kit conflicts: ${thirdConflictScore} (distance: ${thirdVsHomeDistance.toFixed(0)})
    Selected main kit: ${mainKitType}
    Needs special kit: ${needsSpecialKit}
  `;
  
  // Create result object
  const result: KitSelectionResult = {
    awayTeamKitType: mainKitType,
    positionSpecificKits,
    needsSpecialKit,
    conflictDescription
  };
  
  // Save to cache
  positionKitCache[cacheKey] = result;
  
  return result;
}

/**
 * Clear the position-specific kit selection cache
 */
export function clearPositionKitCache(): void {
  Object.keys(positionKitCache).forEach(key => {
    delete positionKitCache[key];
  });
}

/**
 * Generate a special fourth kit for extreme conflict cases
 * @param baseKit The base team kit to modify
 * @param homeTeamColors The home team colors to avoid conflicts with
 * @returns A modified kit with distinct colors
 */
export function generateSpecialKit(
  baseKit: TeamKitColors,
  homeTeamColors: TeamKitColors
): TeamKitColors {
  // Create vibrant alternatives that will be distinct from both teams
  const specialColors = [
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#FFFF00", // Yellow
    "#FF5733", // Coral
    "#8A2BE2", // Blue Violet
    "#00FF7F", // Spring Green
    "#FF1493", // Deep Pink
    "#FF8C00"  // Dark Orange
  ];
  
  // Find colors with maximum contrast to home team colors
  let bestColor = specialColors[0];
  let maxDistance = 0;
  
  const homeOutfieldRgb = parseHexColor(homeTeamColors.primary);
  const homeGkRgb = parseHexColor(homeTeamColors.primary);
  
  for (const color of specialColors) {
    const colorRgb = parseHexColor(color);
    const distToOutfield = getEnhancedColorDistance(homeOutfieldRgb, colorRgb);
    const distToGk = getEnhancedColorDistance(homeGkRgb, colorRgb);
    const totalDist = distToOutfield + distToGk;
    
    if (totalDist > maxDistance) {
      maxDistance = totalDist;
      bestColor = color;
    }
  }
  
  console.log(`Generated special kit with color ${bestColor} for maximum contrast`);
  
  // Create a special kit based on the best contrasting color
  return {
    primary: bestColor,
    secondary: "#FFFFFF", // White is usually a safe secondary
    accent: "#000000"     // Black accent for contrast
  };
}
