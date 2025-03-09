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
  areBlueColorsTooSimilar,
  areYellowGreenColorsTooSimilar,
  arePurplePinkColorsTooSimilar
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
  ['RB Leipzig', 'Rangers'],
  ['Inter', 'Manchester United'],
  ['Inter', 'Man United']
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

// Check if a team's secondary color is red
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

// Check if a team's primary color is black or very dark
export const teamHasBlackPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.BLACK;
};

// Check if a team's primary color is blue
export const teamHasBluePrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.BLUE || category === ColorCategory.NAVY;
};

// Check if a team's primary color is in yellow/green category
export const teamHasYellowGreenPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.YELLOW || category === ColorCategory.GREEN;
};

// Check if a team's primary color is in purple/pink category
export const teamHasPurplePinkPrimaryColor = (teamName: string, kitType: KitType): boolean => {
  if (!teamKitColors[teamName]) return false;
  
  const primary = teamKitColors[teamName][kitType].primary;
  const category = categorizeColor(primary);
  
  return category === ColorCategory.PURPLE || category === ColorCategory.PINK;
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
  
  if (homeIsWhite && awayIsWhite) {
    const homePrimary = teamKitColors[homeTeam].home.primary;
    const awayPrimary = teamKitColors[awayTeam][awayKitType].primary;
    
    return areWhiteColorsTooSimilar(homePrimary, awayPrimary);
  }
  
  return false;
};

// Check for black kit conflicts
export const checkBlackKitConflict = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) return false;
  
  const homeIsBlack = teamHasBlackPrimaryColor(homeTeam, 'home');
  const awayIsBlack = teamHasBlackPrimaryColor(awayTeam, awayKitType);
  
  if (homeIsBlack && awayIsBlack) {
    const homePrimary = teamKitColors[homeTeam].home.primary;
    const awayPrimary = teamKitColors[awayTeam][awayKitType].primary;
    
    return areBlackColorsTooSimilar(homePrimary, awayPrimary);
  }
  
  return false;
};

// Check for blue kit conflicts
export const checkBlueKitConflict = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) return false;
  
  const homeIsBlue = teamHasBluePrimaryColor(homeTeam, 'home');
  const awayIsBlue = teamHasBluePrimaryColor(awayTeam, awayKitType);
  
  if (homeIsBlue && awayIsBlue) {
    const homePrimary = teamKitColors[homeTeam].home.primary;
    const awayPrimary = teamKitColors[awayTeam][awayKitType].primary;
    
    return areBlueColorsTooSimilar(homePrimary, awayPrimary);
  }
  
  return false;
};

// Check for yellow/green kit conflicts
export const checkYellowGreenKitConflict = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) return false;
  
  const homeIsYellowGreen = teamHasYellowGreenPrimaryColor(homeTeam, 'home');
  const awayIsYellowGreen = teamHasYellowGreenPrimaryColor(awayTeam, awayKitType);
  
  if (homeIsYellowGreen && awayIsYellowGreen) {
    const homePrimary = teamKitColors[homeTeam].home.primary;
    const awayPrimary = teamKitColors[awayTeam][awayKitType].primary;
    
    return areYellowGreenColorsTooSimilar(homePrimary, awayPrimary);
  }
  
  return false;
};

// Check for purple/pink kit conflicts
export const checkPurplePinkKitConflict = (
  homeTeam: string, 
  awayTeam: string, 
  awayKitType: KitType
): boolean => {
  if (!teamKitColors[homeTeam] || !teamKitColors[awayTeam]) return false;
  
  const homeIsPurplePink = teamHasPurplePinkPrimaryColor(homeTeam, 'home');
  const awayIsPurplePink = teamHasPurplePinkPrimaryColor(awayTeam, awayKitType);
  
  if (homeIsPurplePink && awayIsPurplePink) {
    const homePrimary = teamKitColors[homeTeam].home.primary;
    const awayPrimary = teamKitColors[awayTeam][awayKitType].primary;
    
    return arePurplePinkColorsTooSimilar(homePrimary, awayPrimary);
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

  // Specific check for red primary vs red secondary conflicts
  const team1RedPrimaryVsTeam2RedSecondary = teamHasRedPrimaryColor(team1, team1KitType) && 
                                             teamHasRedSecondaryColor(team2, team2KitType);
  
  const team2RedPrimaryVsTeam1RedSecondary = teamHasRedPrimaryColor(team2, team2KitType) && 
                                             teamHasRedSecondaryColor(team1, team1KitType);
  
  // Specific check for black primary colors
  const team1BlackPrimaryVsTeam2BlackSecondary = teamHasBlackPrimaryColor(team1, team1KitType) &&
                                               categorizeColor(team2Secondary) === ColorCategory.BLACK;
                                               
  const team2BlackPrimaryVsTeam1BlackSecondary = teamHasBlackPrimaryColor(team2, team2KitType) &&
                                               categorizeColor(team1Secondary) === ColorCategory.BLACK;
  
  // Check for specific color tone conflicts
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
  
  // More strict detection - check for any channel similarity
  const anyChannelTooSimilar = (rDiff < 10 || gDiff < 10 || bDiff < 10);
  
  // More strict detection for dark/black kits
  const bothDark = (team1Rgb.r < 50 && team1Rgb.g < 50 && team1Rgb.b < 50) && 
                   (team2Rgb.r < 50 && team2Rgb.g < 50 && team2Rgb.b < 50);
                  
  if (bothDark) {
    // For dark/black kits, we need a higher total difference
    const totalDiff = rDiff + gDiff + bDiff;
    if (totalDiff < 60) return true; // More strict - consider conflict if total diff < 60
  }
  
  // Special check for red-dominant colors
  const bothRedDominant = (team1Rgb.r > team1Rgb.g && team1Rgb.r > team1Rgb.b) && 
                          (team2Rgb.r > team2Rgb.g && team2Rgb.r > team2Rgb.b);
  
  if (bothRedDominant) {
    // For red-dominant colors, check if they have similar color tone
    const team1GreenRatio = team1Rgb.g / team1Rgb.r;
    const team1BlueRatio = team1Rgb.b / team1Rgb.r;
    const team2GreenRatio = team2Rgb.g / team2Rgb.r;
    const team2BlueRatio = team2Rgb.b / team2Rgb.r;
    
    const greenRatioDiff = Math.abs(team1GreenRatio - team2GreenRatio);
    const blueRatioDiff = Math.abs(team1BlueRatio - team2BlueRatio);
    
    // If secondary color ratios are similar, the colors will appear to have the same tone
    const similarColorTone = greenRatioDiff < 0.08 && blueRatioDiff < 0.08;
    
    return anyChannelTooSimilar || similarColorTone;
  }
  
  // Special check for blue-dominant colors
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
    const similarBlueColorTone = redRatioDiff < 0.08 && greenRatioDiff < 0.08;
    
    return anyChannelTooSimilar || similarBlueColorTone;
  }
  
  // Special check for green-dominant colors
  const bothGreenDominant = (team1Rgb.g > team1Rgb.r && team1Rgb.g > team1Rgb.b) && 
                            (team2Rgb.g > team2Rgb.r && team2Rgb.g > team2Rgb.b);
  
  if (bothGreenDominant) {
    // For green-dominant colors, check if they have similar color tone
    const team1RedRatio = team1Rgb.r / team1Rgb.g;
    const team1BlueRatio = team1Rgb.b / team1Rgb.g;
    const team2RedRatio = team2Rgb.r / team2Rgb.g;
    const team2BlueRatio = team2Rgb.b / team2Rgb.g;
    
    const redRatioDiff = Math.abs(team1RedRatio - team2RedRatio);
    const blueRatioDiff = Math.abs(team1BlueRatio - team2BlueRatio);
    
    // If secondary color ratios are similar, the greens will appear to have the same tone
    const similarGreenColorTone = redRatioDiff < 0.08 && blueRatioDiff < 0.08;
    
    return anyChannelTooSimilar || similarGreenColorTone;
  }
  
  return anyChannelTooSimilar;
}

// Resolve kit conflict by selecting an alternative kit
export const resolveKitConflict = (homeTeam: string, awayTeam: string): KitType => {
  console.log(`Resolving kit conflict between ${homeTeam} and ${awayTeam} - using third kit`);
  return 'third';
};

// Enhanced color similarity detection - more precise than simple categorization
export const areColorsTooSimilar = (color1: string, color2: string): boolean => {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  // Calculate color distance using an improved formula
  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;
  
  // Use weighted Euclidean distance for better perceptual similarity
  // Human eye is more sensitive to green, then red, then blue
  const distance = Math.sqrt(
    (rDiff * rDiff) * 0.299 + 
    (gDiff * gDiff) * 0.587 + 
    (bDiff * bDiff) * 0.114
  );
  
  // Lower threshold means more strict similarity detection
  return distance < 35;
};

// Interface for conflict checking results
export interface ColorConflictResult {
  hasConflict: boolean;
  conflictDetails?: {
    type: string;
    homeTeamColors: {
      primary: string;
      secondary: string;
    };
    awayTeamColors: {
      primary: string;
      secondary: string;
    };
  };
}

// Check for all types of color conflicts between teams
export const checkTeamColorConflict = (homeTeam: string, awayTeam: string): ColorConflictResult => {
  // Handle special case for Milan vs Empoli 
  if ((homeTeam === 'AC Milan' && awayTeam === 'Empoli') || 
      (homeTeam === 'Empoli' && awayTeam === 'AC Milan')) {
    console.log(`Special handling for ${homeTeam} vs ${awayTeam} conflict`);
    
    // Get team colors
    const homeColors = teamKitColors[homeTeam]?.home;
    const awayColors = teamKitColors[awayTeam]?.away;
    
    if (!homeColors || !awayColors) {
      return { hasConflict: false };
    }
    
    return {
      hasConflict: true,
      conflictDetails: {
        type: 'Primary colors too similar',
        homeTeamColors: {
          primary: homeColors.primary,
          secondary: homeColors.secondary
        },
        awayTeamColors: {
          primary: awayColors.primary,
          secondary: awayColors.secondary
        }
      }
    };
  }
  
  // Get team colors
  const homeColors = teamKitColors[homeTeam]?.home;
  const awayColors = teamKitColors[awayTeam]?.away;
  
  if (!homeColors || !awayColors) {
    return { hasConflict: false };
  }
  
  // Check if primary colors are too similar
  if (areColorsTooSimilar(homeColors.primary, awayColors.primary)) {
    return {
      hasConflict: true,
      conflictDetails: {
        type: 'Primary colors too similar',
        homeTeamColors: {
          primary: homeColors.primary,
          secondary: homeColors.secondary
        },
        awayTeamColors: {
          primary: awayColors.primary,
          secondary: awayColors.secondary
        }
      }
    };
  }
  
  // Check if home primary and away secondary are too similar
  if (areColorsTooSimilar(homeColors.primary, awayColors.secondary)) {
    return {
      hasConflict: true,
      conflictDetails: {
        type: 'Home primary vs Away secondary colors too similar',
        homeTeamColors: {
          primary: homeColors.primary,
          secondary: homeColors.secondary
        },
        awayTeamColors: {
          primary: awayColors.primary,
          secondary: awayColors.secondary
        }
      }
    };
  }
  
  // Check if away primary and home secondary are too similar
  if (areColorsTooSimilar(awayColors.primary, homeColors.secondary)) {
    return {
      hasConflict: true,
      conflictDetails: {
        type: 'Away primary vs Home secondary colors too similar',
        homeTeamColors: {
          primary: homeColors.primary,
          secondary: homeColors.secondary
        },
        awayTeamColors: {
          primary: awayColors.primary,
          secondary: awayColors.secondary
        }
      }
    };
  }
  
  return { hasConflict: false };
};

// Generate an alternative kit based on the home team's colors
export const generateAlternativeKit = (homeTeam: string, awayTeam: string) => {
  // Get home team colors to avoid
  const homeColors = teamKitColors[homeTeam]?.home;
  
  if (!homeColors) {
    // Fallback to a neutral kit if home colors not found
    return {
      primary: '#8E9196',  // Neutral gray
      secondary: '#FFFFFF', // White
      accent: '#000000'     // Black accent
    };
  }
  
  // Parse home team colors
  const homePrimaryRgb = parseHexColor(homeColors.primary);
  const homeSecondaryRgb = parseHexColor(homeColors.secondary);
  
  // Alternative color options that provide good contrast
  const alternativeColors = [
    '#0EA5E9', // Bright blue
    '#8B5CF6', // Vivid purple
    '#F97316', // Bright orange
    '#D946EF', // Magenta pink
    '#22C55E', // Green
    '#3730A3', // Indigo
    '#0F766E', // Teal
    '#BE185D', // Pink
    '#FFFF00'  // Yellow
  ];
  
  // Find the color with the best contrast against home team colors
  let bestColor = alternativeColors[0];
  let maxDistance = 0;
  
  for (const color of alternativeColors) {
    const rgb = parseHexColor(color);
    
    // Calculate distance to home primary
    const rDiff1 = rgb.r - homePrimaryRgb.r;
    const gDiff1 = rgb.g - homePrimaryRgb.g;
    const bDiff1 = rgb.b - homePrimaryRgb.b;
    
    const distToPrimary = Math.sqrt(
      (rDiff1 * rDiff1) * 0.299 + 
      (gDiff1 * gDiff1) * 0.587 + 
      (bDiff1 * bDiff1) * 0.114
    );
    
    // Calculate distance to home secondary
    const rDiff2 = rgb.r - homeSecondaryRgb.r;
    const gDiff2 = rgb.g - homeSecondaryRgb.g;
    const bDiff2 = rgb.b - homeSecondaryRgb.b;
    
    const distToSecondary = Math.sqrt(
      (rDiff2 * rDiff2) * 0.299 + 
      (gDiff2 * gDiff2) * 0.587 + 
      (bDiff2 * bDiff2) * 0.114
    );
    
    // Combined distance (weighted more toward primary)
    const totalDist = distToPrimary * 0.7 + distToSecondary * 0.3;
    
    if (totalDist > maxDistance) {
      maxDistance = totalDist;
      bestColor = color;
    }
  }
  
  // For AC Milan vs Empoli specifically, use purple kit
  if ((homeTeam === 'AC Milan' && awayTeam === 'Empoli') || 
      (homeTeam === 'Empoli' && awayTeam === 'AC Milan')) {
    bestColor = '#8B5CF6'; // Vivid purple
  }
  
  // Choose a good secondary color (white or black based on primary brightness)
  const bestColorRgb = parseHexColor(bestColor);
  const brightness = (bestColorRgb.r * 299 + bestColorRgb.g * 587 + bestColorRgb.b * 114) / 1000;
  const secondaryColor = brightness > 128 ? '#000000' : '#FFFFFF';
  
  // Return the alternative kit
  return {
    primary: bestColor,
    secondary: secondaryColor,
    accent: '#CCCCCC' // Light gray accent
  };
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
  
  // Check for specific kit conflicts by color
  if (checkWhiteKitConflict(homeTeam, awayTeam, awayKitType)) {
    return false;
  }
  
  if (checkBlackKitConflict(homeTeam, awayTeam, awayKitType)) {
    return false;
  }
  
  if (checkBlueKitConflict(homeTeam, awayTeam, awayKitType)) {
    return false;
  }
  
  if (checkYellowGreenKitConflict(homeTeam, awayTeam, awayKitType)) {
    return false;
  }
  
  if (checkPurplePinkKitConflict(homeTeam, awayTeam, awayKitType)) {
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
  
  // Check for similar primary colors with stricter detection
  if (checkPrimarySimilarityConflict(homeTeam, awayTeam, 'home', awayKitType)) {
    return false;
  }
  
  // If all checks pass, kits are okay
  return true;
};
