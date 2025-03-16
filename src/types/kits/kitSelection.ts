
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
  'Brest-Krasnodar',
  'Stuttgart-Verona', // Add Stuttgart-Verona as a known conflict
  'Juventus-Fulham',   // Add Juventus-Fulham as they both have white primary kits
  'Benfica-Auxerre'    // Add Benfica-Auxerre as they have similar red/white kits
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

  // Special handling for teams with white primary kits
  // If home team has white primary and away has white primary or very light color
  if (isWhiteColor(homeKit.primary)) {
    // If away team's away kit is also white or very light, use third kit
    if (isWhiteColor(awayKit.primary)) {
      console.log(`Both teams have white primary colors, using third kit for ${awayTeamName}`);
      kitSelectionCache[cacheKey] = 'third';
      return 'third';
    }
    
    // Extra check for light-colored away kits (not just pure white)
    const awayRgb = parseHexColor(awayKit.primary);
    const isVeryLightKit = awayRgb.r > 220 && awayRgb.g > 220 && awayRgb.b > 220;
    
    if (isVeryLightKit) {
      console.log(`Away kit for ${awayTeamName} is very light colored, using third kit to contrast with ${homeTeamName}'s white kit`);
      kitSelectionCache[cacheKey] = 'third';
      return 'third';
    }
  }
  
  // Enhanced handling for red-white kit combinations (like Benfica vs Auxerre)
  // Check if one team is primarily red and the other has red elements
  const homeIsMainlyRed = homeKit.primary.toLowerCase().includes('f') && 
                          homeKit.primary.toLowerCase().charAt(1) > '7' && 
                          homeKit.primary.toLowerCase().charAt(3) < '3';
                          
  const awayHasRedElements = awayKit.primary.toLowerCase().includes('f') && 
                            awayKit.primary.toLowerCase().charAt(1) > '5';
                            
  if (homeIsMainlyRed && awayHasRedElements) {
    console.log(`Red kit conflict detected between ${homeTeamName} (red primary) and ${awayTeamName} (has red elements)`);
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
  }
  
  // Calculate color distances between kits
  const homeRgb = parseHexColor(homeKit.primary);
  const awayRgb = parseHexColor(awayKit.primary);
  const thirdRgb = parseHexColor(thirdKit.primary);
  
  const awayVsHomeDistance = getColorDistance(homeRgb, awayRgb);
  const thirdVsHomeDistance = getColorDistance(homeRgb, thirdRgb);
  
  // Lower the threshold for kit conflict detection to be more cautious
  // Changed from 90 to 100 for better detection
  if (awayVsHomeDistance < 100) {
    if (thirdVsHomeDistance > 120) {
      console.log(`Away kit too similar to home (${awayVsHomeDistance}), using third kit with distance ${thirdVsHomeDistance}`);
      kitSelectionCache[cacheKey] = 'third';
      return 'third';
    }
    // Both away and third are too similar to home, need a special kit
    else if (thirdVsHomeDistance < 100) {
      console.log(`Severe kit conflict between ${homeTeamName} and ${awayTeamName} - both away and third kits conflict`);
      console.log(`Generating special fourth kit for ${awayTeamName}`);
      
      // Fix: Pass homeTeam.home instead of homeTeam to match the expected TeamKitColors type
      generateSpecialKit(awayTeam, homeTeam.home);
      
      // Store in cache and return
      kitSelectionCache[cacheKey] = 'special';
      return 'special';
    }
  }
  
  // Check for pattern-based conflicts (like red-white stripes vs white-red)
  // This is more of a heuristic than a precise measurement
  const isStripedKit = (color: string) => {
    // Striped kits often have secondary colors that are heavily featured
    // We can approximate this by checking for red+white or black+white combinations
    const rgb = parseHexColor(color);
    const hasStrongRedComponent = rgb.r > 180 && rgb.g < 100 && rgb.b < 100;
    const hasStrongWhiteComponent = rgb.r > 200 && rgb.g > 200 && rgb.b > 200;
    return hasStrongRedComponent && hasStrongWhiteComponent;
  };
  
  // If one team has striped pattern, be more cautious with kit selection
  if (isStripedKit(homeKit.primary) && isStripedKit(awayKit.primary)) {
    console.log(`Potential striped kit pattern conflict between ${homeTeamName} and ${awayTeamName}`);
    kitSelectionCache[cacheKey] = 'third';
    return 'third';
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
  
  // For close cases, prefer the third kit for better distinction
  // Changed from preferring away kit to preferring third kit for better visual distinction
  console.log(`Similar contrasts - away (${awayVsHomeDistance}) vs third (${thirdVsHomeDistance}), using third kit for better distinction`);
  kitSelectionCache[cacheKey] = 'third';
  return 'third';
}

/**
 * Clear the kit selection cache
 */
export function clearKitSelectionCache(): void {
  Object.keys(kitSelectionCache).forEach(key => {
    delete kitSelectionCache[key];
  });
}
