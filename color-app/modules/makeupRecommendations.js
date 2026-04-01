import { rgbToHsl, rgbToLab, hexToRgb } from './colorUtils.js';

/**
 * Classify a color into a seasonal palette based on its properties
 * @param {string} hex - Hex color code
 * @returns {string|null} Season name (Spring, Summer, Autumn, Winter) or null if invalid
 */
function classifyColorSeason(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;

    const [h, s, l] = rgbToHsl(rgb);
    const lab = rgbToLab(rgb);
    const [L, a, b] = lab;

    // Temperature (Warm vs Cool)
    // b > 0 is generally yellow (warm), b < 0 is blue (cool)
    // In HSL, hues 0-60 (Red-Yellow) and 300-360 (Magenta-Red) can be warm/cool depending on context
    // Simple heuristic:
    // Warm: Yellow, Orange, Red-Orange, Yellow-Green
    // Cool: Blue, Cyan, Blue-Green, Purple, Blue-Red

    // Using Lab b* for temperature is a good scientific approximation
    // b* > 0 = Warm (Yellow axis)
    // b* < 0 = Cool (Blue axis)
    // However, Red (a* > 0) can be cool (Blue-Red) or warm (Orange-Red)

    let isWarm = b > 2; // Slight bias to yellow
    let isCool = b < -2;

    // Refine temperature with Hue if Lab is inconclusive
    if (!isWarm && !isCool) {
        if ((h >= 0 && h < 50) || (h >= 340 && h <= 360)) isWarm = true; // Reds, Oranges
        else if (h >= 50 && h < 180) isWarm = true; // Yellows, Greens (Spring/Autumn often warm greens)
        else isCool = true; // Blues, Purples
    }

    // Clarity (Clear vs Muted)
    // Saturation is a proxy, but also L value matters.
    // Muted colors have lower saturation or are "muddy" (greyed out)
    const isMuted = s < 40;
    const isClear = s >= 40;

    // Lightness (Light vs Deep)
    const isLight = l > 60;
    const isDeep = l <= 40;
    const isMedium = l > 40 && l <= 60;

    // Classification Logic

    // 1. Handle Achromatic/Near-Achromatic (Black, White, Gray)
    if (s < 10) {
        if (l > 90) return 'Winter'; // White/Icy
        if (l < 15) return 'Winter'; // Black
        return 'Summer'; // Gray/Soft
    }

    if (isWarm) {
        // Spring: Warm + Clear + Light
        // Autumn: Warm + Muted + Deep

        if (isClear) {
            if (l > 40) return 'Spring';
            return 'Autumn'; // Deep Warm Clear is rare, usually Autumn/Deep Autumn
        } else {
            return 'Autumn'; // Muted Warm is Autumn
        }
    } else {
        // Winter: Cool + Clear + Deep (or Icy)
        // Summer: Cool + Muted + Light

        if (isClear) {
            return 'Winter'; // Clear Cool is Winter
        } else {
            // Muted Cool
            if (l < 40) return 'Winter'; // Deep Muted Cool can be Deep Winter
            return 'Summer'; // Light/Medium Muted Cool is Summer
        }
    }
}

/**
 * Check if a product shade is compatible with the user's season and skin traits
 * @param {Object} shade - Cosmetic shade object with hex_value
 * @param {string} seasonKey - User's broad season (Spring, Summer, Autumn, Winter)
 * @param {Object} skinColorInfo - Full skin analysis data
 * @param {string} productType - Type of product (foundation, lipstick, etc.)
 * @returns {boolean} True if compatible
 */
function isShadeCompatible(shade, seasonKey, skinColorInfo, productType) {
    const shadeSeason = classifyColorSeason(shade.hex_value);

    // Direct match is always good
    if (shadeSeason === seasonKey) return true;

    // Advanced Logic: Olive Undertone Handling
    // If the user is identified as "Olive", they often have yellow overtones (high b*)
    // even if they are technically Cool (Winter).
    // The Standard classification flags high b* as "Autumn" (Warm).
    // So, we should allow "Autumn" foundations/powders for "Winter" users IF they are Olive.

    if (skinColorInfo?.advancedUndertone?.undertoneQuality === 'Olive') {
        const isFaceProduct = ['foundation', 'powder', 'concealer', 'bronzer'].includes(productType);

        // Scenario: Cool Olive (Winter) needs Yellow-based (Autumn) foundation
        if (seasonKey === 'Winter' && shadeSeason === 'Autumn' && isFaceProduct) {
            return true;
        }

        // Scenario: Warm Olive (Autumn) might need less orange, possibly some muted Neutral-Cool (Summer/Winter)
        // But usually Autumn covers Warm Olive well. 
        // We can tighten this later if needed.
    }

    return false;
}

/**
 * Fetch cosmetics data
 * @returns {Promise<Array>} List of products
 */
async function fetchCosmeticsData() {
    try {
        const pluginUrl = window.sca_ajax_object ? window.sca_ajax_object.plugin_url : '';
        if (!pluginUrl) throw new Error('Plugin URL not found in sca_ajax_object');
        const response = await fetch(pluginUrl + 'data/cosmetics.json');
        if (!response.ok) throw new Error('Failed to load cosmetics data');
        return await response.json();
    } catch (error) {
        console.error('Error loading cosmetics data:', error);
        return [];
    }
}

/**
 * Get makeup recommendations for a specific season
 * @param {string} season - User's season (Spring, Summer, Autumn, Winter)
 * @returns {Promise<Array>} Recommended products with matching shades
 */
export async function getMakeupRecommendations(season, skinColorInfo = null) {
    // This function is kept for backward compatibility or full list access if needed
    // But we will primarily use getEssentialMakeup for the main display
    if (!season) return [];

    // Normalize season string
    const seasonKey = season.split(' ')[0]; // "True Spring" -> "Spring"

    // Extract advanced undertone info if available
    const advancedUndertone = skinColorInfo?.advancedUndertone || {};
    const isOlive = advancedUndertone.undertoneQuality === 'Olive';

    const products = await fetchCosmeticsData();
    const recommendations = [];

    for (const product of products) {
        if (!product.product_colors || product.product_colors.length === 0) continue;

        const matchingShades = product.product_colors.filter(shade => {
            if (!shade.hex_value) return false;

            // Use the new compatibility check
            return isShadeCompatible(shade, seasonKey, skinColorInfo, product.product_type);
        });

        if (matchingShades.length > 0) {
            recommendations.push({
                ...product,
                matching_shades: matchingShades
            });
        }
    }

    // Sort by number of matching shades (relevance)
    recommendations.sort((a, b) => b.matching_shades.length - a.matching_shades.length);

    // Map product types to display categories
    const categoryMap = {
        'foundation': 'Face',
        'blush': 'Face',
        'bronzer': 'Face',
        'powder': 'Face',
        'lipstick': 'Lips',
        'lip_liner': 'Lips',
        'eyeliner': 'Eyes',
        'eyeshadow': 'Eyes',
        'mascara': 'Eyes',
        'eyebrow': 'Eyes'
    };

    const categorizedRecommendations = recommendations.map(product => ({
        ...product,
        display_category: categoryMap[product.product_type] || 'Other'
    }));

    return categorizedRecommendations;
}

/**
 * Get Top 5 Essential Makeup Products
 * @param {string} season - User's season
 * @returns {Promise<Array>} List of 5 essential products
 */
export async function getEssentialMakeup(season, skinColorInfo = null) {
    const allRecommendations = await getMakeupRecommendations(season, skinColorInfo);

    // Define the 5 essential categories and their mapping to product_type
    const essentials = [
        { id: 'foundation', label: 'Foundation', types: ['foundation', 'powder'] },
        { id: 'blush', label: 'Blush', types: ['blush', 'bronzer'] },
        { id: 'lipstick', label: 'Lipstick', types: ['lipstick'] }, // Prioritize lipstick over liner for "Lipstick" slot
        { id: 'eyeliner', label: 'Eyeliner', types: ['eyeliner'] },
        { id: 'eyeshadow', label: 'Eyeshadow', types: ['eyeshadow'] }
    ];

    const selectedProducts = [];

    for (const category of essentials) {
        // Find the best product for this category
        // We look for products where product_type matches one of the types for this category
        const bestMatch = allRecommendations.find(p => category.types.includes(p.product_type));

        if (bestMatch) {
            selectedProducts.push({
                ...bestMatch,
                essential_label: category.label
            });
        }
    }

    return selectedProducts;
}
