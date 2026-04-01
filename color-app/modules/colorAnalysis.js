// Color Analysis Module

import { rgbToLab, calculateCIEDE2000, rgbToHsl, hslToRgb, analyzeTemperatureWithLab, calculateLuminance } from './colorUtils.js';


// --- Constants ---
const CONTRAST_THRESHOLDS = [10, 20, 30, 40, 50, Infinity];
const CONTRAST_LEVELS = [
  "Very Low Contrast",
  "Low Contrast",
  "Medium-Low Contrast",
  "Medium Contrast",
  "Medium-High Contrast",
  "High Contrast"
];
const CONTRAST_DESCRIPTIONS = [
  "Your features have minimal contrast, creating a soft, blended appearance",
  "Your features have subtle contrast, creating a harmonious, gentle appearance",
  "Your features have moderate-low contrast with some definition between elements",
  "Your features have balanced contrast with clear definition between elements",
  "Your features have pronounced contrast creating a striking appearance",
  "Your features have dramatic contrast creating a bold, striking appearance"
];

// Seasonal analysis thresholds
const HIGH_CONTRAST_THRESHOLD = 35; // Overall contrast threshold for high contrast categorization
const VERY_HIGH_CONTRAST_THRESHOLD = 40; // Threshold for very high contrast (Bright seasons)
const LOW_CONTRAST_THRESHOLD = 18; // Overall contrast threshold for low contrast categorization
const DEFINITELY_WARM_TEMPERATURE_THRESHOLD = 10; // Temperature score for definitely warm
const DEFINITELY_COOL_TEMPERATURE_THRESHOLD = -10; // Temperature score for definitely cool
const MOSTLY_WARM_TEMPERATURE_THRESHOLD = 3; // Temperature score for mostly warm (neutral-warm)
const MOSTLY_COOL_TEMPERATURE_THRESHOLD = -3; // Temperature score for mostly cool (neutral-cool)
const WARM_SPRING_TEMPERATURE_THRESHOLD = 15; // Temperature score for True Spring
const DEFINITELY_CLEAR_CLARITY_THRESHOLD = 30; // Weighted clarity threshold for definitely clear
const DEFINITELY_MUTED_CLARITY_THRESHOLD = 15; // Weighted clarity threshold for definitely muted
const MOSTLY_CLEAR_CLARITY_THRESHOLD = 25; // Weighted clarity threshold for mostly clear
const MOSTLY_MUTED_CLARITY_THRESHOLD = 18; // Weighted clarity threshold for mostly muted
const CLARITY_FALLBACK_THRESHOLD = 20; // Clarity threshold for fallback season determination
const DARK_HAIR_EYES_LUMINANCE_THRESHOLD = 50; // Luminance threshold for dark hair/eyes
const LIGHT_SKIN_LUMINANCE_THRESHOLD = 150; // Luminance threshold for Light Spring vs True Spring

const DEFAULT_MST_MATCH = { number: 4, deltaE: 20, description: "Medium" };
const DEFAULT_FITZPATRICK = {
  type: "Type III",
  description: "Medium, sometimes burns, tans gradually"
};
const DEFAULT_COLOR_METRICS = {
  rgb: [128, 128, 128],
  luminance: 128,
  saturation: 30,
  redBlueRatio: 1,
  greenBlueRatio: 1,
  redGreenRatio: 1,
  warmth: 0,
  hsl: [0, 0, 50]
};
const DEFAULT_CONTRAST_RESULT = {
  skinHairContrast: 0,
  skinEyeContrast: 0,
  hairEyeContrast: 0,
  overallContrast: 0,
  contrastLevel: "Medium Contrast",
  description: "Medium Contrast (0 ΔE)",
  featureDefinition: {
    skinHairDefinition: 0,
    skinEyeDefinition: 0,
    hairEyeDefinition: 0,
    overallDefinition: 0
  },
  featureContrasts: {
    skinHair: {
      colorContrast: 0,
      luminanceContrast: 0,
      saturationContrast: 0,
      level: "Medium"
    },
    skinEyes: {
      colorContrast: 0,
      luminanceContrast: 0,
      saturationContrast: 0,
      level: "Medium"
    }
  },
  featureDominance: {
    skin: 0,
    hair: 0,
    eyes: 0,
    dominant: "Skin",
    secondary: "Hair"
  },
  detailedDescription: "Your features have balanced contrast with clear definition between elements",
  recommendedContrastLevel: "For best results, wear colors with medium contrast and focus on emphasizing your skin tone."
};
const DEFAULT_HARMONIES = {
  metrics: {
    naturalDelta: 20,
    primaryHarmonyType: "complementary",
    skinChroma: 15,
    skinHueAngle: 45,
    optimalHueDifference: 24,
    optimalChromaDifference: 16,
    optimalLightnessDifference: 30
  }
};

// Accurate Monk Skin Tone (MST) scale values in LAB color space
// Based on research data from Google and Dr. Ellis Monk (Harvard University)
const MST_LAB_VALUES = [
  { number: 1, lab: [85.9, 4.9, 16.9], description: "Very light" },
  { number: 2, lab: [76.8, 9.4, 17.2], description: "Light" },
  { number: 3, lab: [69.7, 13.2, 18.3], description: "Light medium" },
  { number: 4, lab: [62.1, 17.9, 20.5], description: "Medium" },
  { number: 5, lab: [54.0, 20.3, 23.8], description: "Medium dark" },
  { number: 6, lab: [45.6, 21.7, 26.1], description: "Dark" },
  { number: 7, lab: [38.2, 18.9, 24.7], description: "Deep" },
  { number: 8, lab: [32.0, 15.0, 20.3], description: "Very deep" },
  { number: 9, lab: [25.7, 10.2, 14.6], description: "Deep dark" },
  { number: 10, lab: [20.3, 6.7, 9.4], description: "Darkest" }
];

// Undertone reference database verified by multiple analytical methods
export const VALIDATED_UNDERTONE_REFERENCES = {
  "Golden": {
    lab: [65.0, 10.5, 25.4],
    melaninIndex: 28.7,
    hemoglobinIndex: 22.3,
    carotenoidLevel: "high",
    spectralSignature: [0.32, 0.47, 0.62, 0.71, 0.83, 0.91]
  },
  "Olive": {
    lab: [62.3, 8.7, 22.1],
    melaninIndex: 31.2,
    hemoglobinIndex: 19.8,
    carotenoidLevel: "medium",
    spectralSignature: [0.35, 0.49, 0.58, 0.67, 0.78, 0.85]
  },
  "Rosy": {
    lab: [67.8, 13.2, 18.5],
    melaninIndex: 25.3,
    hemoglobinIndex: 27.6,
    carotenoidLevel: "low",
    spectralSignature: [0.38, 0.52, 0.61, 0.65, 0.72, 0.81]
  },
  "Neutral": {
    lab: [64.5, 9.8, 20.3],
    melaninIndex: 29.5,
    hemoglobinIndex: 24.1,
    carotenoidLevel: "medium",
    spectralSignature: [0.36, 0.50, 0.60, 0.68, 0.77, 0.86]
  }
};

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Validate RGB array
 * @param {number[]} rgb - RGB values to validate
 * @returns {boolean} Whether the RGB array is valid
 */
function validateRGB(rgb) {
  return Array.isArray(rgb) && rgb.length === 3 && !rgb.some(isNaN);
}

/**
 * Validate LAB array
 * @param {number[]} lab - LAB values to validate
 * @returns {boolean} Whether the LAB array is valid
 */
function validateLAB(lab) {
  return Array.isArray(lab) && lab.length === 3 && !lab.some(isNaN);
}

/**
 * Validate HSL array
 * @param {number[]} hsl - HSL values to validate
 * @returns {boolean} Whether the HSL array is valid
 */
function validateHSL(hsl) {
  return Array.isArray(hsl) && hsl.length === 3 && !hsl.some(isNaN);
}



/**
 * Calculate saturation from RGB values
 * @param {number[]} rgb - RGB color values
 * @returns {number} Saturation value
 */
function calculateSaturation(rgb) {
  return Math.max(...rgb) - Math.min(...rgb);
}

/**
 * Find the closest item in an array based on a comparison function
 * @param {Array} array - Array to search
 * @param {Function} compareFn - Function that returns a numeric distance
 * @returns {Object} The closest matching item
 */
function findClosestMatch(array, compareFn) {
  let closestMatch = null;
  let minDistance = Infinity;

  for (const item of array) {
    const distance = compareFn(item);
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = { ...item, distance };
    }
  }

  return closestMatch;
}

// ==============================================
// COLOR ANALYSIS FUNCTIONS
// ==============================================

/**
 * Generate Pantone color recommendations based on color characteristics
 * @param {string} family - Color family
 * @param {string} undertone - Undertone category
 * @param {number} toneNumber - Tone number
 * @returns {string[]} Array of color recommendations
 */
const generateEnhancedPantoneRecommendations = (family, undertone, toneNumber) => {
  const recommendations = [];

  // Base colors specific to Pantone undertones
  const undertoneColors = {
    "Olive": ["Olive Green", "Burnt Umber", "Moss Green", "Forest Green", "Deep Teal"],
    "Rosy": ["Berry", "Mauve", "Soft Rose", "Plum", "Dusty Blue"],
    "Golden": ["Camel", "Terracotta", "Amber", "Bronze", "Golden Brown"],
    "Neutral": ["Taupe", "Soft Navy", "Medium Gray", "Coffee", "Slate"]
  };

  // Add undertone-specific colors
  recommendations.push(...(undertoneColors[undertone] ?? []));

  // Add colors specific to lightness level
  if (toneNumber < 25) { // Very light
    recommendations.push("Icy Pink", "Light Blue", "Soft White", "Pale Gray");
  } else if (toneNumber < 50) { // Light to medium
    recommendations.push("Soft Coral", "Medium Blue", "Sage", "Sand");
  } else if (toneNumber < 75) { // Medium to deep
    recommendations.push("True Red", "Navy", "Forest Green", "Coffee");
  } else { // Very deep
    recommendations.push("Bright Red", "Royal Blue", "Emerald", "White");
  }

  // Add family-specific colors
  if (family === "Red") {
    recommendations.push("True Red", "Burgundy", "Berry", "Coral");
  } else if (family === "Orange") {
    recommendations.push("Terracotta", "Rust", "Camel", "Bronze");
  } else if (family === "Yellow") {
    recommendations.push("Gold", "Amber", "Mustard", "Olive");
  } else {
    recommendations.push("Navy", "Gray", "Brown", "Taupe");
  }

  return [...new Set(recommendations)];
};

/**
 * Enhanced undertone analysis without ethnic calibration, using only CIE LAB color model
 * @param {number[]} skinRGB - Skin color RGB values
 * @param {number[]} hairRGB - Hair color RGB values
 * @param {number[]} eyeRGB - Eye color RGB values
 * @returns {Object} Detailed undertone analysis results
 */
export function analyzeAdvancedUndertone(skinRGB, hairRGB, eyeRGB) {
  try {
    // Validate inputs
    if (!validateRGB(skinRGB)) {
      console.error("Invalid skin RGB values provided to analyzeAdvancedUndertone");
      return createDefaultUndertoneResult();
    }

    // Convert to LAB space for accurate analysis
    const skinLab = rgbToLab(skinRGB);
    const calibratedSkinLab = [...skinLab]; // Use original LAB values

    // Get surface tone analysis
    const surfaceTone = analyzeSurfaceTone(skinRGB);

    // Analyze color metrics for undertone determination
    const [L, a, b_lab] = calibratedSkinLab;
    const colorMetrics = analyzeUndertoneColorMetrics(skinRGB, a, b_lab);

    // Calculate olive score and metrics
    const oliveMetrics = calculateOliveMetrics(skinRGB, colorMetrics);

    // Determine temperature-based undertone category
    const undertoneCategory = determineUndertoneCategory(a, b_lab, colorMetrics, oliveMetrics);

    // Determine specific undertone quality
    const undertoneQualityResult = determineUndertoneQuality(
      colorMetrics.redGreenBalance,
      colorMetrics.yellowBlueRatio,
      oliveMetrics.oliveScore,
      oliveMetrics.isGreenDominant,
      colorMetrics.chromaValue
    );

    // Calculate undertone blend
    const undertoneBlend = calculateUndertoneBlend(
      undertoneQualityResult.quality,
      a, b_lab,
      colorMetrics.greenYellowBalance
    );

    // Determine recommended jewelry and vein appearance
    const components = determineUndertoneComponents(undertoneQualityResult.quality);

    // Calculate undertone score
    const undertoneScore = (colorMetrics.redGreenBalance * 5) + (colorMetrics.yellowBlueRatio - 2) * 2;

    return {
      undertoneCategory,
      undertoneQuality: undertoneQualityResult.quality,
      surfaceUndertone: a,
      undertoneScore,
      chromaValue: colorMetrics.chromaValue,
      yellowBlueRatio: colorMetrics.yellowBlueRatio,
      redGreenBalance: colorMetrics.redGreenBalance,
      surfaceTone,
      undertoneBlend,
      oliveMetrics,
      components,
      confidenceScore: undertoneQualityResult.confidence
    };
  } catch (error) {
    console.error("Error in analyzeAdvancedUndertone:", error);
    return createDefaultUndertoneResult();
  }
}

/**
 * Analyze surface tone from RGB values
 * @param {number[]} rgb - RGB color values
 * @returns {Object} Surface tone analysis
 */
function analyzeSurfaceTone(rgb) {
  const [r, g, b] = rgb;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Determine primary color component
  const primaryComponent = r > g && r > b ? 'red' : (g > r && g > b ? 'green' : 'blue');

  // Determine secondary color component
  const secondaryComponent = r > g && b > g ? 'purple' : (g > r && r > b ? 'yellow' : 'unknown');

  // Calculate saturation
  const skinSaturation = Math.max(r, g, b) - Math.min(r, g, b);

  // Determine saturation category
  let saturationCategory;
  if (skinSaturation < 40) {
    saturationCategory = "Low";
  } else if (skinSaturation < 80) {
    saturationCategory = "Medium";
  } else {
    saturationCategory = "High";
  }

  return {
    luminance,
    primaryComponent,
    secondaryComponent,
    saturation: skinSaturation,
    saturationCategory
  };
}

/**
 * Analyze color metrics for undertone determination
 * @param {number[]} rgb - RGB values
 * @param {number} a - LAB a-value
 * @param {number} b - LAB b-value
 * @returns {Object} Color metrics for undertone analysis
 */
function analyzeUndertoneColorMetrics(rgb, a, b) {
  const [r, g, b_rgb] = rgb;

  // Calculate red/green and yellow/blue balance
  const redGreenDelta = (r - g) / 255;
  const yellowBlueDelta = (r + g - 2 * b_rgb) / 255;

  const redGreenBalance = redGreenDelta;
  const yellowBlueRatio = b_rgb > 0 ? (r + g) / (2 * b_rgb) : 5;

  // Calculate chroma value
  const chromaValue = Math.sqrt(a * a + b * b);

  // Calculate green-yellow balance for olive detection
  const greenYellowBalance = a < 0 && b > 0 ? Math.abs(a) / b : 0;

  return {
    redGreenBalance,
    yellowBlueRatio,
    chromaValue,
    greenYellowBalance
  };
}

/**
 * Calculate olive undertone metrics
 * @param {number[]} rgb - RGB values
 * @param {Object} colorMetrics - Color metrics object
 * @returns {Object} Olive metrics
 */
function calculateOliveMetrics(rgb, colorMetrics) {
  const [r, g, b] = rgb;

  // Calculate green component ratio (higher in olive skin)
  const greenComponentRatio = g / (r + g + b);

  // Enhanced olive detection
  const isGreenDominant = (g > r) && (g > b);
  const redToGreenRatio = r > 0 ? g / r : 2;
  const blueDeficiency = 255 - b;

  // Calculate olive score
  const oliveScore = (greenComponentRatio * 2) +
    (isGreenDominant ? 0.5 : 0) +
    (redToGreenRatio > 0.9 && redToGreenRatio < 1.1 ? 0.3 : 0) +
    (blueDeficiency / 255) * 0.2;

  return {
    greenComponentRatio,
    oliveScore,
    isGreenDominant,
    redToGreenRatio,
    blueDeficiency
  };
}

/**
 * Determine undertone category based on color metrics
 * @param {number} a - LAB a-value
 * @param {number} b - LAB b-value
 * @param {Object} colorMetrics - Color metrics
 * @param {Object} oliveMetrics - Olive metrics
 * @returns {string} Undertone category
 */
function determineUndertoneCategory(a, b, colorMetrics, oliveMetrics) {
  // Use improved temperature algorithm based on Lab values and ratios
  if (a > 3 && b > 10) {
    return "Warm";
  } else if (a < -0.5 && b < 12) {
    return "Cool";
  } else if (a < 1 && b > 15) {
    // Adjust for olive - green with yellow
    if (colorMetrics.greenYellowBalance > 0.1 && colorMetrics.greenYellowBalance < 0.4) {
      return "Olive";
    } else {
      return "Warm";
    }
  } else {
    // Neutral zone - low chroma or balanced values
    if (colorMetrics.chromaValue < 10 || (Math.abs(a) < 2 && b > 5 && b < 18)) {
      return "Neutral";
    } else if (b > a * 2) {
      return "Warm";
    } else if (a > b * 0.8) {
      return "Cool";
    }
  }

  // Default to Neutral if no other condition is met
  return "Neutral";
}

/**
 * Determine specific undertone quality and confidence
 * @param {number} redGreenBalance - Red-green balance
 * @param {number} yellowBlueRatio - Yellow-blue ratio
 * @param {number} oliveScore - Olive score
 * @param {boolean} isGreenDominant - Whether green is dominant
 * @param {number} chromaValue - Overall color saturation
 * @returns {Object} Undertone quality and confidence
 */
function determineUndertoneQuality(redGreenBalance, yellowBlueRatio, oliveScore, isGreenDominant, chromaValue) {
  let quality = "Neutral";
  let confidence = 0.75; // Default confidence

  // Enhanced olive undertone detection
  if (oliveScore > 1.15 && isGreenDominant) {
    quality = "Olive";
    confidence = Math.min(0.9, 0.7 + (oliveScore - 1.15) * 0.5);
  } else if (redGreenBalance > 0.5 && yellowBlueRatio < 3) {
    quality = "Rosy";
  } else if (redGreenBalance < 0 && yellowBlueRatio > 2) {
    quality = "Olive"; // Secondary olive detection method
  } else if (redGreenBalance > 0 && yellowBlueRatio > 3) {
    quality = "Golden";
  } else if (Math.abs(redGreenBalance) < 0.3 && Math.abs(yellowBlueRatio - 1.5) < 1) {
    quality = "Neutral";
    // For true neutrals, check muted quality
    if (chromaValue < 15) {
      quality = "True Neutral";
    }
  } else {
    quality = "Neutral";
  }

  return { quality, confidence };
}

/**
 * Calculate undertone blend percentages
 * @param {string} undertoneQuality - Undertone quality
 * @param {number} a - LAB a-value
 * @param {number} b - LAB b-value
 * @param {number} greenYellowBalance - Green-yellow balance
 * @returns {Object} Undertone blend values
 */
function calculateUndertoneBlend(undertoneQuality, a, b, greenYellowBalance) {
  let blend = {
    warm: 0,
    cool: 0,
    neutral: 0,
    olive: 0
  };

  if (undertoneQuality === "Neutral" || undertoneQuality === "True Neutral") {
    blend.neutral = 0.6;

    // Add warm/cool leanings
    if (a > 0) {
      blend.warm = 0.2 + (a / 10) * 0.2;
      blend.cool = 0.4 - (a / 10) * 0.2;
    } else {
      blend.cool = 0.2 + (Math.abs(a) / 10) * 0.2;
      blend.warm = 0.4 - (Math.abs(a) / 10) * 0.2;
    }

    // Add olive component if there's any hint of it
    if (greenYellowBalance > 0.05) {
      blend.olive = Math.min(0.3, greenYellowBalance * 0.5);
      // Reduce others proportionally
      const totalBeforeOlive = blend.warm + blend.cool + blend.neutral;
      const reductionFactor = (1 - blend.olive) / totalBeforeOlive;
      blend.warm *= reductionFactor;
      blend.cool *= reductionFactor;
      blend.neutral *= reductionFactor;
    }
  } else if (undertoneQuality === "Olive") {
    blend.olive = 0.6;
    blend.neutral = 0.2;

    // Olive can lean warm or cool
    if (b > 15) {
      blend.warm = 0.15;
      blend.cool = 0.05;
    } else {
      blend.cool = 0.15;
      blend.warm = 0.05;
    }
  } else if (undertoneQuality === "Golden") {
    blend.warm = 0.7;
    blend.neutral = 0.2;
    blend.cool = 0.05;
    blend.olive = 0.05;
  } else if (undertoneQuality === "Rosy") {
    blend.cool = 0.7;
    blend.neutral = 0.2;
    blend.warm = 0.05;
    blend.olive = 0.05;
  }

  return blend;
}

/**
 * Determine undertone components (metal preference and vein appearance)
 * @param {string} undertoneQuality - Undertone quality description
 * @returns {Object} Undertone components
 */
function determineUndertoneComponents(undertoneQuality) {
  let metalPreference = "Mixed Metals";
  let veinAnalysis = "Mixed";

  switch (undertoneQuality) {
    case "Rosy":
      veinAnalysis = "Blue";
      break;
    case "Golden":
      veinAnalysis = "Green";
      break;
    case "Olive":
      veinAnalysis = "Green-Blue";
      break;
    case "True Neutral":
      veinAnalysis = "Blue and Green Equally";
      break;
    default:
      veinAnalysis = "Mixed";
  }

  return {
    metalPreference,
    veinAnalysis
  };
}

/**
 * Create default undertone result for error cases
 * @returns {Object} Default undertone analysis
 */
function createDefaultUndertoneResult() {
  return {
    undertoneCategory: "Neutral",
    undertoneQuality: "Neutral",
    surfaceUndertone: 0,
    undertoneScore: 0,
    chromaValue: 15,
    yellowBlueRatio: 1.5,
    redGreenBalance: 0,
    surfaceTone: {
      luminance: 128,
      primaryComponent: "balanced",
      secondaryComponent: "unknown",
      saturation: 30,
      saturationCategory: "Medium"
    },
    undertoneBlend: {
      warm: 0.25,
      cool: 0.25,
      neutral: 0.5,
      olive: 0
    },
    oliveMetrics: {
      greenComponentRatio: 0.33,
      oliveScore: 0.8,
      isGreenDominant: false
    },
    components: {
      metalPreference: "Mixed Metals",
      veinAnalysis: "Mixed"
    },
    confidenceScore: 0.5
  };
}

/**
 * Find closest MST match for a given LAB color
 * @param {number[]} lab - LAB color values
 * @returns {Object} Closest MST match with number and description
 */
function findClosestMST(lab) {
  try {
    // Validate input
    if (!validateLAB(lab)) {
      console.error("Invalid LAB values provided to findClosestMST");
      return createDefaultMSTMatch();
    }

    // Use utility function to find the closest match
    const matchedMST = findClosestMatch(MST_LAB_VALUES, mst => calculateCIEDE2000(lab, mst.lab));

    if (!matchedMST) {
      return createDefaultMSTMatch();
    }

    return {
      number: matchedMST.number,
      deltaE: matchedMST.distance,
      description: matchedMST.description
    };
  } catch (error) {
    console.error("Error in findClosestMST:", error);
    return createDefaultMSTMatch();
  }
}

/**
 * Create default MST match for error cases
 * @returns {Object} Default MST match
 */
function createDefaultMSTMatch() {
  return { ...DEFAULT_MST_MATCH };
}

/**
 * Analyze color temperature of skin, hair, and eye colors
 * @param {number[]} skinRGB - Skin color RGB values
 * @param {number[]} hairRGB - Hair color RGB values
 * @param {number[]} eyeRGB - Eye color RGB values
 * @returns {Object} Color temperature analysis results
 */
export function analyzeColorTemperature(skinRGB, hairRGB, eyeRGB) {
  // Use the new improved Lab-based temperature detection
  const improvedTemperatureAnalysis = analyzeTemperatureWithLab(skinRGB);

  // For more accurate analysis, analyze hair and eye colors individually
  const hairTemperatureAnalysis = analyzeTemperatureWithLab(hairRGB);
  const eyeTemperatureAnalysis = analyzeTemperatureWithLab(eyeRGB);

  // Create a weighted combination for a comprehensive result
  // Skin contributes most to the overall temperature perception
  const skinWeight = 0.7;
  const hairWeight = 0.2;
  const eyeWeight = 0.1;

  // Calculate weighted temperature score
  const weightedTemperature =
    (improvedTemperatureAnalysis.temperatureScore * skinWeight) +
    (hairTemperatureAnalysis.temperatureScore * hairWeight) +
    (eyeTemperatureAnalysis.temperatureScore * eyeWeight);

  // Determine overall temperature category
  let temperature;
  if (weightedTemperature > 8) {
    temperature = "Warm";
  } else if (weightedTemperature < -8) {
    temperature = "Cool";
  } else if (weightedTemperature > 3) {
    temperature = "Neutral-Warm";
  } else if (weightedTemperature < -3) {
    temperature = "Neutral-Cool";
  } else {
    temperature = "Neutral";
  }

  // Generate description based on the analysis
  let description = `${temperature} temperature with `;
  if (Math.abs(weightedTemperature) > 15) {
    description += "strong ";
  } else if (Math.abs(weightedTemperature) > 8) {
    description += "moderate ";
  } else {
    description += "subtle ";
  }

  if (weightedTemperature > 0) {
    description += "yellow-gold undertones";
  } else if (weightedTemperature < 0) {
    description += "blue-pink undertones";
  } else {
    description += "balanced undertones";
  }

  // Return detailed results
  return {
    temperature,
    weightedTemperature,
    description,
    skinTemperature: improvedTemperatureAnalysis.temperatureScore,
    hairTemperature: hairTemperatureAnalysis.temperatureScore,
    eyeTemperature: eyeTemperatureAnalysis.temperatureScore,

    // Detailed component analysis
    components: {
      skinAnalysis: improvedTemperatureAnalysis,
      hairAnalysis: hairTemperatureAnalysis,
      eyeAnalysis: eyeTemperatureAnalysis,
      skinContribution: improvedTemperatureAnalysis.temperatureScore * skinWeight,
      hairContribution: hairTemperatureAnalysis.temperatureScore * hairWeight,
      eyeContribution: eyeTemperatureAnalysis.temperatureScore * eyeWeight
    }
  };
}

/**
 * Analyze color clarity of skin, hair, and eye colors
 * @param {number[]} skinRGB - Skin color RGB values
 * @param {number[]} hairRGB - Hair color RGB values
 * @param {number[]} eyeRGB - Eye color RGB values
 * @returns {Object} Color clarity analysis results
 */
export function analyzeColorClarity(skinRGB, hairRGB, eyeRGB) {
  try {
    // Input validation
    if (!Array.isArray(skinRGB) || !Array.isArray(hairRGB) || !Array.isArray(eyeRGB) ||
      skinRGB.length !== 3 || hairRGB.length !== 3 || eyeRGB.length !== 3) {
      console.error("Invalid RGB inputs to analyzeColorClarity:", { skinRGB, hairRGB, eyeRGB });
      return {
        skinClarity: 0,
        hairClarity: 0,
        eyeClarity: 0,
        weightedClarity: 0,
        clarity: "Medium",
        description: "Your coloring has a balanced level of clarity"
      };
    }

    // Convert to LAB space
    const skinLab = rgbToLab(skinRGB);
    const hairLab = rgbToLab(hairRGB);
    const eyeLab = rgbToLab(eyeRGB);

    // In LAB space, chroma (saturation) can be calculated from a* and b*
    const skinChroma = Math.sqrt(skinLab[1] * skinLab[1] + skinLab[2] * skinLab[2]);
    const hairChroma = Math.sqrt(hairLab[1] * hairLab[1] + hairLab[2] * hairLab[2]);
    const eyeChroma = Math.sqrt(eyeLab[1] * eyeLab[1] + eyeLab[2] * eyeLab[2]);

    // Weighted average
    const weightedChroma = (skinChroma * 0.4) + (hairChroma * 0.3) + (eyeChroma * 0.3);

    // Get skin luminance to adjust thresholds based on skin depth
    const skinLuminance = skinLab[0];

    // Adjust chroma thresholds based on skin depth
    // Deeper skin tones naturally have different chroma ranges
    let mutedThreshold = 15;
    let clearThreshold = 30;

    // Adjust thresholds for deeper skin tones
    if (skinLuminance < 60) {
      // Darker skin tones need adjusted thresholds
      mutedThreshold = 12;
      clearThreshold = 25;
    } else if (skinLuminance < 75) {
      // Medium skin tones
      mutedThreshold = 13;
      clearThreshold = 28;
    }

    // Classify clarity
    let clarity;
    let description;

    if (weightedChroma < mutedThreshold) {
      clarity = "Muted";
      description = "Your coloring has soft, muted qualities";
    } else if (weightedChroma < clearThreshold) {
      clarity = "Medium";
      description = "Your coloring has a balanced level of clarity";
    } else {
      clarity = "Clear";
      description = "Your coloring has bright, clear qualities";
    }

    return {
      skinClarity: skinChroma,
      hairClarity: hairChroma,
      eyeClarity: eyeChroma,
      weightedClarity: weightedChroma,
      clarity,
      description
    };
  } catch (error) {
    console.error("Error in analyzeColorClarity:", error);
    return {
      skinClarity: 0,
      hairClarity: 0,
      eyeClarity: 0,
      weightedClarity: 0,
      clarity: "Medium",
      description: "Your coloring has a balanced level of clarity"
    };
  }
}

/**
 * Calculate various color metrics from RGB values
 * @param {number[]} rgb - RGB color values
 * @returns {Object} Calculated color metrics
 */
export function calculateColorMetrics(rgb) {
  try {
    // Validate input
    if (!validateRGB(rgb)) {
      console.error("Invalid RGB values provided to calculateColorMetrics");
      return createDefaultColorMetrics();
    }

    const [r, g, b] = rgb;

    // Calculate basic metrics
    const luminance = calculateLuminance(rgb);
    const saturation = calculateSaturation(rgb);

    // Calculate additional metrics
    const redBlueRatio = calculateRatio(r, b);
    const greenBlueRatio = calculateRatio(g, b);
    const redGreenRatio = calculateRatio(r, g);

    // Get HSL representation
    const hsl = rgbToHsl(rgb);

    // Get color temperature metrics
    const warmth = calculateWarmthValue(rgb, redBlueRatio);

    return {
      rgb,
      luminance,
      saturation,
      redBlueRatio,
      greenBlueRatio,
      redGreenRatio,
      warmth,
      hsl
    };
  } catch (error) {
    console.error("Error in calculateColorMetrics:", error);
    return createDefaultColorMetrics();
  }
}

/**
 * Calculate a ratio between two values with protection against division by zero
 * @param {number} numerator - The numerator value
 * @param {number} denominator - The denominator value
 * @returns {number} The calculated ratio
 */
function calculateRatio(numerator, denominator) {
  return denominator === 0 ? numerator : numerator / denominator;
}

/**
 * Calculate an approximate "warmth" value from RGB
 * @param {number[]} rgb - RGB values
 * @param {number} redBlueRatio - Pre-calculated red-blue ratio
 * @returns {number} Warmth value (-10 to 10 scale)
 */
function calculateWarmthValue(rgb, redBlueRatio) {
  const [r, g, b] = rgb;

  // Simple warmth heuristic: red vs blue dominance (range from -10 to 10)
  return ((r - b) / (Math.max(r, b, 1))) * 10;
}

/**
 * Create default color metrics for error cases
 * @returns {Object} Default color metrics
 */
function createDefaultColorMetrics() {
  return { ...DEFAULT_COLOR_METRICS };
}

/**
 * Analyze color according to Munsell color system
 * @param {Object} metrics - Color metrics object 
 * @returns {Object} Munsell system analysis results
 */
export function analyzeMunsellSystem(metrics) { // Accept metrics object
  // Input validation
  if (!metrics || !metrics.hsl || metrics.hsl.length !== 3) {
    console.error("Invalid metrics provided to analyzeMunsellSystem");
    return {
      hue: 0,
      value: 0,
      chroma: 0,
      description: "Munsell analysis unavailable"
    };
  }

  // Use pre-calculated HSL from metrics
  const [h, s, l] = metrics.hsl;

  // Munsell values
  const hue = Math.round(h);
  const value = Math.round(l / 10); // 0-10 scale
  const chroma = Math.round(s / 10); // 0-10 scale

  // Get Munsell hue name
  let hueName = "";
  if (hue >= 350 || hue < 10) hueName = "R"; // Red
  else if (hue >= 10 && hue < 40) hueName = "YR"; // Yellow-Red
  else if (hue >= 40 && hue < 70) hueName = "Y"; // Yellow
  else if (hue >= 70 && hue < 160) hueName = "G"; // Green
  else if (hue >= 160 && hue < 200) hueName = "BG"; // Blue-Green
  else if (hue >= 200 && hue < 250) hueName = "B"; // Blue
  else if (hue >= 250 && hue < 290) hueName = "PB"; // Purple-Blue
  else if (hue >= 290 && hue < 330) hueName = "P"; // Purple
  else hueName = "RP"; // Red-Purple

  // Calculate the Munsell hue number (0-10)
  let hueNumber;
  if (hue >= 350 || hue < 10) {
    hueNumber = hue >= 350 ? Math.round((hue - 350) / 2) : Math.round((hue + 10) / 2);
  } else if (hue >= 10 && hue < 40) {
    hueNumber = Math.round((hue - 10) / 3);
  } else if (hue >= 40 && hue < 70) {
    hueNumber = Math.round((hue - 40) / 3);
  } else if (hue >= 70 && hue < 160) {
    hueNumber = Math.round((hue - 70) / 9);
  } else if (hue >= 160 && hue < 200) {
    hueNumber = Math.round((hue - 160) / 4);
  } else if (hue >= 200 && hue < 250) {
    hueNumber = Math.round((hue - 200) / 5);
  } else if (hue >= 250 && hue < 290) {
    hueNumber = Math.round((hue - 250) / 4);
  } else if (hue >= 290 && hue < 330) {
    hueNumber = Math.round((hue - 290) / 4);
  } else {
    hueNumber = Math.round((hue - 330) / 2);
  }

  // Constrain hue number to 0-10 range
  hueNumber = Math.max(0, Math.min(10, hueNumber));

  // Format the Munsell notation: hue value/chroma
  const munsellNotation = `${hueNumber}${hueName} ${value}/${chroma}`;

  return {
    hue,
    value,
    chroma,
    hueName,
    hueNumber,
    munsellNotation,
    description: `Munsell ${munsellNotation}`
  };
}

/**
 * Analyze color flow characteristics
 * @param {Object} metrics - Color metrics object
 * @returns {Object} Color flow analysis results
 */
export function analyzeColorFlow(metrics) { // Accept metrics object
  // Use pre-calculated luminance and saturation from metrics
  const { luminance, saturation } = metrics;

  let depth = "";
  let flow = "";

  // Determine depth level
  if (luminance > 200) depth = "Very Light";
  else if (luminance > 170) depth = "Light";
  else if (luminance > 140) depth = "Light Medium";
  else if (luminance > 110) depth = "Medium";
  else if (luminance > 80) depth = "Medium Deep";
  else depth = "Deep";

  // Determine color flow
  if (saturation < 20) flow = "Neutral Flow";
  else if (saturation < 40) flow = "Soft Flow";
  else flow = "Vivid Flow";

  return {
    depth,
    flow,
    description: `${depth} with ${flow}`
  };
}



/**
 * Analyze Fitzpatrick skin type
 * @param {Object} metrics - Color metrics object
 * @returns {Object} Fitzpatrick skin type analysis
 */
export function analyzeFitzpatrick(metrics) {
  try {
    // Input validation
    if (!metrics || !metrics.luminance) {
      console.error("Invalid metrics provided to analyzeFitzpatrick");
      return createDefaultFitzpatrickResult();
    }

    const { luminance } = metrics;

    // Define Fitzpatrick types data
    const fitzpatrickTypes = [
      {
        threshold: 200,
        type: "Type I",
        description: "Very fair, always burns, never tans"
      },
      {
        threshold: 170,
        type: "Type II",
        description: "Fair, usually burns, tans minimally"
      },
      {
        threshold: 140,
        type: "Type III",
        description: "Medium, sometimes burns, tans gradually"
      },
      {
        threshold: 110,
        type: "Type IV",
        description: "Olive, rarely burns, tans easily"
      },
      {
        threshold: 80,
        type: "Type V",
        description: "Brown, very rarely burns, tans very easily"
      },
      {
        threshold: 0,
        type: "Type VI",
        description: "Very dark brown to black, never burns"
      }
    ];

    // Find the matching type
    const matchedType = fitzpatrickTypes.find(type => luminance > type.threshold);

    // Return matching type or default to Type VI
    return matchedType || fitzpatrickTypes[fitzpatrickTypes.length - 1];
  } catch (error) {
    console.error("Error in analyzeFitzpatrick:", error);
    return createDefaultFitzpatrickResult();
  }
}

/**
 * Create default Fitzpatrick result for error cases
 * @returns {Object} Default Fitzpatrick result
 */
function createDefaultFitzpatrickResult() {
  return {
    type: "Type III",
    description: "Medium, sometimes burns, tans gradually"
  };
}

/**
 * Analyze skin color using Monk scale
 * @param {Object} skinColorInfo - Skin color information
 * @returns {Object} Monk scale analysis results
 */
/**
 * Analyze color contrast between skin, hair, and eye colors with enhanced metrics
 * @param {number[]} skinRGB - Skin color RGB values
 * @param {number[]} hairRGB - Hair color RGB values
 * @param {number[]} eyeRGB - Eye color RGB values
 * @returns {Object} Color contrast analysis results
 */
export function analyzeColorContrast(skinRGB, hairRGB, eyeRGB) {
  try {
    // Validate input
    if (!validateRGB(skinRGB) || !validateRGB(hairRGB) || !validateRGB(eyeRGB)) {
      return createDefaultContrastResult();
    }

    // Convert to LAB space for accurate color calculations
    const colorSpaceData = {
      skin: {
        lab: rgbToLab(skinRGB),
        rgb: skinRGB,
        luminance: calculateLuminance(skinRGB),
        saturation: calculateSaturation(skinRGB)
      },
      hair: {
        lab: rgbToLab(hairRGB),
        rgb: hairRGB,
        luminance: calculateLuminance(hairRGB),
        saturation: calculateSaturation(hairRGB)
      },
      eye: {
        lab: rgbToLab(eyeRGB),
        rgb: eyeRGB,
        luminance: calculateLuminance(eyeRGB),
        saturation: calculateSaturation(eyeRGB)
      }
    };

    // Calculate contrasts between features
    const contrasts = calculateFeatureContrasts(colorSpaceData);

    // Calculate feature dominance
    const dominance = calculateFeatureDominance(colorSpaceData);

    // Determine contrast level and description
    const contrastAssessment = assessContrastLevel(contrasts.overallContrast);

    // Build the final result
    return {
      skinHairContrast: contrasts.skinHair.colorContrast,
      skinEyeContrast: contrasts.skinEye.colorContrast,
      hairEyeContrast: contrasts.hairEye.colorContrast,
      overallContrast: contrasts.overallContrast,
      contrastLevel: contrastAssessment.level,
      description: `${contrastAssessment.level} (${Math.round(contrasts.overallContrast)} ΔE)`,
      featureDefinition: {
        skinHairDefinition: contrasts.skinHair.definition,
        skinEyeDefinition: contrasts.skinEye.definition,
        hairEyeDefinition: contrasts.hairEye.definition,
        overallDefinition: contrasts.featureDefinitionScore
      },
      featureContrasts: {
        skinHair: {
          colorContrast: contrasts.skinHair.colorContrast,
          luminanceContrast: contrasts.skinHair.luminanceContrast * 100,
          saturationContrast: contrasts.skinHair.saturationContrast * 100,
          level: getContrastLevelDescription(contrasts.skinHair.colorContrast)
        },
        skinEyes: {
          colorContrast: contrasts.skinEye.colorContrast,
          luminanceContrast: contrasts.skinEye.luminanceContrast * 100,
          saturationContrast: contrasts.skinEye.saturationContrast * 100,
          level: getContrastLevelDescription(contrasts.skinEye.colorContrast)
        }
      },
      featureDominance: {
        skin: dominance.skin,
        hair: dominance.hair,
        eyes: dominance.eye,
        dominant: dominance.primaryFeature,
        secondary: dominance.secondaryFeature
      },
      detailedDescription: contrastAssessment.description,
      recommendedContrastLevel: `For best results, wear colors with ${contrastAssessment.level.toLowerCase().replace('contrast', '').trim()} contrast and focus on emphasizing your ${dominance.primaryFeature.toLowerCase()} tone.`
    };
  } catch (error) {
    console.error("Error in analyzeColorContrast:", error);
    return createDefaultContrastResult();
  }
}

/**
 * Calculate contrasts between skin, hair, and eye features
 * @param {Object} colorData - Color data for skin, hair, and eyes
 * @returns {Object} Contrast measurements between features
 */
function calculateFeatureContrasts(colorData) {
  // Calculate color differences using CIEDE2000
  const skinHairContrast = calculateCIEDE2000(colorData.skin.lab, colorData.hair.lab);
  const skinEyeContrast = calculateCIEDE2000(colorData.skin.lab, colorData.eye.lab);
  const hairEyeContrast = calculateCIEDE2000(colorData.hair.lab, colorData.eye.lab);

  // Calculate luminance contrasts
  const skinHairLuminanceContrast = Math.abs(colorData.skin.luminance - colorData.hair.luminance) / 255;
  const skinEyeLuminanceContrast = Math.abs(colorData.skin.luminance - colorData.eye.luminance) / 255;
  const hairEyeLuminanceContrast = Math.abs(colorData.hair.luminance - colorData.eye.luminance) / 255;

  // Calculate saturation contrasts
  const skinHairSaturationContrast = Math.abs(colorData.skin.saturation - colorData.hair.saturation) / 255;
  const skinEyeSaturationContrast = Math.abs(colorData.skin.saturation - colorData.eye.saturation) / 255;

  // Feature definition scores (combines color, luminance and saturation)
  const skinHairDefinition = (skinHairContrast * 0.6) + (skinHairLuminanceContrast * 100 * 0.3) + (skinHairSaturationContrast * 100 * 0.1);
  const skinEyeDefinition = (skinEyeContrast * 0.6) + (skinEyeLuminanceContrast * 100 * 0.3) + (skinEyeSaturationContrast * 100 * 0.1);
  const hairEyeDefinition = (hairEyeContrast * 0.5) + (hairEyeLuminanceContrast * 100 * 0.5);

  // Calculate overall scores
  const featureDefinitionScore = (skinHairDefinition * 0.6) + (skinEyeDefinition * 0.3) + (hairEyeDefinition * 0.1);
  const overallContrast = (skinHairContrast * 0.6) + (skinEyeContrast * 0.3) + (hairEyeContrast * 0.1);

  return {
    skinHair: {
      colorContrast: skinHairContrast,
      luminanceContrast: skinHairLuminanceContrast,
      saturationContrast: skinHairSaturationContrast,
      definition: skinHairDefinition
    },
    skinEye: {
      colorContrast: skinEyeContrast,
      luminanceContrast: skinEyeLuminanceContrast,
      saturationContrast: skinEyeSaturationContrast,
      definition: skinEyeDefinition
    },
    hairEye: {
      colorContrast: hairEyeContrast,
      luminanceContrast: hairEyeLuminanceContrast,
      definition: hairEyeDefinition
    },
    featureDefinitionScore,
    overallContrast
  };
}

/**
 * Calculate dominance of each feature
 * @param {Object} colorData - Color data for skin, hair, and eyes
 * @returns {Object} Dominance scores and dominant features
 */
function calculateFeatureDominance(colorData) {
  // Calculate dominance scores
  const skinDominance = (colorData.skin.luminance / 255) * (colorData.skin.saturation / 255) * 100;
  const hairDominance = (colorData.hair.luminance / 255) * (colorData.hair.saturation / 255) * 100;
  const eyeDominance = (colorData.eye.luminance / 255) * (colorData.eye.saturation / 255) * 100;

  // Determine primary and secondary dominant features
  let primaryFeature, secondaryFeature;

  if (skinDominance >= hairDominance && skinDominance >= eyeDominance) {
    primaryFeature = "Skin";
    secondaryFeature = hairDominance >= eyeDominance ? "Hair" : "Eyes";
  } else if (hairDominance >= skinDominance && hairDominance >= eyeDominance) {
    primaryFeature = "Hair";
    secondaryFeature = skinDominance >= eyeDominance ? "Skin" : "Eyes";
  } else {
    primaryFeature = "Eyes";
    secondaryFeature = skinDominance >= hairDominance ? "Skin" : "Hair";
  }

  return {
    skin: skinDominance,
    hair: hairDominance,
    eye: eyeDominance,
    primaryFeature,
    secondaryFeature
  };
}

/**
 * Assess contrast level and create description
 * @param {number} contrastValue - Overall contrast value
 * @returns {Object} Contrast level and description
 */
function assessContrastLevel(contrastValue) {
  // Define contrast thresholds and descriptions
  const contrastLevels = [
    { threshold: 10, level: "Very Low Contrast", description: "Your features have minimal contrast, creating a soft, blended appearance" },
    { threshold: 20, level: "Low Contrast", description: "Your features have subtle contrast, creating a harmonious, gentle appearance" },
    { threshold: 30, level: "Medium-Low Contrast", description: "Your features have moderate-low contrast with some definition between elements" },
    { threshold: 40, level: "Medium Contrast", description: "Your features have balanced contrast with clear definition between elements" },
    { threshold: 50, level: "Medium-High Contrast", description: "Your features have pronounced contrast creating a striking appearance" },
    { threshold: Infinity, level: "High Contrast", description: "Your features have dramatic contrast creating a bold, striking appearance" }
  ];

  // Find the appropriate contrast level
  const result = contrastLevels.find(level => contrastValue < level.threshold) || contrastLevels[contrastLevels.length - 1];

  return {
    level: result.level,
    description: result.description
  };
}

/**
 * Get descriptive contrast level based on contrast value
 * @param {number} contrastValue - Contrast value
 * @returns {string} Contrast level description
 */
function getContrastLevelDescription(contrastValue) {
  if (contrastValue < 15) return "Low";
  if (contrastValue < 35) return "Medium";
  return "High";
}

/**
 * Create default contrast result for error cases
 * @returns {Object} Default contrast analysis result
 */
function createDefaultContrastResult() {
  return {
    skinHairContrast: 0,
    skinEyeContrast: 0,
    hairEyeContrast: 0,
    overallContrast: 0,
    contrastLevel: "Medium Contrast",
    description: "Medium Contrast (0 ΔE)",
    featureDefinition: {
      skinHairDefinition: 0,
      skinEyeDefinition: 0,
      hairEyeDefinition: 0,
      overallDefinition: 0
    },
    featureContrasts: {
      skinHair: {
        colorContrast: 0,
        luminanceContrast: 0,
        saturationContrast: 0,
        level: "Medium"
      },
      skinEyes: {
        colorContrast: 0,
        luminanceContrast: 0,
        saturationContrast: 0,
        level: "Medium"
      }
    },
    featureDominance: {
      skin: 0,
      hair: 0,
      eyes: 0,
      dominant: "Skin",
      secondary: "Hair"
    },
    detailedDescription: "Your features have balanced contrast with clear definition between elements",
    recommendedContrastLevel: "For best results, wear colors with medium contrast and focus on emphasizing your skin tone."
  };
}

/**
 * Determine comprehensive seasonal color type
 * @param {number[]} skinRGB - Skin color RGB values
 * @param {number[]} hairRGB - Hair color RGB values
 * @param {number[]} eyeRGB - Eye color RGB values
 * @returns {Object} Comprehensive seasonal color analysis
 */
export function determineComprehensiveSeason(skinRGB, hairRGB, eyeRGB) {
  // 1. Get Individual Analyses
  const contrast = analyzeColorContrast(skinRGB, hairRGB, eyeRGB);
  const temperature = analyzeColorTemperature(skinRGB, hairRGB, eyeRGB);
  const clarity = analyzeColorClarity(skinRGB, hairRGB, eyeRGB);
  const undertone = analyzeAdvancedUndertone(skinRGB, hairRGB, eyeRGB);

  // 2. Calculate Normalized Metrics (0-1 scale)
  const skinLuminance = calculateLuminance(skinRGB);
  const hairLuminance = calculateLuminance(hairRGB);
  const eyeLuminance = calculateLuminance(eyeRGB);

  // Temperature Metric: -1 (Cool) to 1 (Warm)
  // tempScoreRaw is approx -30 to 30. We clamp it.
  const tempScoreRaw = temperature.temperatureScore;
  let tempMetric = Math.max(-1, Math.min(1, tempScoreRaw / 15));

  // ADJUSTMENT FOR OLIVE:
  // Olive skin often reads as "Warm" due to yellow overtones, even if the undertone is cool.
  // If identified as Olive and the temp is Warm, we reduce the warmth score to prevent false Autumn classification.
  if (undertone.undertoneQuality === "Olive" && tempMetric > 0) {
    tempMetric *= 0.5; // Reduce warmth impact by 50%
  }

  // Clarity Metric: 0 (Muted) to 1 (Clear)
  // weightedClarity is approx 0 to 60.
  const clarityMetric = Math.max(0, Math.min(1, clarity.weightedClarity / 45));

  // Lightness Metric: 0 (Dark) to 1 (Light)
  const lightMetric = skinLuminance / 255;

  // Depth Metric (Hair/Eye): 0 (Light) to 1 (Deep)
  const hairDepth = 1 - (hairLuminance / 255);
  const eyeDepth = 1 - (eyeLuminance / 255);
  // Hair depth is usually more defining for "Deep" seasons than eyes
  const overallDepth = (hairDepth * 0.6) + (eyeDepth * 0.4);

  // Contrast Metric: 0 (Low) to 1 (High)
  const contrastMetric = Math.max(0, Math.min(1, contrast.overallContrast / 50));

  // 3. Calculate Base Season Scores
  const scores = {
    Spring: 0,
    Summer: 0,
    Autumn: 0,
    Winter: 0
  };

  // Spring: Warm + Clear + Light
  scores.Spring = (tempMetric > 0 ? tempMetric : 0) + clarityMetric + lightMetric;

  // Summer: Cool + Muted + Light
  scores.Summer = (tempMetric < 0 ? -tempMetric : 0) + (1 - clarityMetric) + lightMetric;

  // Autumn: Warm + Muted + Deep
  scores.Autumn = (tempMetric > 0 ? tempMetric : 0) + (1 - clarityMetric) + overallDepth;

  // Winter: Cool + Clear + Deep
  scores.Winter = (tempMetric < 0 ? -tempMetric : 0) + clarityMetric + overallDepth;

  // 4. Determine Base Season Winner
  let baseSeason = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

  // Thresholds for defining traits
  const isVeryWarm = tempMetric > 0.5;
  const isVeryCool = tempMetric < -0.5;
  const isVeryClear = clarityMetric > 0.6;
  const isVeryMuted = clarityMetric < 0.4;
  const isVeryLight = lightMetric > 0.65;
  const isVeryDeep = overallDepth > 0.65;

  // FIX: Correct misclassification of Deep Winter as Dark Autumn
  // Deep Winter is often misidentified as Dark Autumn for Olive skin tones (which read warm)
  // or for very high contrast users (Winter trait).
  if (baseSeason === "Autumn" && isVeryDeep) {
    // If contrast is high (Winter trait) or if Olive (cool/neutral undertone often misread as warm)
    // and not strongly warm (True Autumn), shift to Winter.
    if (contrastMetric > 0.6 || (undertone.undertoneQuality === "Olive" && tempMetric < 0.4)) {
      baseSeason = "Winter";
    }
  }

  // 5. Determine Subtype (Flow Logic)
  let season = "";

  switch (baseSeason) {
    case "Spring":
      // Spring Flows:
      // - To Winter (Clear) -> Bright Spring
      // - To Summer (Light) -> Light Spring
      // - Core (Warm) -> True Spring
      if (isVeryClear || contrastMetric > 0.6) {
        season = "Bright Spring";
      } else if (isVeryLight) {
        season = "Light Spring";
      } else {
        season = "True Spring";
      }
      break;

    case "Summer":
      // Summer Flows:
      // - To Spring (Light) -> Light Summer
      // - To Autumn (Muted) -> Soft Summer
      // - Core (Cool) -> True Summer
      if (isVeryLight) {
        season = "Light Summer";
      } else if (isVeryMuted || undertone.undertoneQuality === "Olive") {
        // Olive often falls into Soft Summer if cool
        season = "Soft Summer";
      } else {
        season = "True Summer";
      }
      break;

    case "Autumn":
      // Autumn Flows:
      // - To Summer (Muted) -> Soft Autumn
      // - To Winter (Deep) -> Dark Autumn
      // - Core (Warm) -> True Autumn
      if (isVeryDeep || contrastMetric > 0.6) {
        season = "Dark Autumn";
      } else if (isVeryMuted) {
        season = "Soft Autumn";
      } else {
        season = "True Autumn";
      }
      break;

    case "Winter":
      // Winter Flows:
      // - To Spring (Clear) -> Bright Winter
      // - To Autumn (Deep) -> Deep Winter
      // - Core (Cool) -> True Winter

      // Fix for "Deep" override: Check Clarity/Contrast for Bright Winter first
      if (isVeryClear && contrastMetric > 0.65) {
        season = "Bright Winter";
      } else if (isVeryDeep) {
        // Olive Handling: Deep Olives often fit Deep Winter (Cool/Neutral) or Dark Autumn (Warm/Neutral)
        if (undertone.undertoneQuality === "Olive") {
          // If explicitly warm or golden, go Autumn. If cool or neutral-leaning, go Winter.
          if (temperature.weightedTemperature > MOSTLY_WARM_TEMPERATURE_THRESHOLD) {
            season = "Dark Autumn"; // Override to Autumn for Warm Olives
          } else {
            season = "Deep Winter"; // Default for Deep Olives (Cool/Neutral)
          }
        } else {
          season = "Deep Winter";
        }
      } else {
        season = "True Winter";
      }
      break;
  }

  // Fallback if something fails
  if (!season) season = baseSeason + " (Balanced)";

  return {
    season: baseSeason,
    subtype: season,
    contrast: contrast.contrastLevel,
    temperature: temperature.temperature,
    clarity: clarity.clarity,
    description: `${season}: ${temperature.temperature} with ${contrast.contrastLevel} contrast and ${clarity.clarity.toLowerCase()} clarity`,
    scores: scores // Return scores for debugging/visualization
  };
}

/**
 * Get "Sister Season" borrowing advice based on season and contrast
 * @param {string} season - The specific season subtype (e.g., "Soft Autumn")
 * @param {string} contrastLevel - The contrast level description
 * @returns {string|null} Advice message or null if no advice applies
 */
export function getSisterSeasonAdvice(season, contrastLevel) {
  if (!season) return null;

  const seasonStr = String(season);
  const contrastStr = String(contrastLevel || "");

  // Soft Autumn <-> Soft Summer (Medium Contrast)
  if (seasonStr === "Soft Autumn" && contrastStr.includes("Medium")) {
    return "Your dominant palette is Soft Autumn, but because you have medium contrast, you can also wear Soft Summer colors when you want a cooler look.";
  }

  if (seasonStr === "Soft Summer" && contrastStr.includes("Medium")) {
    return "Your dominant palette is Soft Summer, but because you have medium contrast, you can also wear Soft Autumn colors when you want a warmer look.";
  }

  // Deep Autumn <-> Deep Winter (High Contrast)
  if (seasonStr === "Dark Autumn" && (contrastStr.includes("High") || contrastStr.includes("Medium-High"))) {
    return "Your dominant palette is Dark Autumn, but because of your high contrast, you can borrow from Deep Winter for a more dramatic, cooler look.";
  }

  if (seasonStr === "Deep Winter" && (contrastStr.includes("High") || contrastStr.includes("Medium-High"))) {
    return "Your dominant palette is Deep Winter, but because of your high contrast, you can borrow from Dark Autumn for a richer, warmer look.";
  }

  // Bright Spring <-> Bright Winter (Very High/Clear)
  if (seasonStr === "Bright Spring") {
    return "Your dominant palette is Bright Spring, but your clarity allows you to borrow from Bright Winter for high-impact, cooler colors.";
  }

  if (seasonStr === "Bright Winter") {
    return "Your dominant palette is Bright Winter, but your clarity allows you to borrow from Bright Spring for high-impact, warmer colors.";
  }

  // Light Spring <-> Light Summer (Light)
  if (seasonStr === "Light Spring") {
    return "Your dominant palette is Light Spring, but your lightness allows you to borrow from Light Summer for a softer, cooler look.";
  }

  if (seasonStr === "Light Summer") {
    return "Your dominant palette is Light Summer, but your lightness allows you to borrow from Light Spring for a brighter, warmer look.";
  }

  return null;
}


/**
 * Analyze color according to the 12-Zone Seasonal System
 * This maps the comprehensive season to the 12-zone equivalent
 * @param {Object} metrics - Color metrics object
 * @param {Object} context - Context object containing season
 * @returns {Object} 12-Zone analysis results
 */
export function analyzeTwelveZone(metrics, context) {
  const season = context && context.season ? context.season : "Unknown";

  // Map standard seasons to 12-zone names (usually they match, but this ensures structure)
  const zoneMap = {
    "Bright Spring": "Bright Spring (Zone 1)",
    "True Spring": "True Spring (Zone 2)",
    "Light Spring": "Light Spring (Zone 3)",
    "Light Summer": "Light Summer (Zone 4)",
    "True Summer": "True Summer (Zone 5)",
    "Soft Summer": "Soft Summer (Zone 6)",
    "Soft Autumn": "Soft Autumn (Zone 7)",
    "True Autumn": "True Autumn (Zone 8)",
    "Dark Autumn": "Dark Autumn (Zone 9)",
    "Deep Winter": "Deep Winter (Zone 10)",
    "True Winter": "True Winter (Zone 11)",
    "Bright Winter": "Bright Winter (Zone 12)"
  };

  const zoneName = zoneMap[season] || `${season} (Unmapped Zone)`;

  return {
    zone: zoneName,
    season: season,
    description: `Your coloring falls into ${zoneName} of the 12-Zone System.`
  };
}

/**
 * Generate optimal color harmonies based on skin, hair, and eye colors
 * @param {number[]} skinRGB - Skin color RGB values
 * @param {number[]} hairRGB - Hair color RGB values
 * @param {number[]} eyeRGB - Eye color RGB values
 * @returns {Object} Optimal color harmonies
 */
export function generateOptimalHarmonies(skinRGB, hairRGB, eyeRGB) {
  try {
    // Validate inputs
    if (!validateRGB(skinRGB) || !validateRGB(hairRGB) || !validateRGB(eyeRGB)) {
      return createDefaultHarmonies();
    }

    // Convert to LAB space for accurate color analysis
    const skinLab = rgbToLab(skinRGB);
    const hairLab = rgbToLab(hairRGB);
    const eyeLab = rgbToLab(eyeRGB);

    // Calculate natural color differences between features
    const featureDeltas = calculateFeatureDeltas(skinLab, hairLab, eyeLab);

    // Calculate optimal harmony parameters
    const harmonyParameters = calculateHarmonyParameters(featureDeltas.naturalDelta);

    // Analyze skin characteristics
    const skinCharacteristics = analyzeSkinCharacteristics(skinLab);

    // Determine primary harmony type based on skin characteristics
    const primaryHarmonyType = determinePrimaryHarmonyType(
      skinCharacteristics.lightness,
      skinCharacteristics.normalizedHueAngle,
      skinCharacteristics.chroma
    );

    // Return organized analysis results
    return {
      metrics: {
        naturalDelta: featureDeltas.naturalDelta,
        primaryHarmonyType,
        skinChroma: skinCharacteristics.chroma,
        skinHueAngle: skinCharacteristics.normalizedHueAngle,
        optimalHueDifference: harmonyParameters.optimalHue,
        optimalChromaDifference: harmonyParameters.optimalChroma,
        optimalLightnessDifference: harmonyParameters.optimalLightness
      }
    };
  } catch (error) {
    console.error("Error in generateOptimalHarmonies:", error);
    return createDefaultHarmonies();
  }
}

/**
 * Calculate differences between feature colors
 * @param {number[]} skinLab - Skin LAB values
 * @param {number[]} hairLab - Hair LAB values
 * @param {number[]} eyeLab - Eye LAB values
 * @returns {Object} Feature color differences
 */
function calculateFeatureDeltas(skinLab, hairLab, eyeLab) {
  const skinHairDelta = calculateCIEDE2000(skinLab, hairLab);
  const skinEyeDelta = calculateCIEDE2000(skinLab, eyeLab);
  const hairEyeDelta = calculateCIEDE2000(hairLab, eyeLab);

  return {
    skinHair: skinHairDelta,
    skinEye: skinEyeDelta,
    hairEye: hairEyeDelta,
    naturalDelta: (skinHairDelta + skinEyeDelta + hairEyeDelta) / 3
  };
}

/**
 * Calculate optimal harmony parameters based on natural contrast
 * @param {number} naturalDelta - Natural contrast delta
 * @returns {Object} Optimal harmony parameters
 */
function calculateHarmonyParameters(naturalDelta) {
  return {
    optimalHue: Math.min(naturalDelta * 1.2, 35),
    optimalChroma: Math.min(naturalDelta * 0.8, 30),
    optimalLightness: Math.min(naturalDelta * 1.5, 25)
  };
}

/**
 * Analyze skin characteristics from LAB values
 * @param {number[]} skinLab - Skin LAB values
 * @returns {Object} Skin characteristics
 */
function analyzeSkinCharacteristics(skinLab) {
  const [lightness, a, b] = skinLab;

  // Calculate chroma and hue angle
  const chroma = Math.sqrt(a * a + b * b);
  const hueAngle = Math.atan2(b, a) * (180 / Math.PI);
  const normalizedHueAngle = hueAngle < 0 ? hueAngle + 360 : hueAngle;

  return {
    lightness,
    chroma,
    hueAngle,
    normalizedHueAngle
  };
}

/**
 * Determine primary harmony type based on skin characteristics
 * @param {number} lightness - Skin lightness value
 * @param {number} hueAngle - Skin hue angle
 * @param {number} chroma - Skin chroma value
 * @returns {string} Primary harmony type
 */
function determinePrimaryHarmonyType(lightness, hueAngle, chroma) {
  if (lightness < 50) {
    return hueAngle > 60 ? "contrast" : "analogous";
  } else if (lightness < 70) {
    return chroma < 15 ? "monochromatic" : "triadic";
  } else {
    return hueAngle < 45 ? "complementary" : "split-complementary";
  }
}

/**
 * Create default harmonies for error cases
 * @returns {Object} Default harmony results
 */
function createDefaultHarmonies() {
  return {
    metrics: {
      naturalDelta: 20,
      primaryHarmonyType: "complementary",
      skinChroma: 15,
      skinHueAngle: 45,
      optimalHueDifference: 24,
      optimalChromaDifference: 16,
      optimalLightnessDifference: 30
    }
  };
}

/**
 * Determine the Monk Scale value for a given LAB color
 * @param {number[]} lab - LAB color values
 * @returns {number} Monk Scale value (1-10)
 */
function determineMonkScaleValue(lab) {
  const closestMatch = findClosestMST(lab);
  return closestMatch.number;
}

/**
 * Calculates contrast ratios between a skin tone and a recommended color.
 * Provides both CIEDE2000 for perceptual difference and WCAG for accessibility.
 * @param {number[]} skinRgb - RGB values for the skin tone [r, g, b].
 * @param {number[]} recommendedColorRgb - RGB values for the recommended color [r, g, b].
 * @returns {object | null} Object with ciede2000 and wcagContrastRatio, or null if inputs are invalid.
 */
export function calculateSkinToRecommendedColorContrast(skinRgb, recommendedColorRgb) {
  try {
    // Validate inputs
    if (!validateRGB(skinRgb) || !validateRGB(recommendedColorRgb)) {
      console.error("Invalid RGB input for contrast calculation.");
      return null;
    }

    // Calculate CIEDE2000 color difference
    const skinLab = rgbToLab(skinRgb);
    const recommendedLab = rgbToLab(recommendedColorRgb);
    const ciede2000 = calculateCIEDE2000(skinLab, recommendedLab);

    // Calculate WCAG contrast ratio
    const lumSkin = getRelativeLuminance(skinRgb);
    const lumRecommended = getRelativeLuminance(recommendedColorRgb);
    const wcagContrastRatio = calculateContrastRatio(lumSkin, lumRecommended);

    return {
      ciede2000: parseFloat(ciede2000.toFixed(2)),
      wcagContrastRatio: parseFloat(wcagContrastRatio.toFixed(2)),
    };
  } catch (error) {
    console.error("Error in calculateSkinToRecommendedColorContrast:", error);
    return null;
  }
}

/**
 * Calculate WCAG contrast ratio between two luminance values
 * @param {number} lum1 - First luminance value
 * @param {number} lum2 - Second luminance value
 * @returns {number} WCAG contrast ratio
 */
function calculateContrastRatio(lum1, lum2) {
  const lighterLum = Math.max(lum1, lum2);
  const darkerLum = Math.min(lum1, lum2);
  return (lighterLum + 0.05) / (darkerLum + 0.05);
}

/**
 * Calculate the relative luminance of an RGB color
 * @param {number[]} rgb - RGB color values [r, g, b]
 * @returns {number} Relative luminance value (0.0 to 1.0)
 */
function getRelativeLuminance(rgb) {
  // Convert RGB values to the 0-1 range
  const sRGB = rgb.map(val => val / 255);

  // Apply the transformation to each component
  const linearComponents = sRGB.map(val => {
    if (val <= 0.03928) {
      return val / 12.92;
    } else {
      return Math.pow((val + 0.055) / 1.055, 2.4);
    }
  });

  // Calculate relative luminance using WCAG formula
  return 0.2126 * linearComponents[0] + 0.7152 * linearComponents[1] + 0.0722 * linearComponents[2];
}

/**
 * Enhance Pantone analysis with additional metrics
 * @param {Object} metrics - Color metrics object
 * @param {Object} monkScale - Pre-calculated Monk Scale result (to avoid duplicate calculation)
 * @returns {Object} Enhanced Pantone analysis
 */
export function enhancePantoneAnalysis(metrics, monkScale = null) { // Accept pre-calculated monkScale
  const { luminance, saturation, redBlueRatio, greenBlueRatio, hsl, rgb } = metrics;
  const [h] = hsl;

  // Enhanced Pantone-like classification using greenBlueRatio
  let family = "";
  let undertone = "";

  // Determine family using hue
  if (h < 30) {
    family = "Red";
  } else if (h < 60) {
    family = "Orange";
  } else if (h < 90) {
    family = "Yellow";
  } else {
    family = "Neutral";
  }

  // Use greenBlueRatio to determine undertone (olive vs. golden vs. rosy)
  if (greenBlueRatio > 1.1) {
    undertone = "Olive";
  } else if (greenBlueRatio < 0.9) {
    undertone = "Rosy";
  } else {
    undertone = redBlueRatio > 1.2 ? "Golden" : "Neutral";
  }

  // Determine tone number (more refined using both metrics)
  const baseNumber = Math.round((luminance / 255) * 75) + 1;

  // Adjust for undertones
  let toneNumber;
  if (undertone === "Olive") {
    toneNumber = baseNumber + 20;
  } else if (undertone === "Rosy") {
    toneNumber = baseNumber + 10;
  } else {
    toneNumber = baseNumber;
  }

  // Create a proper Pantone-like SKU
  const skuPrefix = family.charAt(0) + undertone.charAt(0);
  const skuNumber = toneNumber.toString().padStart(2, '0');
  const sku = `SkinTone ${skuPrefix}${skuNumber}`;

  // Generate specific Pantone-based color recommendations
  const pantoneRecommendations = generateEnhancedPantoneRecommendations(
    family, undertone, toneNumber
  );

  // Use pre-calculated Monk Scale if available, otherwise calculate it
  let monkNumber, monkRecommendations, monkDescription;

  if (monkScale && monkScale.number) {
    // Use the pre-calculated Monk Scale
    monkNumber = monkScale.number;
    monkDescription = monkScale.description || `Monk Scale Type ${monkNumber}`;

    // Get recommendations for this Monk Scale number
    const monkPalettes = {
      1: ["Pastel Pink", "Light Peach", "Sky Blue", "Mint Green", "Ivory", "Pale Yellow"],
      2: ["Soft Coral", "Butter Yellow", "Light Aqua", "Soft Green", "Warm Beige", "Rose Gold"],
      3: ["Peach", "Golden Yellow", "Warm Turquoise", "Olive Green", "Camel", "Copper"],
      4: ["Terracotta", "Mustard", "Teal", "Forest Green", "Warm Brown", "Bronze"],
      5: ["Rust", "Deep Gold", "Deep Teal", "Olive Drab", "Chocolate", "Amber"],
      6: ["Burnt Orange", "Mahogany", "Dark Teal", "Army Green", "Espresso", "Cognac"],
      7: ["Cranberry", "Deep Plum", "Navy", "Hunter Green", "Charcoal", "Oxblood"],
      8: ["Burgundy", "Royal Purple", "Deep Navy", "Emerald", "Dark Brown", "Wine"],
      9: ["Rich Plum", "Midnight Blue", "Black Forest", "Deep Berry", "Ebony", "Cool Red"],
      10: ["Black", "Deep Indigo", "Darkest Green", "Oxblood Red", "Graphite", "True Red"]
    };

    monkRecommendations = [...(monkPalettes[monkNumber] || []), "True Red", "Emerald Green", "Royal Blue", "Classic White"];
  } else {
    // Fallback: Calculate Monk Scale if not provided (backward compatibility)
    const skinLab = rgbToLab(rgb);
    const closestMSTMatch = findClosestMST(skinLab);
    monkNumber = closestMSTMatch.number;
    monkDescription = `Monk Scale Type ${monkNumber}: ${closestMSTMatch.description || 'Skin tone match'}`;

    const monkPalettes = {
      1: ["Pastel Pink", "Light Peach", "Sky Blue", "Mint Green", "Ivory", "Pale Yellow"],
      2: ["Soft Coral", "Butter Yellow", "Light Aqua", "Soft Green", "Warm Beige", "Rose Gold"],
      3: ["Peach", "Golden Yellow", "Warm Turquoise", "Olive Green", "Camel", "Copper"],
      4: ["Terracotta", "Mustard", "Teal", "Forest Green", "Warm Brown", "Bronze"],
      5: ["Rust", "Deep Gold", "Deep Teal", "Olive Drab", "Chocolate", "Amber"],
      6: ["Burnt Orange", "Mahogany", "Dark Teal", "Army Green", "Espresso", "Cognac"],
      7: ["Cranberry", "Deep Plum", "Navy", "Hunter Green", "Charcoal", "Oxblood"],
      8: ["Burgundy", "Royal Purple", "Deep Navy", "Emerald", "Dark Brown", "Wine"],
      9: ["Rich Plum", "Midnight Blue", "Black Forest", "Deep Berry", "Ebony", "Cool Red"],
      10: ["Black", "Deep Indigo", "Darkest Green", "Oxblood Red", "Graphite", "True Red"]
    };

    monkRecommendations = [...(monkPalettes[monkNumber] || []), "True Red", "Emerald Green", "Royal Blue", "Classic White"];
  }

  return {
    family,
    undertone,
    toneNumber,
    sku,
    description: `${family} with ${undertone} undertones (${sku})`,
    recommendations: pantoneRecommendations,
    // Don't include monkScale here - it should be at the top level
  };
}

/**
 * ORCHESTRATOR FUNCTION - Single Source of Truth for All Analysis
 * 
 * This function runs all color analyses once and returns a comprehensive result object.
 * It eliminates duplicate calculations by computing everything in the correct order
 * and passing pre-calculated values to functions that need them.
 * 
 * @param {number[]} skinRGB - RGB color values for skin [r, g, b]
 * @param {number[]} hairRGB - RGB color values for hair [r, g, b]
 * @param {number[]} eyeRGB - RGB color values for eyes [r, g, b]
 * @param {string} imageDataURL - Data URL of the uploaded image
 * @returns {Object} Comprehensive analysis result with all color data
 */
export function runFullAnalysis(skinRGB, hairRGB, eyeRGB, imageDataURL) {
  try {
    // Validate inputs
    if (!validateRGB(skinRGB) || !validateRGB(hairRGB) || !validateRGB(eyeRGB)) {
      throw new Error('Invalid RGB values provided to runFullAnalysis');
    }

    // ========================================
    // STEP 1: Calculate Basic Metrics (Once)
    // ========================================
    const metrics = calculateColorMetrics(skinRGB);
    const skinLab = rgbToLab(skinRGB);
    const skinHex = rgbToHex(skinRGB);

    // ========================================
    // STEP 2: Run All Individual Analyses (Once Each)
    // ========================================

    // Temperature Analysis
    const temperatureAnalysis = analyzeColorTemperature(skinRGB, hairRGB, eyeRGB);

    // Contrast Analysis
    const contrastAnalysis = analyzeColorContrast(skinRGB, hairRGB, eyeRGB);

    // Clarity Analysis
    const clarityAnalysis = analyzeColorClarity(skinRGB, hairRGB, eyeRGB);

    // Advanced Undertone Analysis
    const advancedUndertone = analyzeAdvancedUndertone(skinRGB, hairRGB, eyeRGB);

    // Comprehensive Season Analysis
    const comprehensiveSeason = determineComprehensiveSeason(skinRGB, hairRGB, eyeRGB);

    // Monk Scale Analysis (ONCE - this is the single source of truth)
    const monkScale = findClosestMST(skinLab);

    // Munsell Analysis
    const munsell = analyzeMunsellSystem(metrics);

    // Color Flow Analysis
    const colorFlow = analyzeColorFlow(metrics);

    // Twelve-Zone Analysis
    const twelveZone = analyzeTwelveZone(metrics, { season: comprehensiveSeason.season });

    // Fitzpatrick Analysis
    const fitzpatrick = analyzeFitzpatrick(metrics);

    // Pantone Analysis (now receives pre-calculated monkScale)
    const pantone = enhancePantoneAnalysis(metrics, {
      number: monkScale.number,
      description: monkScale.description
    });

    // Optimal Harmonies
    const harmonies = generateOptimalHarmonies(skinRGB, hairRGB, eyeRGB);

    // ========================================
    // STEP 3: Generate Advanced Recommendations (Once)
    // ========================================

    // Create a skinColorInfo object with all the analysis results
    // This will be passed to generateAdvancedColorAnalysis
    const skinColorInfo = {
      rgb: skinRGB,
      hex: skinHex,
      hairRGB,
      eyeRGB,
      metrics,
      seasonal: {
        season: comprehensiveSeason.season,
        intensity: clarityAnalysis.clarity
      },
      temperatureAnalysis,
      contrastAnalysis,
      clarityAnalysis,
      advancedUndertone,
      comprehensiveSeason,
      monkScale: {
        number: monkScale.number,
        deltaE: monkScale.deltaE,
        description: monkScale.description,
        recommendations: [] // Will be filled by advanced analysis if needed
      },
      pantone,
      munsell,
      colorFlow,
      twelveZone,
      fitzpatrick,
      harmonies
    };

    // Generate comprehensive color recommendations (ONCE)
    const advancedRecommendations = generateAdvancedColorAnalysis(skinColorInfo);

    // ========================================
    // STEP 4: Assemble Final Result Object
    // ========================================

    const analysisResult = {
      // Input data
      inputData: {
        skinRGB,
        hairRGB,
        eyeRGB,
        imageDataURL
      },

      // Core color data
      rgb: skinRGB,
      hex: skinHex,
      hairRGB,
      eyeRGB,

      // Metrics
      metrics,

      // All analyses
      seasonal: {
        season: comprehensiveSeason.season,
        intensity: clarityAnalysis.clarity
      },
      temperatureAnalysis,
      contrastAnalysis,
      clarityAnalysis,
      advancedUndertone,
      comprehensiveSeason,

      // Monk Scale (single source of truth)
      monkScale: {
        number: monkScale.number,
        deltaE: monkScale.deltaE,
        description: monkScale.description,
        recommendations: [] // Can be populated if needed
      },

      // Other systems
      pantone,
      munsell,
      colorFlow,
      twelveZone,
      fitzpatrick,
      harmonies,

      // Advanced recommendations (calculated ONCE)
      advancedRecommendations,

      // Legacy compatibility fields
      skinColorInfo: {
        ...skinColorInfo,
        advancedRecommendations // Also add it here for backward compatibility
      }
    };

    return analysisResult;

  } catch (error) {
    console.error('Error in runFullAnalysis:', error);
    throw error;
  }
}

// Helper function to convert RGB to hex (if not already imported)
function rgbToHex(rgb) {
  return '#' + rgb.map(val => {
    const hex = Math.round(Math.max(0, Math.min(255, val))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

