
export type KitType = 'home' | 'away' | 'third';

export type TeamKitColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TeamKit = {
  home: TeamKitColors;
  away: TeamKitColors;
  third: TeamKitColors;
  goalkeeper: TeamKitColors;
};

export type TeamColors = {
  [key: string]: TeamKit;
};

// Function to adjust green kits to improve contrast with the pitch
export function adjustGreenKitForPitchContrast(color: string): string {
  // Parse the hex color to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // Check if the color is in the "green" range
  // The pitch color is approximately #2a7c35 (RGB: 42, 124, 53)
  // We need to detect if this color is too close to the pitch color
  const isPitchGreen = 
    g > Math.max(r, b) && // Green is dominant
    g > 100 &&            // Green is reasonably high
    r < 80 &&             // Red is low (typical for greens)
    b < 80;               // Blue is low (typical for greens)
    
  if (isPitchGreen) {
    // Options to adjust the green kit:
    
    // 1. Lighten the color significantly
    const lightenedR = Math.min(255, r + 100);
    const lightenedG = Math.min(255, g + 70);
    const lightenedB = Math.min(255, b + 50);
    
    // Convert back to hex
    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  }
  
  // If not a pitch-like green, return the original color
  return color;
}

// Function to check if a color is too close to the pitch color
export function isColorTooCloseToField(color: string): boolean {
  // Parse the hex color to RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  // The pitch color is approximately #2a7c35 (RGB: 42, 124, 53)
  const pitchR = 42;
  const pitchG = 124;
  const pitchB = 53;
  
  // Calculate the color distance using a weighted euclidean distance
  // Giving more weight to green channel differences
  const distance = Math.sqrt(
    Math.pow(r - pitchR, 2) * 0.3 + 
    Math.pow(g - pitchG, 2) * 0.6 + 
    Math.pow(b - pitchB, 2) * 0.1
  );
  
  // Return true if the color is too close to the pitch color
  return distance < 60;
}
