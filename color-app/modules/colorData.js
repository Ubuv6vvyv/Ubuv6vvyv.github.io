/**
 * Color Database
 * 
 * Centralized color definitions with RGB values.
 * Merges curated colors with a massive extended list.
 */

import { colorMap as myCuratedColors, BASIC_COLORS, COLOR_KEYWORDS } from './myCuratedColors.js';
import massiveColorList from './extendedColors.js';

// Helper to convert hex to RGB array
const hexToRgb = (hex) => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// Merge your curated list with the massive list
export const colorMap = { ...myCuratedColors };

// Add the massive list (only adding ones you don't already have)
massiveColorList.forEach(color => {
    if (!colorMap[color.name]) {
        colorMap[color.name] = hexToRgb(color.hex);
    }
});

// Re-export other constants to maintain compatibility
export { BASIC_COLORS, COLOR_KEYWORDS };
