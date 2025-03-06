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
  
  // Get home team's goalkeeper colors (which are typically the secondary color as primary)
  const homeGkPrimary = homeTeam.home.secondary;
  const homeGkSecondary = homeTeam.home.primary;
  
  // Parse away team's kit colors
  const awayColor = awayTeam.away.primary;
  const thirdColor = awayTeam.third.primary;

  // Reduced logging to improve memory usage in tournaments
  const shouldLog = Object.keys(kitSelectionCache).length < 50;
  
  if (shouldLog) {
    console.log(`Kit color comparison for ${homeTeamName} vs ${awayTeamName}:`);
    console.log(`Home primary: ${homeColor} (${categorizeColor(homeColor)})`);
    console.log(`Home GK primary: ${homeGkPrimary} (${categorizeColor(homeGkPrimary)})`);
    console.log(`Away primary: ${awayColor} (${categorizeColor(awayColor)})`);
    console.log(`Third primary: ${thirdColor} (${categorizeColor(thirdColor)})`);
  }

  // Check for color conflicts using our categorization system
  const homeAwayConflict = areColorsConflicting(homeColor, awayColor);
  const homeThirdConflict = areColorsConflicting(homeColor, thirdColor);
  
  // Check goalkeeper color conflicts
  const gkAwayConflict = areColorsConflicting(homeGkPrimary, awayColor);
  const gkThirdConflict = areColorsConflicting(homeGkPrimary, thirdColor);
  
  // Get secondary colors too for more comprehensive comparison
  const homeSecondary = homeTeam.home.secondary;
  const awaySecondary = awayTeam.away.secondary;
  const thirdSecondary = awayTeam.third.secondary;
  
  // Check secondary color conflicts
  const homeAwaySecondaryConflict = areColorsConflicting(homeSecondary, awaySecondary);
  const homeThirdSecondaryConflict = areColorsConflicting(homeSecondary, thirdSecondary);
  
  if (shouldLog) {
    console.log(`Home-Away conflict: ${homeAwayConflict}, secondary: ${homeAwaySecondaryConflict}, GK: ${gkAwayConflict}`);
    console.log(`Home-Third conflict: ${homeThirdConflict}, secondary: ${homeThirdSecondaryConflict}, GK: ${gkThirdConflict}`);
  }

  let selectedKit: KitType;
  
  // Improved decision logic:
  // 1. Consider both outfield player conflicts and goalkeeper conflicts
  // 2. If a kit has no conflicts in either primary or secondary with both outfield and GK, use it
  // 3. If both kits have some conflicts, pick the one with fewer total conflicts
  // 4. If all else equal, use distance-based selection
  
  // Calculate conflict scores (including GK conflicts with higher weight)
  const awayConflictScore = 
    (homeAwayConflict ? 1 : 0) + 
    (homeAwaySecondaryConflict ? 0.5 : 0) +
    (gkAwayConflict ? 1.5 : 0);  // Give higher weight to GK conflicts
    
  const thirdConflictScore = 
    (homeThirdConflict ? 1 : 0) + 
    (homeThirdSecondaryConflict ? 0.5 : 0) +
    (gkThirdConflict ? 1.5 : 0);  // Give higher weight to GK conflicts
  
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
    const homeGkColorRgb = parseHexColor(homeGkPrimary);
    
    const homeToAwayDistance = getColorDistance(homeColorRgb, awayColorRgb);
    const homeToThirdDistance = getColorDistance(homeColorRgb, thirdColorRgb);
    
    // Add goalkeeper distance calculations
    const gkToAwayDistance = getColorDistance(homeGkColorRgb, awayColorRgb);
    const gkToThirdDistance = getColorDistance(homeGkColorRgb, thirdColorRgb);
    
    // Combined distances (normal distance + GK distance)
    const totalAwayDistance = homeToAwayDistance + gkToAwayDistance;
    const totalThirdDistance = homeToThirdDistance + gkToThirdDistance;
    
    if (shouldLog) {
      console.log(`Using combined distance-based selection: away=${totalAwayDistance}, third=${totalThirdDistance}`);
    }
    
    // Choose the kit with the greatest combined color distance
    if (totalThirdDistance > totalAwayDistance) {
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
