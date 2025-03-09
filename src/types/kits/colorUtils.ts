// Helper function to parse hex color to RGB
export function parseHexColor(hex: string): { r: number, g: number, b: number } {
  // Handle invalid hex colors
  if (!hex || hex.length < 7) {
    console.warn(`Invalid hex color: ${hex}, defaulting to black`);
    return { r: 0, g: 0, b: 0 };
  }

  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  } catch (error) {
    console.warn(`Error parsing hex color ${hex}:`, error);
    return { r: 0, g: 0, b: 0 };
  }
}

// Improved color distance calculation (using weighted RGB to account for human perception)
export function getColorDistance(
  color1: { r: number, g: number, b: number }, 
  color2: { r: number, g: number, b: number }
): number {
  // Apply human perception weights to RGB components
  // Human eyes are more sensitive to green, less to blue
  const rWeight = 0.3;
  const gWeight = 0.59;
  const bWeight = 0.11;
  
  // Calculate weighted Euclidean distance
  return Math.sqrt(
    rWeight * Math.pow(color2.r - color1.r, 2) +
    gWeight * Math.pow(color2.g - color1.g, 2) +
    bWeight * Math.pow(color2.b - color1.b, 2)
  );
}

// Enhanced distance calculation with brightness and hue consideration
export function getEnhancedColorDistance(
  color1: { r: number, g: number, b: number },
  color2: { r: number, g: number, b: number }
): number {
  // Calculate traditional weighted distance
  const baseDistance = getColorDistance(color1, color2);
  
  // Calculate brightness for each color
  const brightness1 = (color1.r * 299 + color1.g * 587 + color1.b * 114) / 1000;
  const brightness2 = (color2.r * 299 + color2.g * 587 + color2.b * 114) / 1000;
  
  // Calculate brightness difference (important for visibility)
  const brightnessDiff = Math.abs(brightness1 - brightness2);
  
  // Calculate hue difference (simplified)
  const hue1 = Math.atan2(color1.g - color1.b, color1.r - color1.b);
  const hue2 = Math.atan2(color2.g - color2.b, color2.r - color2.b);
  const hueDiff = Math.abs(hue1 - hue2);
  
  // Combine all factors with increased weights for better differentiation
  return baseDistance * 0.7 + brightnessDiff * 80 + hueDiff * 60; // Further increased weights for better differentiation
}

// Add the missing isWhiteColor function
export function isWhiteColor(hexColor: string): boolean {
  if (!hexColor) return false;
  
  const rgb = parseHexColor(hexColor);
  return rgb.r > 230 && rgb.g > 230 && rgb.b > 230;
}

// Color category system
export enum ColorCategory {
  RED = "RED",
  BURGUNDY = "BURGUNDY",
  ORANGE = "ORANGE",
  YELLOW = "YELLOW",
  GREEN = "GREEN",
  BLUE = "BLUE",
  NAVY = "NAVY",
  PURPLE = "PURPLE",
  PINK = "PINK",
  BROWN = "BROWN",
  BLACK = "BLACK",
  WHITE = "WHITE",
  GRAY = "GRAY"
}

// Function to categorize a hex color with even stricter thresholds
export function categorizeColor(hexColor: string): ColorCategory {
  const rgb = parseHexColor(hexColor);
  const { r, g, b } = rgb;
  
  // Calculate intensity and saturation with stricter thresholds
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;
  
  // Enhanced white detection with even stricter thresholds
  // Check if all RGB values are very high and close to each other
  if (r > 220 && g > 220 && b > 220 && chroma < 20) {
    return ColorCategory.WHITE;
  }
  
  // Enhanced black detection with stricter thresholds
  // Check if all RGB values are very low and close to each other
  if (r < 25 && g < 25 && b < 25 && chroma < 12) {
    return ColorCategory.BLACK;
  }
  
  // Stricter gray/black/white detection
  if (chroma < 35) {
    if (lightness < 35) return ColorCategory.BLACK; // More strict black threshold
    if (lightness > 190) return ColorCategory.WHITE;
    return ColorCategory.GRAY;
  }
  
  // Improved Red detection - more sensitive to different shades of red
  if (r > 170 && r > g * 1.6 && r > b * 1.6) {
    // Strong red detection
    if (g < 100 && b < 100) {
      return r > 220 ? ColorCategory.RED : ColorCategory.BURGUNDY;
    }
    if (g > 150 && b < 100) return ColorCategory.ORANGE;
    if (g > 100 && b > 100) return ColorCategory.PINK;
    return ColorCategory.RED;
  }
  
  // Enhanced blue detection
  if (b > 140 && b > r * 1.2 && b > g * 1.2) {
    // Better differentiation between blue and navy
    if (b > 190 && r < 100 && g < 150) return ColorCategory.BLUE;
    return ColorCategory.NAVY;
  }
  
  // Color categorization based on dominant channel and ratios
  if (r > g && r > b) {
    // Red dominant
    if (g > 150 && b < 100) return ColorCategory.ORANGE;
    if (g < 100 && b < 100) {
      return r > 170 ? ColorCategory.RED : ColorCategory.BURGUNDY;
    }
    if (g > 100 && b > 100) return ColorCategory.PINK;
    return ColorCategory.RED;
  }
  
  if (g > r && g > b) {
    // Green dominant
    // Better differentiation between different green shades
    if (g > 190 && r < 120 && b < 120) return ColorCategory.GREEN;
    if (g > 150 && r > 140 && b < 100) return ColorCategory.YELLOW;
    return ColorCategory.GREEN;
  }
  
  if (b > r && b > g) {
    // Blue dominant
    if (r > 120 && g > 120) return ColorCategory.BLUE;
    if (r > 100 && r > g && g < 80) return ColorCategory.PURPLE;
    return b > 150 ? ColorCategory.BLUE : ColorCategory.NAVY;
  }
  
  if (r > 200 && g > 200 && b < 100) {
    return ColorCategory.YELLOW;
  }
  
  if (r > 120 && b > 120 && g < 100) {
    return ColorCategory.PURPLE;
  }
  
  if (r > 100 && g > 60 && b < 60) {
    return ColorCategory.BROWN;
  }
  
  // Default fallback
  return ColorCategory.GRAY;
}

// Improved function to check if two colors are in the same category or conflicting categories
export function areColorsConflicting(color1: string, color2: string): boolean {
  const category1 = categorizeColor(color1);
  const category2 = categorizeColor(color2);
  
  // Same category is conflicting
  if (category1 === category2) return true;
  
  // Define conflicting categories with expanded relationships
  const conflictMap: Record<ColorCategory, ColorCategory[]> = {
    [ColorCategory.RED]: [ColorCategory.BURGUNDY, ColorCategory.ORANGE, ColorCategory.PINK, ColorCategory.BROWN],
    [ColorCategory.BURGUNDY]: [ColorCategory.RED, ColorCategory.PURPLE, ColorCategory.BROWN, ColorCategory.PINK],
    [ColorCategory.ORANGE]: [ColorCategory.RED, ColorCategory.YELLOW, ColorCategory.BROWN],
    [ColorCategory.YELLOW]: [ColorCategory.ORANGE, ColorCategory.GREEN],
    [ColorCategory.GREEN]: [ColorCategory.YELLOW, ColorCategory.BLUE],
    [ColorCategory.BLUE]: [ColorCategory.GREEN, ColorCategory.NAVY, ColorCategory.PURPLE],
    [ColorCategory.NAVY]: [ColorCategory.BLUE, ColorCategory.PURPLE, ColorCategory.BLACK],
    [ColorCategory.PURPLE]: [ColorCategory.BURGUNDY, ColorCategory.NAVY, ColorCategory.PINK, ColorCategory.BLUE],
    [ColorCategory.PINK]: [ColorCategory.RED, ColorCategory.PURPLE, ColorCategory.BURGUNDY],
    [ColorCategory.BROWN]: [ColorCategory.BURGUNDY, ColorCategory.ORANGE, ColorCategory.RED],
    [ColorCategory.BLACK]: [ColorCategory.NAVY, ColorCategory.GRAY, ColorCategory.PURPLE], // Black conflicts expanded
    [ColorCategory.WHITE]: [ColorCategory.GRAY],
    [ColorCategory.GRAY]: [ColorCategory.BLACK, ColorCategory.WHITE]
  };
  
  // Check if the categories conflict
  return conflictMap[category1]?.includes(category2) || false;
}

// Function to check if colors are too similar with stricter threshold
export function areColorsTooSimilar(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const distance = getEnhancedColorDistance(rgb1, rgb2);
  return distance < 200; // Increased threshold for better differentiation
}

// Enhanced function to check if colors are sufficiently different with even stricter thresholds
export function areColorsSufficientlyDifferent(color1: string, color2: string): boolean {
  // First check categorical conflicts
  const categoricalConflict = areColorsConflicting(color1, color2);
  
  // Parse colors to RGB for more detailed analysis
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  // Calculate enhanced distance with increased threshold for better differentiation
  const enhancedDistance = getEnhancedColorDistance(rgb1, rgb2);
  
  // Calculate component-wise differences (helps catch cases where only one channel is different)
  const redDiff = Math.abs(rgb1.r - rgb2.r);
  const greenDiff = Math.abs(rgb1.g - rgb2.g);
  const blueDiff = Math.abs(rgb1.b - rgb2.b);
  
  // Even more strict detection - consider a conflict if ANY individual color channel is too similar
  const anyComponentTooSimilar = (redDiff < 10 || greenDiff < 10 || blueDiff < 10);
  
  // Check for black kit conflicts specifically
  const bothDark = (rgb1.r < 50 && rgb1.g < 50 && rgb1.b < 50) && 
                   (rgb2.r < 50 && rgb2.g < 50 && rgb2.b < 50);
  
  // For dark kits, be even more strict
  if (bothDark) {
    const totalDiff = redDiff + greenDiff + blueDiff;
    if (totalDiff < 60) return false; // Total difference needs to be higher for dark kits
  }
  
  // For reds specifically, be even more strict
  // If both colors have red as dominant channel and their red values are close
  const bothRedDominant = (rgb1.r > rgb1.g && rgb1.r > rgb1.b) && (rgb2.r > rgb2.g && rgb2.r > rgb2.b);
  const redsTooClose = bothRedDominant && redDiff < 20; // Even stricter threshold for reds
  
  // For blues specifically, be more strict
  const bothBlueDominant = (rgb1.b > rgb1.r && rgb1.b > rgb1.g) && (rgb2.b > rgb2.r && rgb2.b > rgb2.g);
  const bluesTooClose = bothBlueDominant && blueDiff < 20;
  
  // For yellows/greens, be more strict
  const bothGreenYellowDominant = (rgb1.g > rgb1.r && rgb1.g > rgb1.b) && (rgb2.g > rgb2.r && rgb2.g > rgb2.b);
  const greensYellowsTooClose = bothGreenYellowDominant && greenDiff < 20;
  
  // Consider colors different only if:
  // 1. They're not in conflicting categories
  // 2. The overall distance is large enough
  // 3. No color components have a small difference
  // 4. If both are color-dominant in the same channel, they need to be far enough apart
  const isDistantEnough = enhancedDistance > 280; // Further increased threshold
  
  return !categoricalConflict && isDistantEnough && 
         !anyComponentTooSimilar && !redsTooClose && 
         !bluesTooClose && !greensYellowsTooClose;
}

// Add a new utility to specifically handle red color conflicts with stricter thresholds
export function areRedColorsTooSimilar(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const category1 = categorizeColor(color1);
  const category2 = categorizeColor(color2);
  
  // If both are categorized as red or burgundy
  const bothRedCategories = 
    (category1 === ColorCategory.RED || category1 === ColorCategory.BURGUNDY) &&
    (category2 === ColorCategory.RED || category2 === ColorCategory.BURGUNDY);
    
  if (bothRedCategories) {
    // Calculate how similar the red values are
    const redDifference = Math.abs(rgb1.r - rgb2.r);
    // If the red values are within 20 units of each other, consider them too similar
    return redDifference < 20;
  }
  
  // Also check if they're both red-dominant even if not categorized as red/burgundy
  const bothRedDominant = (rgb1.r > rgb1.g && rgb1.r > rgb1.b) && (rgb2.r > rgb2.g && rgb2.r > rgb2.b);
  
  if (bothRedDominant) {
    // Calculate red dominance ratio
    const redRatio1 = rgb1.r / Math.max(rgb1.g, rgb1.b);
    const redRatio2 = rgb2.r / Math.max(rgb2.g, rgb2.b);
    
    // If both have strong red dominance and similar red values
    if (redRatio1 > 1.5 && redRatio2 > 1.5) {
      return Math.abs(rgb1.r - rgb2.r) < 25;
    }
  }
  
  return false;
}

// More strict function to check for white kit conflicts
export function areWhiteColorsTooSimilar(color1: string, color2: string): boolean {
  const category1 = categorizeColor(color1);
  const category2 = categorizeColor(color2);
  
  if (category1 === ColorCategory.WHITE && category2 === ColorCategory.WHITE) {
    const rgb1 = parseHexColor(color1);
    const rgb2 = parseHexColor(color2);
    
    // Calculate how similar the brightness and color components are
    const brightnessDiff = Math.abs(
      (rgb1.r + rgb1.g + rgb1.b) - (rgb2.r + rgb2.g + rgb2.b)
    ) / 3;
    
    // Even more strict white similarity threshold
    return brightnessDiff < 6; // Further reduced threshold
  }
  
  // Also check for very light colors that might appear white
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const isVeryLight1 = rgb1.r > 230 && rgb1.g > 230 && rgb1.b > 230;
  const isVeryLight2 = rgb2.r > 230 && rgb2.g > 230 && rgb2.b > 230;
  
  if (isVeryLight1 && isVeryLight2) {
    const totalDiff = Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
    return totalDiff < 25; // Strict threshold for very light colors
  }
  
  return false;
}

// Enhanced function to detect specific color tone conflicts
export function detectSpecificColorToneConflict(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  // Check for both being similarly dominant in the same channel
  // Red dominant check
  const bothRedDominant = (rgb1.r > rgb1.g && rgb1.r > rgb1.b) && (rgb2.r > rgb2.g && rgb2.r > rgb2.b);
  const bothGreenDominant = (rgb1.g > rgb1.r && rgb1.g > rgb1.b) && (rgb2.g > rgb2.r && rgb2.g > rgb2.b);
  const bothBlueDominant = (rgb1.b > rgb1.r && rgb1.b > rgb1.g) && (rgb2.b > rgb2.r && rgb2.b > rgb2.g);
  
  if (bothRedDominant) {
    // Enhanced tone analysis - check secondary colors (green and blue channels)
    const redRatio1 = rgb1.r / Math.max(rgb1.g, rgb1.b);
    const redRatio2 = rgb2.r / Math.max(rgb2.g, rgb2.b);
    
    const greenRatio = Math.abs(rgb1.g / rgb1.r - rgb2.g / rgb2.r);
    const blueRatio = Math.abs(rgb1.b / rgb1.r - rgb2.b / rgb2.r);
    
    // If both have similar red dominance and the secondary colors give similar tones
    return (redRatio1 > 1.4 && redRatio2 > 1.4) && greenRatio < 0.08 && blueRatio < 0.08;
  }
  
  if (bothGreenDominant) {
    // Similar check for green-dominant colors
    const greenRatio1 = rgb1.g / Math.max(rgb1.r, rgb1.b);
    const greenRatio2 = rgb2.g / Math.max(rgb2.r, rgb2.b);
    
    const redRatio = Math.abs(rgb1.r / rgb1.g - rgb2.r / rgb2.g);
    const blueRatio = Math.abs(rgb1.b / rgb1.g - rgb2.b / rgb2.g);
    
    return (greenRatio1 > 1.4 && greenRatio2 > 1.4) && redRatio < 0.08 && blueRatio < 0.08;
  }
  
  if (bothBlueDominant) {
    // Similar check for blue-dominant colors
    const blueRatio1 = rgb1.b / Math.max(rgb1.r, rgb1.g);
    const blueRatio2 = rgb2.b / Math.max(rgb2.r, rgb2.g);
    
    const redRatio = Math.abs(rgb1.r / rgb1.b - rgb2.r / rgb2.b);
    const greenRatio = Math.abs(rgb1.g / rgb1.b - rgb2.g / rgb2.b);
    
    return (blueRatio1 > 1.4 && blueRatio2 > 1.4) && redRatio < 0.08 && greenRatio < 0.08;
  }
  
  return false;
}

// Enhanced function to check if two kits have similar black colors
export function areBlackColorsTooSimilar(color1: string, color2: string): boolean {
  const category1 = categorizeColor(color1);
  const category2 = categorizeColor(color2);
  
  // If both are categorized as black
  if (category1 === ColorCategory.BLACK && category2 === ColorCategory.BLACK) {
    const rgb1 = parseHexColor(color1);
    const rgb2 = parseHexColor(color2);
    
    // For black kits, calculate total RGB difference
    const totalDiff = 
      Math.abs(rgb1.r - rgb2.r) + 
      Math.abs(rgb1.g - rgb2.g) + 
      Math.abs(rgb1.b - rgb2.b);
    
    // If total difference is less than 40 (stricter threshold for black), 
    // consider them too similar
    return totalDiff < 40;
  }
  
  // Also check for very dark colors that might appear black
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const isVeryDark1 = rgb1.r < 40 && rgb1.g < 40 && rgb1.b < 40;
  const isVeryDark2 = rgb2.r < 40 && rgb2.g < 40 && rgb2.b < 40;
  
  if (isVeryDark1 && isVeryDark2) {
    const totalDiff = Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
    return totalDiff < 30; // Strict threshold for very dark colors
  }
  
  return false;
}

// Enhanced utility to specifically handle blue color conflicts
export function areBlueColorsTooSimilar(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const category1 = categorizeColor(color1);
  const category2 = categorizeColor(color2);
  
  // If both are categorized as blue or navy
  const bothBlueCategories = 
    (category1 === ColorCategory.BLUE || category1 === ColorCategory.NAVY) &&
    (category2 === ColorCategory.BLUE || category2 === ColorCategory.NAVY);
    
  if (bothBlueCategories) {
    // Calculate how similar the blue values are
    const blueDifference = Math.abs(rgb1.b - rgb2.b);
    
    // Check red and green component differences as well
    const redDifference = Math.abs(rgb1.r - rgb2.r);
    const greenDifference = Math.abs(rgb1.g - rgb2.g);
    
    // Blue kits are too similar if:
    // 1. Blue channel difference is less than 25 units
    // 2. Red and green channels are also close
    return blueDifference < 25 && redDifference < 20 && greenDifference < 20;
  }
  
  // Also check if they're both blue-dominant even if not categorized as blue/navy
  const bothBlueDominant = (rgb1.b > rgb1.r && rgb1.b > rgb1.g) && (rgb2.b > rgb2.r && rgb2.b > rgb2.g);
  
  if (bothBlueDominant) {
    // Calculate blue dominance ratio
    const blueRatio1 = rgb1.b / Math.max(rgb1.r, rgb1.g);
    const blueRatio2 = rgb2.b / Math.max(rgb2.r, rgb2.g);
    
    // If both have strong blue dominance and similar blue values
    if (blueRatio1 > 1.4 && blueRatio2 > 1.4) {
      const blueDifference = Math.abs(rgb1.b - rgb2.b);
      const redDifference = Math.abs(rgb1.r - rgb2.r);
      const greenDifference = Math.abs(rgb1.g - rgb2.g);
      
      return blueDifference < 30 && redDifference < 25 && greenDifference < 25;
    }
  }
  
  return false;
}

// New function to detect yellow/bright green kit conflicts
export function areYellowGreenColorsTooSimilar(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const category1 = categorizeColor(color1);
  const category2 = categorizeColor(color2);
  
  // If both are categorized as yellow or green
  const bothYellowGreenCategories = 
    (category1 === ColorCategory.YELLOW || category1 === ColorCategory.GREEN) &&
    (category2 === ColorCategory.YELLOW || category2 === ColorCategory.GREEN);
    
  if (bothYellowGreenCategories) {
    // Calculate how similar the green and red values are (key for yellow/green distinction)
    const greenDifference = Math.abs(rgb1.g - rgb2.g);
    const redDifference = Math.abs(rgb1.r - rgb2.r);
    
    // Calculate green dominance
    const greenRatio1 = rgb1.g / Math.max(rgb1.r, rgb1.b);
    const greenRatio2 = rgb2.g / Math.max(rgb2.r, rgb2.b);
    
    // Yellow/green kits are too similar if green channel is close and red ratios are similar
    const redGreenRatio1 = rgb1.r / rgb1.g;
    const redGreenRatio2 = rgb2.r / rgb2.g;
    
    return greenDifference < 25 && Math.abs(redGreenRatio1 - redGreenRatio2) < 0.15;
  }
  
  return false;
}

// New function to detect purple/pink kit conflicts
export function arePurplePinkColorsTooSimilar(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const category1 = categorizeColor(color1);
  const category2 = categorizeColor(color2);
  
  // If both are categorized as purple or pink
  const bothPurplePinkCategories = 
    (category1 === ColorCategory.PURPLE || category1 === ColorCategory.PINK) &&
    (category2 === ColorCategory.PURPLE || category2 === ColorCategory.PINK);
    
  if (bothPurplePinkCategories) {
    // Purple and pink are distinguished by the balance of red vs blue
    const redDifference = Math.abs(rgb1.r - rgb2.r);
    const blueDifference = Math.abs(rgb1.b - rgb2.b);
    
    // Calculate red-to-blue ratio similarity
    const redBlueRatio1 = rgb1.r / rgb1.b;
    const redBlueRatio2 = rgb2.r / rgb2.b;
    
    return Math.abs(redBlueRatio1 - redBlueRatio2) < 0.2 && redDifference < 30 && blueDifference < 30;
  }
  
  return false;
}
