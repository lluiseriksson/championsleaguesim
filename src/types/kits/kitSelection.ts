

import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { parseHexColor, getColorDistance, areColorsConflicting, categorizeColor, ColorCategory } from './colorUtils';

// Cache for kit selections to avoid recalculating
const kitSelectionCache: Record<string, KitType> = {};

// Special case mappings for teams with known conflicts
const teamConflictOverrides: Record<string, Record<string, KitType>> = {
  // Add specific overrides for problematic team pairs
  'Athletic Bilbao': {
    'Union Berlin': 'third',
    'AC Milan': 'third',
    'Southampton': 'third'
  },
  'Union Berlin': {
    'Athletic Bilbao': 'third',
    'AC Milan': 'third',
    'Southampton': 'third'
  },
  'Ajax': {
    'Real Madrid': 'third'
  },
  'Real Madrid': {
    'Ajax': 'away'
  }
};

// Function to get the best contrasting kit for away team
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  // Check cache first to avoid expensive calculations
  const cacheKey = `${homeTeamName}:${awayTeamName}`;
  if (kitSelectionCache[cacheKey]) {
    return kitSelectionCache[cacheKey];
  }
  
  // Check if we have a specific override for this team pairing
  if (teamConflictOverrides[homeTeamName]?.[awayTeamName]) {
    const override = teamConflictOverrides[homeTeamName][awayTeamName];
    kitSelectionCache[cacheKey] = override;
    return override;
  }

  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    return 'away'; // Default to away kit if team not found
  }

  // Parse home team's primary home kit color
  const homeColor = homeTeam.home.primary;
  
  // Parse away team's kit colors
  const awayColor = awayTeam.away.primary;
  const thirdColor = awayTeam.third.primary;

  // Reduced logging to improve memory usage in tournaments
  const shouldLog = Object.keys(kitSelectionCache).length < 50;
  
  if (shouldLog) {
    console.log(`Kit color comparison for ${homeTeamName} vs ${awayTeamName}:`);
    console.log(`Home primary: ${homeColor} (${categorizeColor(homeColor)})`);
    console.log(`Away primary: ${awayColor} (${categorizeColor(awayColor)})`);
    console.log(`Third primary: ${thirdColor} (${categorizeColor(thirdColor)})`);
  }

  // Check for color conflicts using our categorization system
  const homeAwayConflict = areColorsConflicting(homeColor, awayColor);
  const homeThirdConflict = areColorsConflicting(homeColor, thirdColor);
  
  // Get secondary colors too for more comprehensive comparison
  const homeSecondary = homeTeam.home.secondary;
  const awaySecondary = awayTeam.away.secondary;
  const thirdSecondary = awayTeam.third.secondary;
  
  // Check secondary color conflicts
  const homeAwaySecondaryConflict = areColorsConflicting(homeSecondary, awaySecondary);
  const homeThirdSecondaryConflict = areColorsConflicting(homeSecondary, thirdSecondary);
  
  if (shouldLog) {
    console.log(`Home-Away conflict: ${homeAwayConflict}, secondary: ${homeAwaySecondaryConflict}`);
    console.log(`Home-Third conflict: ${homeThirdConflict}, secondary: ${homeThirdSecondaryConflict}`);
  }

  let selectedKit: KitType;
  
  // Improved decision logic:
  // 1. If a kit has no conflicts in either primary or secondary, use it
  // 2. If both kits have some conflicts, pick the one with fewer conflicts
  // 3. If all else equal, use distance-based selection
  
  const awayConflictScore = (homeAwayConflict ? 1 : 0) + (homeAwaySecondaryConflict ? 0.5 : 0);
  const thirdConflictScore = (homeThirdConflict ? 1 : 0) + (homeThirdSecondaryConflict ? 0.5 : 0);
  
  if (awayConflictScore < thirdConflictScore) {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} based on fewer conflicts`);
    }
    selectedKit = 'away';
  } 
  else if (thirdConflictScore < awayConflictScore) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} based on fewer conflicts`);
    }
    selectedKit = 'third';
  }
  // If conflict scores are equal, use traditional distance-based selection
  else {
    // Calculate color distances for traditional method
    const homeColorRgb = parseHexColor(homeColor);
    const awayColorRgb = parseHexColor(awayColor);
    const thirdColorRgb = parseHexColor(thirdColor);
    
    const homeToAwayDistance = getColorDistance(homeColorRgb, awayColorRgb);
    const homeToThirdDistance = getColorDistance(homeColorRgb, thirdColorRgb);
    
    if (shouldLog) {
      console.log(`Using distance-based selection: away=${homeToAwayDistance}, third=${homeToThirdDistance}`);
    }
    
    // Choose the kit with the greatest color distance from home team's kit
    if (homeToThirdDistance > homeToAwayDistance) {
      if (shouldLog) {
        console.log(`Selected third kit for ${awayTeamName} based on better contrast with ${homeTeamName}`);
      }
      selectedKit = 'third';
    } else {
      if (shouldLog) {
        console.log(`Selected away kit for ${awayTeamName} against ${homeTeamName}`);
      }
      selectedKit = 'away';
    }
  }
  
  // Save result to cache
  kitSelectionCache[cacheKey] = selectedKit;
  
  // If cache gets too large, clean up oldest entries
  if (Object.keys(kitSelectionCache).length > 200) {
    const keys = Object.keys(kitSelectionCache);
    for (let i = 0; i < 50; i++) {
      delete kitSelectionCache[keys[i]];
    }
  }
  
  return selectedKit;
};

// Add a function to clear the kit selection cache (can be called between tournaments)
export const clearKitSelectionCache = () => {
  for (const key in kitSelectionCache) {
    delete kitSelectionCache[key];
  }
  console.log("Kit selection cache cleared");
};
