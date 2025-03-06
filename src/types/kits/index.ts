
// Export all types, utilities, and functions from this barrel file

// Type definitions
export * from './kitTypes';

// Team colors data
export { teamKitColors } from './teamColorsData';

// Color utilities
export { 
  parseHexColor, 
  getColorDistance,
  categorizeColor,
  ColorCategory,
  areColorsConflicting
} from './colorUtils';

// Kit selection functions
export { 
  getAwayTeamKit,
  clearKitSelectionCache
} from './kitSelection';

// Position-specific kit selection
export {
  getPositionSpecificKits,
  clearPositionKitCache,
  generateSpecialKit,
  type PlayerPosition,
  type KitSelectionResult
} from './positionSpecificKits';

// Kit accessors
export { 
  getTeamKitColor,
  getTeamKitColors,
  getTeamAccentColors
} from './kitAccessors';
