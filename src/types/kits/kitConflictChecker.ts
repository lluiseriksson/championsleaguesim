import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { 
  parseHexColor, 
  categorizeColor, 
  ColorCategory,
  areColorsSufficientlyDifferent,
  areRedColorsTooSimilar,
  areWhiteColorsTooSimilar,
  areBlackColorsTooSimilar,
  detectSpecificColorToneConflict,
  areBlueColorsTooSimilar
} from './colorUtils';

// Teams with known conflicts that always require special handling
const conflictingTeamPairs: [string, string][] = [
  ['Forest', 'Espanyol'],
  ['Sevilla', 'Crvena Zvezda'],
  ['Leverkusen', 'Monza'], 
  ['Athletic Bilbao', 'AC Milan'],
  ['Liverpool', 'AC Milan'],
  ['Liverpool', 'Manchester United'],
  ['Bayern Munich', 'FC København'],
  ['Atlanta', 'Leicester'], 
  ['Liverpool', 'Genova'],
  ['Freiburg', 'Strasbourg'],
  ['Girona', 'Celta'], 
  ['Brest', 'FC København'],
  ['Fulham', 'Las Palmas'],
  ['RB Leipzig', 'Braga'], 
  ['Inter', 'Man United'] // Add Inter vs Man United to known conflicts
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

// NEW: Check if a team's secondary color is red
export const teamHasRedSecondaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const secondary = teamKitColors[teamName][kitType].secondary;
  const category = categorizeColor(secondary);
  
  return category === ColorCategory.RED || category === ColorCategory.BURGUNDY;
};

// Check if a team's primary color is white or very light
export const teamHasWhitePrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.WHITE;
};

// NEW: Check if a team's primary color is black or very dark
export const teamHasBlackPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.BLACK;
};

// NEW: Check if a team's primary color is blue
export const teamHasBluePrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.BLUE || category === ColorCategory.NAVY;
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

// NEW: Check for black kit conflicts
export const checkBlackKitConflict = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) return false;
  
  const homeIsBlack = teamHasBlackPrimaryColor(homeTeam, 'home');
  const awayIsBlack = teamHasBlackPrimaryColor(awayTeam, awayKitType);
  
  if (homeIsBlack && awayIsBlack) {
    // For black kits, do an additional similarity check
    const homePrimary = teamKitColors[homeTeam].home.primary;
    const awayPrimary = teamKitColors[awayTeam][awayKitType].primary;
    
    return areBlackColorsTooSimilar(homePrimary, awayPrimary);
  }
  
  return false;
};

// NEW: Check for blue kit conflicts
export const checkBlueKitConflict = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) return false;
  
  const homeIsBlue = teamHasBluePrimaryColor(homeTeam, 'home');
  const awayIsBlue = teamHasBluePrimaryColor(awayTeam, awayKitType);
  
  if (homeIsBlue && awayIsBlue) {
    // For blue kits, do an additional similarity check
    const homePrimary = teamKitColors[homeTeam].home.primary;
    const awayPrimary = teamKitColors[awayTeam][awayKitType].primary;
    
    return areBlueColorsTooSimilar(homePrimary, awayPrimary);
  }
  
  return false;
};

// Enhanced check if primary color of one team is too similar to secondary color of the other
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
  
  // Enhanced check with stricter similarity thresholds
  // Check if team1's primary is too similar to team2's secondary
  const team1PrimaryVsTeam2Secondary = !areColorsSufficientlyDifferent(team1Primary, team2Secondary);
  
  // Check if team2's primary is too similar to team1's secondary
  const team2PrimaryVsTeam1Secondary = !areColorsSufficientlyDifferent(team2Primary, team1Secondary);
  
  // Check for additional similar color scenarios:
  // 1. Is team1's primary similar to team2's primary (base conflict)
  const team1PrimaryVsTeam2Primary = !areColorsSufficientlyDifferent(team1Primary, team2Primary);
  
  // 2. Are both teams' secondaries too similar (could cause confusion)
  const team1SecondaryVsTeam2Secondary = !areColorsSufficientlyDifferent(team1Secondary, team2Secondary);

  // NEW: Specific check for red primary vs red secondary conflicts
  const team1RedPrimaryVsTeam2RedSecondary = teamHasRedPrimaryColor(team1, team1KitType) && 
                                             teamHasRedSecondaryColor(team2, team2KitType);
  
  const team2RedPrimaryVsTeam1RedSecondary = teamHasRedPrimaryColor(team2, team2KitType) && 
                                             teamHasRedSecondaryColor(team1, team1KitType);
  
  // NEW: Specific check for black primary colors
  const team1BlackPrimaryVsTeam2BlackSecondary = teamHasBlackPrimaryColor(team1, team1KitType) &&
                                               categorizeColor(team2Secondary) === ColorCategory.BLACK;
                                               
  const team2BlackPrimaryVsTeam1BlackSecondary = teamHasBlackPrimaryColor(team2, team2KitType) &&
                                               categorizeColor(team1Secondary) === ColorCategory.BLACK;
  
  // NEW: Check for specific color tone conflicts (like Brest vs FC København)
  const specificToneConflict = detectSpecificColorToneConflict(team1Primary, team2Primary);
  
  // Check for specific blue-related conflicts
  const team1BluePrimaryVsTeam2BlueSecondary = teamHasBluePrimaryColor(team1, team1KitType) && 
                                         categorizeColor(teamKitColors[team2][team2KitType].secondary) === ColorCategory.BLUE;
  
  const team2BluePrimaryVsTeam1BlueSecondary = teamHasBluePrimaryColor(team2, team2KitType) && 
                                         categorizeColor(teamKitColors[team1][team1KitType].secondary) === ColorCategory.BLUE;
  
  return team1PrimaryVsTeam2Secondary || 
         team2PrimaryVsTeam1Secondary || 
         team1PrimaryVsTeam2Primary || 
         team1SecondaryVsTeam2Secondary ||
         team1RedPrimaryVsTeam2RedSecondary ||
         team2RedPrimaryVsTeam1RedSecondary ||
         team1BlackPrimaryVsTeam2BlackSecondary ||
         team2BlackPrimaryVsTeam1BlackSecondary ||
         specificToneConflict ||
         team1BluePrimaryVsTeam2BlueSecondary ||
         team2BluePrimaryVsTeam1BlueSecondary;
};

// Improved function to check for similar primary colors between teams
export const checkPrimarySimilarityConflict = (
  team1: string,
  team2: string,
  team1KitType: KitType,
  team2KitType: KitType
): boolean => {
  if (!teamKitColors[team1] || !teamKitColors[team2]) return false;
  
  const team1Primary = teamKitColors[team1][team1KitType].primary;
  const team2Primary = teamKitColors[team2][team2KitType].primary;
  
  // Parse colors to check RGB values directly
  const team1Rgb = parseHexColor(team1Primary);
  const team2Rgb = parseHexColor(team2Primary);
  
  // Calculate the difference in each RGB channel
  const rDiff = Math.abs(team1Rgb.r - team2Rgb.r);
  const gDiff = Math.abs(team1Rgb.g - team2Rgb.g);
  const bDiff = Math.abs(team1Rgb.b - team2Rgb.b);
  
  // UPDATED: More strict detection - lowered the threshold from 15 to 12
  const anyChannelTooSimilar = (rDiff < 12 || gDiff < 12 || bDiff < 12);
  
  // NEW: More strict detection for dark/black kits
  const bothDark = (team1Rgb.r < 60 && team1Rgb.g < 60 && team1Rgb.b < 60) && 
                  (team2Rgb.r < 60 && team2Rgb.g < 60 && team2Rgb.b < 60);
                  
  if (bothDark) {
    // For dark/black kits, we need a higher total difference
    const totalDiff = rDiff + gDiff + bDiff;
    if (totalDiff < 50) return true; // More strict - consider conflict if total diff < 50
  }
  
  // UPDATED: Special check for red-dominant colors (like Brest vs FC København)
  const bothRedDominant = (team1Rgb.r > team1Rgb.g && team1Rgb.r > team1Rgb.b) && 
                          (team2Rgb.r > team2Rgb.g && team2Rgb.r > team2Rgb.b);
  
  if (bothRedDominant) {
    // For red-dominant colors, check if they have similar color tone despite having different red values
    const team1GreenRatio = team1Rgb.g / team1Rgb.r;
    const team1BlueRatio = team1Rgb.b / team1Rgb.r;
    const team2GreenRatio = team2Rgb.g / team2Rgb.r;
    const team2BlueRatio = team2Rgb.b / team2Rgb.r;
    
    const greenRatioDiff = Math.abs(team1GreenRatio - team2GreenRatio);
    const blueRatioDiff = Math.abs(team1BlueRatio - team2BlueRatio);
    
    // If secondary color ratios are similar, the colors will appear to have the same tone
    // even if the red values are different
    const similarColorTone = greenRatioDiff < 0.1 && blueRatioDiff < 0.1;
    
    return anyChannelTooSimilar || similarColorTone;
  }
  
  // UPDATED: Special check for blue-dominant colors (like Inter vs Man United)
  const bothBlueDominant = (team1Rgb.b > team1Rgb.r && team1Rgb.b > team1Rgb.g) && 
                           (team2Rgb.b > team2Rgb.r && team2Rgb.b > team2Rgb.g);
  
  if (bothBlueDominant) {
    // For blue-dominant colors, check if they have similar color tone
    const team1RedRatio = team1Rgb.r / team1Rgb.b;
    const team1GreenRatio = team1Rgb.g / team1Rgb.b;
    const team2RedRatio = team2Rgb.r / team2Rgb.b;
    const team2GreenRatio = team2Rgb.g / team2Rgb.b;
    
    const redRatioDiff = Math.abs(team1RedRatio - team2RedRatio);
    const greenRatioDiff = Math.abs(team1GreenRatio - team2GreenRatio);
    
    // If secondary color ratios are similar, the blues will appear to have the same tone
    const similarBlueColorTone = redRatioDiff < 0.1 && greenRatioDiff < 0.1;
    
    return anyChannelTooSimilar || similarBlueColorTone;
  }
  
  return anyChannelTooSimilar;
}

// Resolve kit conflict by selecting an alternative kit
export const resolveKitConflict = (homeTeam: string, awayTeam: string): KitType => {
  // Default to 'third' kit in case of conflict
  // This is a simplified approach; in a more complex system we might
  // dynamically select the kit that creates the least amount of conflict
  console.log(`Resolving kit conflict between ${homeTeam} and ${awayTeam} - using third kit`);
  return 'third';
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
  
  // Check for black kit conflicts
  if (checkBlackKitConflict(homeTeam, awayTeam, awayKitType)) {
    return false;
  }
  
  // Check for blue kit conflicts
  if (checkBlueKitConflict(homeTeam, awayTeam, awayKitType)) {
    return false;
  }
  
  // Check for red kit conflicts
  const homeIsRed = teamHasRedPrimaryColor(homeTeam, 'home');
  const awayIsRed = teamHasRedPrimaryColor(awayTeam, awayKitType);
  
  if (homeIsRed && awayIsRed) {
    return false;
  }
  
  // Check for primary-secondary conflicts with enhanced detection
  if (checkPrimarySecondaryConflict(homeTeam, awayTeam, 'home', awayKitType)) {
    return false;
  }
  
  // Check for similar primary colors with stricter single-channel detection
  if (checkPrimarySimilarityConflict(homeTeam, awayTeam, 'home', awayKitType)) {
    return false;
  }
  
  // If all checks pass, kits are okay
  return true;
};
