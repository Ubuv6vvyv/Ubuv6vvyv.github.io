import { rgbToHex, rgbToLab, calculateCIEDE2000, hexToRgb } from './colorUtils.js';
import { colorMap, BASIC_COLORS, COLOR_KEYWORDS } from './colorData.js';

// --- Constants ---
const FALLBACK_RGB = [128, 128, 128];
const FALLBACK_NEUTRAL_RGB = [180, 180, 180];
const FALLBACK_HINT_RGB = [200, 200, 240];

/**
 * Create a standardized color object from various input formats
 * This function helps normalize different color representations across the codebase
 * 
 * @param {string|Array|Object} colorInput - Color in any supported format (name, rgb array, hex, or object)
 * @returns {Object} Standardized color object with name, rgb, and hex properties
 */
export function standardizeColor(colorInput) {
  // Default values
  const defaultColor = {
    name: 'Default Color',
    rgb: [128, 128, 128],
    hex: '#808080'
  };

  try {
    // If null or undefined, return default
    if (!colorInput) {
      return defaultColor;
    }

    // Case 1: Already a properly formatted color object
    if (typeof colorInput === 'object' && colorInput !== null && !Array.isArray(colorInput)) {
      if (colorInput.rgb && colorInput.hex && colorInput.name) {
        return {
          name: colorInput.name,
          rgb: colorInput.rgb,
          hex: colorInput.hex
        };
      }

      // Partial object with some properties - fill in the missing ones
      const rgb = colorInput.rgb ||
        (colorInput.hex ? hexToRgb(colorInput.hex) : null) ||
        (colorInput.name ? getColorRGB(colorInput.name)?.rgb : null) ||
        defaultColor.rgb;

      const hex = colorInput.hex ||
        (colorInput.rgb ? rgbToHex(colorInput.rgb) : null) ||
        (colorInput.name ? getColorRGB(colorInput.name)?.hex : null) ||
        defaultColor.hex;

      const name = colorInput.name ||
        (colorInput.hex || rgbToHex(rgb)) ||
        defaultColor.name;

      return { name, rgb, hex };
    }

    // Case 2: RGB array
    if (Array.isArray(colorInput) && colorInput.length >= 3) {
      const rgb = colorInput.slice(0, 3);
      const hex = rgbToHex(rgb);
      return {
        name: hex, // Use hex as name if no better name is available
        rgb: rgb,
        hex: hex
      };
    }

    // Case 3: String input (name or hex)
    if (typeof colorInput === 'string') {
      // Check if it's a hex code
      if (colorInput.startsWith('#')) {
        const rgb = hexToRgb(colorInput);
        return {
          name: colorInput,
          rgb: rgb,
          hex: colorInput
        };
      }

      // It must be a color name
      const colorInfo = getColorRGB(colorInput);
      if (colorInfo && colorInfo.rgb) {
        return {
          name: colorInput,
          rgb: colorInfo.rgb,
          hex: colorInfo.hex || rgbToHex(colorInfo.rgb)
        };
      }
    }

    // Fallback to default if all parsing attempts fail
    return defaultColor;
  } catch (error) {
    console.error("Error in standardizeColor:", error);
    return defaultColor;
  }
}

/**
 * Find the closest named color from the colorMap
 * Uses CIEDE2000 for perceptually accurate color matching
 * @param {number[]} rgb - RGB color to match
 * @returns {Object|null} Closest color found or null
 */
export function findClosestNamedColor(rgb) {
  try {
    // Input validation
    if (!rgb || !Array.isArray(rgb) || rgb.length < 3) return null;

    // Get all color entries from the colorDataUtils colorMap
    // Filter out invalid entries early
    const colorEntries = Object.entries(colorMap).filter(entry => {
      const [colorName, colorRgbArray] = entry;
      return typeof colorName === 'string' &&
        Array.isArray(colorRgbArray) &&
        colorRgbArray.length === 3;
    }).map(([name, rgb]) => ({ name, rgb }));

    // If map is empty, try direct fallback
    if (colorEntries.length === 0) {
      console.warn('findClosestNamedColor: colorEntries is empty, attempting direct lookup for RGB:', rgb);
      const directColorInfo = getColorRGB(rgbToHex(rgb));
      return directColorInfo && !directColorInfo.isFallback && directColorInfo.rgb
        ? { name: directColorInfo.name || rgbToHex(rgb), rgb: directColorInfo.rgb }
        : null;
    }

    // Convert input color to Lab space once
    const inputLab = rgbToLab(rgb);

    let closestColor = null;
    let minDeltaE = Infinity;

    // Iterate through all colors and find the smallest CIEDE2000 difference
    for (const color of colorEntries) {
      // optimization: simple Euclidean check first to skip very distant colors?
      // For now, full CIEDE2000 for maximum accuracy as requested.

      const targetLab = rgbToLab(color.rgb);
      const deltaE = calculateCIEDE2000(inputLab, targetLab);

      if (deltaE < minDeltaE) {
        minDeltaE = deltaE;
        closestColor = color;
      }
    }

    // Return closest if it's within a reasonable threshold
    // DeltaE < 25 is a very loose match, but ensures we don't return something totally wild if the DB is sparse.
    // Ideally DeltaE < 2 is a "match", but for "closest named color" we largely just want the best one available.
    return minDeltaE < 25 ? closestColor : null;

  } catch (e) {
    // If something fails, return null and let the caller handle it
    console.error('Error in findClosestNamedColor:', e, rgb);
    return null;
  }
}
// Color data is now imported from colorData.js

/**
 * Returns the RGB value for a given color name, with intelligent fallbacks.
 * @param {string} colorName - The color name to look up.
 * @returns {Object} { rgb: [r,g,b], isFallback: boolean, name: string, ... }
 */
export function getColorRGB(colorName) {
  if (typeof colorName !== 'string') {
    // If colorName is not a string, it can't be processed by subsequent checks.
    // Return a fallback, similar to other error conditions.
    console.warn(`getColorRGB received non-string colorName: ${colorName === null ? 'null' : typeof colorName}`);
    return { rgb: [...FALLBACK_RGB], isFallback: true, name: String(colorName) };
  }

  if (!colorName) {
    return { rgb: [...FALLBACK_RGB], isFallback: true };
  }
  if (colorName.includes('Echo') && colorName.includes('(#')) {
    const match = colorName.match(/\(#([0-9A-Fa-f]{6})\)/);
    if (match && match[1]) {
      const hexValue = match[1];
      const r = parseInt(hexValue.substring(0, 2), 16);
      const g = parseInt(hexValue.substring(2, 4), 16);
      const b = parseInt(hexValue.substring(4, 6), 16);
      const baseName = colorName.substring(0, colorName.indexOf(' (#')).trim();
      return {
        rgb: [r, g, b],
        isFallback: false,
        name: baseName
      };
    }
  }
  if (colorName.includes(' ') && colorName.length > 20) {
    return {
      rgb: [...FALLBACK_NEUTRAL_RGB],
      isFallback: true,
      name: 'Descriptive Text',
      description: colorName
    };
  }
  const rgb = colorMap[colorName];
  if (rgb) {
    return { rgb: [...rgb], isFallback: false, name: colorName };
  }
  if (colorName.startsWith('Look for')) {
    return {
      rgb: [...FALLBACK_HINT_RGB],
      isFallback: true,
      name: 'Guidance Text',
      description: colorName
    };
  }
  const similarColorName = findSimilarColorName(colorName);
  if (similarColorName && colorMap[similarColorName]) {
    return {
      rgb: [...colorMap[similarColorName]],
      isFallback: false,
      name: colorName,
      mappedFrom: similarColorName
    };
  }
  const fallbackRgb = getIntelligentFallback(colorName);
  if (fallbackRgb) {
    return {
      rgb: fallbackRgb,
      isFallback: true,
      name: colorName,
      fallbackType: 'pattern-match'
    };
  }
  return { rgb: [...FALLBACK_RGB], isFallback: true, name: colorName };
}

/**
 * Finds a similar color name in the color map.
 * @param {string} colorName - The color name to find a similar match for.
 * @returns {string|null} A similar color name if found, null otherwise.
 */
function findSimilarColorName(colorName) {
  const lowerColorName = colorName.toLowerCase();
  for (const name of Object.keys(colorMap)) {
    if (name.toLowerCase() === lowerColorName) {
      return name;
    }
  }
  for (const name of Object.keys(colorMap)) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes(lowerColorName) || lowerColorName.includes(lowerName)) {
      return name;
    }
  }
  const colorWords = lowerColorName.split(/\s+/);
  const baseColor = colorWords.find(word => COLOR_KEYWORDS.includes(word));
  if (baseColor) {
    for (const name of Object.keys(colorMap)) {
      if (name.toLowerCase().includes(baseColor)) {
        return name;
      }
    }
  }
  return null;
}

/**
 * Generate an intelligent RGB fallback based on color name patterns.
 * @param {string} colorName - The color name to analyze.
 * @returns {number[]|null} RGB values or null if no pattern matched.
 */
function getIntelligentFallback(colorName) {
  const lowerName = colorName.toLowerCase();
  for (const [color, rgb] of Object.entries(BASIC_COLORS)) {
    if (lowerName.includes(color)) {
      let result = [...rgb];
      if (lowerName.includes('light') || lowerName.includes('pale') || lowerName.includes('soft')) {
        result = result.map(v => Math.min(255, v + 80));
      } else if (lowerName.includes('dark') || lowerName.includes('deep') || lowerName.includes('rich')) {
        result = result.map(v => Math.max(0, v - 60));
      }
      if (lowerName.includes('bright') || lowerName.includes('vibrant')) {
        const max = Math.max(...result);
        if (max > 0) {
          const factor = 255 / max;
          result = result.map(v => Math.min(255, Math.round(v * factor)));
        }
      } else if (lowerName.includes('muted') || lowerName.includes('dusty')) {
        result = result.map(v => Math.round(v * 0.7 + 40));
      }
      return result;
    }
  }
  return null;
}


