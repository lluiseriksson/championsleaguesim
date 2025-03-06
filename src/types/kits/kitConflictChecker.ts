
import { teamKitColors } from './teamColorsData';
import { categorizeColor, ColorCategory } from './colorUtils';
import { getTeamKitColor } from './kitAccessors';
import { KitType } from './kitTypes';
import { toast } from 'sonner';

// Function to check if a team uses red as primary color
export const teamHasRedPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primaryColor = getTeamKitColor(teamName, kitType);
  const colorCategory = categorizeColor(primaryColor);
  
  return colorCategory === ColorCategory.RED || colorCategory === ColorCategory.BURGUNDY;
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
  
  return true; // No conflicts
};

// Enhanced function to resolve kit conflicts, forcing third kit for red teams
export const resolveKitConflict = (homeTeam: string, awayTeam: string): KitType => {
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
