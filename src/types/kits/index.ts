
// Export all kit-related types and utilities
export * from './kitTypes';
export * from './kitAccessors';
export * from './teamColorsData';
export { 
  parseHexColor,
  getColorDistance,
  getEnhancedColorDistance,
  ColorCategory,
  categorizeColor,
  areColorsConflicting,
  // Do not re-export areColorsTooSimilar from colorUtils since it would cause a duplicate
  areColorsSufficientlyDifferent,
  areRedColorsTooSimilar,
  areWhiteColorsTooSimilar,
  detectSpecificColorToneConflict,
  areBlackColorsTooSimilar,
  areBlueColorsTooSimilar,
  areYellowGreenColorsTooSimilar,
  arePurplePinkColorsTooSimilar,
} from './colorUtils';
export * from './kitSelection';
export * from './positionSpecificKits';
export * from './kitConflictChecker';
