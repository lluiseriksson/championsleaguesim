
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
  return baseDistance * 0.7 + brightnessDiff * 60 + hueDiff * 45; // Increased weights
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

// Function to categorize a hex color with stricter thresholds
export function categorizeColor(hexColor: string): ColorCategory {
  const rgb = parseHexColor(hexColor);
  const { r, g, b } = rgb;
  
  // Calculate intensity and saturation with stricter thresholds
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;
  
  // Enhanced white detection
  // Check if all RGB values are very high and close to each other
  if (r > 220 && g > 220 && b > 220 && chroma < 30) {
    return ColorCategory.WHITE;
  }
  
  // Stricter gray/black/white detection
  if (chroma < 40) { // Increased from 30
    if (lightness < 50) return ColorCategory.BLACK; // More strict black threshold
    if (lightness > 180) return ColorCategory.WHITE; // More strict white threshold
    return ColorCategory.GRAY;
  }
  
  // Improved Red detection - more sensitive to different shades of red
  // This fixes issues with similar red kits like Forest & Espanyol
  if (r > 180 && r > g * 1.5 && r > b * 1.5) {
    // Strong red detection
    if (g < 100 && b < 100) {
      return r > 220 ? ColorCategory.RED : ColorCategory.BURGUNDY;
    }
    if (g > 150 && b < 100) return ColorCategory.ORANGE;
    if (g > 100 && b > 100) return ColorCategory.PINK;
    return ColorCategory.RED;
  }
  
  // Enhanced blue detection (helps with teams like Leicester with blue kits)
  if (b > 150 && b > r * 1.2 && b > g * 1.2) {
    return b > 200 ? ColorCategory.BLUE : ColorCategory.NAVY;
  }
  
  // Color categorization based on dominant channel and ratios
  if (r > g && r > b) {
    // Red dominant
    if (g > 150 && b < 100) return ColorCategory.ORANGE;
    if (g < 100 && b < 100) {
      return r > 180 ? ColorCategory.RED : ColorCategory.BURGUNDY;
    }
    if (g > 100 && b > 100) return ColorCategory.PINK;
    return ColorCategory.RED;
  }
  
  if (g > r && g > b) {
    // Green dominant
    return ColorCategory.GREEN;
  }
  
  if (b > r && b > g) {
    // Blue dominant
    if (r > 100 && g > 100) return ColorCategory.BLUE;
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
  
  // Define conflicting categories
  const conflictMap: Record<ColorCategory, ColorCategory[]> = {
    [ColorCategory.RED]: [ColorCategory.BURGUNDY, ColorCategory.ORANGE, ColorCategory.PINK],
    [ColorCategory.BURGUNDY]: [ColorCategory.RED, ColorCategory.PURPLE, ColorCategory.BROWN],
    [ColorCategory.ORANGE]: [ColorCategory.RED, ColorCategory.YELLOW, ColorCategory.BROWN],
    [ColorCategory.YELLOW]: [ColorCategory.ORANGE, ColorCategory.GREEN],
    [ColorCategory.GREEN]: [ColorCategory.YELLOW, ColorCategory.BLUE],
    [ColorCategory.BLUE]: [ColorCategory.GREEN, ColorCategory.NAVY],
    [ColorCategory.NAVY]: [ColorCategory.BLUE, ColorCategory.PURPLE, ColorCategory.BLACK],
    [ColorCategory.PURPLE]: [ColorCategory.BURGUNDY, ColorCategory.NAVY, ColorCategory.PINK],
    [ColorCategory.PINK]: [ColorCategory.RED, ColorCategory.PURPLE],
    [ColorCategory.BROWN]: [ColorCategory.BURGUNDY, ColorCategory.ORANGE],
    [ColorCategory.BLACK]: [ColorCategory.NAVY, ColorCategory.GRAY],
    [ColorCategory.WHITE]: [ColorCategory.GRAY],
    [ColorCategory.GRAY]: [ColorCategory.BLACK, ColorCategory.WHITE]
  };
  
  // Check if the categories conflict
  return conflictMap[category1]?.includes(category2) || false;
}

// New function to check if colors are too similar
export function areColorsTooSimilar(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  const distance = getEnhancedColorDistance(rgb1, rgb2);
  return distance < 180; // Increased threshold for better differentiation
}

// Enhanced function to check if colors are sufficiently different with MUCH stricter thresholds
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
  
  // UPDATED: Even more strict detection - consider a conflict if ANY individual color channel is too similar
  // Reduced from 20 to 15 for stricter margins
  const anyComponentTooSimilar = (redDiff < 15 || greenDiff < 15 || blueDiff < 15);
  
  // UPDATED: For reds specifically, be even more strict
  // If both colors have red as dominant channel and their red values are close
  const bothRedDominant = (rgb1.r > rgb1.g && rgb1.r > rgb1.b) && (rgb2.r > rgb2.g && rgb2.r > rgb2.b);
  const redsTooClose = bothRedDominant && redDiff < 25; // Even stricter threshold for reds
  
  // Consider colors different only if:
  // 1. They're not in conflicting categories
  // 2. The overall distance is large enough
  // 3. No color components have a small difference
  // 4. If both are red-dominant, they need to be far enough apart
  const isDistantEnough = enhancedDistance > 250; // Increased from 220 for more strict checking
  
  return !categoricalConflict && isDistantEnough && !anyComponentTooSimilar && !redsTooClose;
}

// Add a new utility to specifically handle red color conflicts
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
    // If the red values are within 40 units of each other, consider them too similar
    // UPDATED: Stricter margin, reduced from 40 to 25
    return redDifference < 25;
  }
  
  return false;
}

// Add a specific function to check for white kit conflicts
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
    
    // UPDATED: More strict white similarity threshold
    // If the brightness difference is less than 10 on a 0-255 scale (reduced from 15)
    // consider the whites too similar
    return brightnessDiff < 10;
  }
  
  return false;
}

// New utility to detect specific color tone conflicts (like Brest vs FC Copenhagen)
export function detectSpecificColorToneConflict(color1: string, color2: string): boolean {
  const rgb1 = parseHexColor(color1);
  const rgb2 = parseHexColor(color2);
  
  // Check for both being red dominant but with different tones
  const bothRedDominant = (rgb1.r > rgb1.g && rgb1.r > rgb1.b) && (rgb2.r > rgb2.g && rgb2.r > rgb2.b);
  
  if (bothRedDominant) {
    // Enhanced tone analysis - check secondary colors (green and blue channels)
    const greenRatio = Math.abs(rgb1.g / rgb1.r - rgb2.g / rgb2.r);
    const blueRatio = Math.abs(rgb1.b / rgb1.r - rgb2.b / rgb2.r);
    
    // If both have similar red but the secondary colors give different tones,
    // they might still be too similar for visual distinction
    return greenRatio < 0.1 && blueRatio < 0.1;
  }
  
  return false;
}

