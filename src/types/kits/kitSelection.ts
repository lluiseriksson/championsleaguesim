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
  areRedColorsTooSimilar,
  areWhiteColorsTooSimilar,
  areBlackColorsTooSimilar,
  detectSpecificColorToneConflict
} from './colorUtils';
import { 
  teamHasRedPrimaryColor,
  teamHasRedSecondaryColor,
  teamHasWhitePrimaryColor,
  teamHasBlackPrimaryColor,
  checkForestVsEspanyolConflict,
  checkBlackKitConflict 
} from './kitConflictChecker';

const kitSelectionCache: Record<string, KitType> = {};
const kitConflictCache: Record<string, boolean> = {};

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
    'FC København': 'third'
  },
  'RB Leipzig': {
    'Braga': 'third'
  },
  'Braga': {
    'RB Leipzig': 'third'
  },
  'Inter': {
    'Man United': 'third'
  },
  'Man United': {
    'Inter': 'third'
  }
};

export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  const cacheKey = `${homeTeamName}:${awayTeamName}`;
  if (kitSelectionCache[cacheKey]) {
    console.log(`Using cached kit selection for ${awayTeamName} against ${homeTeamName}: ${kitSelectionCache[cacheKey]}`);
    return kitSelectionCache[cacheKey];
  }
  
  if (teamConflictOverrides[homeTeamName]?.[awayTeamName]) {
    const override = teamConflictOverrides[homeTeamName][awayTeamName];
    console.log(`Using explicit override for ${awayTeamName} against ${homeTeamName}: ${override}`);
    kitSelectionCache[cacheKey] = override;
    kitConflictCache[cacheKey] = true;
    return override;
  }

  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    kitSelectionCache[cacheKey] = 'away';
    return 'away';
  }

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

  const homeIsRed = teamHasRedPrimaryColor(homeTeamName, 'home');
  const awayIsRed = teamHasRedPrimaryColor(awayTeamName, 'away');
  
  const homeIsWhite = teamHasWhitePrimaryColor(homeTeamName, 'home');
  const awayIsWhite = teamHasWhitePrimaryColor(awayTeamName, 'away');
  
  const homeIsBlack = teamHasBlackPrimaryColor(homeTeamName, 'home');
  const awayIsBlack = teamHasBlackPrimaryColor(awayTeamName, 'away');
  
  const homeOutfieldPrimary = homeTeam.home.primary;
  const awayOutfieldPrimary = awayTeam.away.primary;
  
  const similarReds = areRedColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  const similarWhites = areWhiteColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  const similarBlacks = areBlackColorsTooSimilar(homeOutfieldPrimary, awayOutfieldPrimary);
  
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
  
  if (homeCategory === ColorCategory.WHITE && awayCategory === ColorCategory.WHITE) {
    if (shouldLog) {
      console.log(`WHITE vs WHITE conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if (homeCategory === ColorCategory.BLACK && awayCategory === ColorCategory.BLACK) {
    if (shouldLog) {
      console.log(`BLACK vs BLACK conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if (homeCategory === ColorCategory.RED && awayCategory === ColorCategory.RED) {
    if (shouldLog) {
      console.log(`RED vs RED conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if ((homeCategory === ColorCategory.RED && awayCategory === ColorCategory.BURGUNDY) ||
      (homeCategory === ColorCategory.BURGUNDY && awayCategory === ColorCategory.RED)) {
    if (shouldLog) {
      console.log(`RED vs BURGUNDY conflict detected between ${homeTeamName} and ${awayTeamName} - forcing third kit`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }

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
    kitConflictCache[cacheKey] = true;
    return 'away';
  }
  
  if (thirdKitConflictScore === 0 && awayKitConflictScore > 0) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} (no conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
    return 'third';
  }
  
  if (awayKitConflictScore < thirdKitConflictScore) {
    if (shouldLog) {
      console.log(`Selected away kit for ${awayTeamName} (fewer conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'away';
    kitConflictCache[cacheKey] = true;
    return 'away';
  } 
  
  if (thirdKitConflictScore < awayKitConflictScore) {
    if (shouldLog) {
      console.log(`Selected third kit for ${awayTeamName} (fewer conflicts)`);
    }
    kitSelectionCache[cacheKey] = 'third';
    kitConflictCache[cacheKey] = true;
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
