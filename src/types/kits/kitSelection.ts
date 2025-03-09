
import { KitType, TeamKit, TeamKitColors } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { 
  parseHexColor, 
  getColorDistance,
  areColorsConflicting, 
  categorizeColor, 
  ColorCategory,
  getEnhancedColorDistance,
  areColorsSufficientlyDifferent,
  areRedColorsTooSimilar,
  areWhiteColorsTooSimilar,
  areBlackColorsTooSimilar,
  detectSpecificColorToneConflict,
  areBlueColorsTooSimilar,
  areYellowGreenColorsTooSimilar,
  arePurplePinkColorsTooSimilar
} from './colorUtils';
import { 
  teamHasRedPrimaryColor,
  teamHasRedSecondaryColor,
  teamHasWhitePrimaryColor,
  teamHasBlackPrimaryColor,
  checkForestVsEspanyolConflict,
  checkBlackKitConflict,
  teamHasBluePrimaryColor,
  checkBlueKitConflict,
  checkYellowGreenKitConflict,
  checkPurplePinkKitConflict
} from './kitConflictChecker';
import { generateSpecialKit } from './positionSpecificKits';

const kitSelectionCache: Record<string, KitType> = {};
const kitConflictCache: Record<string, boolean> = {};

// Updated team conflict overrides to include all team conflicts
const teamConflictOverrides: Record<string, Record<string, KitType>> = {
  'Fulham': {
    'Las Palmas': 'third'
  },
  'AC Milan': {
    'FC København': 'third',
    'Athletic Bilbao': 'third'
  },
  'FC København': {
    'AC Milan': 'away',
    'Bayern Munich': 'away',
    'Brest': 'third'
  },
  'Liverpool': {
    'Manchester United': 'third',
    'FC København': 'third',
    'AC Milan': 'third',
    'Genova': 'third'
  },
  'Manchester United': {
    'Liverpool': 'third',
    'FC København': 'third',
    'AC Milan': 'third',
    'Inter': 'third'
  },
  'Bayern Munich': {
    'FC København': 'third',
    'AC Milan': 'third'
  },
  'Espanyol': {
    'Forest': 'third'
  },
  'Forest': {
    'Espanyol': 'third'
  },
  'Sevilla': {
    'Crvena Zvezda': 'third'
  },
  'Crvena Zvezda': {
    'Sevilla': 'third'
  },
  'Leverkusen': {
    'Monza': 'third'
  },
  'Monza': {
    'Leverkusen': 'third'
  },
  'Atlanta': {
    'Leicester': 'third'
  },
  'Leicester': {
    'Atlanta': 'third'
  },
  'Genova': {
    'Liverpool': 'third'
  },
  'Freiburg': {
    'Strasbourg': 'third'
  },
  'Strasbourg': {
    'Freiburg': 'third'
  },
  'Girona': {
    'Celta': 'third'
  },
  'Celta': {
    'Girona': 'third'
  },
  'Brest': {
    'FC København': 'third',
    'Krasnodar': 'third'
  },
  'Krasnodar': {
    'Brest': 'third'
  },
  'RB Leipzig': {
    'Braga': 'third',
    'Rangers': 'third'
  },
  'Braga': {
    'RB Leipzig': 'third'
  },
  'Rangers': {
    'RB Leipzig': 'third'
  },
  'Inter': {
    'Manchester United': 'third',
    'Man United': 'third'
  },
  'Man United': {
    'Inter': 'third'
  }
};

const teamsNeedingSpecialKits: [string, string][] = [
  ['Brest', 'Krasnodar'],
  ['RB Leipzig', 'Rangers'],
  ['AC Milan', 'Athletic Bilbao']
];

export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  const cacheKey = `${homeTeamName}:${awayTeamName}`;
  if (kitSelectionCache[cacheKey]) {
    console.log(`Using cached kit selection for ${awayTeamName} against ${homeTeamName}: ${kitSelectionCache[cacheKey]}`);
    return kitSelectionCache[cacheKey];
  }
  
  // Check for explicit overrides
  if (teamConflictOverrides[homeTeamName]?.[awayTeamName]) {
    const override = teamConflictOverrides[homeTeamName][awayTeamName];
    console.log(`Using explicit override for ${awayTeamName} against ${homeTeamName}: ${override}`);
    kitSelectionCache[cacheKey] = override;
    kitConflictCache[cacheKey] = true;
    return override;
  }

  // Check for teams that explicitly need special fourth kits
  const needsSpecialKit = teamsNeedingSpecialKits.some(
    ([team1, team2]) => 
      (team1 === homeTeamName && team2 === awayTeamName) || 
      (team1 === awayTeamName && team2 === homeTeamName)
  );
  
  if (needsSpecialKit) {
    console.log(`Teams ${homeTeamName} vs ${awayTeamName} need special kit - using fourth kit`);
    kitSelectionCache[cacheKey] = 'special';
    kitConflictCache[cacheKey] = true;
    return 'special';
  }

  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    kitSelectionCache[cacheKey] = 'away';
    return 'away';
  }

  // Check for specific team conflicts
  if ((homeTeamName === 'Forest' && awayTeamName === 'Espanyol') || 
      (homeTeamName === 'Espanyol' && awayTeamName === 'Forest')) {
    console.log(`Special handling for ${homeTeamName} vs ${awayTeamName}`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }

  if ((homeTeamName === 'RB Leipzig' && awayTeamName === 'Braga') || 
      (homeTeamName === 'Braga' && awayTeamName === 'RB Leipzig')) {
    console.log(`Special handling for black kit conflict: ${homeTeamName} vs ${awayTeamName}`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if ((homeTeamName === 'Inter' && (awayTeamName === 'Manchester United' || awayTeamName === 'Man United')) || 
      ((homeTeamName === 'Manchester United' || homeTeamName === 'Man United') && awayTeamName === 'Inter')) {
    console.log(`Special handling for blue kit conflict: ${homeTeamName} vs ${awayTeamName}`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }

  // Check primary color conflicts
  const homeIsRed = teamHasRedPrimaryColor(homeTeamName, 'home');
  const awayIsRed = teamHasRedPrimaryColor(awayTeamName, 'away');
  
  const homeIsWhite = teamHasWhitePrimaryColor(homeTeamName, 'home');
  const awayIsWhite = teamHasWhitePrimaryColor(awayTeamName, 'away');
  
  const homeIsBlack = teamHasBlackPrimaryColor(homeTeamName, 'home');
  const awayIsBlack = teamHasBlackPrimaryColor(awayTeamName, 'away');
  
  const homeIsBlue = teamHasBluePrimaryColor(homeTeamName, 'home');
  const awayIsBlue = teamHasBluePrimaryColor(awayTeamName, 'away');
  
  const homeOutfieldPrimary = homeTeam.home.primary;
  const awayOutfieldPrimary = awayTeam.away.primary;
  
  // Enhanced color similarity checks
  const similarReds = areRedColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  const similarWhites = areWhiteColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  const similarBlacks = areBlackColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  const similarBlues = areBlueColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  const similarYellowGreens = areYellowGreenColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  const similarPurplePinks = arePurplePinkColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  
  // Extreme conflict check - all kits have conflicts
  const awayConflictsWithHome = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayTeam.away.primary);
  const thirdConflictsWithHome = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayTeam.third.primary);
  
  if (awayConflictsWithHome && thirdConflictsWithHome) {
    // Severe conflict - need special fourth kit
    console.log(`Severe kit conflict between ${homeTeamName} and ${awayTeamName} - both away and third kits conflict`);
    console.log(`Generating special fourth kit for ${awayTeamName}`);
    
    // Fixed: Pass the correct type to generateSpecialKit
    // The function expects TeamKit objects, not TeamKitColors
    generateSpecialKit(awayTeam, homeTeam);
    
    // Store in cache and return
    kitSelectionCache[cacheKey] = 'special';
    kitConflictCache[cacheKey] = true;
    return 'special';
  }
  
  // Check for specific color conflicts
  if ((homeIsBlack && awayIsBlack) || similarBlacks) {
    console.log(`Black kit conflict between ${homeTeamName} and ${awayTeamName}, using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if ((homeIsRed && awayIsRed) || similarReds) {
    console.log(`Red kit conflict between ${homeTeamName} and ${awayTeamName}, using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if ((homeIsWhite && awayIsWhite) || similarWhites) {
    console.log(`White kit conflict between ${homeTeamName} and ${awayTeamName}, using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if ((homeIsBlue && awayIsBlue) || similarBlues) {
    console.log(`Blue kit conflict between ${homeTeamName} and ${awayTeamName}, using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if (similarYellowGreens) {
    console.log(`Yellow/Green kit conflict between ${homeTeamName} and ${awayTeamName}, using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if (similarPurplePinks) {
    console.log(`Purple/Pink kit conflict between ${homeTeamName} and ${awayTeamName}, using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }

  // Check secondary color conflicts
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

  // Check categorized colors
  const homeCategory = categorizeColor(homeOutfieldPrimary);
  const awayCategory = categorizeColor(awayPrimary);
  const thirdCategory = categorizeColor(thirdPrimary);
  
  // Check for same color category conflicts
  if (homeCategory === awayCategory) {
    if (shouldLog) {
      console.log(`${homeCategory} vs ${awayCategory} category conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }

  // Red primary vs red secondary check
  const homeHasRedPrimary = teamHasRedPrimaryColor(homeTeamName, 'home');
  const awayHasRedSecondary = teamHasRedSecondaryColor(awayTeamName, 'away');
  
  if (homeHasRedPrimary && awayHasRedSecondary) {
    console.log(`Red primary vs red secondary conflict between ${homeTeamName} (primary) and ${awayTeamName} (secondary), using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  const awayHasRedPrimary = teamHasRedPrimaryColor(awayTeamName, 'away');
  const homeHasRedSecondary = teamHasRedSecondaryColor(homeTeamName, 'home');
  
  if (awayHasRedPrimary && homeHasRedSecondary) {
    console.log(`Red primary vs red secondary conflict between ${awayTeamName} (primary) and ${homeTeamName} (secondary), using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }

  // Enhanced color difference checks
  const awayVsHomeOutfieldConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayTeam.away.primary);
  const thirdVsHomeOutfieldConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayTeam.third.primary);
  
  const awayVsHomeGkConflict = !areColorsSufficientlyDifferent(homeTeam.goalkeeper.primary, awayTeam.away.primary);
  const thirdVsHomeGkConflict = !areColorsSufficientlyDifferent(homeTeam.goalkeeper.primary, awayTeam.third.primary);

  const awaySecondaryVsHomeConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayTeam.away.secondary);
  const thirdSecondaryVsHomeConflict = !areColorsSufficientlyDifferent(homeOutfieldPrimary, awayTeam.third.secondary);
  
  const awaySecondaryVsGkConflict = !areColorsSufficientlyDifferent(homeTeam.goalkeeper.primary, awayTeam.away.secondary);
  const thirdSecondaryVsGkConflict = !areColorsSufficientlyDifferent(homeTeam.goalkeeper.primary, awayTeam.third.secondary);
  
  if (shouldLog) {
    console.log(`Away vs Home conflicts: outfield=${awayVsHomeOutfieldConflict}, GK=${awayVsHomeGkConflict}`);
    console.log(`Third vs Home conflicts: outfield=${thirdVsHomeOutfieldConflict}, GK=${thirdVsHomeGkConflict}`);
  }
  
  // Calculate conflict scores with adjusted weights
  const awayKitConflictScore = 
    (awayVsHomeOutfieldConflict ? 1.2 : 0) + 
    (awayVsHomeGkConflict ? 1.8 : 0) + 
    (awaySecondaryVsHomeConflict ? 0.5 : 0) + 
    (awaySecondaryVsGkConflict ? 0.7 : 0);
  
  const thirdKitConflictScore = 
    (thirdVsHomeOutfieldConflict ? 1.2 : 0) + 
    (thirdVsHomeGkConflict ? 1.8 : 0) + 
    (thirdSecondaryVsHomeConflict ? 0.5 : 0) + 
    (thirdSecondaryVsGkConflict ? 0.7 : 0);
  
  if (shouldLog) {
    console.log(`Conflict scores: away=${awayKitConflictScore}, third=${thirdKitConflictScore}`);
  }
  
  // If both kits have severe conflicts, use special fourth kit
  if (awayKitConflictScore > 3 && thirdKitConflictScore > 3) {
    console.log(`Both away and third kits have severe conflicts, using special fourth kit`);
    kitSelectionCache[cacheKey] = 'special';
    kitConflictCache[cacheKey] = true;
    return 'special';
  }
  
  // Check for no-conflict scenarios
  if (awayKitConflictScore === 0 && thirdKitConflictScore > 0) {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} (no conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'away';
    kitConflictCache[cacheKey] = false;
    return 'away';
  }
  
  if (thirdKitConflictScore === 0 && awayKitConflictScore > 0) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} (no conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = false;
    return 'third';
  }
  
  // Choose the kit with fewer conflicts
  if (awayKitConflictScore < thirdKitConflictScore) {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} (fewer conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'away';
    kitConflictCache[cacheKey] = awayKitConflictScore > 0;
    return 'away';
  } 
  
  if (thirdKitConflictScore < awayKitConflictScore) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} (fewer conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = thirdKitConflictScore > 0;
    return 'third';
  }
  
  // If conflict scores are equal, use enhanced color distance to determine the best kit
  const homeOutfieldRgb = parseHexColor(homeOutfieldPrimary);
  const homeGkRgb = parseHexColor(homeTeam.goalkeeper.primary);
  const awayRgb = parseHexColor(awayTeam.away.primary);
  const thirdRgb = parseHexColor(awayTeam.third.primary);
  
  const awayVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, awayRgb);
  const thirdVsHomeDistance = getEnhancedColorDistance(homeOutfieldRgb, thirdRgb);
  const awayVsGkDistance = getEnhancedColorDistance(homeGkRgb, awayRgb);
  const thirdVsGkDistance = getEnhancedColorDistance(homeGkRgb, thirdRgb);
  
  // Adjusted weights for better distinction
  const totalAwayDistance = awayVsHomeDistance + (awayVsGkDistance * 1.8);
  const totalThirdDistance = thirdVsHomeDistance + (thirdVsGkDistance * 1.8);
  
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
  kitConflictCache[cacheKey] = true;
  
  // Manage cache size
  if (Object.keys(kitSelectionCache).length > 200) {
    const keys = Object.keys(kitSelectionCache);
    for (let i = 0; i < 50; i++) {
      delete kitSelectionCache[keys[i]];
      delete kitConflictCache[keys[i]];
    }
  }
  
  return selectedKit;
};

export const hasKnownKitConflict = (homeTeamName: string, awayTeamName: string): boolean => {
  const cacheKey = `${homeTeamName}:${awayTeamName}`;
  
  if (teamConflictOverrides[homeTeamName]?.[awayTeamName]) {
    return true;
  }
  
  if (kitConflictCache[cacheKey] !== undefined) {
    return kitConflictCache[cacheKey];
  }
  
  return false;
};

export const clearKitSelectionCache = () => {
  for (const key in kitSelectionCache) {
    delete kitSelectionCache[key];
  }
  for (const key in kitConflictCache) {
    delete kitConflictCache[key];
  }
  console.log("Kit selection cache cleared");
};
