// Color space conversion utilities and calculations



/**
 * Generate a color object from HSL values
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @param {string} name - Optional name for the color
 * @returns {Object} Color object {name, rgb, hex, hsl}
 */
export function generateHslColor(h, s, l, name) {
  const rgb = hslToRgb([h, s, l]);
  const hex = rgbToHex(rgb);
  return {
    name: name || getColorNameFromHSL([h, s, l]),
    rgb: rgb,
    hex: hex,
    hsl: [h, s, l]
  };
}

/**
 * Generate a descriptive name for a color based on its HSL values
 * @param {number[]} hsl - HSL values [h, s, l]
 * @returns {string} Descriptive color name
 */
export function getColorNameFromHSL(hsl) {
  if (!Array.isArray(hsl) || hsl.length < 3) return "Unknown Color";
  const [h, s, l] = hsl;

  // Basic brightness/saturation descriptor
  let purityParams = "";
  if (l < 15) purityParams = "Black/Dark ";
  else if (l > 85) purityParams = "White/Pale ";
  else if (s < 15) purityParams = "Gray/Muted ";
  else if (l < 40) purityParams = "Deep ";
  else if (l > 70) purityParams = "Light ";
  else if (s > 80) purityParams = "Vivid ";
  else purityParams = "Medium ";

  // Hue descriptor
  let hueName = "Gray";
  if (s > 10 && l > 15 && l < 90) { // If not effectively grayscale
    if (h >= 0 && h < 15) hueName = "Red";
    else if (h >= 15 && h < 45) hueName = "Orange";
    else if (h >= 45 && h < 70) hueName = "Yellow";
    else if (h >= 70 && h < 150) hueName = "Green";
    else if (h >= 150 && h < 190) hueName = "Teal";
    else if (h >= 190 && h < 260) hueName = "Blue";
    else if (h >= 260 && h < 300) hueName = "Purple";
    else if (h >= 300 && h < 340) hueName = "Pink";
    else hueName = "Red";
  } else if (l <= 15) {
    hueName = "Black";
    purityParams = "";
  } else if (l >= 90) {
    hueName = "White";
    purityParams = "";
  } else {
    hueName = "Gray";
    purityParams = "";
  }

  return (purityParams + hueName).trim();
}

/**
 * Converts Hex string to RGB array
 * @param {string} hex - Hex color string (e.g. "#FF0000" or "FF0000")
 * @returns {number[]} RGB array [r, g, b]
 */
export function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/**
 * Converts RGB color values to CIE L*a*b* color space
 * @param {number[]} rgb - Array of RGB values [r, g, b] in range 0-255
 * @returns {number[]} Array of L*a*b* values [L, a, b]
 */
export function rgbToLab(rgb) {
  // Input validation
  if (!Array.isArray(rgb) || rgb.length < 3) {
    console.error("Invalid RGB input to rgbToLab:", rgb);
    return [50, 0, 0]; // Return neutral gray as fallback
  }

  // Improved clamping of RGB values to 0-255 range
  const clampedRgb = rgb.map(val => {
    const num = Number(val);
    return Math.max(0, Math.min(255, isNaN(num) ? 128 : num));
  });

  // First convert RGB to XYZ
  const [rVal, gVal, bVal] = clampedRgb.map(val => {
    val = val / 255;
    return val > 0.04045 ? Math.pow((val + 0.055) / 1.055, 2.4) : val / 12.92;
  });

  // Standard RGB to XYZ matrix
  const x = rVal * 0.4124 + gVal * 0.3576 + bVal * 0.1805;
  const y = rVal * 0.2126 + gVal * 0.7152 + bVal * 0.0722;
  const z = rVal * 0.0193 + gVal * 0.1192 + bVal * 0.9505;

  // XYZ to Lab
  // Reference white (D65) - standard values per CIE specification
  const xRef = 0.95047;
  const yRef = 1.00000;
  const zRef = 1.08883;

  // Threshold value for the f function per CIE standard
  const epsilon = 0.008856; // 216/24389
  const kappa = 903.3;   // 24389/27

  const xN = x / xRef;
  const yN = y / yRef;
  const zN = z / zRef;

  const fx = xN > epsilon ? Math.pow(xN, 1 / 3) : (kappa * xN + 16) / 116;
  const fy = yN > epsilon ? Math.pow(yN, 1 / 3) : (kappa * yN + 16) / 116;
  const fz = zN > epsilon ? Math.pow(zN, 1 / 3) : (kappa * zN + 16) / 116;

  const L = 116 * fy - 16;
  const aLab = 500 * (fx - fy);
  const bLab = 200 * (fy - fz);

  return [L, aLab, bLab];
}

/**
 * Improved CIEDE2000 color difference calculation
 * Based on CIE 015:2018 and Sharma et al. (2005) with enhanced numerical stability
 * @param {number[]} lab1 - First Lab color [L, a, b]
 * @param {number[]} lab2 - Second Lab color [L, a, b]
 * @param {Object} options - Configuration options
 * @param {number} options.kL - Lightness weighting factor (default: 1.0)
 * @param {number} options.kC - Chroma weighting factor (default: 1.0)
 * @param {number} options.kH - Hue weighting factor (default: 1.0)
 * @param {boolean} options.debug - Return intermediate values for debugging
 * @returns {number|Object} CIEDE2000 color difference value or debug object
 */
export function calculateCIEDE2000(lab1, lab2, options = {}) {
  // Configuration with scientifically-based defaults
  const config = {
    kL: options.kL ?? 1.0,
    kC: options.kC ?? 1.0,
    kH: options.kH ?? 1.0,
    debug: options.debug ?? false
  };

  // Scientific constants
  const EPSILON = Number.EPSILON * 100; // Robust floating-point comparison
  const PERCEPTUAL_CHROMA_THRESHOLD = 1e-12; // Based on JND studies
  const POW_25_7 = Math.pow(25, 7); // Pre-calculated expensive operation
  const RAD_TO_DEG = 180 / Math.PI;
  const DEG_TO_RAD = Math.PI / 180;

  // Custom error class for better error handling
  class CIEDE2000Error extends Error {
    constructor(message, context = {}) {
      super(message);
      this.name = 'CIEDE2000Error';
      this.context = context;
    }
  }

  // Comprehensive input validation
  function validateInputs(lab1, lab2) {
    // Check array structure
    if (!Array.isArray(lab1) || lab1.length < 3) {
      throw new CIEDE2000Error('Invalid first Lab color array', {
        provided: lab1,
        expected: '[L, a, b] array with at least 3 elements'
      });
    }
    if (!Array.isArray(lab2) || lab2.length < 3) {
      throw new CIEDE2000Error('Invalid second Lab color array', {
        provided: lab2,
        expected: '[L, a, b] array with at least 3 elements'
      });
    }

    // Convert to numbers and validate
    const [L1, a1, b1] = lab1.slice(0, 3).map(Number);
    const [L2, a2, b2] = lab2.slice(0, 3).map(Number);

    // Check for NaN values
    if ([L1, a1, b1, L2, a2, b2].some(isNaN)) {
      throw new CIEDE2000Error('Non-numeric values detected in Lab inputs', {
        lab1: [L1, a1, b1],
        lab2: [L2, a2, b2]
      });
    }

    // Validate Lab color space ranges
    if (L1 < 0 || L1 > 100 || L2 < 0 || L2 > 100) {
      throw new CIEDE2000Error('L* values must be in range [0, 100]', {
        L1, L2
      });
    }

    // More lenient range for a* and b* to accommodate edge cases
    const MAX_AB = 200; // Extended range for computational stability
    if (Math.abs(a1) > MAX_AB || Math.abs(a2) > MAX_AB ||
      Math.abs(b1) > MAX_AB || Math.abs(b2) > MAX_AB) {
      throw new CIEDE2000Error(`a* and b* values must be in range [-${MAX_AB}, ${MAX_AB}]`, {
        a1, a2, b1, b2
      });
    }

    return [L1, a1, b1, L2, a2, b2];
  }

  // Robust hue calculation with proper undefined handling
  function calculateHue(a, b) {
    if (Math.abs(a) < EPSILON && Math.abs(b) < EPSILON) {
      return { hue: 0, isUndefined: true };
    }
    let hue = Math.atan2(b, a) * RAD_TO_DEG;
    return {
      hue: hue < 0 ? hue + 360 : hue,
      isUndefined: false
    };
  }

  // Proper circular mean calculation for hue
  function calculateMeanHue(h1, h2, isUndefined1, isUndefined2) {
    if (isUndefined1 && isUndefined2) return { meanHue: 0, isUndefined: true };
    if (isUndefined1) return { meanHue: h2, isUndefined: false };
    if (isUndefined2) return { meanHue: h1, isUndefined: false };

    const diff = Math.abs(h1 - h2);
    if (diff <= 180) {
      return { meanHue: (h1 + h2) / 2, isUndefined: false };
    } else {
      let mean = (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2;
      if (mean < 0) mean += 360;
      if (mean >= 360) mean -= 360;
      return { meanHue: mean, isUndefined: false };
    }
  }

  // Calculate hue difference with proper circular handling
  function calculateHueDifference(h1, h2, isUndefined1, isUndefined2) {
    if (isUndefined1 || isUndefined2) {
      return 0;
    }

    const absDiff = Math.abs(h1 - h2);
    if (absDiff <= 180) {
      return h2 - h1;
    } else if (h2 <= h1) {
      return h2 - h1 + 360;
    } else {
      return h2 - h1 - 360;
    }
  }

  // Enhanced G calculation with overflow protection
  function calculateG(meanChroma) {
    if (meanChroma < EPSILON) return 0;

    const c7 = Math.pow(meanChroma, 7);
    const denominator = c7 + POW_25_7;

    // Protect against overflow
    if (!isFinite(c7) || denominator <= 0) return 0;

    return 0.5 * (1 - Math.sqrt(c7 / denominator));
  }

  // Improved T function with proper hue normalization
  function calculateT(meanHuePrime, isHueUndefined) {
    if (isHueUndefined) return 1;

    // Normalize hue to [0, 360)
    const h = ((meanHuePrime % 360) + 360) % 360;

    return 1 -
      0.17 * Math.cos((h - 30) * DEG_TO_RAD) +
      0.24 * Math.cos((2 * h) * DEG_TO_RAD) +
      0.32 * Math.cos((3 * h + 6) * DEG_TO_RAD) -
      0.20 * Math.cos((4 * h - 63) * DEG_TO_RAD);
  }

  // Safe division with fallback
  function safeDivide(numerator, denominator, fallback = 0) {
    return Math.abs(denominator) < EPSILON ? fallback : numerator / denominator;
  }

  // Check if color is effectively achromatic
  function isAchromatic(chroma) {
    return chroma < PERCEPTUAL_CHROMA_THRESHOLD;
  }

  try {
    // Validate and extract Lab values
    const [L1, a1, b1, L2, a2, b2] = validateInputs(lab1, lab2);

    // Handle identical colors early
    if (Math.abs(L1 - L2) < EPSILON &&
      Math.abs(a1 - a2) < EPSILON &&
      Math.abs(b1 - b2) < EPSILON) {
      return config.debug ? { deltaE: 0, identical: true } : 0;
    }

    // Step 1: Calculate initial chroma and hue values
    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const meanC = (C1 + C2) / 2;

    // Calculate G factor for chroma adjustment
    const G = calculateG(meanC);

    // Calculate adjusted a' values
    const aPrime1 = (1 + G) * a1;
    const aPrime2 = (1 + G) * a2;

    // Calculate adjusted chroma values
    const CPrime1 = Math.sqrt(aPrime1 * aPrime1 + b1 * b1);
    const CPrime2 = Math.sqrt(aPrime2 * aPrime2 + b2 * b2);

    // Calculate hue values with proper undefined handling
    const hue1 = calculateHue(aPrime1, b1);
    const hue2 = calculateHue(aPrime2, b2);

    // Step 2: Calculate differences
    const deltaLPrime = L2 - L1;
    const deltaCPrime = CPrime2 - CPrime1;

    // Calculate hue difference
    const deltahPrime = calculateHueDifference(
      hue1.hue, hue2.hue, hue1.isUndefined, hue2.isUndefined
    );

    // Calculate ΔH' (hue difference in Lab space)
    let deltaHPrime = 0;
    if (!hue1.isUndefined && !hue2.isUndefined && Math.abs(deltahPrime) > EPSILON) {
      // Improved calculation for better numerical stability
      const hDiffRad = deltahPrime * DEG_TO_RAD;
      const sinHalfDiff = Math.sin(hDiffRad / 2);
      deltaHPrime = 2 * Math.sqrt(CPrime1 * CPrime2) * sinHalfDiff;
    }

    // Step 3: Calculate mean values for weighting functions
    const LPrimeBar = (L1 + L2) / 2;
    const CPrimeBar = (CPrime1 + CPrime2) / 2;

    const meanHue = calculateMeanHue(
      hue1.hue, hue2.hue, hue1.isUndefined, hue2.isUndefined
    );

    // Handle special case for achromatic colors
    if (isAchromatic(CPrime1) && isAchromatic(CPrime2)) {
      // For achromatic colors, only lightness difference matters
      const SL = 1 + (0.015 * Math.pow(LPrimeBar - 50, 2)) /
        Math.sqrt(20 + Math.pow(LPrimeBar - 50, 2));

      const deltaE = Math.abs(deltaLPrime) / (config.kL * SL);
      return config.debug ? { deltaE, achromatic: true } : deltaE;
    }

    // Step 4: Calculate weighting functions
    const T = calculateT(meanHue.meanHue, meanHue.isUndefined);

    // Lightness weighting
    const LPrimeBarMinus50Squared = Math.pow(LPrimeBar - 50, 2);
    const SL = 1 + (0.015 * LPrimeBarMinus50Squared) /
      Math.sqrt(20 + LPrimeBarMinus50Squared);

    // Chroma weighting
    const SC = 1 + 0.045 * CPrimeBar;

    // Hue weighting
    const SH = 1 + 0.015 * CPrimeBar * T;

    // Step 5: Calculate rotation term for blue region
    const deltaTheta = 30 * Math.exp(-Math.pow((meanHue.meanHue - 275) / 25, 2));
    const CPrimeBar7 = Math.pow(CPrimeBar, 7);
    const RC = 2 * Math.sqrt(CPrimeBar7 / (CPrimeBar7 + POW_25_7));
    const RT = -Math.sin(2 * deltaTheta * DEG_TO_RAD) * RC;

    // Step 6: Calculate final CIEDE2000 difference
    const firstTerm = Math.pow(safeDivide(deltaLPrime, config.kL * SL), 2);
    const secondTerm = Math.pow(safeDivide(deltaCPrime, config.kC * SC), 2);
    const thirdTerm = Math.pow(safeDivide(deltaHPrime, config.kH * SH), 2);
    const rotationTerm = RT *
      safeDivide(deltaCPrime, config.kC * SC) *
      safeDivide(deltaHPrime, config.kH * SH);

    const deltaE00 = Math.sqrt(
      Math.max(0, firstTerm + secondTerm + thirdTerm + rotationTerm)
    );

    // Return debug information if requested
    if (config.debug) {
      return {
        deltaE: deltaE00,
        intermediate: {
          deltaL: deltaLPrime,
          deltaC: deltaCPrime,
          deltaH: deltaHPrime,
          deltah: deltahPrime,
          SL, SC, SH, T, RT,
          CPrimeBar, meanHue: meanHue.meanHue,
          terms: { firstTerm, secondTerm, thirdTerm, rotationTerm }
        }
      };
    }

    return deltaE00;

  } catch (error) {
    // Re-throw CIEDE2000 errors, wrap others
    if (error instanceof CIEDE2000Error) {
      throw error;
    }
    throw new CIEDE2000Error('Unexpected error in CIEDE2000 calculation', {
      originalError: error.message,
      lab1, lab2, options
    });
  }
}

// Convenience function with common viewing condition presets
export function calculateCIEDE2000WithPreset(lab1, lab2, preset = 'standard', options = {}) {
  const presets = {
    standard: { kL: 1.0, kC: 1.0, kH: 1.0 },
    textiles: { kL: 2.0, kC: 1.0, kH: 1.0 },
    graphics: { kL: 1.0, kC: 1.5, kH: 1.0 },
    skinTone: { kL: 1.2, kC: 1.1, kH: 0.9 }
  };

  const presetConfig = presets[preset];
  if (!presetConfig) {
    throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(presets).join(', ')}`);
  }

  return calculateCIEDE2000(lab1, lab2, { ...presetConfig, ...options });
}

// Batch processing function for efficiency
export function calculateCIEDE2000Batch(labPairs, options = {}) {
  return labPairs.map(([lab1, lab2], index) => {
    try {
      return {
        index,
        deltaE: calculateCIEDE2000(lab1, lab2, options),
        success: true
      };
    } catch (error) {
      return {
        index,
        error: error.message,
        success: false
      };
    }
  });
}

/**
 * Converts RGB color values to HSL color space
 * @param {number[]} rgb - Array of RGB values [r, g, b] in range 0-255
 * @returns {number[]} Array of HSL values [h, s, l] where h is in degrees (0-360) and s,l are in percent (0-100)
 */
export function rgbToHsl(rgb) {
  // Input validation
  if (!Array.isArray(rgb) || rgb.length < 3) {
    console.error("Invalid RGB input to rgbToHsl:", rgb);
    return [0, 0, 50]; // Return middle gray as fallback
  }

  // Improved clamping of RGB values to valid range
  const [r, g, b] = rgb.map(x => {
    const val = Number(x);
    return Math.max(0, Math.min(255, isNaN(val) ? 128 : val)) / 255;
  });

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Calculate lightness
  const l = (max + min) / 2;

  // Calculate saturation
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  }

  // Calculate hue
  let h = 0;
  if (delta !== 0) {
    switch (max) {
      case r: h = ((g - b) / delta + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / delta + 2); break;
      case b: h = ((r - g) / delta + 4); break;
    }
    h = h * 60;
  }

  // Standardized rounding with consistent precision
  const precision = 2;
  return [
    parseFloat(h.toFixed(precision)),
    parseFloat((s * 100).toFixed(precision)),
    parseFloat((l * 100).toFixed(precision))
  ];
}

/**
 * Converts HSL color values to RGB color space
 * @param {number[]} hsl - Array of HSL values [h, s, l] where h is in degrees (0-360) and s,l are in percent (0-100)
 * @returns {number[]} Array of RGB values [r, g, b] in range 0-255
 */
export function hslToRgb(hsl) {
  // Input validation
  if (!Array.isArray(hsl) || hsl.length < 3) {
    console.error("Invalid HSL input to hslToRgb:", hsl);
    return [128, 128, 128]; // Return mid-gray as fallback
  }

  let h = Number(hsl[0]);
  let s = Number(hsl[1]) / 100;
  let l = Number(hsl[2]) / 100;

  // Handle invalid values
  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    console.error("NaN values in HSL input to hslToRgb:", hsl);
    return [128, 128, 128];
  }

  // Normalize values
  h = ((h % 360) + 360) % 360; // Normalize hue to 0-360
  s = Math.max(0, Math.min(1, s));   // Clamp saturation to 0-1
  l = Math.max(0, Math.min(1, l));   // Clamp lightness to 0-1

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic (gray)
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, (h / 360 + 1 / 3));
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, (h / 360 - 1 / 3));
  }

  // Apply consistent rounding for better precision
  return [r, g, b].map(val => Math.round(val * 255));
}

/**
 * Converts RGB color values to hexadecimal color string
 * @param {number[]|Object} rgb - Array of RGB values [r, g, b] or object with rgb property
 * @returns {string} Hexadecimal color string (e.g., "#FF0000" for red)
 */
export function rgbToHex(rgb) {
  // Input validation
  if (!rgb) {
    console.error("Invalid input to rgbToHex: null or undefined");
    return "#808080"; // Default to medium gray if invalid input
  }

  // Handle when rgb is an object with rgb property
  if (typeof rgb === 'object' && !Array.isArray(rgb) && rgb.rgb) {
    rgb = rgb.rgb;
  }

  // Validate the RGB array
  if (!Array.isArray(rgb) || rgb.length < 3) {
    console.error("Invalid RGB array input to rgbToHex:", rgb);
    return "#808080"; // Default to medium gray if invalid input
  }

  try {
    // Ensure values are numbers and in the valid range
    const validRgb = rgb.map(val => {
      const num = Math.round(Number(val));
      return Math.max(0, Math.min(255, isNaN(num) ? 128 : num));
    });

    // Convert to hex
    return "#" + validRgb.map(val => {
      const hex = val.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("").toUpperCase(); // Standardize to uppercase hex
  } catch (e) {
    console.error("Error in rgbToHex:", e);
    return "#808080"; // Default to medium gray if any error occurs
  }
}

/**
 * Converts LAB color values to RGB
 * @param {number[]} lab - LAB color values [L, a, b]
 * @returns {number[]} RGB values [r, g, b] in range 0-255
 */
export function labToRgb(lab) {
  // Input validation
  if (!Array.isArray(lab) || lab.length < 3 || lab.some(val => isNaN(Number(val)))) {
    console.error("Invalid LAB input to labToRgb:", lab);
    return [128, 128, 128]; // Return mid-gray as fallback
  }

  // Convert LAB to XYZ
  const [L, a, bValue] = lab.map(Number); // Ensure numeric values

  // Use same constants as in rgbToLab for consistency
  const epsilon = 0.008856; // 216/24389
  const kappa = 903.3;   // 24389/27

  const y = (L + 16) / 116;
  const x = a / 500 + y;
  const z = y - bValue / 200;

  // XYZ to linear RGB
  const xr = x > epsilon ? Math.pow(x, 3) : (x - 16 / 116) / kappa;
  const yr = y > epsilon ? Math.pow(y, 3) : (y - 16 / 116) / kappa;
  const zr = z > epsilon ? Math.pow(z, 3) : (z - 16 / 116) / kappa;

  // Reference white D65 - use same values as in rgbToLab
  const xRef = 0.95047;
  const yRef = 1.00000;
  const zRef = 1.08883;

  const X = xr * xRef;
  const Y = yr * yRef;
  const Z = zr * zRef;

  // XYZ to RGB (corrected matrix that is the exact inverse of RGB to XYZ)
  let r = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  let g = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
  let b = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;

  // Apply gamma correction
  const gammaCorrected = [r, g, b].map(v => {
    return v > 0.0031308
      ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055
      : 12.92 * v;
  });

  // Clamp and convert to 0-255
  const rgb = gammaCorrected.map(v => {
    const clamped = Math.max(0, Math.min(1, v));
    return Math.round(clamped * 255);
  });

  return rgb;
}

/**
 * Convert LAB color values to RGB and then to Hex with a name
 * @param {number[]} lab - LAB color values [L, a, b]
 * @param {string} name - Name of the color
 * @returns {Object} Object with name and hex properties
 */
export function labToHexWithName(lab, name) {
  // Input validation
  if (!Array.isArray(lab) || lab.length < 3) {
    console.error("Invalid LAB input to labToHexWithName:", lab);
    return { name: name || "Invalid Color", hex: "#808080" }; // Return gray as fallback
  }

  // Reuse the labToRgb function to avoid code duplication
  const rgb = labToRgb(lab);
  const hex = rgbToHex(rgb);

  return {
    name: name || "Unnamed Color",
    hex
  };
}

/**
 * Determines color temperature using Lab color space
 * More accurate than simple hue-based approach with evidence-based weighting
 * @param {number[]} rgb - RGB color values [r, g, b]
 * @returns {Object} Temperature analysis with temperature classification and confidence score
 */
export function analyzeTemperatureWithLab(rgb) {
  // Input validation
  if (!Array.isArray(rgb) || rgb.length < 3 || rgb.some(val => isNaN(Number(val)))) {
    console.error("Invalid RGB input to analyzeTemperatureWithLab:", rgb);
    return {
      temperature: "Neutral",
      detailedTemperature: "Neutral",
      temperatureScore: 0,
      confidence: "Low"
    };
  }

  // Convert RGB to Lab
  const lab = rgbToLab(rgb);

  // Extract a (red-green) and b (yellow-blue) components
  const [L, a, b] = lab;

  // Calculate temperature score
  // Weights based on perceptual research (Ou et al., 2004; Xiao et al., 2011)
  // b component (yellow vs blue) has higher weight than a component (red vs green)
  // Yellow/blue is the primary axis for warmth/coolness perception
  // FIXED: Adjusted weights to prevent warm bias (Olive skin has high b but can be cool)
  const bWeight = 0.60;  // Yellow-blue axis weight (reduced from 0.70)
  const aWeight = 0.40;  // Red-green axis weight (increased from 0.30)

  // Calculate yellow-to-blue ratio (positive b = yellow/warm, negative b = blue/cool)
  const yellowBlueComponent = b * bWeight;

  // Calculate red-to-green ratio (positive a = red/warm, negative a = green/cool)
  const redGreenComponent = a * aWeight;

  // Combined score (higher = warmer)
  const temperatureScore = yellowBlueComponent + redGreenComponent;

  // FIXED: Adjusted thresholds to prevent warm bias
  // Evidence-based thresholds for temperature classification 
  let temperature;
  if (temperatureScore > 12) { // Increased from 10 to 12
    temperature = "Warm";
  } else if (temperatureScore < -8) { // Changed from -10 to -8 to make cool more sensitive
    temperature = "Cool";
  } else {
    temperature = "Neutral";
  }

  // Determine confidence level based on magnitude and luminance
  const magnitude = Math.abs(temperatureScore);

  // Very dark or very light colors have less distinct temperature perception
  const isExtremeL = L < 15 || L > 90;

  // Low chroma colors (close to gray) have less distinct temperature
  const chroma = Math.sqrt(a * a + b * b);
  const isLowChroma = chroma < 15;

  let confidence;
  if (isExtremeL || isLowChroma) {
    confidence = "Low";
  } else if (magnitude > 25) {
    confidence = "High";
  } else if (magnitude > 15) {
    confidence = "Medium";
  } else {
    confidence = "Low";
  }

  // Additional nuanced temperature classification with finer granularity
  let detailedTemperature;
  if (temperatureScore > 25) {
    detailedTemperature = "Very Warm";
  } else if (temperatureScore > 12) { // Changed from 10 to 12
    detailedTemperature = "Warm";
  } else if (temperatureScore > 3) { // Changed from 4 to 3
    detailedTemperature = "Slightly Warm";
  } else if (temperatureScore >= -3) { // Changed from -4 to -3
    detailedTemperature = "Neutral";
  } else if (temperatureScore >= -8) { // Changed from -10 to -8
    detailedTemperature = "Slightly Cool";
  } else if (temperatureScore >= -25) {
    detailedTemperature = "Cool";
  } else {
    detailedTemperature = "Very Cool";
  }

  return {
    temperature,
    detailedTemperature,
    temperatureScore,
    confidence,
    components: {
      yellowBlueComponent,
      redGreenComponent
    },
    metadata: {
      chroma,
      luminance: L,
      isLowChroma,
      isExtremeLuminance: isExtremeL
    }
  };
}

/**
 * Analyzes color temperature with more comprehensive approach
 * Combines LAB-based temperature analysis with additional considerations
 * @param {number[]} rgb - RGB color values [r, g, b]
 * @param {number[]} hsl - Optional HSL values for additional analysis
 * @returns {Object} Comprehensive temperature analysis with confidence scores
 */
export function analyzeColorTemperature(rgb, hsl = null) {
  // Get the core LAB-based temperature analysis
  const labAnalysis = analyzeTemperatureWithLab(rgb);

  // Calculate confidence scores for each temperature category
  const temperatureScore = labAnalysis.temperatureScore;
  const magnitude = Math.abs(temperatureScore);

  // Convert magnitude to confidence scores using sigmoid normalization
  const warmConfidence = temperatureScore > 0 ?
    sigmoid((temperatureScore - 5) / 10) : 0.1;

  const coolConfidence = temperatureScore < 0 ?
    sigmoid((-temperatureScore - 5) / 10) : 0.1;

  const neutralConfidence = sigmoid(10 - magnitude / 5);

  // Normalize confidence scores to sum to 1
  const total = warmConfidence + coolConfidence + neutralConfidence;
  const normalizedConfidences = {
    warm: warmConfidence / total,
    cool: coolConfidence / total,
    neutral: neutralConfidence / total
  };

  // Determine boolean flags for temperature categories
  const isWarm = labAnalysis.temperature === "Warm" ||
    (labAnalysis.temperature === "Neutral" && temperatureScore > 0);

  const isCool = labAnalysis.temperature === "Cool" ||
    (labAnalysis.temperature === "Neutral" && temperatureScore < 0);

  const isNeutral = Math.abs(temperatureScore) < 10;

  return {
    temperature: labAnalysis.temperature,
    detailedTemperature: labAnalysis.detailedTemperature,
    temperatureScore,
    confidence: labAnalysis.confidence,
    isWarm,
    isCool,
    isNeutral,
    confidenceScores: normalizedConfidences,
    metadata: labAnalysis.metadata
  };
}

// Helper sigmoid function for fuzzy boundaries
export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * HTML Escaping Helper - escapes HTML characters for safe display
 * @param {string} str - String to escape
 * @returns {string} HTML-escaped string
 */
export function escapeHTML(str) {
  if (str === null || typeof str === 'undefined') {
    return '';
  }
  return String(str).replace(/[&<>"']/g, function (match) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match];
  });
}

/**
 * Calculate luminance from RGB values
 * @param {number[]} rgb - RGB color values
 * @returns {number} Luminance value
 */
export function calculateLuminance(rgb) {
  const [r, g, b] = rgb;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
