
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
