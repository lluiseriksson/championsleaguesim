
import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { 
  parseHexColor, 
  getColorDistance, 
  areColorsConflicting, 
  categorizeColor, 
  ColorCategory,
  getEnhancedColorDistance,
  areColorsSufficientlyDifferent
} from './colorUtils';

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
  },
  // Add the Milan vs FC København conflict
  'AC Milan': {
    'FC København': 'third'
  },
  'FC København': {
    'AC Milan': 'away'
  },
  // Add more red team conflicts
  'Liverpool': {
    'Manchester United': 'third',
    'FC København': 'third',
    'AC Milan': 'third'
  },
  'Manchester United': {
    'Liverpool': 'third',
    'FC København': 'third',
    'AC Milan': 'third'
  },
  'Bayern Munich': {
    'FC København': 'third',
    'AC Milan': 'third'
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

  // Parse home team colors (players and goalkeeper)
  const homeOutfieldPrimary = homeTeam.home.primary;
  const homeOutfieldSecondary = homeTeam.home.secondary;
  const homeGkPrimary = homeTeam.goalkeeper.primary;
  const homeGkSecondary = homeTeam.goalkeeper.secondary;
  
  // Parse away team kit colors
  const awayPrimary = awayTeam.away.primary;
  const awaySecondary = awayTeam.away.secondary;
  const thirdPrimary = awayTeam.third.primary;
  const thirdSecondary = awayTeam.third.secondary;

  // Reduced logging to improve memory usage in tournaments
  const shouldLog = Object.keys(kitSelectionCache).length < 50;
  
  if (shouldLog) {
    console.log(`Kit color comparison for ${homeTeamName} vs ${awayTeamName}:`);
    console.log(`Home outfield primary: ${homeOutfieldPrimary} (${categorizeColor(homeOutfieldPrimary)})`);
    console.log(`Home GK primary: ${homeGkPrimary} (${categorizeColor(homeGkPrimary)})`);
    console.log(`Away kit primary: ${awayPrimary} (${categorizeColor(awayPrimary)})`);
    console.log(`Third kit primary: ${thirdPrimary} (${categorizeColor(thirdPrimary)})`);
  }

  // ENHANCED: More strict color conflict detection for RED teams
  const homeCategory = categorizeColor(homeOutfieldPrimary);
  const awayCategory = categorizeColor(awayPrimary);
  const thirdCategory = categorizeColor(thirdPrimary);
  
  // Special handling for RED teams - use third kit immediately if both are red
  if (homeCategory === ColorCategory.RED && awayCategory === ColorCategory.RED) {
    if (shouldLog) {
      console.log(`RED vs RED conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }
  
  // Also check BURGUNDY which can look like RED
  if ((homeCategory === ColorCategory.RED && awayCategory === ColorCategory.BURGUNDY) ||
      (homeCategory === ColorCategory.BURGUNDY && awayCategory === ColorCategory.RED)) {
    if (shouldLog) {
      console.log(`RED vs BURGUNDY conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }

  // Check outfield player conflicts
  const awayVsHomeOutfieldConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayPrimary);
  const thirdVsHomeOutfieldConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, thirdPrimary);
  
  // Check goalkeeper conflicts 
  const awayVsHomeGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, awayPrimary);
  const thirdVsHomeGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, thirdPrimary);

  // Also check secondary colors
  const awaySecondaryVsHomeConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awaySecondary);
  const thirdSecondaryVsHomeConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, thirdSecondary);
  
  // And secondary kit vs GK
  const awaySecondaryVsGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, awaySecondary);
  const thirdSecondaryVsGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, thirdSecondary);
  
  if (shouldLog) {
    console.log(`Away vs Home conflicts: outfield=${awayVsHomeOutfieldConflict}, GK=${awayVsHomeGkConflict}`);
    console.log(`Third vs Home conflicts: outfield=${thirdVsHomeOutfieldConflict}, GK=${thirdVsHomeGkConflict}`);
  }
  
  // Calculate conflict scores for each kit
  // Higher weight to goalkeeper conflicts since they're particularly problematic
  const awayKitConflictScore = 
    (awayVsHomeOutfieldConflict ? 1.0 : 0) + 
    (awayVsHomeGkConflict ? 1.5 : 0) + 
    (awaySecondaryVsHomeConflict ? 0.3 : 0) + 
    (awaySecondaryVsGkConflict ? 0.5 : 0);
  
  const thirdKitConflictScore = 
    (thirdVsHomeOutfieldConflict ? 1.0 : 0) + 
    (thirdVsHomeGkConflict ? 1.5 : 0) + 
    (thirdSecondaryVsHomeConflict ? 0.3 : 0) + 
    (thirdSecondaryVsGkConflict ? 0.5 : 0);
  
  if (shouldLog) {
    console.log(`Conflict scores: away=${awayKitConflictScore}, third=${thirdKitConflictScore}`);
  }
  
  // If one kit has no conflicts at all, use it immediately
  if (awayKitConflictScore === 0 && thirdKitConflictScore > 0) {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} (no conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'away';
    return 'away';
  }
  
  if (thirdKitConflictScore === 0 && awayKitConflictScore > 0) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} (no conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }
  
  // If both have some conflicts, use the one with lower conflict score
  if (awayKitConflictScore < thirdKitConflictScore) {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} (fewer conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'away';
    return 'away';
  } 
  
  if (thirdKitConflictScore < awayKitConflictScore) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} (fewer conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }
  
  // If conflict scores are equal or both zero, fall back to numerical color distance
  const homeOutfieldRgb = parseHexColor(homeOutfieldPrimary);
  const homeGkRgb = parseHexColor(homeGkPrimary);
  const awayRgb = parseHexColor(awayPrimary);
  const thirdRgb = parseHexColor(thirdPrimary);
  
  // Calculate enhanced color distances that better represent visual distinction
  const awayVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, awayRgb);
  const thirdVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, thirdRgb);
  const awayVsGkDistance = getEnhancedColorDistance(homeGkRgb, awayRgb);
  const thirdVsGkDistance = getEnhancedColorDistance(homeGkRgb, thirdRgb);
  
  // Combine distances, giving more weight to GK distance since it's more important
  const totalAwayDistance = awayVsHomeDistance + (awayVsGkDistance * 1.5);
  const totalThirdDistance = thirdVsHomeDistance + (thirdVsGkDistance * 1.5);
  
  if (shouldLog) {
    console.log(`Enhanced distances: away total=${totalAwayDistance}, third total=${totalThirdDistance}`);
  }
  
  // Choose the kit with the greatest combined distance (more distinct)
  let selectedKit: KitType;
  if (totalThirdDistance > totalAwayDistance) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} based on better contrast`);
    }
    selectedKit = 'third';
  } else {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} based on better contrast`);
    }
    selectedKit = 'away';
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
