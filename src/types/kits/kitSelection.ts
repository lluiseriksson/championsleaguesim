
import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { parseHexColor, getColorDistance, areColorsConflicting, categorizeColor, ColorCategory } from './colorUtils';

// Cache for kit selections to avoid recalculating
const kitSelectionCache: Record<string, KitType> = {};

// Function to get the best contrasting kit for away team
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  // Check cache first to avoid expensive calculations
  const cacheKey = `${homeTeamName}:${awayTeamName}`;
  if (kitSelectionCache[cacheKey]) {
    return kitSelectionCache[cacheKey];
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
  
  if (shouldLog) {
    console.log(`Home-Away conflict: ${homeAwayConflict}`);
    console.log(`Home-Third conflict: ${homeThirdConflict}`);
  }

  let selectedKit: KitType;
  
  // If neither kit conflicts, use traditional distance-based selection
  if (!homeAwayConflict && !homeThirdConflict) {
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
  // If only one kit doesn't conflict, use that
  else if (!homeAwayConflict) {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} as it doesn't conflict with ${homeTeamName}`);
    }
    selectedKit = 'away';
  }
  else if (!homeThirdConflict) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} as it doesn't conflict with ${homeTeamName}`);
    }
    selectedKit = 'third';
  }
  // If both kits conflict, use a fallback based on which might be least problematic
  else {
    // For this fallback, we'll use traditional color distance
    const homeColorRgb = parseHexColor(homeColor);
    const awayColorRgb = parseHexColor(awayColor);
    const thirdColorRgb = parseHexColor(thirdColor);
    
    const homeToAwayDistance = getColorDistance(homeColorRgb, awayColorRgb);
    const homeToThirdDistance = getColorDistance(homeColorRgb, thirdColorRgb);
    
    if (shouldLog) {
      console.log(`Both kits conflict, falling back to distance: away=${homeToAwayDistance}, third=${homeToThirdDistance}`);
    }
    
    // Use the kit with the greater distance when both conflict
    if (homeToThirdDistance > homeToAwayDistance) {
      if (shouldLog) {
        console.log(`Fallback to third kit for ${awayTeamName} despite conflict with ${homeTeamName}`);
      }
      selectedKit = 'third';
    } else {
      if (shouldLog) {
        console.log(`Fallback to away kit for ${awayTeamName} despite conflict with ${homeTeamName}`);
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
