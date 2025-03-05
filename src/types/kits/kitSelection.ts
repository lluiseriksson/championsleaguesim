
import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { parseHexColor, getColorDistance, areColorsConflicting, categorizeColor, ColorCategory } from './colorUtils';

// Function to get the best contrasting kit for away team
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    return 'away'; // Default to away kit if team not found
  }

  // Parse home team's primary home kit color
  const homeColor = homeTeam.home.primary;
  
  // Parse away team's kit colors
  const awayColor = awayTeam.away.primary;
  const thirdColor = awayTeam.third.primary;

  console.log(`Kit color comparison for ${homeTeamName} vs ${awayTeamName}:`);
  console.log(`Home primary: ${homeColor} (${categorizeColor(homeColor)})`);
  console.log(`Away primary: ${awayColor} (${categorizeColor(awayColor)})`);
  console.log(`Third primary: ${thirdColor} (${categorizeColor(thirdColor)})`);

  // Check for color conflicts using our categorization system
  const homeAwayConflict = areColorsConflicting(homeColor, awayColor);
  const homeThirdConflict = areColorsConflicting(homeColor, thirdColor);
  
  console.log(`Home-Away conflict: ${homeAwayConflict}`);
  console.log(`Home-Third conflict: ${homeThirdConflict}`);

  // If neither kit conflicts, use traditional distance-based selection
  if (!homeAwayConflict && !homeThirdConflict) {
    // Calculate color distances for traditional method
    const homeColorRgb = parseHexColor(homeColor);
    const awayColorRgb = parseHexColor(awayColor);
    const thirdColorRgb = parseHexColor(thirdColor);
    
    const homeToAwayDistance = getColorDistance(homeColorRgb, awayColorRgb);
    const homeToThirdDistance = getColorDistance(homeColorRgb, thirdColorRgb);
    
    console.log(`Using distance-based selection: away=${homeToAwayDistance}, third=${homeToThirdDistance}`);
    
    // Choose the kit with the greatest color distance from home team's kit
    if (homeToThirdDistance > homeToAwayDistance) {
      console.log(`Selected third kit for ${awayTeamName} based on better contrast with ${homeTeamName}`);
      return 'third';
    } else {
      console.log(`Selected away kit for ${awayTeamName} against ${homeTeamName}`);
      return 'away';
    }
  }
  
  // If only one kit doesn't conflict, use that
  if (!homeAwayConflict) {
    console.log(`Selected away kit for ${awayTeamName} as it doesn't conflict with ${homeTeamName}`);
    return 'away';
  }
  
  if (!homeThirdConflict) {
    console.log(`Selected third kit for ${awayTeamName} as it doesn't conflict with ${homeTeamName}`);
    return 'third';
  }
  
  // If both kits conflict, use a fallback based on which might be least problematic
  // For this fallback, we'll use traditional color distance
  const homeColorRgb = parseHexColor(homeColor);
  const awayColorRgb = parseHexColor(awayColor);
  const thirdColorRgb = parseHexColor(thirdColor);
  
  const homeToAwayDistance = getColorDistance(homeColorRgb, awayColorRgb);
  const homeToThirdDistance = getColorDistance(homeColorRgb, thirdColorRgb);
  
  console.log(`Both kits conflict, falling back to distance: away=${homeToAwayDistance}, third=${homeToThirdDistance}`);
  
  // Use the kit with the greater distance when both conflict
  if (homeToThirdDistance > homeToAwayDistance) {
    console.log(`Fallback to third kit for ${awayTeamName} despite conflict with ${homeTeamName}`);
    return 'third';
  }
  
  console.log(`Fallback to away kit for ${awayTeamName} despite conflict with ${homeTeamName}`);
  return 'away';
};
