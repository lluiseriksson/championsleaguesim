
import { teamKitColors } from './teamColorsData';
import { categorizeColor, ColorCategory } from './colorUtils';
import { getTeamKitColor } from './kitAccessors';
import { KitType } from './kitTypes';
import { toast } from 'sonner';

// Known problematic team combinations that require special handling
const CONFLICTING_TEAM_PAIRS = [
  ['RB Leipzig', 'Udinese'],
  ['RB Leipzig', 'Southampton'],
  ['Athletic Bilbao', 'Southampton'],
  ['AC Milan', 'Athletic Bilbao'],
  ['Ajax', 'Fulham'],
  ['Real Madrid', 'Leeds United']
  // Removed Forest vs Espanyol as we'll check colors explicitly
];

// Function to check if a team uses red as primary color
export const teamHasRedPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primaryColor = getTeamKitColor(teamName, kitType);
  const colorCategory = categorizeColor(primaryColor);
  
  return colorCategory === ColorCategory.RED || colorCategory === ColorCategory.BURGUNDY;
};

// Function to check if teams are in the known conflicting pairs list
export const areTeamsInConflictList = (homeTeam: string, awayTeam: string): boolean => {
  return CONFLICTING_TEAM_PAIRS.some(pair => 
    (pair[0] === homeTeam && pair[1] === awayTeam) || 
    (pair[0] === awayTeam && pair[1] === homeTeam)
  );
};

// Helper to check if Forest vs Espanyol have conflicting kits
export const checkForestVsEspanyolConflict = (homeTeam: string, awayTeam: string, awayTeamKit: KitType): boolean => {
  // Only run this check for the specific matchup
  if (!((homeTeam === 'Forest' && awayTeam === 'Espanyol') || 
        (homeTeam === 'Espanyol' && awayTeam === 'Forest'))) {
    return false;
  }
  
  const homeColor = getTeamKitColor(homeTeam, 'home');
  const awayColor = getTeamKitColor(awayTeam, awayTeamKit);
  
  const homeCategory = categorizeColor(homeColor);
  const awayCategory = categorizeColor(awayColor);

  // Log colors for debugging
  console.log(`${homeTeam} home kit color: ${homeColor} (${homeCategory})`);
  console.log(`${awayTeam} ${awayTeamKit} kit color: ${awayColor} (${awayCategory})`);
  
  // If both are red or one is red and one is burgundy, there's a conflict
  const redConflict = 
    (homeCategory === ColorCategory.RED && awayCategory === ColorCategory.RED) ||
    (homeCategory === ColorCategory.RED && awayCategory === ColorCategory.BURGUNDY) ||
    (homeCategory === ColorCategory.BURGUNDY && awayCategory === ColorCategory.RED);
  
  return redConflict;
};

// Function to perform a final kit conflict check between two teams
export const performFinalKitCheck = (
  homeTeam: string, 
  awayTeam: string, 
  awayTeamKit: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) {
    return true; // No team data, can't check
  }
  
  // First, check known conflict pairs
  if (areTeamsInConflictList(homeTeam, awayTeam)) {
    console.warn(`⚠️ KNOWN KIT CONFLICT BETWEEN: ${homeTeam} vs ${awayTeam}`);
    return false;
  }
  
  // Special check for Forest vs Espanyol
  if (checkForestVsEspanyolConflict(homeTeam, awayTeam, awayTeamKit)) {
    console.warn(`⚠️ FOREST-ESPANYOL KIT CONFLICT DETECTED: ${homeTeam} vs ${awayTeam}`);
    return false;
  }
  
  const homeIsRed = teamHasRedPrimaryColor(homeTeam, 'home');
  const awayIsRed = teamHasRedPrimaryColor(awayTeam, awayTeamKit);
  
  // Logging for debugging
  console.log(`Final kit check: ${homeTeam} vs ${awayTeam} (${awayTeamKit})`);
  console.log(`- ${homeTeam} uses red primary: ${homeIsRed}`);
  console.log(`- ${awayTeam} uses red primary with ${awayTeamKit} kit: ${awayIsRed}`);
  
  // Red vs Red conflict detected
  if (homeIsRed && awayIsRed) {
    console.warn(`⚠️ RED KIT CONFLICT DETECTED: ${homeTeam} vs ${awayTeam}`);
    return false;
  }
  
  // Check for special cases with similar colors
  // RB Leipzig (white/red) vs Udinese (black/white)
  if ((homeTeam === 'RB Leipzig' && awayTeam === 'Udinese') || 
      (homeTeam === 'Udinese' && awayTeam === 'RB Leipzig')) {
    console.warn(`⚠️ SPECIAL CASE KIT CONFLICT: ${homeTeam} vs ${awayTeam}`);
    return false;
  }
  
  return true; // No conflicts
};

// Enhanced function to resolve kit conflicts, forcing third kit for red teams
export const resolveKitConflict = (homeTeam: string, awayTeam: string): KitType => {
  // If teams are in the known conflict list, always use third kit
  if (areTeamsInConflictList(homeTeam, awayTeam)) {
    console.log(`Forcing third kit for ${awayTeam} against ${homeTeam} due to known conflict`);
    return 'third';
  }
  
  // Special case for Forest vs Espanyol - check based on actual colors
  if ((homeTeam === 'Forest' && awayTeam === 'Espanyol') || 
      (homeTeam === 'Espanyol' && awayTeam === 'Forest')) {
    // Check if away kit would conflict
    const awayConflict = checkForestVsEspanyolConflict(homeTeam, awayTeam, 'away');
    // If away kit conflicts, use third kit, otherwise use away kit
    if (awayConflict) {
      console.log(`${awayTeam} away kit conflicts with ${homeTeam}, using third kit`);
      return 'third';
    } else {
      console.log(`${awayTeam} away kit is fine against ${homeTeam}`);
      return 'away';
    }
  }
  
  // If away team has a red away kit, force third kit
  if (teamHasRedPrimaryColor(awayTeam, 'away')) {
    console.log(`Forcing third kit for ${awayTeam} against ${homeTeam} due to red away kit`);
    return 'third';
  }
  
  // If home team is red and away team has a red third kit too, we have a problem
  // In this case, log an error but still return third as the best option
  if (teamHasRedPrimaryColor(homeTeam, 'home') && teamHasRedPrimaryColor(awayTeam, 'third')) {
    console.error(`⚠️ SEVERE KIT CONFLICT: Both ${homeTeam} (home) and ${awayTeam} (third) use red kits!`);
    toast.error(`Kit conflict between ${homeTeam} and ${awayTeam}!`, {
      description: "Both teams have similar colored kits. This may cause confusion."
    });
  }
  
  return 'third';
};
