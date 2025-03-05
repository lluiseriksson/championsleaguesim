
import { KitType, TeamKit } from './kitTypes';
import { teamKitColors } from './teamColorsData';
import { parseHexColor, getColorDistance } from './colorUtils';

// Function to get the best contrasting kit for away team
export const getAwayTeamKit = (homeTeamName: string, awayTeamName: string): KitType => {
  const homeTeam = teamKitColors[homeTeamName];
  const awayTeam = teamKitColors[awayTeamName];

  if (!homeTeam || !awayTeam) {
    return 'away'; // Default to away kit if team not found
  }

  // Parse home team's primary home kit color
  const homeColor = parseHexColor(homeTeam.home.primary);
  
  // Parse away team's kit colors
  const awayColor = parseHexColor(awayTeam.away.primary);
  const thirdColor = parseHexColor(awayTeam.third.primary);

  // Calculate color distances between home team's primary and away team's kits
  const homeToAwayDistance = getColorDistance(homeColor, awayColor);
  const homeToThirdDistance = getColorDistance(homeColor, thirdColor);

  console.log(`Kit color comparison for ${homeTeamName} vs ${awayTeamName}:`);
  console.log(`Home to away distance: ${homeToAwayDistance}`);
  console.log(`Home to third distance: ${homeToThirdDistance}`);

  // Choose the kit with the greatest color distance from home team's kit
  // Use a higher minimum threshold to ensure better contrast
  const MINIMUM_COLOR_DISTANCE = 150; // Increased threshold for better contrast
  
  // If both kits have poor contrast, use a special case with a monochrome kit
  if (homeToAwayDistance < MINIMUM_COLOR_DISTANCE && homeToThirdDistance < MINIMUM_COLOR_DISTANCE) {
    console.log(`Both away and third kits for ${awayTeamName} have poor contrast with ${homeTeamName}`);
    return homeColor.r + homeColor.g + homeColor.b > 382 ? 'third' : 'away';
  }
  
  // Always choose the kit with better contrast
  if (homeToThirdDistance > homeToAwayDistance) {
    console.log(`Using third kit for ${awayTeamName} for better contrast with ${homeTeamName}`);
    return 'third';
  }
  
  console.log(`Using away kit for ${awayTeamName} against ${homeTeamName}`);
  return 'away';
};
