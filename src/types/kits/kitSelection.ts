import { teamKitColors } from './teamColorsData';
import { KitType } from './kitTypes';
import { areColorsSufficientlyDifferent } from './colorUtils';

// Cache for kit selection decisions to avoid recalculating
let kitSelectionCache: Record<string, KitType> = {};

/**
 * Clears the kit selection cache
 * This should be called at the start of new tournaments or game sessions
 */
export const clearKitSelectionCache = (): void => {
  kitSelectionCache = {};
};

/**
 * Determines which kit the away team should wear based on potential color conflicts
 * 
 * @param homeTeamName The name of the home team
 * @param awayTeamName The name of the away team
 * @returns The kit type that the away team should wear (away or third)
 */
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  // Check if we've already calculated this matchup
  const cacheKey = `${homeTeamName}-${awayTeamName}`;
  if (kitSelectionCache[cacheKey]) {
    return kitSelectionCache[cacheKey];
  }
  
  // Handle the specific case of Nice vs Auxerre (or vice versa) who have similar colors
  if ((homeTeamName === 'Nice' && awayTeamName === 'Auxerre') || 
      (homeTeamName === 'Auxerre' && awayTeamName === 'Nice')) {
    // Use third kits which are more distinct
    const kitType = 'third' as KitType;
    kitSelectionCache[cacheKey] = kitType;
    return kitType;
  }
  
  // Get team color data
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];
  
  // Default to away kit if team data is missing
  if (!homeTeam || !awayTeam) {
    return 'away';
  }
  
  // Check if away kit has sufficient difference from home kit
  const homeKit = homeTeam.home.primary;
  const awayKit = awayTeam.away.primary;
  const thirdKit = awayTeam.third.primary;
  
  // First check if away kit is different enough
  const awayKitDifferent = areColorsSufficientlyDifferent(homeKit, awayKit);
  
  // If away kit is different enough, use it
  if (awayKitDifferent) {
    kitSelectionCache[cacheKey] = 'away';
    return 'away';
  }
  
  // Otherwise use third kit
  kitSelectionCache[cacheKey] = 'third';
  return 'third';
};
