
import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { 
  parseHexColor, 
  getColorDistance, 
  areColorsConflicting, 
  categorizeColor, 
  ColorCategory,
  getEnhancedColorDistance,
  areColorsSufficientlyDifferent,
  areRedColorsTooSimilar
} from './colorUtils';
import { 
  teamHasRedPrimaryColor, 
  checkForestVsEspanyolConflict 
} from './kitConflictChecker';

const kitSelectionCache: Record<string, KitType> = {};

// Updated to conditionally handle Forest vs Espanyol based on actual color analysis
const teamConflictOverrides: Record<string, Record<string, KitType>> = {
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
  'AC Milan': {
    'FC København': 'third'
  },
  'FC København': {
    'AC Milan': 'away'
  },
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
  // Removed static Forest/Espanyol override to use dynamic color check instead
};

export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  const cacheKey = `${homeTeamName}:${awayTeamName}`;
  if (kitSelectionCache[cacheKey]) {
    return kitSelectionCache[cacheKey];
  }
  
  // Special handling for Forest vs Espanyol based on actual colors
  if ((homeTeamName === 'Forest' && awayTeamName === 'Espanyol') || 
      (homeTeamName === 'Espanyol' && awayTeamName === 'Forest')) {
    // Check if away kit conflicts with home kit
    const awayKitConflict = checkForestVsEspanyolConflict(homeTeamName, awayTeamName, 'away');
    // If away kit conflicts, use third kit, otherwise use away kit
    const selectedKit = awayKitConflict ? 'third' : 'away';
    console.log(`Selected ${selectedKit} kit for ${awayTeamName} against ${homeTeamName} based on color analysis`);
    kitSelectionCache[cacheKey] = selectedKit;
    return selectedKit;
  }
  
  if (teamConflictOverrides[homeTeamName]?.[awayTeamName]) {
    const override = teamConflictOverrides[homeTeamName][awayTeamName];
    kitSelectionCache[cacheKey] = override;
    return override;
  }

  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    return 'away';
  }

  const homeIsRed = teamHasRedPrimaryColor(homeTeamName, 'home');
  const awayIsRed = teamHasRedPrimaryColor(awayTeamName, 'away');
  
  const homeOutfieldPrimary = homeTeam.home.primary;
  const awayOutfieldPrimary = awayTeam.away.primary;
  const similarReds = areRedColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  
  if ((homeIsRed && awayIsRed) || similarReds) {
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }

  const homeOutfieldSecondary = homeTeam.home.secondary;
  const homeGkPrimary = homeTeam.goalkeeper.primary;
  const homeGkSecondary = homeTeam.goalkeeper.secondary;
  
  const awayPrimary = awayTeam.away.primary;
  const awaySecondary = awayTeam.away.secondary;
  const thirdPrimary = awayTeam.third.primary;
  const thirdSecondary = awayTeam.third.secondary;

  const shouldLog = Object.keys(kitSelectionCache).length < 50;
  
  if (shouldLog) {
    console.log(`Kit selection for ${homeTeamName} vs ${awayTeamName}:`);
    console.log(`Home outfield primary: ${homeOutfieldPrimary} (${categorizeColor(homeOutfieldPrimary)})`);
    console.log(`Home GK primary: ${homeGkPrimary} (${categorizeColor(homeGkPrimary)})`);
    console.log(`Away kit primary: ${awayPrimary} (${categorizeColor(awayPrimary)})`);
    console.log(`Third kit primary: ${thirdPrimary} (${categorizeColor(thirdPrimary)})`);
  }

  const homeCategory = categorizeColor(homeOutfieldPrimary);
  const awayCategory = categorizeColor(awayPrimary);
  const thirdCategory = categorizeColor(thirdPrimary);
  
  if (homeCategory === ColorCategory.RED && awayCategory === ColorCategory.RED) {
    if (shouldLog) {
      console.log(`RED vs RED conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }
  
  if ((homeCategory === ColorCategory.RED && awayCategory === ColorCategory.BURGUNDY) ||
      (homeCategory === ColorCategory.BURGUNDY && awayCategory === ColorCategory.RED)) {
    if (shouldLog) {
      console.log(`RED vs BURGUNDY conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }

  const awayVsHomeOutfieldConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayPrimary);
  const thirdVsHomeOutfieldConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, thirdPrimary);
  
  const awayVsHomeGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, awayPrimary);
  const thirdVsHomeGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, thirdPrimary);

  const awaySecondaryVsHomeConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awaySecondary);
  const thirdSecondaryVsHomeConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, thirdSecondary);
  
  const awaySecondaryVsGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, awaySecondary);
  const thirdSecondaryVsGkConflict = !areColorsSufficientlyDifferent(homeGkPrimary, thirdSecondary);
  
  if (shouldLog) {
    console.log(`Away vs Home conflicts: outfield=${awayVsHomeOutfieldConflict}, GK=${awayVsHomeGkConflict}`);
    console.log(`Third vs Home conflicts: outfield=${thirdVsHomeOutfieldConflict}, GK=${thirdVsHomeGkConflict}`);
  }
  
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
  
  const homeOutfieldRgb = parseHexColor(homeOutfieldPrimary);
  const homeGkRgb = parseHexColor(homeGkPrimary);
  const awayRgb = parseHexColor(awayPrimary);
  const thirdRgb = parseHexColor(thirdPrimary);
  
  const awayVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, awayRgb);
  const thirdVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, thirdRgb);
  const awayVsGkDistance = getEnhancedColorDistance(homeGkRgb, awayRgb);
  const thirdVsGkDistance = getEnhancedColorDistance(homeGkRgb, thirdRgb);
  
  const totalAwayDistance = awayVsHomeDistance + (awayVsGkDistance * 1.5);
  const totalThirdDistance = thirdVsHomeDistance + (thirdVsGkDistance * 1.5);
  
  if (shouldLog) {
    console.log(`Enhanced distances: away total=${totalAwayDistance}, third total=${totalThirdDistance}`);
  }
  
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
  
  kitSelectionCache[cacheKey] = selectedKit;
  
  if (Object.keys(kitSelectionCache).length > 200) {
    const keys = Object.keys(kitSelectionCache);
    for (let i = 0; i < 50; i++) {
      delete kitSelectionCache[keys[i]];
    }
  }
  
  return selectedKit;
};

export const clearKitSelectionCache = () => {
  for (const key in kitSelectionCache) {
    delete kitSelectionCache[key];
  }
  console.log("Kit selection cache cleared");
};
