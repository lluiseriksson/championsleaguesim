
import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { 
  parseHexColor, 
  categorizeColor, 
  ColorCategory,
  areColorsSufficientlyDifferent,
  areRedColorsTooSimilar,
  areWhiteColorsTooSimilar
} from './colorUtils';

// Teams with known conflicts that always require special handling
const conflictingTeamPairs: [string, string][] = [
  ['Forest', 'Espanyol'],
  ['Sevilla', 'Crvena Zvezda'],
  ['Leverkusen', 'Monza'], // Add the new conflict pair
  ['Athletic Bilbao', 'AC Milan'],
  ['Liverpool', 'AC Milan'],
  ['Liverpool', 'Manchester United'],
  ['Bayern Munich', 'FC København']
];

// Check if two teams are in the known conflict list
export const areTeamsInConflictList = (team1: string, team2: string): boolean => {
  return conflictingTeamPairs.some(
    ([a, b]) => (a === team1 && b === team2) || (a === team2 && b === team1)
  );
};

// Check if a team's primary color is red
export const teamHasRedPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.RED || category === ColorCategory.BURGUNDY;
};

// Check if a team's primary color is white or very light
export const teamHasWhitePrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.WHITE;
};

// Special check for the known Forest vs Espanyol color conflict
export const checkForestVsEspanyolConflict = (
  homeTeam: string, 
  awayTeam: string
): boolean => {
  return (homeTeam === 'Forest' && awayTeam === 'Espanyol') || 
         (homeTeam === 'Espanyol' && awayTeam === 'Forest');
};

// Check for white kit conflicts
export const checkWhiteKitConflict = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) return false;
  
  const homeIsWhite = teamHasWhitePrimaryColor(homeTeam, 'home');
  const awayIsWhite = teamHasWhitePrimaryColor(awayTeam, awayKitType);
  
  return homeIsWhite && awayIsWhite;
};

// Check if primary color of one team is too similar to secondary color of the other
export const checkPrimarySecondaryConflict = (
  team1: string,
  team2: string,
  team1KitType: KitType,
  team2KitType: KitType
): boolean => {
  if (!teamKitColors[team1] || !teamKitColors[team2]) return false;
  
  const team1Primary = teamKitColors[team1][team1KitType].primary;
  const team2Primary = teamKitColors[team2][team2KitType].primary;
  const team1Secondary = teamKitColors[team1][team1KitType].secondary;
  const team2Secondary = teamKitColors[team2][team2KitType].secondary;
  
  // Check if team1's primary is too similar to team2's secondary
  const team1PrimaryVsTeam2Secondary = !areColorsSufficientlyDifferent(team1Primary, team2Secondary);
  
  // Check if team2's primary is too similar to team1's secondary
  const team2PrimaryVsTeam1Secondary = !areColorsSufficientlyDifferent(team2Primary, team1Secondary);
  
  return team1PrimaryVsTeam2Secondary || team2PrimaryVsTeam1Secondary;
};

// Comprehensive kit conflict check
export const performFinalKitCheck = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  // First check if the teams are in the known conflict list
  if (areTeamsInConflictList(homeTeam, awayTeam)) {
    return false;
  }
  
  // Check for white kit conflicts
  if (checkWhiteKitConflict(homeTeam, awayTeam, awayKitType)) {
    return false;
  }
  
  // Check for red kit conflicts
  const homeIsRed = teamHasRedPrimaryColor(homeTeam, 'home');
  const awayIsRed = teamHasRedPrimaryColor(awayTeam, awayKitType);
  
  if (homeIsRed && awayIsRed) {
    return false;
  }
  
  // Check for primary-secondary conflicts
  if (checkPrimarySecondaryConflict(homeTeam, awayTeam, 'home', awayKitType)) {
    return false;
  }
  
  // If all checks pass, kits are okay
  return true;
};
