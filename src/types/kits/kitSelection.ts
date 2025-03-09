
import { teamKitColors } from './teamColorsData';
import { KitType, TeamKitColors } from './kitTypes';
import { getColorDistance, parseHexColor, isWhiteColor } from './colorUtils';
import { generateSpecialKit } from './positionSpecificKits';

// Cache to store previously selected kits
const kitSelectionCache: Record<string, KitType> = {};

// List of known team conflicts that always require a third kit
const knownConflictTeams: string[] = [
  'RB Leipzig-Rangers',
  'RB Leipzig-Braga',
  'AC Milan-Athletic Bilbao',
  'Brest-Krasnodar'
];

// Function to determine which kit the away team should use
export function getAwayTeamKit(homeTeamName: string, awayTeamName: string): KitType {
  // Check cache first to avoid recalculations
  const cacheKey = `${homeTeamName}-${awayTeamName}`;
  if (kitSelectionCache[cacheKey]) {
    return kitSelectionCache[cacheKey];
  }
  
  // Get team data, if missing default to away kit
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];
  
  if (!homeTeam || !awayTeam) {
    return 'away';
  }
  
  const homeKit = homeTeam.home;
  const awayKit = awayTeam.away;
  const thirdKit = awayTeam.third;
  
  // First check known conflict teams that always need third kit
  if (knownConflictTeams.includes(`${homeTeamName}-${awayTeamName}`)) {
    console.log(`Known kit conflict between ${homeTeamName}-${awayTeamName}, using third kit`);
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }

  // Check if home team has white primary and away has white primary
  if (isWhiteColor(homeKit.primary) && isWhiteColor(awayKit.primary)) {
    console.log(`Both teams have white primary colors, using third kit for ${awayTeamName}`);
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }
  
  // Calculate color distances between kits
  const homeRgb = parseHexColor(homeKit.primary);
  const awayRgb = parseHexColor(awayKit.primary);
  const thirdRgb = parseHexColor(thirdKit.primary);
  
  const awayVsHomeDistance = getColorDistance(homeRgb, awayRgb);
  const thirdVsHomeDistance = getColorDistance(homeRgb, thirdRgb);
  
  // If home and away are too similar, use third
  if (awayVsHomeDistance < 90) {
    if (thirdVsHomeDistance > 120) {
      console.log(`Away kit too similar to home (${awayVsHomeDistance}), using third kit with distance ${thirdVsHomeDistance}`);
      kitSelectionCache[cacheKey] = 'third';
      return 'third';
    }
    // Both away and third are too similar to home, need a special kit
    else if (thirdVsHomeDistance < 90) {
      console.log(`Severe kit conflict between ${homeTeamName} and ${awayTeamName} - both away and third kits conflict`);
      console.log(`Generating special fourth kit for ${awayTeamName}`);
      
      // Fix: Pass homeTeam.home instead of homeTeam to match the expected TeamKitColors type
      generateSpecialKit(awayTeam, homeTeam.home);
      
      // Store in cache and return
      kitSelectionCache[cacheKey] = 'special';
      return 'special';
    }
  }
  
  // If away kit is clearly better than third kit, use it
  if (awayVsHomeDistance > thirdVsHomeDistance + 40) {
    console.log(`Away kit has better contrast (${awayVsHomeDistance}) than third kit (${thirdVsHomeDistance})`);
    kitSelectionCache[cacheKey] = 'away';
    return 'away';
  }
  
  // If third kit is clearly better than away kit, use it
  if (thirdVsHomeDistance > awayVsHomeDistance + 40) {
    console.log(`Third kit has better contrast (${thirdVsHomeDistance}) than away kit (${awayVsHomeDistance})`);
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }
  
  // For close cases, prefer away kit as it's the traditional choice
  console.log(`Similar contrasts - away (${awayVsHomeDistance}) vs third (${thirdVsHomeDistance}), defaulting to away kit`);
  kitSelectionCache[cacheKey] = 'away';
  return 'away';
}

/**
 * Clear the kit selection cache
 */
export function clearKitSelectionCache(): void {
  Object.keys(kitSelectionCache).forEach(key => {
    delete kitSelectionCache[key];
  });
}
