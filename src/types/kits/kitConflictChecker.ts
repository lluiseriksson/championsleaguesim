
import { teamKitColors } from './teamColorsData';
import { categorizeColor, ColorCategory, areWhiteColorsTooSimilar } from './colorUtils';
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
  ['Real Madrid', 'Leeds United'],
  ['Liverpool', 'Manchester United'],
  ['Bayern Munich', 'FC København'],
  ['FC København', 'AC Milan'],
  ['Sevilla', 'Crvena Zvezda'] // Added Sevilla and Crvena Zvezda to conflicting pairs
];

// Function to check if a team uses red as primary color
export const teamHasRedPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primaryColor = getTeamKitColor(teamName, kitType);
  const colorCategory = categorizeColor(primaryColor);
  
  return colorCategory === ColorCategory.RED || colorCategory === ColorCategory.BURGUNDY;
};

// Function to check if a team uses white as primary color
export const teamHasWhitePrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primaryColor = getTeamKitColor(teamName, kitType);
  const colorCategory = categorizeColor(primaryColor);
  
  return colorCategory === ColorCategory.WHITE;
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

// Function to check for white kit conflicts between teams
export const checkWhiteKitConflict = (
  homeTeam: string,
  awayTeam: string,
  awayTeamKit: KitType
): boolean => {
  const homeColor = getTeamKitColor(homeTeam, 'home');
  const awayColor = getTeamKitColor(awayTeam, awayTeamKit);
  
  // Check if both teams have white kits
  const homeIsWhite = categorizeColor(homeColor) === ColorCategory.WHITE;
  const awayIsWhite = categorizeColor(awayColor) === ColorCategory.WHITE;
  
  // Log white kit detection for debugging
  if (homeIsWhite && awayIsWhite) {
    console.warn(`⚠️ WHITE KIT CONFLICT DETECTED: ${homeTeam} vs ${awayTeam}`);
    return true;
  }
  
  // Additional check for similar white shades
  if (areWhiteColorsTooSimilar(homeColor, awayColor)) {
    console.warn(`⚠️ SIMILAR WHITE SHADES CONFLICT: ${homeTeam} vs ${awayTeam}`);
    return true;
  }
  
  return false;
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
    toast.error(`Kit conflict between ${homeTeam} and ${awayTeam}!`, {
      description: "Teams have similar colored kits. Resolving automatically..."
    });
    return false;
  }
  
  // Check for white kit conflicts (Sevilla vs Crvena Zvezda)
  if (checkWhiteKitConflict(homeTeam, awayTeam, awayTeamKit)) {
    toast.error(`White kit conflict detected!`, {
      description: `Both ${homeTeam} and ${awayTeam} have white kits. Resolving automatically...`
    });
    return false;
  }
  
  // Special check for Forest vs Espanyol
  if (checkForestVsEspanyolConflict(homeTeam, awayTeam, awayTeamKit)) {
    console.warn(`⚠️ FOREST-ESPANYOL KIT CONFLICT DETECTED: ${homeTeam} vs ${awayTeam}`);
    toast.error(`Kit conflict between ${homeTeam} and ${awayTeam}!`, {
      description: "Similar red kits detected. Resolving automatically..."
    });
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
    toast.error(`Kit conflict detected!`, {
      description: `Both ${homeTeam} and ${awayTeam} have red kits. Resolving automatically...`
    });
    return false;
  }
  
  // Check for special cases with similar colors
  // RB Leipzig (white/red) vs Udinese (black/white)
  if ((homeTeam === 'RB Leipzig' && awayTeam === 'Udinese') || 
      (homeTeam === 'Udinese' && awayTeam === 'RB Leipzig')) {
    console.warn(`⚠️ SPECIAL CASE KIT CONFLICT: ${homeTeam} vs ${awayTeam}`);
    toast.error(`Kit conflict between ${homeTeam} and ${awayTeam}!`, {
      description: "Teams have similar color combinations. Resolving automatically..."
    });
    return false;
  }
  
  return true; // No conflicts
};

// Enhanced function to resolve kit conflicts, forcing third kit for red teams
export const resolveKitConflict = (homeTeam: string, awayTeam: string): KitType => {
  // If teams are in the known conflict list, always use third kit
  if (areTeamsInConflictList(homeTeam, awayTeam)) {
    console.log(`Forcing third kit for ${awayTeam} against ${homeTeam} due to known conflict`);
    toast.success(`Conflict resolved`, {
      description: `${awayTeam} will use their third kit against ${homeTeam}`
    });
    return 'third';
  }
  
  // Check for white kit conflicts
  if (teamHasWhitePrimaryColor(homeTeam, 'home') && teamHasWhitePrimaryColor(awayTeam, 'away')) {
    console.log(`White kit conflict detected between ${homeTeam} and ${awayTeam}, using third kit`);
    toast.success(`White kit conflict resolved`, {
      description: `${awayTeam} will use their third kit to avoid white kit conflict`
    });
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
      toast.success(`Conflict resolved`, {
        description: `${awayTeam} will use their third kit against ${homeTeam}`
      });
      return 'third';
    } else {
      console.log(`${awayTeam} away kit is fine against ${homeTeam}`);
      toast.success(`No conflict detected`, {
        description: `${awayTeam} will use their away kit against ${homeTeam}`
      });
      return 'away';
    }
  }
  
  // If away team has a red away kit, force third kit
  if (teamHasRedPrimaryColor(awayTeam, 'away')) {
    console.log(`Forcing third kit for ${awayTeam} against ${homeTeam} due to red away kit`);
    toast.success(`Conflict resolved`, {
      description: `${awayTeam} will use their third kit to avoid red kit conflict`
    });
    return 'third';
  }
  
  // If home team is red and away team has a red third kit too, we have a problem
  // In this case, log an error but still return third as the best option
  if (teamHasRedPrimaryColor(homeTeam, 'home') && teamHasRedPrimaryColor(awayTeam, 'third')) {
    console.error(`⚠️ SEVERE KIT CONFLICT: Both ${homeTeam} (home) and ${awayTeam} (third) use red kits!`);
    toast.error(`Severe kit conflict!`, {
      description: `Both ${homeTeam} (home) and ${awayTeam} (third) use red kits. This may cause confusion.`
    });
    return 'away'; // In this rare case, away might be better than third
  }
  
  toast.success(`Conflict resolved`, {
    description: `${awayTeam} will use their third kit`
  });
  return 'third';
};
