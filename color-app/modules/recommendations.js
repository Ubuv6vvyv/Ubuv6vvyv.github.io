
import {
  rgbToHsl,
  hslToRgb,
  rgbToLab,
  calculateCIEDE2000,
  rgbToHex,
  labToHexWithName,
  analyzeTemperatureWithLab,
  generateHslColor,
  getColorNameFromHSL,
  hexToRgb
} from './colorUtils.js';

import {
  determineComprehensiveSeason,
  analyzeColorContrast,
  analyzeColorClarity
} from './colorAnalysis.js';

import { getColorRGB, findClosestNamedColor as utilsFindClosest } from './colorDataUtils.js';
import { colorMap } from './colorData.js';

// ==============================================
// CONSTANTS
// ==============================================

const FALLBACK_COLORS = {
  UNIVERSAL: ["Navy", "Medium Gray", "Burgundy"],
  WARM: ["Camel", "Olive", "Rust"],
  COOL: ["Navy", "Plum", "Charcoal"]
};

const COLOR_FAMILIES = {
  R: {
    primary: ["Red", "Ruby", "Crimson", "Burgundy"],
    light: ["Pink", "Coral", "Salmon", "Rose"],
    dark: ["Maroon", "Wine", "Oxblood", "Burgundy"],
    neutral: ["Brick", "Terra Cotta", "Rust", "Cinnamon"]
  },
  YR: {
    primary: ["Orange", "Amber", "Terracotta", "Rust"],
    light: ["Peach", "Apricot", "Cantaloupe", "Coral"],
    dark: ["Bronze", "Copper", "Cinnamon", "Rust"],
    neutral: ["Camel", "Tan", "Caramel", "Ochre"]
  },
  Y: {
    primary: ["Yellow", "Gold", "Mustard", "Ochre"],
    light: ["Buttercream", "Lemon", "Canary", "Blonde"],
    dark: ["Amber", "Honey", "Mustard", "Goldenrod"],
    neutral: ["Wheat", "Buff", "Sand", "Straw"]
  },
  G: {
    primary: ["Green", "Olive", "Sage", "Emerald", "Mint"],
    light: ["Mint", "Pistachio", "Seafoam", "Celadon"],
    dark: ["Forest", "Hunter", "Moss", "Evergreen"],
    neutral: ["Sage", "Olive", "Artichoke", "Avocado"]
  },
  BG: {
    primary: ["Teal", "Turquoise", "Aquamarine", "Jade"],
    light: ["Aqua", "Cyan", "Sky", "Seafoam"],
    dark: ["Deep Teal", "Peacock", "Ocean", "Pine"],
    neutral: ["Juniper", "Sage", "Eucalyptus", "Verdigris"]
  },
  B: {
    primary: ["Blue", "Navy", "Royal Blue", "Sky Blue"],
    light: ["Sky", "Powder", "Baby Blue", "Periwinkle"],
    dark: ["Navy", "Indigo", "Cobalt", "Midnight"],
    neutral: ["Slate", "Steel", "Denim", "Cerulean"]
  },
  PB: {
    primary: ["Indigo", "Slate Blue", "Periwinkle", "Cornflower Blue"],
    light: ["Periwinkle", "Cornflower", "Lavender", "Powder"],
    dark: ["Indigo", "Navy", "Midnight", "Royal"],
    neutral: ["Slate", "Steel", "Denim", "Air Force"]
  },
  P: {
    primary: ["Purple", "Violet", "Plum", "Lavender"],
    light: ["Lavender", "Lilac", "Wisteria", "Orchid"],
    dark: ["Plum", "Eggplant", "Royal Purple", "Violet"],
    neutral: ["Mauve", "Dusty Purple", "Amethyst", "Mulberry"]
  },
  RP: {
    primary: ["Magenta", "Pink", "Fuchsia", "Rose"],
    light: ["Bubblegum", "Cotton Candy", "Baby Pink", "Blush"],
    dark: ["Fuchsia", "Magenta", "Berry", "Raspberry"],
    neutral: ["Mauve", "Dusty Rose", "Orchid", "Plum"]
  }
};

const COMPLEMENTARY_MAP = {
  "R": "BG",
  "YR": "B",
  "Y": "PB",
  "G": "RP",
  "BG": "R",
  "B": "YR",
  "PB": "Y",
  "P": "G",
  "RP": "G"
};

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Helper sigmoid function for fuzzy boundaries
 * @param {number} x - Input value
 * @returns {number} Sigmoid result between 0 and 1
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Get base season from specific seasonal category
 * @param {string} season - Specific seasonal category
 * @returns {string} Base season name
 */
function getBaseSeason(season) {
  if (!season) return "Neutral";

  const seasonStr = String(season).toLowerCase();

  if (seasonStr.includes("spring")) return "Spring";
  if (seasonStr.includes("summer")) return "Summer";
  if (seasonStr.includes("autumn") || seasonStr.includes("fall")) return "Autumn";
  if (seasonStr.includes("winter")) return "Winter";

  return "Neutral";
}

/**
 * Handle graceful fallback for color recommendations
 * @param {string} type - Type of fallback ('WARM', 'COOL', or 'UNIVERSAL')
 * @returns {string[]} Fallback colors
 */
function getFallbackColors(type = 'UNIVERSAL') {
  return FALLBACK_COLORS[type] || FALLBACK_COLORS.UNIVERSAL;
}

/**
 * Get categorized recommendations for the new UI
 * @param {string} season - The user's season
 * @param {Object} skinColorInfo - Full skin color info
 * @returns {Object} Categorized colors { everyday, occasion, neutrals, accents }
 */
/**
 * Get categorized recommendations for the new UI
 * @param {string} season - The user's season
 * @param {Object} skinColorInfo - Full skin color info
 * @returns {Object} Categorized colors { top7, extended, neutrals }
 */
export function getCategorizedRecommendations(season, skinColorInfo) {
  const seasonLower = String(season || '').toLowerCase();
  const baseSeason = getBaseSeason(season);

  // Get all available colors from various sources
  let allColors = [];

  if (skinColorInfo.advancedRecommendations && skinColorInfo.advancedRecommendations.personalColors) {
    allColors = [...skinColorInfo.advancedRecommendations.personalColors];
    if (skinColorInfo.advancedRecommendations.analyticalColors) {
      allColors.push(...skinColorInfo.advancedRecommendations.analyticalColors);
    }
  } else {
    // Fallback if advanced analysis hasn't run
    const basicRecs = generateClothingRecommendations(
      rgbToHsl(skinColorInfo.rgb),
      skinColorInfo.rgb,
      season
    );
    allColors = colorNamesToObjects(basicRecs);
  }

  // Deduplicate by hex
  const uniqueColors = [];
  const seenHexes = new Set();
  allColors.forEach(c => {
    if (c.hex && !seenHexes.has(c.hex)) {
      seenHexes.add(c.hex);
      uniqueColors.push(c);
    }
  });

  // Helper to check if a color name contains certain keywords
  const nameContains = (color, keywords) => {
    const name = color.name.toLowerCase();
    return keywords.some(k => name.includes(k));
  };

  // Helper to get HSL
  const getHSL = (color) => rgbToHsl(color.rgb || hexToRgb(color.hex));

  // --- 1. Categorize all unique colors first ---
  const pool = {
    neutrals: [],
    colors: []
  };

  uniqueColors.forEach(color => {
    const [h, s, l] = getHSL(color);
    const isNeutral = s < 15 || l > 90 || l < 15 || nameContains(color, ['gray', 'grey', 'black', 'white', 'beige', 'taupe', 'navy', 'brown', 'charcoal', 'cream', 'ivory', 'sand', 'khaki', 'stone', 'camel', 'tan', 'wheat', 'bone']);

    if (isNeutral) {
      pool.neutrals.push(color);
    } else {
      pool.colors.push(color);
    }
  });

  // --- 2. Select TOP 7 ESSENTIALS ---
  const top7 = {
    anchors: [],   // 3 Neutrals
    accents: [],   // 2 Metallic/Rich
    statements: [] // 2 Pop/Bold
  };

  // A. Anchors (3 Neutrals)
  // Priority: Navy/Black/Charcoal (Dark), Camel/Beige/Tan (Light/Warm), Gray/Taupe/White (Mid/Cool)
  // We want a mix of depths if possible.

  // Sort neutrals by lightness
  pool.neutrals.sort((a, b) => getHSL(a)[2] - getHSL(b)[2]);

  // Try to pick one dark, one medium, one light
  const darkNeutrals = pool.neutrals.filter(c => getHSL(c)[2] < 40);
  const midNeutrals = pool.neutrals.filter(c => getHSL(c)[2] >= 40 && getHSL(c)[2] < 75);
  const lightNeutrals = pool.neutrals.filter(c => getHSL(c)[2] >= 75);

  const pushUnique = (targetArray, color) => {
    if (color && !targetArray.some(c => c.hex === color.hex)) {
      targetArray.push(color);
      return true;
    }
    return false;
  };

  // Strategy: 1 Dark, 1 Light, 1 Mid/Other
  if (darkNeutrals.length > 0) pushUnique(top7.anchors, darkNeutrals[0]);
  if (lightNeutrals.length > 0) pushUnique(top7.anchors, lightNeutrals[0]);

  // Fill 3rd spot
  if (midNeutrals.length > 0) {
    pushUnique(top7.anchors, midNeutrals[0]);
  } else if (darkNeutrals.length > 1) {
    pushUnique(top7.anchors, darkNeutrals[1]);
  } else if (lightNeutrals.length > 1) {
    pushUnique(top7.anchors, lightNeutrals[1]);
  }

  // Fallback if we still don't have 3
  pool.neutrals.forEach(c => {
    if (top7.anchors.length < 3) pushUnique(top7.anchors, c);
  });

  // B. Accents (2 Colors - Metallic-like or Rich Earthy/Jewel)
  // Look for Gold, Bronze, Copper, Rust, Olive, Teal, Burgundy
  const accentKeywords = ['gold', 'bronze', 'copper', 'rust', 'olive', 'teal', 'burgundy', 'mustard', 'plum', 'forest'];
  const potentialAccents = pool.colors.filter(c => nameContains(c, accentKeywords));

  // Sort by saturation (moderate is better for accents than super neon)
  potentialAccents.sort((a, b) => getHSL(b)[1] - getHSL(a)[1]);

  potentialAccents.forEach(c => {
    if (top7.accents.length < 2) pushUnique(top7.accents, c);
  });

  // If not enough specific accents, pick from general colors with medium saturation
  if (top7.accents.length < 2) {
    const mediumSat = pool.colors.filter(c => {
      const s = getHSL(c)[1];
      return s > 30 && s < 80;
    });
    mediumSat.forEach(c => {
      if (top7.accents.length < 2) pushUnique(top7.accents, c);
    });
  }

  // C. Statements (2 Colors - Bold/Pop)
  // High saturation or specific bold names
  const statementKeywords = ['red', 'bright', 'vivid', 'royal', 'electric', 'hot', 'magenta', 'emerald', 'sapphire', 'ruby', 'amber', 'coral'];
  const potentialStatements = pool.colors.filter(c =>
    !top7.accents.includes(c) && // Don't reuse accents
    (getHSL(c)[1] > 60 || nameContains(c, statementKeywords))
  );

  potentialStatements.sort((a, b) => getHSL(b)[1] - getHSL(a)[1]); // Highest saturation first

  potentialStatements.forEach(c => {
    if (top7.statements.length < 2) pushUnique(top7.statements, c);
  });

  // Fallback for statements
  pool.colors.forEach(c => {
    if (top7.statements.length < 2 && !top7.accents.includes(c)) {
      pushUnique(top7.statements, c);
    }
  });


  // --- 3. EXTENDED PALETTE ---
  const extended = {
    everyday: [],
    occasion: [],
    seasonal: []
  };

  // Filter out colors already used in Top 7
  const usedHexes = new Set([
    ...top7.anchors.map(c => c.hex),
    ...top7.accents.map(c => c.hex),
    ...top7.statements.map(c => c.hex)
  ]);

  const remainingColors = pool.colors.filter(c => !usedHexes.has(c.hex));

  remainingColors.forEach(color => {
    const [h, s, l] = getHSL(color);

    // Occasion: High Saturation or Dark/Dramatic
    if (s > 70 || (l < 30 && s > 40)) {
      extended.occasion.push(color);
    }
    // Everyday: Moderate Saturation, Mid Lightness
    else if (s <= 70 && s > 20) {
      extended.everyday.push(color);
    }
    // Seasonal/Other: Very light or very muted
    else {
      extended.seasonal.push(color);
    }
  });

  // Balance buckets if needed
  if (extended.everyday.length < 3 && extended.seasonal.length > 0) {
    extended.everyday.push(...extended.seasonal.splice(0, 3));
  }

  // --- 4. NEUTRAL REFERENCE ---
  const neutralRef = {
    layering: [], // Light/Soft
    grounding: [], // Dark/Deep
    basics: [] // Mid-tone
  };

  // Use ALL neutrals for this reference section, even if used in Top 7
  pool.neutrals.forEach(color => {
    const [h, s, l] = getHSL(color);

    if (l > 70) {
      neutralRef.layering.push(color);
    } else if (l < 40) {
      neutralRef.grounding.push(color);
    } else {
      neutralRef.basics.push(color);
    }
  });

  // Sort all lists alphabetically for consistency
  const sortFn = (a, b) => a.name.localeCompare(b.name);

  // Top 7 (keep logical order for anchors, but sort others?) 
  // Actually, keep logic order for Top 7 as it's curated.

  extended.everyday.sort(sortFn);
  extended.occasion.sort(sortFn);
  extended.seasonal.sort(sortFn);

  neutralRef.layering.sort(sortFn);
  neutralRef.grounding.sort(sortFn);
  neutralRef.basics.sort(sortFn);

  return {
    top7,
    extended,
    neutrals: neutralRef
  };
}

/**
 * Get colors to avoid based on season
 * @param {string} season - The determined season
 * @returns {Array} Array of color objects to avoid
 */
export function getColorsToAvoid(season) {
  const seasonLower = String(season || '').toLowerCase();

  // Define avoid lists with scientific reasoning based on:
  // - Temperature conflicts (warm vs cool)
  // - Saturation/clarity conflicts (muted vs vivid)
  // - Value/depth conflicts (light vs dark)
  // - Complementary color theory

  if (seasonLower.includes('spring')) {
    // Spring = Warm + Clear + Light/Medium
    // Avoid: Cool, Muted, Heavy colors
    return [
      { name: "Black", reason: "Too dark for you." },
      { name: "Gray", reason: "Too dull." },
      { name: "Charcoal", reason: "Too dark." },
      { name: "Dusty Pink", reason: "Too muted." },
      { name: "Burgundy", reason: "Too deep." },
      { name: "Navy", reason: "Too heavy." },
      { name: "Mauve", reason: "Too muted." },
      { name: "Olive", reason: "Too muted." }
    ];
  }

  if (seasonLower.includes('summer')) {
    // Summer = Cool + Soft/Muted + Light
    // Avoid: Warm, Bright, Heavy colors
    return [
      { name: "Orange", reason: "Clashes with your tone." },
      { name: "Black", reason: "Too harsh." },
      { name: "Mustard", reason: "Too warm." },
      { name: "Bright Gold", reason: "Too warm." },
      { name: "Rust", reason: "Too earthy." },
      { name: "Terracotta", reason: "Too bright." },
      { name: "Burnt Orange", reason: "Too warm." },
      { name: "Warm Brown", reason: "Too warm." }
    ];
  }

  if (seasonLower.includes('autumn')) {
    // Autumn = Warm + Muted/Deep + Rich
    // Avoid: Cool, Bright, Icy colors
    return [
      { name: "Hot Pink", reason: "Too cool." },
      { name: "Icy Blue", reason: "Makes you pale." },
      { name: "Magenta", reason: "Clashes with your tone." },
      { name: "Neon Green", reason: "Too fake." },
      { name: "Bright White", reason: "Too stark." },
      { name: "Lavender", reason: "Too cool." },
      { name: "Baby Blue", reason: "Too light." },
      { name: "Silver", reason: "Clashes with your tone." }
    ];
  }

  if (seasonLower.includes('winter')) {
    // Winter = Cool + Clear/Bright + Deep/Vivid
    // Avoid: Warm, Muted, Earthy colors
    return [
      { name: "Orange", reason: "Clashes with your tone." },
      { name: "Gold", reason: "Too warm." },
      { name: "Rust", reason: "Too earthy." },
      { name: "Beige", reason: "Washes you out." },
      { name: "Camel", reason: "Too warm." },
      { name: "Mustard", reason: "Too muddy." },
      { name: "Warm Brown", reason: "Not clear enough." },
      { name: "Peach", reason: "Too soft." }
    ];
  }

  // Default fallback
  return [
    { name: "Neon Yellow", reason: "Hard to wear." },
    { name: "Beige", reason: "Washes you out." }
  ];
}

/**
 * Get contrast-based styling advice
 * @param {string} contrastLevel - The user's contrast level (Low, Medium, High)
 * @returns {Object} Styling advice object { title, subtitle, rules: [{title, text, visual}] }
 */
export function getContrastAdvice(contrastLevel) {
  const level = String(contrastLevel || '').toLowerCase();

  if (level.includes('high')) {
    return {
      title: "High Contrast",
      subtitle: "Your features have a striking difference between light and dark value.",
      rules: [
        {
          title: "Block Colors",
          text: "Wear a light top with a dark bottom (or vice versa) to mirror your natural intensity.",
          visual: "light-dark"
        },
        {
          title: "Bold Prints",
          text: "Opt for graphic standards like black & white stripes or geometrics.",
          visual: "contrast-print"
        },
        {
          title: "Avoid Blending",
          text: "Monochromatic looks may wash you out unless you add a bold accessory.",
          visual: "pop-color"
        }
      ]
    };
  }

  if (level.includes('low')) {
    return {
      title: "Low Contrast",
      subtitle: "Your features blend harmoniously with similar value levels.",
      rules: [
        {
          title: "Monochromatic",
          text: "Wear different shades of the same color for a sophisticated, continuous line.",
          visual: "monochrome"
        },
        {
          title: "Texture Over Color",
          text: "Use fabrics like silk, wool, or leather to add depth without breaking your line.",
          visual: "texture"
        },
        {
          title: "Gradient Flow",
          text: "Avoid harsh black-against-white combinations that overpower your features.",
          visual: "soft-gradient"
        }
      ]
    };
  }

  // Medium / Default
  return {
    title: "Medium Contrast",
    subtitle: "You have a balanced mix of light and dark features.",
    rules: [
      {
        title: "Tone on Tone",
        text: "Pair colors of similar intensity rather than extreme opposites.",
        visual: "tone-on-tone"
      },
      {
        title: "Bridge Colors",
        text: "Use a medium-value 'bridge' (like denim or grey) to connect light and dark items.",
        visual: "bridge"
      },
      {
        title: "Balanced Prints",
        text: "Choose patterns with medium scale and moderate contrast.",
        visual: "medium-print"
      }
    ]
  };
}

/**
 * Get Style DNA (Patterns & Fabrics) based on Season
 * @param {string} season - The user's season (Spring, Summer, Autumn, Winter)
 * @returns {Object} Style DNA object { patterns: [], fabrics: [] }
 */
export function getStyleDNA(season) {
  const s = String(season || 'Spring').toLowerCase();

  // 1. Patterns
  let patterns = [];
  if (s.includes('spring')) {
    patterns = [
      { name: "Floral (Small Scale)", visual: "pattern-floral-small", description: "Fresh, lively blooms." },
      { name: "Polka Dots", visual: "pattern-polka", description: "Playful and rounded." },
      { name: "Gingham", visual: "pattern-gingham", description: "Crisp and energetic." }
    ];
  } else if (s.includes('summer')) {
    patterns = [
      { name: "Watercolor", visual: "pattern-watercolor", description: "Soft, blended edges." },
      { name: "Floral (Soft)", visual: "pattern-floral-soft", description: "Delicate and flowing." },
      { name: "Paisley", visual: "pattern-paisley", description: "Intricate and curved." }
    ];
  } else if (s.includes('autumn')) {
    patterns = [
      { name: "Plaid / Tartan", visual: "pattern-plaid", description: "Rich and structured." },
      { name: "Botanical", visual: "pattern-botanical", description: "Leafy and organic." },
      { name: "Animal Print", visual: "pattern-animal", description: "Warm and textured." }
    ];
  } else { // Winter
    patterns = [
      { name: "Geometric", visual: "pattern-geometric", description: "Sharp, high contrast lines." },
      { name: "Stripes", visual: "pattern-stripe", description: "Bold and graphic." },
      { name: "Abstract", visual: "pattern-abstract", description: "Modern and defined." }
    ];
  }

  // 2. Fabrics
  let fabrics = [];
  if (s.includes('spring')) {
    fabrics = [
      { name: "Cotton / Linen", visual: "fabric-cotton", description: "Crisp and light." },
      { name: "Silk Jersey", visual: "fabric-silk", description: "Fluid with a subtle sheen." },
      { name: "Light Knit", visual: "fabric-knit-light", description: "Soft and approachable." }
    ];
  } else if (s.includes('summer')) {
    fabrics = [
      { name: "Chiffon / Lace", visual: "fabric-chiffon", description: "Sheer and matte." },
      { name: "Soft Cotton", visual: "fabric-cotton-soft", description: "Worn-in and gentle." },
      { name: "Crepe", visual: "fabric-crepe", description: "Fluid drape, low sheen." }
    ];
  } else if (s.includes('autumn')) {
    fabrics = [
      { name: "Wool / Tweed", visual: "fabric-wool", description: "Textured and substantial." },
      { name: "Suede / Leather", visual: "fabric-suede", description: "Rich and matte." },
      { name: "Corduroy", visual: "fabric-corduroy", description: "Warm and ribbed." }
    ];
  } else { // Winter
    fabrics = [
      { name: "Satin / Silk", visual: "fabric-satin", description: "High shine and smooth." },
      { name: "Velvet", visual: "fabric-velvet", description: "Deep and luxurious." },
      { name: "Structured Wool", visual: "fabric-wool-stiff", description: "Crisp and tailored." }
    ];
  }

  return { patterns, fabrics };
}

/**
 * Convert color name to object with RGB and hex values
 * @param {string} name - Color name
 * @returns {Object|null} Color object or null if invalid
 */
function colorNameToObject(name) {
  const colorInfo = getColorRGB(name);
  if (colorInfo && colorInfo.rgb) {
    return {
      name,
      rgb: colorInfo.rgb,
      hex: rgbToHex(colorInfo.rgb)
    };
  }
  return null;
}

/**
 * Convert array of color names to color objects
 * @param {string[]} colorNames - Array of color names
 * @returns {Object[]} Array of color objects
 */
function colorNamesToObjects(colorNames) {
  if (!Array.isArray(colorNames)) return [];
  return colorNames
    .map(colorNameToObject)
    .filter(color => color !== null);
}

/**
 * Generate clothing color recommendations based on HSL values
 * @param {number[]} hsl - HSL color values [h, s, l]
 * @param {number[]} rgb - RGB color values [r, g, b]
 * @returns {string[]} Array of clothing color recommendations
 */
export function generateClothingRecommendations(hsl, rgb = null, season = null) {
  if (!hsl || hsl.length !== 3) {
    console.error("Invalid HSL values provided to generateClothingRecommendations");
    return [];
  }

  try {
    const [h, s, l] = hsl;
    const recommendations = [];

    let skinDepthConfidence, dominantDepth, secondaryDepth;
    let temperatureInfo, isWarm, isCool, isNeutral, temperatureConfidence;
    let saturationConfidence, isMuted, isVivid;

    // If season is provided, derive characteristics from it (Single Source of Truth)
    if (season) {
      const seasonLower = season.toLowerCase();

      // 1. Temperature
      isWarm = seasonLower.includes('spring') || seasonLower.includes('autumn') || seasonLower.includes('warm');
      isCool = seasonLower.includes('summer') || seasonLower.includes('winter') || seasonLower.includes('cool');
      isNeutral = !isWarm && !isCool; // Should rarely happen with standard seasons

      temperatureConfidence = {
        warm: isWarm ? 0.9 : 0.1,
        cool: isCool ? 0.9 : 0.1,
        neutral: 0.1
      };

      // 2. Saturation (Clarity)
      isVivid = seasonLower.includes('spring') || seasonLower.includes('winter') || seasonLower.includes('bright') || seasonLower.includes('clear');
      isMuted = seasonLower.includes('summer') || seasonLower.includes('autumn') || seasonLower.includes('soft') || seasonLower.includes('muted');

      saturationConfidence = {
        vivid: isVivid ? 0.9 : 0.1,
        muted: isMuted ? 0.9 : 0.1
      };

      // 3. Depth
      const isDeep = seasonLower.includes('autumn') || seasonLower.includes('winter') || seasonLower.includes('deep') || seasonLower.includes('dark');
      const isLight = seasonLower.includes('spring') || seasonLower.includes('summer') || seasonLower.includes('light');

      dominantDepth = isDeep ? 'deep' : (isLight ? 'light' : 'medium');
      secondaryDepth = isDeep ? 'mediumDeep' : (isLight ? 'veryLight' : 'medium');

      skinDepthConfidence = {
        veryLight: isLight ? 0.8 : 0.1,
        light: isLight ? 0.9 : 0.2,
        medium: (!isDeep && !isLight) ? 0.9 : 0.3,
        mediumDeep: isDeep ? 0.7 : 0.2,
        deep: isDeep ? 0.9 : 0.1
      };

      // Adjust for specific subtypes
      if (seasonLower.includes('light')) {
        dominantDepth = 'light';
        secondaryDepth = 'veryLight';
      } else if (seasonLower.includes('deep') || seasonLower.includes('dark')) {
        dominantDepth = 'deep';
        secondaryDepth = 'mediumDeep';
      }

    } else {
      // Fallback: Simplified heuristic if season is missing
      // console.warn('Parameters missing in generateClothingRecommendations, using hue-based fallback');
      const hue = hsl[0];

      // Rough approximation: Warm (reds/oranges/yellows) vs Cool (blues/purples)
      isWarm = (hue >= 0 && hue < 60) || (hue >= 300 && hue <= 360) || (hue >= 60 && hue < 150); // Reds, Yellows, Greens(mixed)
      isCool = !isWarm;

      temperatureConfidence = {
        warm: isWarm ? 0.7 : 0.3,
        cool: isCool ? 0.7 : 0.3,
        neutral: 0.2
      };

      isVivid = s > 50;
      isMuted = !isVivid;

      saturationConfidence = { vivid: isVivid ? 0.7 : 0.3, muted: isMuted ? 0.7 : 0.3 };

      // Default depths
      dominantDepth = l < 40 ? 'deep' : (l > 70 ? 'light' : 'medium');
      secondaryDepth = 'medium';
      skinDepthConfidence = { medium: 1 };
    }

    const colorPalettes = getColorPalettes();

    if (isWarm) {
      addTemperatureBasedColors(recommendations, colorPalettes.warm, temperatureConfidence.warm,
        colorPalettes.neutral, temperatureConfidence.neutral,
        isVivid, isMuted, saturationConfidence);
    }
    else if (isCool) {
      addTemperatureBasedColors(recommendations, colorPalettes.cool, temperatureConfidence.cool,
        colorPalettes.neutral, temperatureConfidence.neutral,
        isVivid, isMuted, saturationConfidence);
    }
    else {
      addNeutralTemperatureColors(recommendations, colorPalettes, temperatureConfidence,
        isVivid, isMuted, saturationConfidence);
    }

    addDepthSpecificColors(recommendations, dominantDepth, secondaryDepth, skinDepthConfidence);
    addTemperatureNeutrals(recommendations, isWarm, isCool, temperatureConfidence, rgb);

    if (recommendations.length < 10) {
      recommendations.push("Navy");
    }

    addSeasonalColors(recommendations, isWarm, isCool, isVivid, isMuted, saturationConfidence, temperatureConfidence, rgb);

    // Deduplicate recommendations based on hex codes
    const seenHexes = new Set();
    const uniqueRecommendations = [];

    for (const colorName of recommendations) {
      const colorObj = colorNameToObject(colorName);
      if (colorObj && colorObj.hex) {
        if (!seenHexes.has(colorObj.hex)) {
          seenHexes.add(colorObj.hex);
          uniqueRecommendations.push(colorName);
        }
      } else {
        // If we can't resolve the hex, keep the name but check for duplicates by name
        if (!uniqueRecommendations.includes(colorName)) {
          uniqueRecommendations.push(colorName);
        }
      }
    }

    return uniqueRecommendations;
  }
  catch (error) {
    console.error("Error in generateClothingRecommendations:", error);

    try {
      const h = hsl[0];
      return (h >= 0 && h < 60 || h >= 300 && h <= 360) ?
        FALLBACK_COLORS.WARM : FALLBACK_COLORS.COOL;
    }
    catch {
      return FALLBACK_COLORS.UNIVERSAL;
    }
  }
}

/**
 * Calculate skin depth confidence scores
 * @param {number} lightness - Lightness value from HSL
 * @returns {Object} Skin depth confidence scores
 */
function calculateSkinDepthConfidence(lightness) {
  return {
    veryLight: sigmoid((lightness - 80) * 0.2),
    light: sigmoid((lightness - 72.5) * 0.2) * sigmoid((87.5 - lightness) * 0.2),
    medium: sigmoid((lightness - 57.5) * 0.2) * sigmoid((72.5 - lightness) * 0.2),
    mediumDeep: sigmoid((lightness - 42.5) * 0.2) * sigmoid((57.5 - lightness) * 0.2),
    deep: sigmoid((35 - lightness) * 0.2)
  };
}

/**
 * Get dominant and secondary depth categories
 * @param {Object} skinDepthConfidence - Skin depth confidence scores
 * @returns {Object} Dominant and secondary depth categories
 */
function getDominantAndSecondaryDepth(skinDepthConfidence) {
  const sortedDepths = Object.entries(skinDepthConfidence).sort((a, b) => b[1] - a[1]);
  return {
    dominantDepth: sortedDepths[0][0],
    secondaryDepth: sortedDepths[1][0]
  };
}

/**
 * Calculate saturation confidence
 * @param {number} saturation - Saturation value from HSL
 * @returns {Object} Saturation confidence scores
 */
function calculateSaturationConfidence(saturation) {
  return {
    muted: sigmoid((40 - saturation) * 0.1),
    vivid: sigmoid((saturation - 40) * 0.1)
  };
}

/**
 * Get temperature info based on color values
 * @param {number} h - Hue value
 * @param {number[]} rgb - RGB values if available
 * @returns {Object} Temperature information
 */
function getTemperatureInfo(h, rgb) {
  let temperatureConfidence = { warm: 0, cool: 0, neutral: 0 };

  if (rgb && rgb.length === 3) {
    const analysis = analyzeTemperatureWithLab(rgb);

    if (analysis.temperature === "Warm") {
      temperatureConfidence.warm = 0.7 + (0.3 * (analysis.temperatureScore / 30));
      temperatureConfidence.cool = 0.1;
    }
    else if (analysis.temperature === "Cool") {
      temperatureConfidence.cool = 0.7 + (0.3 * (Math.abs(analysis.temperatureScore) / 30));
      temperatureConfidence.warm = 0.1;
    }
    else {
      temperatureConfidence.neutral = 0.6;
      if (analysis.temperatureScore > 0) {
        temperatureConfidence.warm = 0.3;
        temperatureConfidence.cool = 0.1;
      } else {
        temperatureConfidence.cool = 0.3;
        temperatureConfidence.warm = 0.1;
      }
    }
  }
  else {
    const hueConfidenceWarm1 = sigmoid((30 - Math.abs(h - 30)) * 0.2);
    const hueConfidenceWarm2 = sigmoid((30 - Math.abs(h - 330)) * 0.2);
    const hueConfidenceCool = sigmoid((30 - Math.abs(h - 180)) * 0.1);

    temperatureConfidence.warm = Math.max(hueConfidenceWarm1, hueConfidenceWarm2);
    temperatureConfidence.cool = hueConfidenceCool;
  }

  temperatureConfidence.neutral = 1 - temperatureConfidence.warm - temperatureConfidence.cool;

  return {
    isWarm: temperatureConfidence.warm > temperatureConfidence.cool && temperatureConfidence.warm > temperatureConfidence.neutral,
    isCool: temperatureConfidence.cool > temperatureConfidence.warm && temperatureConfidence.cool > temperatureConfidence.neutral,
    isNeutral: temperatureConfidence.neutral > temperatureConfidence.warm && temperatureConfidence.neutral > temperatureConfidence.cool,
    temperatureConfidence
  };
}

/**
 * Get color palettes for different temperatures
 * @returns {Object} Color palettes
 */
function getColorPalettes() {
  return {
    warm: {
      core: ["Terracotta", "Coral", "Warm Red", "Golden Yellow", "Peach"],
      vivid: ["Bright Orange", "Warm Gold", "Amber", "Tangerine"],
      muted: ["Warm Brown", "Rust", "Bronze", "Cognac"]
    },
    cool: {
      core: ["Navy Blue", "Berry", "Plum", "Cool Red", "Ice Blue"],
      vivid: ["Royal Blue", "Magenta", "Bright Pink", "Violet"],
      muted: ["Mauve", "Burgundy", "Slate Blue", "Dusty Rose"]
    },
    neutral: {
      core: ["Taupe", "Khaki", "Olive", "Medium Gray", "Navy"],
      vivid: ["Forest Green", "Teal", "Deep Purple", "Burgundy"],
      muted: ["Sage", "Dusty Blue", "Soft Rose", "Pewter"]
    }
  };
}

/**
 * Add colors based on temperature and saturation
 * @param {string[]} recommendations - Recommendations array to add to
 * @param {Object} primaryPalette - Primary color palette based on temperature
 * @param {number} primaryConfidence - Confidence in primary temperature
 * @param {Object} neutralPalette - Neutral palette
 * @param {number} neutralConfidence - Confidence in neutral temperature
 * @param {boolean} isVivid - Whether colors are vivid
 * @param {boolean} isMuted - Whether colors are muted
 * @param {Object} saturationConfidence - Confidence in saturation levels
 */
function addTemperatureBasedColors(
  recommendations,
  primaryPalette,
  primaryConfidence,
  neutralPalette,
  neutralConfidence,
  isVivid,
  isMuted,
  saturationConfidence
) {
  const coreCount = Math.ceil(primaryPalette.core.length * primaryConfidence);
  recommendations.push(...primaryPalette.core.slice(0, coreCount));

  if (neutralConfidence > 0.35) {
    const neutralCount = Math.round(neutralPalette.core.length * (neutralConfidence / 2));
    if (neutralCount > 0) {
      recommendations.push(...neutralPalette.core.slice(0, neutralCount));
    }
  }

  if (isVivid) {
    addSaturationBasedColors(recommendations, primaryPalette, saturationConfidence, true);
  } else {
    addSaturationBasedColors(recommendations, primaryPalette, saturationConfidence, false);
  }
}

/**
 * Add colors based on saturation
 * @param {string[]} recommendations - Recommendations array
 * @param {Object} palette - Color palette
 * @param {Object} saturationConfidence - Confidence in saturation levels
 * @param {boolean} isVivid - Whether colors are vivid
 */
function addSaturationBasedColors(recommendations, palette, saturationConfidence, isVivid) {
  if (isVivid) {
    const vividCount = Math.ceil(palette.vivid.length * saturationConfidence.vivid);
    recommendations.push(...palette.vivid.slice(0, vividCount));

    if (saturationConfidence.muted > 0.35) {
      const mutedCount = Math.round(palette.muted.length * saturationConfidence.muted / 2);
      if (mutedCount > 0) {
        recommendations.push(...palette.muted.slice(0, mutedCount));
      }
    }
  } else {
    const mutedCount = Math.ceil(palette.muted.length * saturationConfidence.muted);
    recommendations.push(...palette.muted.slice(0, mutedCount));

    if (saturationConfidence.vivid > 0.35) {
      const vividCount = Math.round(palette.vivid.length * saturationConfidence.vivid / 2);
      if (vividCount > 0) {
        recommendations.push(...palette.vivid.slice(0, vividCount));
      }
    }
  }
}

/**
 * Add colors for neutral temperature
 * @param {string[]} recommendations - Recommendations array
 * @param {Object} colorPalettes - Color palettes
 * @param {Object} temperatureConfidence - Temperature confidence scores
 * @param {boolean} isVivid - Whether colors are vivid
 * @param {boolean} isMuted - Whether colors are muted
 * @param {Object} saturationConfidence - Saturation confidence scores
 */
function addNeutralTemperatureColors(
  recommendations,
  colorPalettes,
  temperatureConfidence,
  isVivid,
  isMuted,
  saturationConfidence
) {
  const neutralCoreCount = Math.ceil(colorPalettes.neutral.core.length * temperatureConfidence.neutral);
  recommendations.push(...colorPalettes.neutral.core.slice(0, neutralCoreCount));

  if (temperatureConfidence.warm > temperatureConfidence.cool && temperatureConfidence.warm > 0.25) {
    const warmCount = Math.round(colorPalettes.warm.core.length * temperatureConfidence.warm / 2);
    if (warmCount > 0) {
      recommendations.push(...colorPalettes.warm.core.slice(0, warmCount));
    }
  } else if (temperatureConfidence.cool > temperatureConfidence.warm && temperatureConfidence.cool > 0.25) {
    const coolCount = Math.round(colorPalettes.cool.core.length * temperatureConfidence.cool / 2);
    if (coolCount > 0) {
      recommendations.push(...colorPalettes.cool.core.slice(0, coolCount));
    }
  }

  if (isVivid) {
    const vividCount = Math.ceil(colorPalettes.neutral.vivid.length * saturationConfidence.vivid);
    recommendations.push(...colorPalettes.neutral.vivid.slice(0, vividCount));
  } else {
    const mutedCount = Math.ceil(colorPalettes.neutral.muted.length * saturationConfidence.muted);
    recommendations.push(...colorPalettes.neutral.muted.slice(0, mutedCount));
  }
}

/**
 * Add depth-specific colors
 * @param {string[]} recommendations - Recommendations array
 * @param {string} dominantDepth - Dominant depth category
 * @param {string} secondaryDepth - Secondary depth category
 * @param {Object} skinDepthConfidence - Confidence scores for skin depth
 */
function addDepthSpecificColors(recommendations, dominantDepth, secondaryDepth, skinDepthConfidence) {
  const depthColors = {
    veryLight: ["Deep Navy", "Charcoal", "Forest Green", "Deep Purple", "Burgundy"],
    light: ["Medium Blue", "Sage Green", "Soft Purple", "Deep Teal", "Rich Brown", "Lavender", "Seafoam"],
    medium: ["Teal Blue", "Olive Green", "Aubergine", "Warm Brown", "Deep Red"],
    mediumDeep: ["Bright Blue", "Kelly Green", "Bright Purple", "Vibrant Red", "Golden Yellow"],
    deep: ["Ice Blue", "Bright White", "Emerald Green", "Fuchsia", "Bright Yellow"]
  };

  const depthConfidence = skinDepthConfidence[dominantDepth];
  const depthColorCount = Math.ceil(depthColors[dominantDepth].length * depthConfidence);
  recommendations.push(...depthColors[dominantDepth].slice(0, depthColorCount));

  if (skinDepthConfidence[secondaryDepth] > 0.35) {
    const secondaryCount = Math.round(depthColors[secondaryDepth].length *
      (skinDepthConfidence[secondaryDepth] / 2));
    if (secondaryCount > 0) {
      recommendations.push(...depthColors[secondaryDepth].slice(0, secondaryCount));
    }
  }
}

/**
 * Add temperature-based neutrals
 * @param {string[]} recommendations - Recommendations array
 * @param {boolean} isWarm - Whether temperature is warm
 * @param {boolean} isCool - Whether temperature is cool
 * @param {Object} temperatureConfidence - Temperature confidence scores
 * @param {Array} rgb - Skin RGB
 */
function addTemperatureNeutrals(recommendations, isWarm, isCool, temperatureConfidence, rgb) {
  const temperatureNeutrals = {
    warm: ["Warm White", "Ivory", "Camel", "Warm Gray", "Chocolate Brown"],
    cool: ["Pure White", "Light Gray", "Charcoal", "Cool Brown", "Black"],
    neutral: ["Off-White", "Stone", "Greige", "Mushroom", "Pewter"]
  };

  // Filter lists if rgb is available
  if (rgb) {
    temperatureNeutrals.warm = filterNamedColorsBySkin(temperatureNeutrals.warm, { rgb }).map(c => c.name);
    temperatureNeutrals.cool = filterNamedColorsBySkin(temperatureNeutrals.cool, { rgb }).map(c => c.name);
    temperatureNeutrals.neutral = filterNamedColorsBySkin(temperatureNeutrals.neutral, { rgb }).map(c => c.name);
  }

  const dominantTemp = isWarm ? "warm" : (isCool ? "cool" : "neutral");
  const tempConfidence = temperatureConfidence[dominantTemp];
  const neutralCount = Math.ceil(temperatureNeutrals[dominantTemp].length * tempConfidence);
  recommendations.push(...temperatureNeutrals[dominantTemp].slice(0, neutralCount));

  const secondaryTemp = Object.entries(temperatureConfidence)
    .sort((a, b) => b[1] - a[1])[1][0];

  if (temperatureConfidence[secondaryTemp] > 0.45) {
    const secondaryCount = Math.round(temperatureNeutrals[secondaryTemp].length *
      (temperatureConfidence[secondaryTemp] / 2));
    if (secondaryCount > 0) {
      recommendations.push(...temperatureNeutrals[secondaryTemp].slice(0, secondaryCount));
    }
  }
}

/**
 * Add seasonal colors
 * @param {string[]} recommendations - Recommendations array
 * @param {boolean} isWarm - Whether temperature is warm
 * @param {boolean} isCool - Whether temperature is cool
 * @param {boolean} isVivid - Whether colors are vivid
 * @param {boolean} isMuted - Whether colors are muted
 * @param {Object} saturationConfidence - Saturation confidence scores
 * @param {Object} temperatureConfidence - Temperature confidence scores
 * @param {Array} rgb - Skin RGB
 */
function addSeasonalColors(
  recommendations,
  isWarm,
  isCool,
  isVivid,
  isMuted,
  saturationConfidence,
  temperatureConfidence,
  rgb
) {
  const seasonalColors = {
    spring: ["Coral Pink", "Warm Turquoise", "Apple Green", "Golden Brown",
      "Bright Coral", "Peach", "Clear Yellow", "Warm Green"],
    autumn: ["Rust Red", "Olive Green", "Warm Plum", "Bronze",
      "Burnt Orange", "Terracotta", "Mustard", "Camel"],
    summer: ["Soft Pink", "Powder Blue", "Sage Green", "Lavender",
      "Rose", "Periwinkle", "Mauve", "Dusty Blue"],
    winter: ["Ice Blue", "Bright Pink", "Royal Purple", "True Red",
      "Emerald", "Pure White", "Bright Blue", "Magenta"]
  };

  // Filter lists if rgb is available
  if (rgb) {
    seasonalColors.spring = filterNamedColorsBySkin(seasonalColors.spring, { rgb }).map(c => c.name);
    seasonalColors.autumn = filterNamedColorsBySkin(seasonalColors.autumn, { rgb }).map(c => c.name);
    seasonalColors.summer = filterNamedColorsBySkin(seasonalColors.summer, { rgb }).map(c => c.name);
    seasonalColors.winter = filterNamedColorsBySkin(seasonalColors.winter, { rgb }).map(c => c.name);
  }

  if (isWarm && isVivid) {
    const springCount = Math.ceil(seasonalColors.spring.length *
      (temperatureConfidence.warm * saturationConfidence.vivid));
    recommendations.push(...seasonalColors.spring.slice(0, springCount));

    if (saturationConfidence.muted > 0.45) {
      const autumnCount = Math.round(seasonalColors.autumn.length * saturationConfidence.muted / 2);
      if (autumnCount > 0) {
        recommendations.push(...seasonalColors.autumn.slice(0, autumnCount));
      }
    }
  }
  else if (isWarm && isMuted) {
    const autumnCount = Math.ceil(seasonalColors.autumn.length *
      (temperatureConfidence.warm * saturationConfidence.muted));
    recommendations.push(...seasonalColors.autumn.slice(0, autumnCount));

    if (saturationConfidence.vivid > 0.45) {
      const springCount = Math.round(seasonalColors.spring.length * saturationConfidence.vivid / 2);
      if (springCount > 0) {
        recommendations.push(...seasonalColors.spring.slice(0, springCount));
      }
    }
  }
  else if (isCool && isMuted) {
    const summerCount = Math.ceil(seasonalColors.summer.length *
      (temperatureConfidence.cool * saturationConfidence.muted));
    recommendations.push(...seasonalColors.summer.slice(0, summerCount));

    if (saturationConfidence.vivid > 0.45) {
      const winterCount = Math.round(seasonalColors.winter.length * saturationConfidence.vivid / 2);
      if (winterCount > 0) {
        recommendations.push(...seasonalColors.winter.slice(0, winterCount));
      }
    }
  }
  else if (isCool && isVivid) {
    const winterCount = Math.ceil(seasonalColors.winter.length *
      (temperatureConfidence.cool * saturationConfidence.vivid));
    recommendations.push(...seasonalColors.winter.slice(0, winterCount));

    if (saturationConfidence.muted > 0.45) {
      const summerCount = Math.round(seasonalColors.summer.length * saturationConfidence.muted / 2);
      if (summerCount > 0) {
        recommendations.push(...seasonalColors.summer.slice(0, summerCount));
      }
    }
  }
}

/**
 * Generate advanced color analysis that combines all color systems
 * @param {Object} skinColorInfo - Complete skin color analysis
 * @returns {Object} Consolidated color recommendations with sources
 */
/**
 * Convert hex or rgb map to LAB
 * @param {Object|string} color - Color object or hex string
 * @returns {Array|null} LAB values
 */
function toLab(color) {
  if (!color) return null;
  if (Array.isArray(color.rgb)) return rgbToLab(color.rgb);
  if (typeof color.hex === 'string') {
    const rgbInfo = getColorRGB(color.hex) || getColorRGB(color.name);
    return rgbInfo && rgbInfo.rgb ? rgbToLab(rgbInfo.rgb) : null;
  }
  if (typeof color === 'string') {
    const rgbInfo = getColorRGB(color);
    return rgbInfo && rgbInfo.rgb ? rgbToLab(rgbInfo.rgb) : null;
  }
  return null;
}

/**
 * Scores how well a candidate matches user
 * @param {Object} candidate - Candidate color
 * @param {Array} skinLab - User's skin LAB
 * @param {number} skinTempScore - User's temperature score
 * @param {Array} preferredChromaRange - Preferred chroma range [min, max]
 * @param {number} systemWeight - Weight of the source system
 * @returns {Object} Score details
 */
function scoreCandidateColor(candidate, skinLab, skinTempScore, preferredChromaRange = [8, 50], systemWeight = 0.5) {
  // candidate: { name, rgb, hex, sourceSystem }
  const candLab = toLab(candidate);
  if (!candLab) return { score: 0, deltaE: Infinity };

  // deltaE match (lower is better)
  const deltaE = calculateCIEDE2000(skinLab, candLab);
  const matchScore = Math.max(0, 1 - (deltaE / 40)); // 40 ≈ perceptual cutoff

  // tempScore: compare sign of b* and a* direction to skinTempScore (skinTempScore from analyzeColorTemperature)
  // We expect skinTempScore to be >0 for warm, <0 for cool
  const candidateTemp = candLab[2]; // b* (positive = yellow/warm, negative = blue/cool)
  const tempAgreement = skinTempScore === 0 ? 0.5 : ((skinTempScore > 0 && candidateTemp > 0) || (skinTempScore < 0 && candidateTemp < 0)) ? 1 : 0;

  // chroma match
  const candChroma = Math.sqrt(candLab[1] * candLab[1] + candLab[2] * candLab[2]);
  const chromaMin = preferredChromaRange[0], chromaMax = preferredChromaRange[1];
  const chromaMatch = candChroma < chromaMin ? candChroma / chromaMin : (candChroma > chromaMax ? Math.max(0, 1 - (candChroma - chromaMax) / chromaMax) : 1);

  // final weighted score
  const w1 = 0.45, w2 = 0.25, w3 = 0.15, w4 = 0.15;
  const finalScore = (w1 * matchScore) + (w2 * tempAgreement) + (w3 * chromaMatch) + (w4 * systemWeight);

  return { score: finalScore, deltaE, matchScore, tempAgreement, chromaMatch };
}

/**
 * Resolve consensus among different color systems
 * @param {Object} systemsMap - Map of system results
 * @param {Object} skinColorInfo - User's skin color info
 * @returns {Object} Consensus results
 */
function resolveConsensus(systemsMap, skinColorInfo) {
  // systemsMap: { zyla: [...], houseOfColor: [...], pantone: [...], munsell: [...], colorHarmony: [...] }
  const skinLab = skinColorInfo && skinColorInfo.monkScale && skinColorInfo.monkScale.lab
    ? skinColorInfo.monkScale.lab
    : (skinColorInfo.rgb ? rgbToLab(skinColorInfo.rgb) : null);

  if (!skinLab) return { consensus: [], others: [], all: [] };

  // fallback: try temperatureAnalysis weighted score for sign
  const skinTempScore = (skinColorInfo && skinColorInfo.temperatureAnalysis)
    ? skinColorInfo.temperatureAnalysis.weightedTemperature
    : 0;

  // Assign a base system weight
  const systemWeightMap = {
    zyla: 0.9, houseOfColor: 0.9, colorMeBeautiful: 0.85,
    colorHarmony: 0.6, pantone: 0.5, munsell: 0.45, scientific: 0.95
  };

  // flatten unique candidates with provenance
  const candidateMap = new Map();
  for (const [systemName, arr] of Object.entries(systemsMap)) {
    if (!Array.isArray(arr)) continue;
    for (const c of arr) {
      // normalize candidate object: {name, rgb, hex}
      let hex = c.hex;
      if (!hex && c.rgb) hex = rgbToHex(c.rgb);
      if (!hex && typeof c === 'string') {
        const info = getColorRGB(c);
        if (info) hex = rgbToHex(info.rgb);
      }

      const key = (hex || (c.name || c)).toLowerCase();

      const existing = candidateMap.get(key) || { candidate: c, sources: [], systemWeights: [] };
      if (!existing.candidate.hex && hex) existing.candidate = { ...existing.candidate, hex }; // Upgrade candidate with hex if found

      existing.sources.push(systemName);
      existing.systemWeights.push(systemWeightMap[systemName] || 0.5);
      candidateMap.set(key, existing);
    }
  }

  // Score each candidate
  const scored = [];
  for (const { candidate, sources, systemWeights } of candidateMap.values()) {
    const avgSystemWeight = systemWeights.reduce((a, b) => a + b, 0) / systemWeights.length;
    const { score, deltaE } = scoreCandidateColor(candidate, skinLab, skinTempScore, [8, 45], avgSystemWeight);
    scored.push({ candidate, sources, avgSystemWeight, score, deltaE });
  }

  // dedupe similar candidates by deltaE < 4
  scored.sort((a, b) => b.score - a.score);
  const final = [];
  for (const s of scored) {
    const dup = final.find(f => f.deltaE !== undefined && s.deltaE !== undefined && s.deltaE - f.deltaE < 4 && s.deltaE - f.deltaE > -4);
    if (dup) {
      // merge sources and average score
      dup.sources = Array.from(new Set([...dup.sources, ...s.sources]));
      dup.score = Math.max(dup.score, s.score);
    } else {
      final.push(Object.assign({}, s));
    }
  }

  // Extract consensus: at least two distinct systems and score >= 0.45
  const consensus = final.filter(f => f.sources && f.sources.length >= 2 && f.score >= 0.45);
  const others = final.filter(f => !(f.sources && f.sources.length >= 2 && f.score >= 0.45));

  return { consensus, others, all: final };
}

/**
 * Generate advanced color analysis that combines all color systems
 * @param {Object} skinColorInfo - Complete skin color analysis
 * @returns {Object} Consolidated color recommendations with sources
 */
export function generateAdvancedColorAnalysis(skinColorInfo) {
  // Input validation
  if (!skinColorInfo) {
    console.error("No skin color information provided to generateAdvancedColorAnalysis");
    return {
      personalColors: [],
      analyticalColors: [],
      systemsData: {}
    };
  }

  try {
    // Get recommendations from all color systems with validation
    const zylaRecs = skinColorInfo.rgb ? generateZylaRecommendations(skinColorInfo) : [];
    const houseOfColorRecs = skinColorInfo.seasonal ? generateHouseOfColourRecommendations(skinColorInfo) : [];
    const colorMeBeautifulRecs = skinColorInfo.seasonal ? generateColorMeBeautifulRecommendations(skinColorInfo) : [];

    // Get color harmony recommendations with enhanced data structure
    const colorHarmonyData = skinColorInfo.rgb ? generateColorHarmonyTheoryRecommendations(skinColorInfo) : { colors: [] };
    const colorHarmonyRecs = colorHarmonyData.colors || [];

    // Get Monk Scale recommendations (if available) with validation
    const monkResult = skinColorInfo.monkScale || {
      number: 'N/A',
      recommendations: [],
      description: 'Analysis unavailable.'
    };
    const monkRecs = monkResult.recommendations || [];

    // Get season for filtering
    const season = skinColorInfo.seasonal?.season || "Autumn";

    // Get Pantone recommendations (if available)
    const pantoneResult = skinColorInfo.pantone || {
      family: 'N/A',
      undertone: 'N/A',
      sku: 'N/A',
      recommendations: [],
      description: 'Analysis unavailable.'
    };
    let pantoneRecs = pantoneResult.recommendations || [];
    // Apply strict filtering to Pantone
    pantoneRecs = filterColorsBySeason(pantoneRecs, season);

    // Get Munsell color system recommendations (if available)
    const munsellResult = skinColorInfo.munsell || {
      hue: 'N/A',
      value: 'N/A',
      chroma: 'N/A',
      description: 'Analysis unavailable.'
    };

    // Generate recommended colors based on Munsell values
    let munsellRecs = generateMunsellRecommendations(munsellResult);
    // Apply strict filtering to Munsell
    munsellRecs = filterColorsBySeason(munsellRecs, season);

    // Organize systems into two distinct categories
    const personalSystems = {
      zyla: {
        name: "Zyla Archetypes",
        description: "Colors based on your personality and natural coloring",
        colors: zylaRecs,
        type: 'personal'
      },
      houseOfColor: {
        name: "House of Color",
        description: "Seasonal analysis combined with flow characteristics",
        colors: houseOfColorRecs,
        type: 'personal'
      },
      colorMeBeautiful: {
        name: "Color Me Beautiful",
        description: "The classic four-season color system",
        colors: colorMeBeautifulRecs,
        type: 'personal'
      }
    };

    const analyticalSystems = {
      monkScale: {
        name: "Monk Skin Tone Scale",
        description: `MST #${monkResult.number || 'N/A'}`,
        colors: monkRecs,
        type: 'analytical'
      },
      colorHarmony: {
        name: "Color Theory",
        description: "Harmonies based on the color wheel",
        colors: colorHarmonyRecs,
        type: 'analytical'
      },
      pantone: {
        name: "Pantone",
        description: `${pantoneResult.sku || 'N/A'}`,
        colors: pantoneRecs,
        type: 'analytical'
      },
      munsell: {
        name: "Munsell",
        description: `${munsellResult.hue || ''} ${munsellResult.value || ''}/${munsellResult.chroma || ''}`,
        colors: munsellRecs,
        type: 'analytical'
      }
    };

    // Helper to process colors for a group of systems
    const processSystemGroup = (systemsGroup) => {
      let colorMap = new Map();

      Object.entries(systemsGroup).forEach(([systemId, system]) => {
        if (system.colors && Array.isArray(system.colors)) {
          system.colors.forEach(colorItem => {
            let colorName, colorHex, colorRgb, colorContext;

            // Handle both string and object formats
            if (typeof colorItem === 'string') {
              colorName = colorItem;
              colorContext = system.name; // Default context if none provided
              const colorInfo = getColorRGB(colorItem);
              if (colorInfo && colorInfo.rgb) {
                colorRgb = colorInfo.rgb;
                colorHex = rgbToHex(colorInfo.rgb);
              } else {
                return;
              }
            } else if (colorItem && typeof colorItem === 'object') {
              colorName = colorItem.name;
              colorContext = colorItem.context || system.name;

              // Try to resolve color if hex/rgb missing
              if (!colorItem.hex || !colorItem.rgb) {
                const colorInfo = getColorRGB(colorName);
                if (colorInfo && colorInfo.rgb) {
                  colorRgb = colorInfo.rgb;
                  colorHex = rgbToHex(colorInfo.rgb);
                } else {
                  // If object has hex/rgb, use it
                  colorHex = colorItem.hex;
                  colorRgb = colorItem.rgb;
                }
              } else {
                colorHex = colorItem.hex;
                colorRgb = colorItem.rgb;
              }

              if (!colorHex && colorRgb) {
                colorHex = rgbToHex(colorRgb);
              }
              if (!colorName) return;
            } else {
              return;
            }

            if (!colorHex) return; // Skip if no valid color found

            const hexKey = colorHex.toLowerCase();

            if (colorMap.has(hexKey)) {
              const existing = colorMap.get(hexKey);
              // Check if this specific system is already added
              const existingSystem = existing.systems.find(s => s.id === systemId);
              if (!existingSystem) {
                existing.systems.push({ id: systemId, context: colorContext });
              } else if (existingSystem.context !== colorContext) {
                // If same system but different context (unlikely but possible), append context
                existingSystem.context += `, ${colorContext}`;
              }
            } else {
              colorMap.set(hexKey, {
                name: colorName,
                hex: colorHex,
                rgb: colorRgb,
                systems: [{ id: systemId, context: colorContext }]
              });
            }
          });
        }
      });

      const consolidated = Array.from(colorMap.values());
      consolidated.sort((a, b) => {
        if (b.systems.length !== a.systems.length) {
          return b.systems.length - a.systems.length;
        }
        return a.name.localeCompare(b.name);
      });

      return consolidated;
    };

    const personalColors = processSystemGroup(personalSystems);
    const analyticalColors = processSystemGroup(analyticalSystems);

    // Calculate Consensus
    const allSystems = { ...personalSystems, ...analyticalSystems };
    const systemsMap = {};
    Object.entries(allSystems).forEach(([key, sys]) => {
      systemsMap[key] = sys.colors;
    });

    const { consensus, others } = resolveConsensus(systemsMap, skinColorInfo);

    return {
      personalColors,
      analyticalColors,
      colors: [...personalColors, ...analyticalColors],
      consensusMatches: consensus,
      systemMatches: others,
      systemsData: { ...personalSystems, ...analyticalSystems }
    };
  } catch (error) {
    console.error("Error in generateAdvancedColorAnalysis:", error);
    return {
      personalColors: [],
      analyticalColors: [],
      systemsData: {},
      error: true
    };
  }
}

/**
 * Generate an enhanced color palette using LAB color space calculations
 * @param {number[]} skinRGB - RGB color values for skin
 * @param {number[]} hairRGB - RGB color values for hair
 * @param {number[]} eyeRGB - RGB color values for eyes
 * @param {Object} skinMetrics - Additional color metrics and analysis
 * @param {string} season - The determined season (optional, for curated harmonies)
 * @returns {Object} Enhanced color palette with color objects
 */
export function enhancedLabColorPalette(skinRGB, hairRGB, eyeRGB, skinMetrics, season = null) {
  // Input validation
  if (!skinRGB || !Array.isArray(skinRGB) || skinRGB.length !== 3) {
    console.error("Invalid skin RGB data provided to enhancedLabColorPalette");
    return { colors: [] };
  }

  try {
    const skinLab = rgbToLab(skinRGB);
    const hairLab = hairRGB && Array.isArray(hairRGB) && hairRGB.length === 3 ? rgbToLab(hairRGB) : null;
    const eyeLab = eyeRGB && Array.isArray(eyeRGB) && eyeRGB.length === 3 ? rgbToLab(eyeRGB) : null;

    // Start with empty palette
    const palette = {
      colors: []
    };

    // Generate monochromatic variations of skin color
    const mono1Lab = [skinLab[0] + 15, skinLab[1], skinLab[2]];
    const mono2Lab = [skinLab[0] - 15, skinLab[1], skinLab[2]];
    const mono3Lab = [skinLab[0], skinLab[1] * 1.2, skinLab[2] * 1.2];

    palette.colors.push(
      labToHexWithName(mono1Lab, "Monochromatic 1"),
      labToHexWithName(mono2Lab, "Monochromatic 2"),
      labToHexWithName(mono3Lab, "Monochromatic 3")
    );

    // Generate complementary color
    const complementLab = [skinLab[0], -skinLab[1], -skinLab[2]];

    // Use curated fashion color if season is available
    if (season) {
      const curatedComplement = findClosestNamedColor(complementLab, season);
      if (curatedComplement) {
        palette.colors.push({
          name: curatedComplement.name,
          hex: curatedComplement.hex,
          context: "True Complement (Curated)"
        });
      } else {
        palette.colors.push(labToHexWithName(complementLab, "True Complement"));
      }
    } else {
      palette.colors.push(labToHexWithName(complementLab, "True Complement"));
    }

    // Generate analogous colors
    const analogMinus = [skinLab[0], skinLab[1] * 0.8 - 10, skinLab[2] * 0.8 + 10];
    const analogPlus = [skinLab[0], skinLab[1] * 0.8 + 10, skinLab[2] * 0.8 - 10];

    if (season) {
      const curatedAnalogMinus = findClosestNamedColor(analogMinus, season);
      const curatedAnalogPlus = findClosestNamedColor(analogPlus, season);

      if (curatedAnalogMinus) {
        palette.colors.push({
          name: curatedAnalogMinus.name,
          hex: curatedAnalogMinus.hex,
          context: "Analogous Minus (Curated)"
        });
      } else {
        palette.colors.push(labToHexWithName(analogMinus, "Analogous Minus"));
      }

      if (curatedAnalogPlus) {
        palette.colors.push({
          name: curatedAnalogPlus.name,
          hex: curatedAnalogPlus.hex,
          context: "Analogous Plus (Curated)"
        });
      } else {
        palette.colors.push(labToHexWithName(analogPlus, "Analogous Plus"));
      }

    } else {
      palette.colors.push(
        labToHexWithName(analogMinus, "Analogous Minus"),
        labToHexWithName(analogPlus, "Analogous Plus")
      );
    }

    // Add scientific variations
    if (skinMetrics && skinMetrics.temperature) {
      // Use temperature to adjust color variations
      const tempFactor = skinMetrics.temperature === "Warm" ? 1.2 : 0.8;

      // Scientific complement with temperature adjustment
      const scientificComplement = [
        skinLab[0],
        -skinLab[1] * tempFactor,
        -skinLab[2] * tempFactor
      ];

      // Scientific analogous with temperature adjustment
      const scientificAnalog1 = [
        skinLab[0],
        skinLab[1] * tempFactor + 15,
        skinLab[2] * tempFactor - 10
      ];

      const scientificAnalog2 = [
        skinLab[0],
        skinLab[1] * tempFactor - 15,
        skinLab[2] * tempFactor + 10
      ];

      palette.colors.push(
        labToHexWithName(scientificComplement, "Scientific Complement"),
        labToHexWithName(scientificAnalog1, "Scientific Analogous 1"),
        labToHexWithName(scientificAnalog2, "Scientific Analogous 2")
      );

      // Try to find curated versions for scientific variations too if season exists
      if (season) {
        const curatedSciComp = findClosestNamedColor(scientificComplement, season);
        if (curatedSciComp) {
          // Add as an alternative or replace? For now, let's append with a distinct context
          palette.colors.push({
            name: curatedSciComp.name,
            hex: curatedSciComp.hex,
            context: "Scientific Complement (Curated)"
          });
        }
      }
    }

    // Add lightness variations
    const lightVariation = [skinLab[0] + 25, skinLab[1] * 0.8, skinLab[2] * 0.8];
    const deepVariation = [skinLab[0] - 25, skinLab[1] * 1.1, skinLab[2] * 1.1];

    // Add saturation variations
    const saturatedVariation = [skinLab[0], skinLab[1] * 1.5, skinLab[2] * 1.5];
    const mutedVariation = [skinLab[0], skinLab[1] * 0.5, skinLab[2] * 0.5];

    palette.colors.push(
      labToHexWithName(lightVariation, "Scientific Light"),
      labToHexWithName(deepVariation, "Scientific Deep"),
      labToHexWithName(saturatedVariation, "Scientific Saturated"),
      labToHexWithName(mutedVariation, "Scientific Muted")
    );

    // If we have hair and eye color, create a scientifically optimized color
    if (hairLab && eyeLab) {
      // Average the LAB values with weights
      const optimizedLab = [
        skinLab[0] * 0.6 + hairLab[0] * 0.2 + eyeLab[0] * 0.2,
        skinLab[1] * 0.6 + hairLab[1] * 0.2 + eyeLab[1] * 0.2,
        skinLab[2] * 0.6 + hairLab[2] * 0.2 + eyeLab[2] * 0.2
      ];

      // Create complementary color to this optimized color
      const optimizedComplement = [optimizedLab[0], -optimizedLab[1], -optimizedLab[2]];

      palette.colors.push(
        labToHexWithName(optimizedComplement, "Scientifically Optimized")
      );
    }

    return palette;
  } catch (error) {
    console.error("Error in enhancedLabColorPalette:", error);
    return { colors: [] };
  }
}

/**
 * Find the closest named fashion color to a target LAB value, filtered by season
 * @param {number[]} targetLab - Target LAB color [L, a, b]
 * @param {string} season - Season name for filtering
 * @returns {Object|null} Closest named color object {name, hex, rgb} or null
 */
function findClosestNamedColor(targetLab, season) {
  if (!targetLab || !season) return null;

  let bestMatch = null;
  let minDeltaE = Infinity;

  // Convert colorMap to array of objects
  const allColors = Object.entries(colorMap).map(([name, rgb]) => ({
    name,
    rgb,
    hex: rgbToHex(rgb)
  }));

  // Filter by season first
  const seasonColors = filterColorsBySeason(allColors, season);

  // If filtering removed everything (unlikely but possible), fall back to all colors
  const candidates = seasonColors.length > 0 ? seasonColors : allColors;

  for (const color of candidates) {
    const colorLab = rgbToLab(color.rgb);
    const deltaE = calculateCIEDE2000(targetLab, colorLab);

    // We want a close match, but not necessarily exact. 
    // The "closest" valid fashion color is what we want.
    // However, if the closest match is still very far (e.g. > 25), 
    // it might be better to return null and stick to the mathematical one.
    // But the user request implies preference for "Sage" over "Lime" even if "Lime" is mathematically closer to "Green".
    // Actually, "Sage" (muted green) vs "Lime" (bright green).
    // If target is "Green", and user is Soft Summer, "Lime" is filtered out.
    // So "Sage" becomes the closest *valid* candidate.

    if (deltaE < minDeltaE) {
      minDeltaE = deltaE;
      bestMatch = color;
    }
  }

  // Threshold: if the best match is wildly different (e.g. > 35), maybe it's not a good "harmony"
  if (minDeltaE > 35) return null;

  return bestMatch;
}

/**
 * Generate comprehensive color recommendations that integrate all color systems and analyses
 * @param {Object} skinColorInfo - Full skin color analysis data
 * @returns {Object} Comprehensive recommendations including clothing
 */
export function generateComprehensiveRecommendations(skinMetrics, skinColorInfo) {
  try {
    // Input validation
    if (!skinMetrics || !skinMetrics.hsl || !skinColorInfo) {
      console.error("Invalid inputs for generateComprehensiveRecommendations");
      return { clothing: [], scientificClothingRecommendations: [] };
    }

    const { hsl } = skinMetrics;
    const rgb = skinMetrics.rgb || null; // Use provided RGB if available

    // Get tone from twelve-zone analysis
    let seasonTone = null;
    if (skinColorInfo.twelveZone && skinColorInfo.twelveZone.tone) {
      seasonTone = skinColorInfo.twelveZone.tone;
    } else if (skinColorInfo.seasonal && skinColorInfo.seasonal.season) {
      // If no tone is available, use the base season with a "True" prefix
      seasonTone = "True " + skinColorInfo.seasonal.season;
    } else if (skinColorInfo.comprehensiveSeason && skinColorInfo.comprehensiveSeason.season) {
      seasonTone = "True " + skinColorInfo.comprehensiveSeason.season;
    }

    // Generate clothing recommendations based on HSL/RGB values
    const validRGB = rgb && rgb.length === 3 && !rgb.some(isNaN);
    const recommendations = generateClothingRecommendations(hsl, validRGB ? rgb : null);

    return {
      clothing: recommendations,
      seasonTone: seasonTone
    };
  } catch (error) {
    console.error("Error in generateComprehensiveRecommendations:", error);
    return { clothing: [] };
  }
}

/**
 * Generate color recommendations based on the Zyla Color System
 * @param {Object} skinColorInfo - Skin color analysis information
 * @returns {string[]} Array of Zyla color recommendations
 */
export function generateZylaRecommendations(skinColorInfo) {
  // Input validation
  if (!skinColorInfo || !skinColorInfo.rgb) {
    console.error("Invalid skinColorInfo provided to generateZylaRecommendations");
    return [];
  }

  try {
    const skinRGB = skinColorInfo.rgb;
    const hairRGB = skinColorInfo.hairRGB || skinColorInfo.hairRgb;
    const eyeRGB = skinColorInfo.eyeRGB || skinColorInfo.eyeRgb;

    // Get seasonal info if available
    const season = skinColorInfo.seasonal && skinColorInfo.seasonal.season
      ? skinColorInfo.seasonal.season
      : null;

    // Convert to lab for better color analysis
    const skinLab = rgbToLab(skinRGB);

    // Get temperature analysis
    let temperature = "neutral";
    if (skinColorInfo.colorTemperature) {
      temperature = skinColorInfo.colorTemperature.toLowerCase();
    } else {
      // Use LAB values to determine temperature
      const tempAnalysis = analyzeTemperatureWithLab(skinRGB);
      temperature = tempAnalysis.temperature.toLowerCase();
    }

    // Default Zyla archetypes
    const zylaArchetypes = [
      "Vital Spring",
      "Sunset Summer",
      "Dusky Summer",
      "Floral Summer",
      "Misty Summer",
      "Twilight Summer",
      "Sunset Autumn",
      "Dusky Autumn",
      "Antique Winter",
      "High Winter"
    ];

    // Colors for common Zyla archetypes
    const archetypeColors = {
      "Vital Spring": ["Bright Yellow", "Coral", "Turquoise", "Apple Green", "Peach"],
      "Sunset Summer": ["Sky Blue", "Rose Pink", "Lavender", "Warm Pink", "Soft White"],
      "Dusky Summer": ["Blue Gray", "Mauve", "Periwinkle", "Soft Pink", "Light Gray"],
      "Floral Summer": ["Powder Blue", "Rosy Pink", "Sage Green", "Lavender", "Light Peach"],
      "Misty Summer": ["Seafoam", "Heather", "Soft Blue", "Mauve", "Pearl Gray"],
      "Twilight Summer": ["Dusty Blue", "Plum", "Mauve", "Gray Blue", "Soft White"],
      "Sunset Autumn": ["Rust", "Golden Brown", "Olive", "Terracotta", "Warm Beige"],
      "Dusky Autumn": ["Bronze", "Terracotta", "Olive Green", "Golden Brown", "Cream"],
      "Antique Winter": ["Royal Blue", "Deep Purple", "Burgundy", "Emerald", "Black"],
      "High Winter": ["True Red", "Bright White", "Royal Blue", "Emerald", "Black"]
    };

    // Determine the most likely Zyla archetype based on seasonal and temperature info
    let likelyArchetype = "";

    if (season) {
      // Map season to likely archetypes
      if (season.includes("Spring")) {
        likelyArchetype = "Vital Spring";
      } else if (season.includes("Summer")) {
        if (temperature.includes("cool")) {
          likelyArchetype = "Dusky Summer";
        } else {
          likelyArchetype = "Sunset Summer";
        }
      } else if (season.includes("Autumn")) {
        likelyArchetype = "Sunset Autumn";
      } else if (season.includes("Winter")) {
        if (temperature.includes("cool")) {
          likelyArchetype = "High Winter";
        } else {
          likelyArchetype = "Antique Winter";
        }
      }
    } else {
      // If no season info, use temperature and skin Lab values
      const L = skinLab[0];

      // Very rough approximation without full Zyla analysis
      if (temperature.includes("warm")) {
        if (L > 65) {
          likelyArchetype = "Vital Spring";
        } else {
          likelyArchetype = "Sunset Autumn";
        }
      } else {
        if (L > 65) {
          likelyArchetype = "Dusky Summer";
        } else {
          likelyArchetype = "High Winter";
        }
      }
    }

    // Get colors for determined archetype, or fall back to a basic set
    let zylaColors = archetypeColors[likelyArchetype] ||
      ["True Red", "Navy", "Forest Green", "Burgundy", "Charcoal"]; // Default fallback

    // Return the colors with archetype info
    return zylaColors;
  } catch (error) {
    console.error("Error in generateZylaRecommendations:", error);
    return ["Navy", "True Red", "Forest Green"]; // Minimal fallback set
  }
}

/**
 * Filter colors based on seasonal rules to prevent contradictions
 * @param {Array} colors - Array of color objects or strings
 * @param {string} season - The determined season
 * @returns {Array} Filtered colors
 */
function filterColorsBySeason(colors, season) {
  if (!season || !colors) return colors;

  const seasonLower = season.toLowerCase();
  const isAutumn = seasonLower.includes('autumn');
  const isWinter = seasonLower.includes('winter');
  const isSpring = seasonLower.includes('spring');
  const isSummer = seasonLower.includes('summer');

  return colors.filter(color => {
    const colorName = (typeof color === 'string' ? color : color.name).toLowerCase();

    // Strict Autumn Rules: No cool, blue-based, or bright pinks
    if (isAutumn) {
      if (colorName.includes('berry') ||
        colorName.includes('fuchsia') ||
        colorName.includes('magenta') ||
        (colorName.includes('red') && colorName.includes('true')) ||
        (colorName.includes('red') && colorName.includes('blue')) ||
        colorName.includes('royal blue') ||
        colorName.includes('black') ||
        colorName.includes('pure white')) {
        return false;
      }
    }

    // Strict Winter Rules: No warm earth tones, orange, gold
    if (isWinter) {
      if (colorName.includes('orange') ||
        colorName.includes('gold') ||
        colorName.includes('rust') ||
        colorName.includes('olive') ||
        colorName.includes('terracotta') ||
        colorName.includes('mustard') ||
        colorName.includes('brown') ||
        colorName.includes('camel') ||
        colorName.includes('tan') ||
        colorName.includes('beige') ||
        colorName.includes('khaki') ||
        colorName.includes('cream') ||
        colorName.includes('sand') ||
        colorName.includes('stone') ||
        colorName.includes('amber') ||
        colorName.includes('umber') ||
        colorName.includes('sienna') ||
        colorName.includes('ochre') ||
        colorName.includes('moss') ||
        colorName.includes('chartreuse') ||
        colorName.includes('lime') ||
        colorName.includes('coral') ||
        colorName.includes('salmon') ||
        colorName.includes('peach') ||
        colorName.includes('apricot') ||
        colorName.includes('coffee') ||
        colorName.includes('latte') ||
        colorName.includes('cappuccino') ||
        colorName.includes('copper') ||
        colorName.includes('bronze')) {
        return false;
      }
    }

    // Strict Spring Rules: No muted/dusty tones, black
    if (isSpring) {
      if (colorName.includes('dusty') ||
        colorName.includes('muted') ||
        colorName.includes('black') ||
        colorName.includes('burgundy')) {
        return false;
      }
    }

    // Strict Summer Rules: No bright/clear, orange, black
    if (isSummer) {
      if (colorName.includes('bright') ||
        colorName.includes('orange') ||
        colorName.includes('black') ||
        colorName.includes('gold')) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter named colors by skin LAB and temperature
 * @param {Array} namesArray - Array of color names
 * @param {Object} skinColorInfo - Skin color info
 * @param {Object} options - Options
 * @returns {Array} Filtered color objects {name, rgb, hex}
 */
function filterNamedColorsBySkin(namesArray, skinColorInfo, options = {}) {
  const skinLab = skinColorInfo.monkScale && skinColorInfo.monkScale.lab ? skinColorInfo.monkScale.lab : (skinColorInfo.rgb ? rgbToLab(skinColorInfo.rgb) : null);
  const skinTempScore = skinColorInfo.temperatureAnalysis ? skinColorInfo.temperatureAnalysis.weightedTemperature : 0;
  const result = [];

  if (!skinLab) return namesArray.map(name => {
    const info = getColorRGB(name);
    return info ? { name, rgb: info.rgb, hex: rgbToHex(info.rgb) } : null;
  }).filter(Boolean);

  for (const name of namesArray) {
    const info = getColorRGB(name);
    if (!info || !info.rgb) continue;
    const candLab = rgbToLab(info.rgb);
    // temperature agreement: require b* sign match
    const candWinsWarm = candLab[2] > 0;
    const skinWarm = skinTempScore > 3; // tune threshold
    if ((skinWarm && !candWinsWarm) || (!skinWarm && candWinsWarm && skinTempScore < -3)) {
      // skip opposite temp unless systemConfidence strong
      continue;
    }
    // deltaE filter
    const de = calculateCIEDE2000(skinLab, candLab);
    if (de > 45) continue; // discard very distant colors
    result.push({ name, rgb: info.rgb, hex: rgbToHex(info.rgb) });
  }
  return result;
}

/**
 * Generate House of Colour recommendations
 * @param {Object} skinColorInfo - Complete skin color analysis data
 * @param {Object} options - Optional configuration options
 * @returns {Object} Comprehensive color recommendations with metadata
 */
export function generateHouseOfColourRecommendations(skinColorInfo, options = {}) {
  // Input validation
  if (!skinColorInfo) {
    console.error("Invalid skinColorInfo provided to generateHouseOfColourRecommendations");
    return { colors: [], palettes: {}, baseInfo: {} };
  }

  try {
    // Extract skin information
    const skinRGB = skinColorInfo.rgb || null;

    // Get seasonal info if available
    const season = skinColorInfo.seasonal && skinColorInfo.seasonal.season
      ? skinColorInfo.seasonal.season
      : null;

    // Analyze seasonal characteristics
    const seasonalCharacteristics = analyzeSeasonalCharacteristics(skinColorInfo);

    // Base configuration for season generation
    const config = {
      // Color temperature ranges for different seasons 
      // (influences hue selections)
      temperatureRanges: options.temperatureRanges || {
        "Spring": { hueMin: 10, hueMax: 80, warmth: 0.8 },
        "Summer": { hueMin: 270, hueMax: 350, warmth: 0.3 },
        "Autumn": { hueMin: 20, hueMax: 80, warmth: 0.7 },
        "Winter": { hueMin: 270, hueMax: 350, warmth: 0.4 }
      },

      // Luminosity ranges (controls brightness)
      luminosityRanges: options.luminosityRanges || {
        "Spring": { min: 0.6, max: 0.9 },
        "Summer": { min: 0.5, max: 0.8 },
        "Autumn": { min: 0.3, max: 0.6 },
        "Winter": { min: 0.2, max: 0.7 }
      },

      // Saturation ranges (controls color intensity)
      saturationRanges: options.saturationRanges || {
        "Spring": { min: 0.6, max: 1.0 },
        "Summer": { min: 0.3, max: 0.7 },
        "Autumn": { min: 0.5, max: 0.9 },
        "Winter": { min: 0.7, max: 1.0 }
      },

      // Prefix/modifier mappings to make color names more descriptive
      prefixMappings: options.prefixMappings || {
        "Light": { satMod: -0.2, lumMod: 0.2 },
        "Bright": { satMod: 0.3, lumMod: 0.1 },
        "Clear": { satMod: 0.2, lumMod: 0.15 },
        "Soft": { satMod: -0.3, lumMod: 0.0 },
        "Warm": { hueMod: 15, satMod: 0.1, lumMod: 0.0 },
        "Cool": { hueMod: -15, satMod: -0.1, lumMod: 0.0 },
        "Deep": { satMod: 0.1, lumMod: -0.2 },
        "True": { satMod: 0.0, lumMod: 0.0 }
      },

      // Color families that should appear in each season
      seasonalColorFamilies: options.seasonalColorFamilies || {
        "Spring": ["Warm Yellow", "Spiced Coral", "Apple Green", "Turquoise", "Bright Gold"],
        "Summer": ["Soft Pink", "Powder Blue", "Lavender", "Sage Green", "Soft Gray"],
        "Autumn": ["Burnt Orange", "Olive", "Rust", "Terracotta", "Mustard", "Brick Red"],
        "Winter": ["True Red", "Royal Blue", "Royal Purple", "Emerald", "Pure White"]
      },

      // Base color hues mapped to names (for generating descriptive color names)
      baseColorHues: options.baseColorHues || {
        0: "Red",
        30: "Orange",
        60: "Yellow",
        90: "Yellow-Green",
        120: "Green",
        150: "Blue-Green",
        180: "Cyan",
        210: "Turquoise",
        240: "Blue",
        270: "Purple",
        300: "Magenta",
        330: "Pink"
      }
    };

    // Generate colors dynamically based on seasonal characteristics
    const { baseSeason, seasonalQuality } = seasonalCharacteristics;

    // Determine modifiers based on seasonal quality
    const prefix = seasonalQuality || "True";
    const prefixModifiers = config.prefixMappings[prefix] || { satMod: 0, lumMod: 0, hueMod: 0 };

    // Results container
    const results = {
      colors: [], // Final array of color names
      palettes: {}, // Organized by season/quality
      baseInfo: seasonalCharacteristics
    };

    // If we have a valid base season, generate the appropriate color palette
    if (baseSeason) {
      // Get base range parameters for this season
      const tempRange = config.temperatureRanges[baseSeason] || { hueMin: 0, hueMax: 360, warmth: 0.5 };
      const lumRange = config.luminosityRanges[baseSeason] || { min: 0.4, max: 0.8 };
      const satRange = config.saturationRanges[baseSeason] || { min: 0.5, max: 0.9 };

      // Apply modifiers from seasonal quality
      const adjustedRanges = {
        hueMin: tempRange.hueMin + (prefixModifiers.hueMod || 0),
        hueMax: tempRange.hueMax + (prefixModifiers.hueMod || 0),
        satMin: Math.max(0, Math.min(1, satRange.min + (prefixModifiers.satMod || 0))),
        satMax: Math.max(0, Math.min(1, satRange.max + (prefixModifiers.satMod || 0))),
        lumMin: Math.max(0, Math.min(1, lumRange.min + (prefixModifiers.lumMod || 0))),
        lumMax: Math.max(0, Math.min(1, lumRange.max + (prefixModifiers.lumMod || 0))),
        warmth: tempRange.warmth
      };

      // Generate colors for each color family appropriate for this season
      const targetColorFamilies = config.seasonalColorFamilies[baseSeason] || [];
      const generatedColors = [];

      // Generate colors for each target color family
      for (const colorFamily of targetColorFamilies) {
        // Find the base hue for this color family
        const baseHue = getBaseHueForColorFamily(colorFamily, config.baseColorHues);

        // Generate an appropriate color in this family
        const colorData = generateSeasonalColor(
          baseHue,
          adjustedRanges,
          prefix,
          colorFamily,
          baseSeason
        );

        generatedColors.push(colorData);
      }

      // Store in palettes and extract color names with context
      results.palettes[`${prefix} ${baseSeason}`] = generatedColors;
      results.colors = generatedColors.map(color => ({
        name: color.name,
        context: `${prefix} ${baseSeason}`
      }));

      // Apply strict filtering
      results.colors = filterColorsBySeason(results.colors, baseSeason);

      // For backward compatibility return just the colors array
      return results.colors.length > 0 ? results.colors : [{ name: "Navy", context: "Classic" }];
    }

    // Fallback to using pre-defined palettes if we couldn't dynamically generate colors
    if (options.enableFallback !== false) {
      // Only define a minimal reference set as fallback
      const baseSeasonalPalettes = {
        "Spring": ["Spiced Coral", "Bright Yellow", "Apple Green", "Warm Turquoise", "Light Gold"],
        "Summer": ["Rose Pink", "Powder Blue", "Lavender", "Soft Green", "Light Gray"],
        "Autumn": ["Rust", "Olive", "Terracotta", "Bronze", "Camel", "Brick Red"],
        "Winter": ["True Red", "Royal Blue", "Emerald", "Bright White", "Black"]
      };

      // Use exact season if available, otherwise use base season
      let hocColors = [];

      if (season) {
        // Check if we have this exact season 
        if (season in baseSeasonalPalettes) {
          hocColors = baseSeasonalPalettes[season];
        } else {
          // Extract base season from more specific season name
          const baseSeason = getBaseSeason(season);
          if (baseSeason in baseSeasonalPalettes) {
            hocColors = baseSeasonalPalettes[baseSeason];
          }
        }
      }

      // Default fallback if no match found
      if (hocColors.length === 0) {
        hocColors = ["True Red", "Navy", "Forest Green", "Burgundy", "Camel"];
      }

      // Apply strict filtering to fallback
      const filteredColors = filterColorsBySeason(hocColors, season || "Autumn");

      return filteredColors.map(colorName => ({
        name: colorName,
        context: season || "House of Color"
      }));
    }

    // Ultimate fallback
    return [{ name: "Navy", context: "Classic" }, { name: "True Red", context: "Classic" }];
  } catch (error) {
    console.error("Error in generateHouseOfColourRecommendations:", error);
    return [{ name: "Navy", context: "Classic" }]; // Minimal fallback set
  }
}

/**
 * Analyze seasonal characteristics from skin color information
 * @param {Object} skinColorInfo - Skin color analysis data
 * @returns {Object} Seasonal characteristics
 */
/**
 * Analyze seasonal characteristics from skin color information
 * @param {Object} skinColorInfo - Skin color analysis data
 * @returns {Object} Seasonal characteristics
 */
function analyzeSeasonalCharacteristics(skinColorInfo) {
  // Default characteristics
  const results = {
    baseSeason: null,
    seasonalQuality: null,
    temperature: "Neutral",
    contrast: "Medium",
    clarity: "Clear",
    depth: "Medium"
  };

  // If no skin info, return defaults
  if (!skinColorInfo) return results;

  // Extract season if directly available
  if (skinColorInfo.seasonal) {
    // Prefer the explicit subtype from the new analysis logic
    if (skinColorInfo.seasonal.subtype) {
      const parts = skinColorInfo.seasonal.subtype.split(' ');
      if (parts.length > 1) {
        results.seasonalQuality = parts[0]; // e.g., "Soft", "Light", "Deep", "Bright", "True"
        results.baseSeason = parts[1];
      } else {
        results.baseSeason = skinColorInfo.seasonal.subtype;
        results.seasonalQuality = "True";
      }
    } else if (skinColorInfo.seasonal.season) {
      // Fallback to old behavior
      const fullSeason = skinColorInfo.seasonal.season;
      const seasonParts = fullSeason.split(' ');
      if (seasonParts.length > 1) {
        results.seasonalQuality = seasonParts[0];
        results.baseSeason = seasonParts[1];
      } else {
        results.baseSeason = fullSeason;
        results.seasonalQuality = "True";
      }
    }

    // Map other attributes if available
    if (skinColorInfo.seasonal.temperature) results.temperature = skinColorInfo.seasonal.temperature;
    if (skinColorInfo.seasonal.contrast) results.contrast = skinColorInfo.seasonal.contrast;
    if (skinColorInfo.seasonal.clarity) results.clarity = skinColorInfo.seasonal.clarity;
  }

  // Removed "lite" analysis fallback to ensure consistency with main analyzer.
  // If seasonal data is missing, we should not guess.

  return results;
}

/**
 * Find the best matching base hue for a color family name
 * @param {string} colorFamily - Color family name (e.g., "Blue")
 * @param {Object} baseHues - Mapping of degrees to color names
 * @returns {number} Base hue in degrees
 */
function getBaseHueForColorFamily(colorFamily, baseHues) {
  const colorLower = colorFamily.toLowerCase();

  // Create a reverse mapping from names to hues
  const nameToHue = {};
  Object.entries(baseHues).forEach(([hue, name]) => {
    nameToHue[name.toLowerCase()] = parseInt(hue);
  });

  // Check for exact match first
  if (nameToHue[colorLower] !== undefined) {
    return nameToHue[colorLower];
  }

  // Check for partial matches
  for (const [name, hue] of Object.entries(nameToHue)) {
    if (colorLower.includes(name) || name.includes(colorLower)) {
      return hue;
    }
  }

  // Handle specific compound colors
  if (colorLower.includes('yellow') && colorLower.includes('green')) return 90;
  if (colorLower.includes('blue') && colorLower.includes('green')) return 150;
  if (colorLower.includes('blue') && colorLower.includes('purple')) return 270;

  // Default hues for common colors not directly in the mapping
  const defaultHues = {
    'coral': 15,
    'salmon': 15,
    'brown': 30,
    'rust': 25,
    'terracotta': 20,
    'olive': 80,
    'teal': 180,
    'navy': 240,
    'lavender': 270,
    'mauve': 300,
    'burgundy': 345,
    'rose': 330,
    'gold': 45,
    'silver': 0, // Neutral with a slight cool tone
    'white': 0,   // Neutral
    'black': 0,   // Neutral
    'gray': 0,    // Neutral
    'grey': 0     // Neutral
  };

  for (const [name, hue] of Object.entries(defaultHues)) {
    if (colorLower.includes(name)) {
      return hue;
    }
  }

  // Default to red if no match found
  return 0;
}

/**
 * Generate a seasonal color based on parameters
 * @param {number} baseHue - The base hue value (0-360)
 * @param {Object} ranges - Range parameters for saturation and luminosity
 * @param {string} prefix - Seasonal quality prefix (e.g., "Light", "Bright")
 * @param {string} colorFamily - Color family name
 * @param {string} season - The season name (optional, for snapping to named colors)
 * @returns {Object} Generated color object
 */
function generateSeasonalColor(baseHue, ranges, prefix, colorFamily, season = null) {
  // Apply small random variation to hue within seasonal range
  // This helps create variation in the generated colors
  const hueRange = 15; // Degrees of variance
  const hueVariation = (Math.random() * hueRange * 2) - hueRange;

  // Ensure hue stays within expected ranges
  let hue = (baseHue + hueVariation) % 360;
  if (hue < 0) hue += 360;

  // Generate saturation and luminosity within seasonal ranges
  const saturation = ranges.satMin + Math.random() * (ranges.satMax - ranges.satMin);
  const luminosity = ranges.lumMin + Math.random() * (ranges.lumMax - ranges.lumMin);

  // Convert HSL to RGB
  const rgb = hslToRgb([hue, saturation * 100, luminosity * 100]);
  const hex = rgbToHex(rgb);
  const lab = rgbToLab(rgb);

  // Try to snap to a named color if season is provided
  let colorName = `${prefix} ${colorFamily}`;
  let finalRgb = rgb;
  let finalHex = hex;
  let finalHsl = [hue, saturation * 100, luminosity * 100];

  if (season) {
    const closestNamed = findClosestNamedColor(lab, season);
    if (closestNamed) {
      colorName = closestNamed.name;
      finalRgb = closestNamed.rgb;
      finalHex = closestNamed.hex;
      finalHsl = rgbToHsl(finalRgb);
    }
  }

  return {
    name: colorName,
    hsl: finalHsl,
    rgb: finalRgb,
    hex: finalHex,
    colorFamily: colorFamily,
    seasonalQuality: prefix
  };
}

/**
 * Generate Color Me Beautiful recommendations
 * @param {Object} skinColorInfo - Complete skin color analysis data
 * @param {Object} options - Optional configuration options
 * @returns {Array} Array of color recommendations
 */
export function generateColorMeBeautifulRecommendations(skinColorInfo, options = {}) {
  // Input validation
  if (!skinColorInfo) {
    console.error("Invalid skinColorInfo provided to generateColorMeBeautifulRecommendations");
    return [];
  }

  try {
    // Get seasonal characteristics - reuse analysis from House of Colour function
    const seasonalCharacteristics = analyzeSeasonalCharacteristics(skinColorInfo);
    const { baseSeason, seasonalQuality } = seasonalCharacteristics;

    // Configuration for CMB color generation - slightly different than House of Color
    const config = {
      // CMB uses a more traditional 4-season approach with less dramatic sub-seasons
      // These are the core color families associated with each season
      seasonalColorFamilies: options.seasonalColorFamilies || {
        "Spring": ["Peach", "Warm Yellow", "Apple Green", "Spiced Coral", "Warm Turquoise"],
        "Summer": ["Soft Pink", "Powder Blue", "Lavender", "Sage Green", "Mauve"],
        "Autumn": ["Rust", "Olive", "Bronze", "Terracotta", "Camel", "Warm Maroon"],
        "Winter": ["True Red", "Royal Blue", "Pure White", "Emerald", "Black"]
      },

      // Quality modifiers specifically for CMB system
      qualityModifiers: options.qualityModifiers || {
        // Minimal modifications - CMB doesn't emphasize qualities as much as HoC
        "Light": { satMod: -0.15, lumMod: 0.15 },
        "True": { satMod: 0.0, lumMod: 0.0 },
        "Soft": { satMod: -0.2, lumMod: -0.05 },
        "Deep": { satMod: 0.05, lumMod: -0.15 },
        "Warm": { satMod: 0.1, lumMod: 0.0 },
        "Cool": { satMod: -0.1, lumMod: 0.0 },
        "Clear": { satMod: 0.15, lumMod: 0.1 },
        "Bright": { satMod: 0.2, lumMod: 0.05 }
      }
    };

    // If we have a determined season, generate appropriate colors
    if (baseSeason) {
      // Get color families for this season
      const colorFamilies = config.seasonalColorFamilies[baseSeason] || [];

      // Generate Colors - use a simpler approach for CMB (less variation)
      const cmbColors = colorFamilies.map(colorFamily => {
        // Add seasonal quality if provided
        if (seasonalQuality && seasonalQuality !== "True") {
          return `${seasonalQuality} ${colorFamily}`;
        }
        return colorFamily;
      });

      // Apply strict filtering
      const filteredColors = filterColorsBySeason(cmbColors, baseSeason);

      return filteredColors.map(colorName => ({
        name: colorName,
        context: seasonalQuality && seasonalQuality !== "True" ? `${seasonalQuality} ${baseSeason}` : baseSeason
      }));
    }

    // Fallback to using pre-defined palettes if we don't have a season
    // Extract season if directly available
    const season = skinColorInfo.seasonal?.season;

    // Default Color Me Beautiful palettes (minimal set for fallback)
    const cmbPalettes = {
      "Spring": ["Spiced Coral", "Warm Peach", "Golden Yellow", "Apple Green", "Warm Turquoise"],
      "Summer": ["Soft Pink", "Powder Blue", "Lavender", "Soft Green", "Mauve"],
      "Autumn": ["Rust", "Terracotta", "Olive", "Bronze", "Camel", "Brick Red"],
      "Winter": ["True Red", "Royal Blue", "Pure White", "Emerald", "Black"]
    };

    // Get colors for determined season, or fall back to a basic set
    let cmbColors = [];

    if (season) {
      // Check if this is a base season
      if (season in cmbPalettes) {
        cmbColors = cmbPalettes[season];
      } else {
        // Extract base season from more complex season name
        const baseSeason = getBaseSeason(season);
        if (baseSeason in cmbPalettes) {
          cmbColors = cmbPalettes[baseSeason];
        }
      }
    }

    // Default fallback if no match found
    if (cmbColors.length === 0) {
      cmbColors = ["Navy", "Burgundy", "Gray", "Forest Green", "Taupe"];
    }

    // Apply strict filtering to fallback
    const filteredColors = filterColorsBySeason(cmbColors, season || "Autumn");

    return filteredColors.map(colorName => ({
      name: colorName,
      context: season || "Color Me Beautiful"
    }));
  } catch (error) {
    console.error("Error in generateColorMeBeautifulRecommendations:", error);
    return [{ name: "Navy", context: "Classic" }]; // Minimal fallback set
  }
}

/**
 * Generate recommendations based on Color Harmony Theory
 * @param {Object} skinColorInfo - Complete skin color analysis data
 * @param {Object} options - Optional configuration for harmony generation
 * @returns {Object} Comprehensive color harmony recommendations
 */
export function generateColorHarmonyTheoryRecommendations(skinColorInfo, options = {}) {
  // Input validation with early return
  if (!skinColorInfo || !skinColorInfo.rgb) {
    console.error("Invalid skinColorInfo provided to generateColorHarmonyTheoryRecommendations");
    return { colors: [], harmonies: {} };
  }

  try {
    const skinRGB = skinColorInfo.rgb;

    // Convert to HSL for easier harmony calculations
    const skinHSL = rgbToHsl(skinRGB);
    const [h, s, l] = skinHSL;

    // Determine season for context-aware harmony
    const season = skinColorInfo.seasonal?.season || "Autumn"; // Default to Autumn if unknown
    const isAutumn = season.toLowerCase().includes('autumn');
    const isWinter = season.toLowerCase().includes('winter');
    const isSpring = season.toLowerCase().includes('spring');
    const isSummer = season.toLowerCase().includes('summer');

    // Get harmony patterns (default + custom ones from options)
    const harmonyPatterns = getHarmonyPatterns(options);

    // Create a color generator function that respects season
    const getColorData = (hue) => {
      // Adjust saturation/lightness based on season
      let sat = 100;
      let lum = 50;

      if (isAutumn) { sat = 70; lum = 40; } // Muted, earthy
      if (isSummer) { sat = 50; lum = 60; } // Soft, cool
      if (isSpring) { sat = 90; lum = 60; } // Bright, warm
      if (isWinter) { sat = 100; lum = 50; } // Clear, deep

      const rgb = hslToRgb([hue, sat, lum]);
      const hex = rgbToHex(rgb);

      // Find closest named color
      let name = "Custom Color";
      // Simple mapping for demo purposes - ideally use findClosestNamedColor
      if (hue < 15 || hue > 345) name = isAutumn ? "Brick Red" : "True Red";
      else if (hue < 45) name = isAutumn ? "Rust" : "Orange";
      else if (hue < 70) name = isAutumn ? "Mustard" : "Yellow";
      else if (hue < 150) name = isAutumn ? "Olive" : "Green";
      else if (hue < 200) name = isAutumn ? "Teal" : "Cyan";
      else if (hue < 260) name = isAutumn ? "Navy" : "Royal Blue";
      else if (hue < 300) name = isAutumn ? "Plum" : "Purple";
      else name = isAutumn ? "Maroon" : "Magenta";

      return { name, hex, rgb, context: "Color Harmony" };
    };

    // Generate all harmonies
    const { harmonies, allColors } = generateHarmonies(harmonyPatterns, h, s, l, getColorData);

    // Filter harmonies strictly
    const filteredColors = filterColorsBySeason(allColors, season);

    // Extract color names for backwards compatibility
    const colorNames = filteredColors.map(color => color.name);

    // Return a comprehensive result object
    return {
      colors: colorNames,
      colorData: filteredColors,
      harmonies: harmonies,
      baseColor: {
        name: getColorData(h).name,
        hsl: [h, s, l],
        rgb: skinRGB,
        hex: rgbToHex(skinRGB)
      }
    };
  } catch (error) {
    console.error("Error in generateColorHarmonyTheoryRecommendations:", error);
    return {
      colors: ["Blue", "Orange", "Green"],
      colorData: [],
      harmonies: {},
      error: true
    };
  }
}

/**
 * Get harmony patterns configuration
 * @param {Object} options - User options for harmony patterns
 * @returns {Object} Configured harmony patterns
 */
function getHarmonyPatterns(options) {
  // Define default harmony patterns
  const defaultPatterns = {
    complementary: {
      offsets: [0, 180],
      description: "Colors opposite each other on the color wheel",
      importance: 1.0
    },
    analogous: {
      offsets: [0, 30, 330],
      description: "Colors adjacent to each other on the color wheel",
      importance: 0.9
    },
    splitComplementary: {
      offsets: [0, 150, 210],
      description: "A color and two colors adjacent to its complement",
      importance: 0.8
    },
    triadic: {
      offsets: [0, 120, 240],
      description: "Three colors equally spaced around the color wheel",
      importance: 0.8
    },
    tetradic: {
      offsets: [0, 90, 180, 270],
      description: "Four colors equally spaced around the color wheel",
      importance: 0.7
    },
    square: {
      offsets: [0, 90, 180, 270],
      description: "Four colors forming a square on the color wheel",
      importance: 0.6
    }
  };

  // Merge with any additional patterns from options
  const patterns = { ...defaultPatterns, ...(options.additionalPatterns || {}) };

  // Remove excluded patterns if specified
  const excludedPatterns = options.excludePatterns || [];
  excludedPatterns.forEach(pattern => {
    if (patterns[pattern]) {
      delete patterns[pattern];
    }
  });

  return patterns;
}

/**
 * Create a function that generates color data objects
 * @param {number} baseHue - Base hue value
 * @param {number} baseSat - Base saturation value
 * @param {number} baseLight - Base lightness value
 * @returns {Function} Color data generator function
 */
function createColorDataFunction(baseHue, baseSat, baseLight) {
  return (hue, sat = baseSat, light = baseLight) => {
    // Normalize hue to 0-359
    hue = ((hue % 360) + 360) % 360;

    // Generate RGB value for this color
    const rgb = hslToRgb([hue, sat, light]);
    const hex = rgbToHex(rgb);

    // Define hue point mapping
    const huePoints = [
      { pos: 0, name: "Red" },
      { pos: 30, name: "Orange Red" },
      { pos: 60, name: "Orange" },
      { pos: 90, name: "Yellow Orange" },
      { pos: 120, name: "Yellow" },
      { pos: 150, name: "Yellow Green" },
      { pos: 180, name: "Green" },
      { pos: 210, name: "Blue Green" },
      { pos: 240, name: "Blue" },
      { pos: 270, name: "Blue Violet" },
      { pos: 300, name: "Purple" },
      { pos: 330, name: "Red Violet" },
      { pos: 360, name: "Red" }
    ];

    // Find the two closest hue points
    const lowerPoint = huePoints.find((p, i) =>
      hue >= p.pos && (!huePoints[i + 1] || hue < huePoints[i + 1].pos)
    ) || huePoints[0];

    // Determine saturation and lightness descriptors
    let satPrefix = "";
    let lightPrefix = "";

    if (sat < 30) satPrefix = "Muted ";
    else if (sat > 75) satPrefix = "Vibrant ";

    if (light < 30) lightPrefix = "Dark ";
    else if (light > 75) lightPrefix = "Light ";

    // Combine descriptors with base color name
    const fullName = `${lightPrefix}${satPrefix}${lowerPoint.name}`;

    // Return comprehensive color object
    return {
      name: fullName,
      hex: hex,
      rgb: rgb,
      hsl: [hue, sat, light],
      baseHue: lowerPoint.name,
      huePosition: hue
    };
  };
}

/**
 * Generate harmonies from patterns
 * @param {Object} harmonyPatterns - Harmony pattern definitions
 * @param {number} h - Hue value
 * @param {number} s - Saturation value
 * @param {number} l - Lightness value
 * @param {Function} getColorData - Color data generator function
 * @returns {Object} Generated harmonies and all colors
 */
function generateHarmonies(harmonyPatterns, h, s, l, getColorData) {
  const harmonies = {};
  const allColors = [];

  // Process each harmony pattern
  Object.entries(harmonyPatterns).forEach(([patternName, pattern]) => {
    const colorSet = [];

    // Generate each color in the pattern
    pattern.offsets.forEach(offset => {
      const hueValue = (h + offset) % 360;
      const colorData = getColorData(hueValue, s, l);

      colorSet.push(colorData);

      // Add to all colors array if not a duplicate
      if (!allColors.some(c => c.hex === colorData.hex)) {
        allColors.push(colorData);
      }
    });

    // Store the harmony set with metadata
    harmonies[patternName] = {
      colors: colorSet,
      description: pattern.description,
      importance: pattern.importance
    };
  });

  // Sort all colors by hue position
  allColors.sort((a, b) => a.huePosition - b.huePosition);

  return { harmonies, allColors };
}

/**
 * Generate Munsell color recommendations based on Munsell notation
 * @param {Object} munsellInfo - Munsell color information
 * @returns {string[]} Array of color recommendations
 */
export function generateMunsellRecommendations(munsellInfo) {
  // Early return for invalid input
  if (!munsellInfo || munsellInfo.hue === 'N/A') {
    return [];
  }

  const { hue, value, chroma, hueName } = munsellInfo;

  // Get hue category
  const hueCategory = hueName || getHueCategoryFromDegrees(hue);

  // Get color family or default to R if not found
  const colorFamily = COLOR_FAMILIES[hueCategory] || COLOR_FAMILIES.R;

  let recommendations = [];

  // Add primary colors
  recommendations.push(...colorFamily.primary);

  // Add value-based colors (light, medium, dark)
  addValueBasedColors(recommendations, colorFamily, value);

  // Add neutral colors based on value
  addNeutralsByValue(recommendations, value);

  // Add complementary colors if chroma is high enough
  if (chroma >= 6) {
    addComplementaryColors(recommendations, hueCategory, value);
  }

  // Add Munsell-specific notation information
  recommendations.push(`Munsell ${munsellInfo.munsellNotation || `${hueCategory} ${value}/${chroma}`}`);

  // Filter out duplicates and return
  return [...new Set(recommendations)];
}

/**
 * Get Munsell hue category from degrees
 * @param {number} hueDegree - Hue in degrees
 * @returns {string} Munsell hue category
 */
function getHueCategoryFromDegrees(hueDegree) {
  const hueCategories = [
    { min: 345, max: 360, category: "R" },
    { min: 0, max: 30, category: "R" },
    { min: 30, max: 60, category: "YR" },
    { min: 60, max: 90, category: "Y" },
    { min: 90, max: 150, category: "G" },
    { min: 150, max: 210, category: "BG" },
    { min: 210, max: 270, category: "B" },
    { min: 270, max: 315, category: "P" },
    { min: 315, max: 345, category: "RP" }
  ];

  return hueCategories.find(category =>
    hueDegree >= category.min && hueDegree < category.max
  )?.category || "R"; // Default to R if not found
}

/**
 * Add colors based on value (lightness)
 * @param {string[]} recommendations - Recommendations array
 * @param {Object} colorFamily - Color family object
 * @param {number} value - Munsell value
 */
function addValueBasedColors(recommendations, colorFamily, value) {
  if (value >= 7) {
    // For higher values (lighter colors)
    recommendations.push(...colorFamily.light);
  } else if (value >= 4) {
    // For medium values, add a mix
    const mediumColors = [
      ...colorFamily.primary.slice(0, 2),
      ...colorFamily.neutral.slice(0, 2)
    ];
    recommendations.push(...mediumColors);
  } else {
    // For lower values (darker colors)
    recommendations.push(...colorFamily.dark);
  }
}

/**
 * Add neutral colors based on value
 * @param {string[]} recommendations - Recommendations array
 * @param {number} value - Munsell value
 */
function addNeutralsByValue(recommendations, value) {
  if (value >= 7) {
    // Light neutrals
    recommendations.push("Light Gray", "Ivory", "Cream", "White");
  } else if (value >= 4) {
    // Medium neutrals
    recommendations.push("Medium Gray", "Taupe", "Khaki", "Camel");
  } else {
    // Dark neutrals
    recommendations.push("Charcoal", "Deep Brown", "Black", "Navy");
  }
}

/**
 * Add complementary colors based on hue category
 * @param {string[]} recommendations - Recommendations array
 * @param {string} hueCategory - Munsell hue category
 * @param {number} value - Munsell value
 */
function addComplementaryColors(recommendations, hueCategory, value) {
  const complementMap = {
    "R": "BG",
    "YR": "B",
    "Y": "PB",
    "G": "RP",
    "BG": "R",
    "B": "YR",
    "PB": "Y",
    "P": "G",
    "RP": "G"
  };

  const complementaryHue = complementMap[hueCategory] || "B";
  const complementaryFamily = COLOR_FAMILIES[complementaryHue] || COLOR_FAMILIES.B;

  // Add complementary colors based on value
  if (value >= 7) {
    recommendations.push(...complementaryFamily.light.slice(0, 2));
  } else if (value >= 4) {
    recommendations.push(...complementaryFamily.primary.slice(0, 2));
  } else {
    recommendations.push(...complementaryFamily.dark.slice(0, 2));
  }
}

/**
 * Extracts seasonal color recommendations from analysis results
 * @param {Object} skinColorInfo - Skin color analysis info
 * @returns {Array} Array of color objects for seasonal system
 */
export function getSeasonalColors(skinColorInfo) {
  if (!skinColorInfo || !skinColorInfo.seasonal || !skinColorInfo.seasonal.season) {
    return [];
  }

  // Extract season and recommended colors if they exist
  const season = skinColorInfo.seasonal.season;
  let seasonalColors = [];

  // First check for structured recommendations
  if (skinColorInfo.seasonal.recommendations &&
    Array.isArray(skinColorInfo.seasonal.recommendations.colors)) {
    seasonalColors = skinColorInfo.seasonal.recommendations.colors;
  }
  // Then check for traditional seasonal palettes
  else if (skinColorInfo.seasonalPalette &&
    Array.isArray(skinColorInfo.seasonalPalette.colors)) {
    seasonalColors = skinColorInfo.seasonalPalette.colors;
  }
  // Fallback to pre-defined seasonal colors if not found in analysis
  else {
    // Basic palette based on season
    const seasonalDefaults = {
      'Spring': ['Peach', 'Coral', 'Warm Yellow', 'Bright Green', 'Turquoise'],
      'Summer': ['Lavender', 'Soft Pink', 'Powder Blue', 'Sage Green', 'Rose'],
      'Autumn': ['Rust', 'Olive', 'Mustard', 'Terracotta', 'Forest Green'],
      'Winter': ['Royal Blue', 'True Red', 'Emerald', 'Fuchsia', 'Ice Blue']
    };

    seasonalColors = (seasonalDefaults[season] || []).map(name => {
      const colorInfo = getColorRGB(name);
      if (colorInfo && colorInfo.rgb) {
        return {
          name,
          rgb: colorInfo.rgb,
          hex: rgbToHex(colorInfo.rgb)
        };
      }
      return null;
    }).filter(color => color !== null);
  }

  return seasonalColors;
}

/**
 * Gets scientific color recommendations based on skin analysis
 * @param {Object} skinColorInfo - Skin color analysis info
 * @returns {Array} Array of color objects for scientific system
 */
export function getScientificColors(skinColorInfo) {
  if (!skinColorInfo || !skinColorInfo.rgb) {
    return [];
  }

  // First check if we already have scientific recommendations
  if (skinColorInfo.scientificClothingRecommendations &&
    Array.isArray(skinColorInfo.scientificClothingRecommendations)) {
    return skinColorInfo.scientificClothingRecommendations.map(color => {
      if (typeof color === 'string') {
        const colorInfo = getColorRGB(color);
        if (colorInfo && colorInfo.rgb) {
          return {
            name: color,
            rgb: colorInfo.rgb,
            hex: rgbToHex(colorInfo.rgb)
          };
        }
      } else if (color && color.rgb) {
        return {
          name: color.name || 'Scientific Color',
          rgb: color.rgb,
          hex: color.hex || rgbToHex(color.rgb)
        };
      }
      return null;
    }).filter(color => color !== null);
  }

  // Fallback to an empty array if no scientific recommendations
  return [];
}

/**
 * Gets Kibbe system color recommendations
 * @param {Object} skinColorInfo - Skin color analysis info
 * @returns {Array} Array of color objects for Kibbe system
 */
export function getKibbeColors(skinColorInfo) {
  if (!skinColorInfo || !skinColorInfo.rgb) {
    return [];
  }

  // Extract key data for calculations
  const skinRGB = skinColorInfo.rgb;
  const skinHSL = rgbToHsl(skinRGB);
  const [skinHue, skinSat, skinLight] = skinHSL;

  // Get key analysis points
  const isWarm = skinColorInfo &&
    skinColorInfo.temperatureAnalysis &&
    skinColorInfo.temperatureAnalysis.temperature === 'Warm';

  // Get contrast level if available
  let contrastLevel = 'medium';
  if (skinColorInfo.contrastAnalysis && skinColorInfo.contrastAnalysis.contrast) {
    contrastLevel = skinColorInfo.contrastAnalysis.contrast.toLowerCase();
  }

  // Kibbe has several body types that influence color choices
  // Without actual Kibbe data, we'll use contrast and temperature to simulate
  let kibbeProfile = isWarm ?
    (contrastLevel === 'high' ? 'Dramatic' : 'Natural') :
    (contrastLevel === 'high' ? 'Gamine' : 'Classic');

  if (skinColorInfo.kibbeType) {
    kibbeProfile = skinColorInfo.kibbeType;
  }

  // Generate dynamic palette based on Kibbe profile and skin properties
  const colors = [];

  // Dramatic: high contrast, bold colors
  // Natural: warm earth tones, textural colors
  // Classic: balanced, moderate colors
  // Gamine: playful, high contrast with cool tones
  // Romantic: soft, light, delicate colors

  // Base the color generation on the Kibbe profile
  if (kibbeProfile.includes('Dramatic')) {
    // Dramatic: Bold, high-contrast colors
    colors.push(
      // Bold primary color - high saturation complementary
      generateHslColor((skinHue + 180) % 360, Math.min(skinSat + 30, 100), skinLight, "Bold Accent"),
      // Dramatic neutral - dark high contrast
      generateHslColor(skinHue, Math.max(skinSat - 15, 5), Math.max(skinLight - 40, 10), "Dramatic Deep"),
      // Statement color - shifted 90 degrees on color wheel
      generateHslColor((skinHue + 90) % 360, Math.min(skinSat + 20, 100), skinLight, "Statement"),
      // Metallic - subtle version of skin tone
      generateHslColor(skinHue, Math.max(skinSat - 30, 5), Math.min(skinLight + 25, 95), "Dramatic Light"),
      // Rich accent
      generateHslColor((skinHue + 30) % 360, skinSat, Math.max(skinLight - 20, 15), "Rich Accent")
    );
  } else if (kibbeProfile.includes('Natural')) {
    // Natural: Warm, earthy tones with texture
    colors.push(
      // Warm, earthy version of complementary
      generateHslColor(isWarm ? 35 : 215, 65, 55, "Earth Tone"),
      // Forest or moss - natural green
      generateHslColor(isWarm ? 85 : 150, 55, 40, "Natural Green"),
      // Terracotta or warm neutral
      generateHslColor(isWarm ? 25 : 210, 70, 45, "Textured Neutral"),
      // Golden or silver neutral
      generateHslColor(isWarm ? 45 : 210, 50, 70, "Metallic Accent"),
      // Soft, warm version of skin tone
      generateHslColor(skinHue, Math.max(skinSat - 10, 20), Math.min(skinLight + 10, 85), "Natural Harmony")
    );
  } else if (kibbeProfile.includes('Classic')) {
    // Classic: Balanced, moderate colors
    colors.push(
      // Subtle complementary
      generateHslColor((skinHue + 180) % 360, Math.max(skinSat - 20, 20), skinLight, "Classic Complement"),
      // Navy or rich neutral
      generateHslColor(isWarm ? 35 : 220, 60, 30, "Classic Neutral"),
      // Subtle accent
      generateHslColor((skinHue + 60) % 360, Math.max(skinSat - 15, 20), skinLight, "Refined Accent"),
      // Cream or light neutral
      generateHslColor(isWarm ? 40 : 210, 20, 85, "Classic Light"),
      // Muted version of skin tone
      generateHslColor(skinHue, Math.max(skinSat - 25, 10), skinLight, "Balanced Neutral")
    );
  } else if (kibbeProfile.includes('Gamine')) {
    // Gamine: Playful, high contrast with cool tones
    colors.push(
      // Bright, playful primary
      generateHslColor((skinHue + 150) % 360, Math.min(skinSat + 40, 100), Math.min(skinLight + 15, 75), "Playful Primary"),
      // Contrasting secondary
      generateHslColor((skinHue + 240) % 360, Math.min(skinSat + 20, 90), Math.max(skinLight - 10, 30), "Contrasting Secondary"),
      // Black or dark accent
      generateHslColor(skinHue, 10, 15, "Gamine Dark"),
      // White or bright accent
      generateHslColor(skinHue, 5, 95, "Gamine Light"),
      // Playful accent in analogous color
      generateHslColor((skinHue + 30) % 360, Math.min(skinSat + 30, 100), skinLight, "Playful Accent")
    );
  } else {
    // Romantic or other: Soft, light, delicate colors
    colors.push(
      // Soft, light complementary
      generateHslColor((skinHue + 180) % 360, Math.max(skinSat - 15, 30), Math.min(skinLight + 20, 90), "Soft Complement"),
      // Delicate primary - lighter, softer version of skin tone
      generateHslColor(skinHue, Math.max(skinSat - 25, 20), Math.min(skinLight + 25, 90), "Delicate Primary"),
      // Romantic accent - soft pink or peach
      generateHslColor(isWarm ? 25 : 340, 40, 75, "Romantic Accent"),
      // Delicate neutral
      generateHslColor(isWarm ? 40 : 210, 15, 85, "Delicate Neutral"),
      // Soft accent
      generateHslColor((skinHue + 30) % 360, Math.max(skinSat - 20, 25), Math.min(skinLight + 15, 85), "Soft Accent")
    );
  }

  // Convert generated colors to named colors if possible
  return colors.map(color => {
    // Try to map to a named color from colorMap if close enough
    const namedColor = findClosestNamedColor(color.rgb);

    return {
      name: namedColor ? namedColor.name : color.name,
      rgb: namedColor ? namedColor.rgb : color.rgb,
      hex: namedColor ? rgbToHex(namedColor.rgb) : color.hex
    };
  });
}

/**
 * Gets Tonal system color recommendations
 * @param {Object} skinColorInfo - Skin color analysis info
 * @returns {Array} Array of color objects for Tonal system
 */
export function getTonalColors(skinColorInfo) {
  if (!skinColorInfo || !skinColorInfo.rgb) {
    return [];
  }

  // Extract data for calculations
  const skinRGB = skinColorInfo.rgb;
  const skinHSL = rgbToHsl(skinRGB);
  const [h, s, l] = skinHSL;

  // Determine tonal category from skinColorInfo
  let tonalCategory = 'Clear';

  if (skinColorInfo.clarityAnalysis && skinColorInfo.clarityAnalysis.clarity) {
    tonalCategory = skinColorInfo.clarityAnalysis.clarity;
  } else if (skinColorInfo.seasonal && skinColorInfo.seasonal.intensity) {
    // Map intensity to clarity as a fallback
    const intensity = skinColorInfo.seasonal.intensity.toLowerCase();
    if (intensity.includes('muted') || intensity.includes('soft')) {
      tonalCategory = 'Muted';
    } else if (intensity.includes('deep') || intensity.includes('dark')) {
      tonalCategory = 'Deep';
    } else if (intensity.includes('light')) {
      tonalCategory = 'Light';
    } else if (intensity.includes('bright') || intensity.includes('clear')) {
      tonalCategory = 'Clear';
    } else if (intensity.includes('warm')) {
      tonalCategory = 'Warm';
    } else if (intensity.includes('cool')) {
      tonalCategory = 'Cool';
    }
  } else {
    // Determine category algorithmically from HSL values if no analysis
    if (l < 40) {
      tonalCategory = 'Deep';
    } else if (l > 70) {
      tonalCategory = 'Light';
    } else if (s < 30) {
      tonalCategory = 'Muted';
    } else if (s > 70) {
      tonalCategory = 'Clear';
    } else if (h >= 0 && h < 45 || h >= 280 && h < 360) {
      tonalCategory = 'Warm';
    } else if (h >= 180 && h < 280) {
      tonalCategory = 'Cool';
    }
  }

  // Generate colors based on tonal category
  const colors = [];

  // Each category gets special HSL adjustments to create appropriate palette
  switch (tonalCategory) {
    case 'Clear':
      // Clear: High saturation, moderate to high lightness
      colors.push(
        generateHslColor((h + 0) % 360, Math.min(s + 30, 100), Math.min(l + 10, 75), "Clear Primary"),
        generateHslColor((h + 120) % 360, Math.min(s + 30, 100), Math.min(l + 5, 70), "Clear Secondary"),
        generateHslColor((h + 180) % 360, Math.min(s + 25, 100), Math.min(l + 5, 70), "Clear Complement"),
        generateHslColor((h + 60) % 360, Math.min(s + 25, 95), l, "Clear Accent")
      );
      break;

    case 'Muted':
      // Muted: Low saturation, moderate lightness
      colors.push(
        generateHslColor(h, Math.max(s - 20, 20), l, "Muted Primary"),
        generateHslColor((h + 30) % 360, Math.max(s - 15, 25), Math.min(l + 5, 75), "Muted Secondary"),
        generateHslColor((h + 150) % 360, Math.max(s - 10, 30), Math.max(l - 5, 35), "Muted Accent"),
        generateHslColor((h + 180) % 360, Math.max(s - 20, 20), Math.min(l + 10, 70), "Muted Complement")
      );
      break;

    case 'Deep':
      // Deep: Moderate saturation, low lightness
      colors.push(
        generateHslColor(h, Math.min(s + 5, 80), Math.max(l - 15, 20), "Deep Primary"),
        generateHslColor((h + 30) % 360, Math.min(s + 10, 85), Math.max(l - 20, 15), "Deep Secondary"),
        generateHslColor((h + 150) % 360, Math.min(s + 15, 90), Math.max(l - 15, 20), "Deep Accent"),
        generateHslColor((h + 180) % 360, Math.min(s + 10, 85), Math.max(l - 10, 25), "Deep Complement")
      );
      break;

    case 'Light':
      // Light: Low to moderate saturation, high lightness
      colors.push(
        generateHslColor(h, Math.max(s - 10, 30), Math.min(l + 15, 90), "Light Primary"),
        generateHslColor((h + 30) % 360, Math.max(s - 5, 35), Math.min(l + 20, 92), "Light Secondary"),
        generateHslColor((h + 150) % 360, Math.max(s - 5, 35), Math.min(l + 15, 90), "Light Accent"),
        generateHslColor((h + 180) % 360, Math.max(s - 10, 30), Math.min(l + 10, 88), "Light Complement")
      );
      break;

    case 'Warm':
      // Warm: Shift hues toward warm side of the spectrum
      const warmBase = h >= 180 ? (h + 180) % 360 : h; // Make sure we're in warm territory
      colors.push(
        generateHslColor(warmBase, Math.min(s + 10, 90), l, "Warm Primary"),
        generateHslColor(warmBase > 30 ? warmBase - 30 : warmBase + 330, Math.min(s + 5, 85), Math.min(l + 5, 75), "Warm Secondary"),
        generateHslColor((warmBase + 30) % 360, Math.min(s + 5, 85), Math.max(l - 5, 30), "Warm Accent"),
        generateHslColor((warmBase + 60) % 360, s, l, "Warm Complement")
      );
      break;

    case 'Cool':
      // Cool: Shift hues toward cool side of the spectrum
      const coolBase = h < 180 ? (h + 180) % 360 : h; // Make sure we're in cool territory
      colors.push(
        generateHslColor(coolBase, s, l, "Cool Primary"),
        generateHslColor((coolBase + 30) % 360, Math.max(s - 5, 40), Math.min(l + 5, 75), "Cool Secondary"),
        generateHslColor((coolBase + 60) % 360, Math.min(s + 5, 85), Math.max(l - 10, 30), "Cool Accent"),
        generateHslColor((coolBase - 30 + 360) % 360, s, l, "Cool Complement")
      );
      break;

    default:
      // Neutral as fallback
      colors.push(
        generateHslColor(h, s, l, "Neutral Primary"),
        generateHslColor((h + 120) % 360, Math.max(s - 10, 30), l, "Neutral Secondary"),
        generateHslColor((h + 180) % 360, Math.max(s - 5, 35), Math.min(l + 5, 75), "Neutral Complement"),
        generateHslColor((h + 60) % 360, Math.max(s - 5, 35), Math.max(l - 5, 30), "Neutral Accent")
      );
  }

  // Add a universal neutral that works with the palette
  // For warm categories, add a warm neutral; for cool, add a cool neutral
  if (['Warm', 'Clear', 'Deep'].includes(tonalCategory)) {
    // Warm neutral - tan/camel/brown
    colors.push(generateHslColor(30, 30, 60, "Neutral Base"));
  } else {
    // Cool neutral - gray/navy
    colors.push(generateHslColor(210, 20, 55, "Neutral Base"));
  }

  // Convert generated colors to named colors if possible
  return colors.map(color => {
    // Try to map to a named color from colorMap
    const namedColor = findClosestNamedColor(color.rgb);

    return {
      name: namedColor ? namedColor.name : color.name,
      rgb: namedColor ? namedColor.rgb : color.rgb,
      hex: namedColor ? rgbToHex(namedColor.rgb) : color.hex
    };
  });
}

/**
 * Gets Pantone color recommendations based on skin analysis
 * @param {Object} skinColorInfo - Skin color analysis info
 * @returns {Array} Array of color objects for Pantone system
 */
export function getPantoneColors(skinColorInfo) {
  // Early validation
  if (!skinColorInfo || !skinColorInfo.rgb) {
    return [];
  }

  // Define actual Pantone colors collection (trimmed version from the database)
  // Source: https://raw.githubusercontent.com/Margaret2/pantone-colors/refs/heads/master/pantone-colors-map.scss
  const PANTONE_COLORS = {
    // Neutrals & Whites
    'egret': '#f3ece0',
    'snow-white': '#f2f0eb',
    'bright-white': '#f4f5f0',
    'cloud-dancer': '#f0eee9',
    'gardenia': '#f1e8df',
    'marshmallow': '#f0eee4',
    'blanc-de-blanc': '#e7e9e7',
    'pristine': '#f2e8da',
    'whisper-white': '#ede6db',
    'white-asparagus': '#e1dbc8',
    'birch': '#ddd5c7',
    'turtledove': '#ded7c8',
    'bone-white': '#d7d0c0',
    'silver-birch': '#d2cfc4',
    'vanilla-ice': '#f0eada',
    'papyrus': '#f5edd6',
    'antique-white': '#ede3d2',
    'winter-white': '#f5ecd2',
    'cloud-cream': '#e6ddc5',
    'angora': '#dfd1bb',
    'seedpearl': '#e6dac4',
    'vanilla-custard': '#f3e0be',
    'almond-oil': '#f4efc1',
    'white-sand': '#dbd5d1',

    // Reds & Pinks
    'cherry-tomato': '#e34b32',
    'fiery-red': '#d01c1f',
    'aurora-red': '#b93a32',
    'jester-red': '#9e1030',
    'valiant-poppy': '#bc322c',
    'aura-orange': '#b4262a',
    'toreador': '#b61032',
    'lychee': '#ba0b32',
    'goji-berry': '#b91228',
    'jalapeno-red': '#b2103c',
    'love-potion': '#c01352',
    'pink-peacock': '#c62168',
    'rose-quartz': '#f7cac9',
    'peony': '#dc9680',
    'ballet-slipper': '#ebced5',
    'mauve-mist': '#d8b4b6',
    'dusty-rose': '#cf9496',
    'rose-brown': '#bb6b5e',
    'brandied-apricot': '#ca848c',
    'pink-yarrow': '#ce3175',
    'cherry-blossom': '#f7cee0',
    'fruit-dove': '#ce5b78',
    'living-coral': '#ff6f61',
    'rose-water': '#f8e0e7',
    'blooming-dahlia': '#eb9687',
    'sheer-pink': '#f6e5db',
    'petal-pink': '#f2e2e0',
    'bridal-blush': '#eee2dd',
    'cream-pink': '#f6e4d9',
    'angel-wing': '#f3dfd7',
    'almost-mauve': '#e7dcd9',
    'peach-quartz': '#f5b895',
    'creme-de-peche': '#f5d6c6',
    'marys-rose': '#f7d1d4',
    'pink-salt': '#f7cdc7',

    // Yellow & Orange
    'lemon-verbena': '#f3e779',
    'meadowlark': '#ead94e',
    'vibrant-yellow': '#ffda29',
    'aspen-gold': '#ffd662',
    'mango-mojito': '#d69c2f',
    'turmeric': '#fe840e',
    'tangelo': '#fe7e03',
    'coral-quartz': '#f77464',
    'papaya': '#fea166',
    'golden-orange': '#d7942d',
    'autumn-maple': '#c46215',
    'golden-kiwi': '#f3dd3e',
    'evening-primrose': '#ccdb1e',
    'habanero-gold': '#fed450',
    'minion-yellow': '#fed55d',
    'iceland-poppy': '#f4963a',
    'carrot-curl': '#fe8c18',
    'orange-tiger': '#f96714',
    'exotic-orange': '#f96531',
    'dragon-fire': '#fc642d',
    'peach-echo': '#f7786b',
    'orange-chiffon': '#f9aa7d',
    'kumquat': '#fbaa4c',
    'scarlet-ibis': '#f45520',
    'spice-route': '#b95b3f',
    'peach-caramel': '#c5733d',
    'tomato-cream': '#c57644',
    'chai-tea': '#b1832f',
    'thai-curry': '#ab6819',
    'honey-ginger': '#a86217',

    // Greens
    'lime-popsicle': '#c0db3a',
    'pepper-stem': '#8d9440',
    'guacamole': '#797b3a',
    'kale': '#5a7247',
    'terrarium-moss': '#616247',
    'forest-biome': '#184a45',
    'eden': '#264e36',
    'lush-meadow': '#006e51',
    'mint': '#00a170',
    'arcadia': '#00a28a',
    'acid-lime': '#badf30',
    'golden-lime': '#9a9738',
    'split-pea': '#9c9a40',
    'lentil-sprout': '#aba44d',
    'twist-of-lime': '#4e632c',
    'mayfly': '#65663f',
    'quetzal-green': '#006865',
    'rain-forest': '#15463e',
    'sea-moss': '#254445',
    'deep-depths': '#46483c',
    'sprout-green': '#cbd7d2',
    'hint-of-mint': '#d8e8e6',
    'hushed-green': '#d8e9e5',
    'blue-flower': '#d0d9d4',
    'zephyr-blue': '#d3d9d1',

    // Blues
    'princess-blue': '#00539c',
    'galaxy-blue': '#2a4b7c',
    'nebulas-blue': '#2d62a3',
    'indigo-bunting': '#006ca9',
    'bluestone': '#577284',
    'turkish-sea': '#195190',
    'blue-depths': '#263056',
    'island-paradise': '#95dee3',
    'crystal-seas': '#5dafce',
    'serenity': '#91a8d0',
    'tanager-turquoise': '#91dce8',
    'airy-blue': '#92b6d5',
    'harbor-mist': '#afb1b4',
    'sea-angel': '#98bfca',
    'baltic-sea': '#79b5db',
    'antiqua-sand': '#83c2cd',
    'iced-aqua': '#abd3db',
    'tibetan-stone': '#82c2c7',
    'limpet-shell': '#98ddde',
    'zen-blue': '#9fa9be',
    'riverside': '#4c6a92',
    'quiet-harbor': '#5a789a',
    'lichen-blue': '#5d89b3',
    'pacific-coast': '#5480ac',
    'ibiza-blue': '#007cb7',
    'navagio-bay': '#3183a0',
    'barrier-reef': '#0084a1',
    'fjord-blue': '#007290',
    'hawaiian-surf': '#0078a7',
    'tahitian-tide': '#006b7e',
    'crystal-teal': '#00637c',
    'deep-lagoon': '#005265',
    'spa-blue': '#d3dedf',
    'billowing-sail': '#d8e7e7',
    'lapis-blue': '#004b8d',
    'baleine-blue': '#155187',
    'blue-opal': '#0f3b57',
    'moonlit-ocean': '#293b4d',
    'deep-dive': '#29495c',
    'sailor-blue': '#0e3a53',
    'gibraltar-sea': '#123850',
    'navy-peony': '#223a5e',
    'sargasso-sea': '#35435a',

    // Purples
    'ultra-violet': '#5f4b8b',
    'spring-crocus': '#bc70a4',
    'bodacious': '#b76ba3',
    'lavender-crystal': '#936a98',
    'purple-corallite': '#5a4e8f',
    'chive-blossom': '#7d5d99',
    'purple-sapphire': '#6f4685',
    'amethyst-orchid': '#926aa6',
    'crocus-petal': '#b99bc5',
    'purple-rose': '#b09fca',
    'lilac-breeze': '#b3a0c9',
    'purple-dove': '#98878c',
    'sand-verbena': '#9f90c1',
    'lilac-gray': '#9896a4',
    'diffused-orchid': '#9879a2',
    'fairy-wren': '#9479af',
    'sunlit-allium': '#9787bb',
    'pale-iris': '#8895c5',
    'iolite': '#707bb4',
    'grape-kiss': '#7b4368',
    'willowherb': '#8e4483',
    'charisma': '#632a60',
    'plum-jam': '#624076',
    'spiced-plum': '#6d4773',
    'violet-indigo': '#3e285c',
    'plum-caspia': '#61224a',
    'winter-bloom': '#47243b',
    'pickled-beet': '#4d233d',

    // Browns & Earth tones
    'hazelnut': '#cfb095',
    'butterum': '#c68f65',
    'iced-coffee': '#b18f6a',
    'tawny-port': '#672e3b',
    'emperador': '#684832',
    'autumn-maple': '#c46215',
    'martini-olive': '#716a4d',
    'shaded-spruce': '#005960',
    'soybean': '#d2c29d',
    'jurassic-gold': '#e7aa56',
    'brown-rice': '#c7bba4',
    'peachy-keen': '#e2bdb3',
    'brazilian-sand': '#dacab7',
    'morganite': '#dfcdc6',
    'almond-milk': '#d6cebe',
    'irish-cream': '#c0ac92',
    'pure-cashmere': '#ada396',
    'tree-house': '#988c75',
    'roasted-cashew': '#918579',
    'winter-twig': '#948a7a',
    'petrified-oak': '#8d7960',
    'argan-oil': '#8b593e',
    'sepia-tint': '#897560',
    'summer-fig': '#be4b3b',
    'fenugreek': '#c0916c',
    'dusted-clay': '#cc7357',
    'pastry-shell': '#bd8c66',
    'meerkat': '#a46f44',
    'sun-baked': '#d27f63',
    'porcini': '#cca580',
    'roasted-pecan': '#93592b',
    'sugar-almond': '#935529',
    'spiced-apple': '#783937',
    'chili-oil': '#8e3c36',
    'plum-truffle': '#675657',
    'brandy-brown': '#73362a',

    // Grays & Blacks
    'sharkskin': '#838487',
    'gray-flannel': '#848182',
    'quiet-gray': '#b9babd',
    'antarctica': '#c6c5c6',
    'oyster-mushroom': '#c3c6c8',
    'raindrops': '#b1aab3',
    'silver-gray': '#c1b7b0',
    'lunar-rock': '#c5c5c5',
    'glacier-gray': '#c5c6c7',
    'paloma': '#9f9c99',
    'moon-rock': '#958b84',
    'drizzle': '#a09f9c',
    'flint-gray': '#a09c98',
    'wild-dove': '#8b8c89',
    'neutral-gray': '#8e918f',
    'steel-gray': '#726f70',
    'castlerock': '#5f5e62',
    'charcoal-gray': '#6c6868',
    'pewter': '#666564',
    'nine-iron': '#46434a',
    'ash': '#a09998',
    'toadstool': '#988088',
    'moonscape': '#725f69',
    'arctic-dusk': '#735b6a',
    'ephemera': '#6f5965',
    'volcanic-glass': '#615c60',
    'gray-blue': '#4d587a',
    'blue-horizon': '#4e6482',
    'granite-gray': '#615e5f',
    'gray-pinstripe': '#49494d',
    'raven': '#413e3d',
    'licorice': '#3a3536',
    'after-dark': '#3c3535',
    'phantom': '#39373b',
    'moonless-night': '#2f2d30',
    'black-beauty': '#26262a',
    'black-onyx': '#2b272b',
    'jet-black': '#2d2c2f',
    'pirate-black': '#363838',
    'anthracite': '#28282d',
    'caviar': '#292a2d',
    'stretch-limo': '#2b2c30'
  };

  // Extract skin RGB and convert to HSL for matching
  const skinRGB = skinColorInfo.rgb;
  const skinHSL = rgbToHsl(skinRGB);
  const [skinHue, skinSat, skinLightness] = skinHSL;

  // Get season and temperature if available
  const season = skinColorInfo?.seasonal?.season || '';
  const isWarm = skinColorInfo?.temperatureAnalysis?.temperature === 'Warm';

  // Array to store our recommended Pantone colors
  let pantoneColors = [];



  // Convert all PANTONE_COLORS to HSL for color matching
  const pantoneHSL = {};
  Object.entries(PANTONE_COLORS).forEach(([name, hex]) => {
    const rgb = hexToRgb(hex);
    pantoneHSL[name] = {
      rgb,
      hex,
      hsl: rgbToHsl(rgb)
    };
  });

  // Pick color families based on seasonal theory
  let colorCategories = [];
  if (season === 'Spring') {
    colorCategories = ['coral', 'peach', 'gold', 'yellow', 'green', 'turquoise'];
  } else if (season === 'Summer') {
    colorCategories = ['rose', 'pink', 'blue', 'lavender', 'periwinkle', 'mint'];
  } else if (season === 'Autumn') {
    colorCategories = ['orange', 'rust', 'brown', 'olive', 'terracotta', 'moss'];
  } else if (season === 'Winter') {
    colorCategories = ['red', 'purple', 'blue', 'emerald', 'violet', 'magenta'];
  } else {
    // Default: use temperature-based categories
    colorCategories = isWarm ?
      ['orange', 'gold', 'yellow', 'olive', 'coral', 'peach'] :
      ['blue', 'purple', 'pink', 'magenta', 'green', 'teal'];
  }

  // Function to score how well a Pantone color matches our requirements
  const scoreColor = (colorName, colorData) => {
    const [h, s, l] = colorData.hsl;
    let score = 0;

    // Check if color name includes any of our target categories
    const nameMatchScore = colorCategories.some(category =>
      colorName.toLowerCase().includes(category)
    ) ? 30 : 0;

    // Temperature match (warm or cool hue)
    const isWarmHue = (h >= 0 && h < 50) || (h >= 300 && h <= 360);
    const temperatureMatchScore = (isWarm === isWarmHue) ? 20 : 0;

    // Saturation and lightness matching based on season
    let satLightScore = 0;
    if (season === 'Spring') {
      // Spring: clear, warm, light to medium
      satLightScore = (s > 50 && l > 55) ? 20 : 0;
    } else if (season === 'Summer') {
      // Summer: soft, cool, light to medium
      satLightScore = (s < 60 && l > 50) ? 20 : 0;
    } else if (season === 'Autumn') {
      // Autumn: warm, muted, medium to dark
      satLightScore = (s < 70 && l < 60) ? 20 : 0;
    } else if (season === 'Winter') {
      // Winter: cool, clear, high contrast
      satLightScore = (s > 60) ? 20 : 0;
    }

    return nameMatchScore + temperatureMatchScore + satLightScore;
  };

  // Score and sort all Pantone colors
  const scoredColors = Object.entries(pantoneHSL)
    .map(([name, data]) => ({
      name: `Pantone ${name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
      rgb: data.rgb,
      hex: data.hex,
      score: scoreColor(name, data)
    }))
    .sort((a, b) => b.score - a.score);

  // Take the top 5 highest scoring colors
  pantoneColors = scoredColors.slice(0, 5);

  // Add some directly complementary colors based on skin tone if we have fewer than 5
  if (pantoneColors.length < 5) {
    const complementHue = (skinHue + 180) % 360;

    // Find colors with hues close to the complementary hue
    const complementaryColors = Object.entries(pantoneHSL)
      .filter(([_, data]) => {
        const hDiff = Math.abs(data.hsl[0] - complementHue);
        return hDiff < 30 || hDiff > 330; // Within 30 degrees
      })
      .map(([name, data]) => ({
        name: `Pantone ${name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
        rgb: data.rgb,
        hex: data.hex
      }));

    // Add unique complementary colors until we reach 5 or run out
    for (const color of complementaryColors) {
      if (pantoneColors.length >= 5) break;
      if (!pantoneColors.some(c => c.hex === color.hex)) {
        pantoneColors.push(color);
      }
    }
  }

  return pantoneColors;
}

/**
 * Gets Monk color system recommendations
 * @param {Object} skinColorInfo - Skin color analysis info
 * @returns {Array} Array of color objects for Monk system
 */
export function getMonkColors(skinColorInfo) {
  if (!skinColorInfo || !skinColorInfo.rgb) {
    return [];
  }

  // Extract skin properties for calculations
  const skinRGB = skinColorInfo.rgb;
  const skinHSL = rgbToHsl(skinRGB);
  const [h, s, l] = skinHSL;

  // Get clarity/contrast level if available
  let contrastLevel = 'medium';
  if (skinColorInfo.clarityAnalysis && skinColorInfo.clarityAnalysis.clarity) {
    const clarity = skinColorInfo.clarityAnalysis.clarity.toLowerCase();
    if (clarity.includes('clear') || clarity.includes('bright')) {
      contrastLevel = 'high';
    } else if (clarity.includes('muted') || clarity.includes('soft')) {
      contrastLevel = 'low';
    }
  }

  // Get temperature if available
  const isWarm = skinColorInfo &&
    skinColorInfo.temperatureAnalysis &&
    skinColorInfo.temperatureAnalysis.temperature === 'Warm';

  // Generate colors based on contrast level and temperature
  const colors = [];

  if (contrastLevel === 'high') {
    // High contrast palette - bright, clear colors
    colors.push(
      generateHslColor(isWarm ? 30 : 200, 90, 55, "High Contrast 1"),
      generateHslColor(isWarm ? 45 : 280, 85, 60, "High Contrast 2"),
      generateHslColor(isWarm ? 15 : 350, 80, 50, "High Contrast 3"),
      generateHslColor(isWarm ? 180 : 170, 85, 45, "High Contrast 4"),
      generateHslColor(isWarm ? 100 : 120, 75, 45, "High Contrast 5")
    );
  } else if (contrastLevel === 'low') {
    // Low contrast palette - muted, soft colors
    colors.push(
      generateHslColor(isWarm ? 355 : 330, 30, 70, "Low Contrast 1"),
      generateHslColor(isWarm ? 25 : 15, 40, 65, "Low Contrast 2"),
      generateHslColor(isWarm ? 40 : 30, 25, 60, "Low Contrast 3"),
      generateHslColor(isWarm ? 55 : 170, 30, 55, "Low Contrast 4"),
      generateHslColor(isWarm ? 80 : 260, 25, 65, "Low Contrast 5")
    );
  } else { // medium contrast
    // Medium contrast palette - balanced colors
    colors.push(
      generateHslColor(isWarm ? 35 : 215, 60, 50, "Medium Contrast 1"),
      generateHslColor(isWarm ? 25 : 0, 65, 45, "Medium Contrast 2"),
      generateHslColor(isWarm ? 80 : 150, 55, 40, "Medium Contrast 3"),
      generateHslColor(isWarm ? 15 : 330, 60, 40, "Medium Contrast 4"),
      generateHslColor(isWarm ? 30 : 210, 55, 35, "Medium Contrast 5")
    );
  }

  // Convert generated colors to named colors if possible
  return colors.map(color => {
    // Try to map to a named color from colorMap
    const namedColor = findClosestNamedColor(color.rgb);

    return {
      name: namedColor ? namedColor.name : color.name,
      rgb: namedColor ? namedColor.rgb : color.rgb,
      hex: namedColor ? rgbToHex(namedColor.rgb) : color.hex
    };
  });
}

/**
 * Generates curated harmony tips (Duos and Trios) based on math/dynamic analysis
 * @param {Object} skinColorInfo - Complete analysis object
 * @returns {Array} Array of tip objects { title, description, colors: [] }
 */
/**
 * Generates curated outfit inspirations based on categorized recommendations
 * @param {Object} skinColorInfo - Complete analysis object
 * @returns {Array} Array of tip objects { title, description, colors: [] }
 */
export function generateHarmonyTips(skinColorInfo) {
  if (!skinColorInfo) return [];

  // Get the user's season
  const season = skinColorInfo.seasonal?.season || 'Spring';

  // Get categorized recommendations (Everyday, Occasion, Neutrals, Accents)
  const rawCategories = getCategorizedRecommendations(season, skinColorInfo);

  // Map new structure to flat arrays for internal logic
  const categories = {
    neutrals: [...(rawCategories.neutrals?.layering || []), ...(rawCategories.neutrals?.grounding || []), ...(rawCategories.neutrals?.basics || [])],
    everyday: rawCategories.extended?.everyday || [],
    occasion: rawCategories.extended?.occasion || [],
    accents: rawCategories.top7?.accents || []
  };

  const tips = [];

  // Helper to get random items from an array
  const getRandom = (arr, count = 1) => {
    if (!arr || arr.length === 0) return [];
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Helper to find a specific color type (e.g., "Navy", "White")
  const findColor = (arr, keywords) => {
    return arr.find(c => {
      const name = c.name.toLowerCase();
      return keywords.some(k => name.includes(k.toLowerCase()));
    });
  };

  // --- OUTFIT FORMULA 1: THE PROFESSIONAL (Neutral + Light Neutral + Subtle Accent) ---
  if (categories.neutrals.length >= 2 && categories.everyday.length >= 1) {
    const mainNeutral = getRandom(categories.neutrals.filter(c => !c.name.toLowerCase().includes('white') && !c.name.toLowerCase().includes('cream')), 1)[0];
    const lightNeutral = getRandom(categories.neutrals.filter(c => c.name.toLowerCase().includes('white') || c.name.toLowerCase().includes('cream') || c.name.toLowerCase().includes('beige') || c.name.toLowerCase().includes('gray')), 1)[0];
    const accent = getRandom(categories.everyday, 1)[0];

    if (mainNeutral && lightNeutral && accent) {
      tips.push({
        title: "The Professional",
        description: `A timeless office look. Pair a ${mainNeutral.name} suit or trousers with a ${lightNeutral.name} top, and use ${accent.name} for a tie, scarf, or bag.`,
        colors: [mainNeutral, lightNeutral, accent]
      });
    }
  }

  // --- OUTFIT FORMULA 2: CASUAL CHIC (Everyday + Neutral) ---
  if (categories.everyday.length >= 1 && categories.neutrals.length >= 1) {
    const everyday = getRandom(categories.everyday, 1)[0];
    const neutral = getRandom(categories.neutrals, 1)[0];

    if (everyday && neutral) {
      tips.push({
        title: "Casual Chic",
        description: `Effortless style. Wear ${everyday.name} as your main piece (sweater or dress) anchored with ${neutral.name} accessories or bottoms.`,
        colors: [everyday, neutral]
      });
    }
  }

  // --- OUTFIT FORMULA 3: DATE NIGHT / EVENT (Occasion + Dark Neutral) ---
  if (categories.occasion.length >= 1 && categories.neutrals.length >= 1) {
    const occasion = getRandom(categories.occasion, 1)[0];
    const darkNeutral = getRandom(categories.neutrals.filter(c => {
      const name = c.name.toLowerCase();
      return name.includes('black') || name.includes('navy') || name.includes('charcoal') || name.includes('chocolate') || name.includes('dark');
    }), 1)[0] || categories.neutrals[0];

    if (occasion && darkNeutral) {
      tips.push({
        title: "Evening Glamour",
        description: `Turn heads with ${occasion.name}. It pops beautifully against ${darkNeutral.name} for a sophisticated evening vibe.`,
        colors: [occasion, darkNeutral]
      });
    }
  }

  // --- OUTFIT FORMULA 4: THE POWER LOOK (High Contrast) ---
  // Try to find a very light neutral and a deep/bold color
  const lightNeutral = findColor(categories.neutrals, ['white', 'cream', 'ivory', 'ice', 'silver']);
  const powerColor = getRandom([...categories.occasion, ...categories.accents], 1)[0];

  if (lightNeutral && powerColor) {
    tips.push({
      title: "The Power Look",
      description: `Command attention with high contrast. ${powerColor.name} looks striking next to crisp ${lightNeutral.name}.`,
      colors: [powerColor, lightNeutral]
    });
  }

  // --- OUTFIT FORMULA 5: MONOCHROMATIC (Tonal) ---
  // Find 3 colors from the same family (e.g., all Blues or all Greens)
  const allColors = [...categories.neutrals, ...categories.everyday, ...categories.occasion, ...categories.accents];

  // Group by rough family
  const families = {};
  allColors.forEach(c => {
    let family = 'Other';
    const name = c.name.toLowerCase();
    if (name.includes('blue') || name.includes('navy') || name.includes('sky') || name.includes('teal')) family = 'Blue';
    else if (name.includes('green') || name.includes('olive') || name.includes('sage') || name.includes('emerald')) family = 'Green';
    else if (name.includes('red') || name.includes('burgundy') || name.includes('maroon') || name.includes('rose')) family = 'Red';
    else if (name.includes('pink') || name.includes('blush') || name.includes('fuchsia')) family = 'Pink';
    else if (name.includes('brown') || name.includes('tan') || name.includes('camel') || name.includes('beige')) family = 'Brown';
    else if (name.includes('gray') || name.includes('charcoal') || name.includes('silver')) family = 'Gray';

    if (!families[family]) families[family] = [];
    families[family].push(c);
  });

  // Find a family with 3+ distinct colors
  const bestFamily = Object.keys(families).find(f => f !== 'Other' && families[f].length >= 3);

  if (bestFamily) {
    // Sort by lightness (mock logic: just assume distinct names imply distinct shades for now, 
    // or rely on the fact they came from different buckets)
    const monoColors = getRandom(families[bestFamily], 3);

    tips.push({
      title: "Monochromatic Mastery",
      description: `Elongate your silhouette by wearing shades of ${bestFamily}. Mix textures (e.g., silk with wool) to keep it interesting.`,
      colors: monoColors
    });
  }

  // Ensure we have at least 3 tips, if not, fill with generic pairings
  if (tips.length < 3) {
    const c1 = getRandom(categories.everyday, 1)[0] || categories.neutrals[0];
    const c2 = getRandom(categories.accents, 1)[0] || categories.neutrals[1];
    if (c1 && c2) {
      tips.push({
        title: "Simple & Stylish",
        description: `You can't go wrong pairing ${c1.name} with ${c2.name}.`,
        colors: [c1, c2]
      });
    }
  }

  // Deduplicate tips by title just in case
  const uniqueTips = [];
  const seenTitles = new Set();
  tips.forEach(t => {
    if (!seenTitles.has(t.title)) {
      seenTitles.add(t.title);
      uniqueTips.push(t);
    }
  });

  return uniqueTips.slice(0, 6); // Return max 6 tips
}