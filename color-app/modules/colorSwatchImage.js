import { rgbToHex } from './colorUtils.js';
import { getColorRGB } from './colorDataUtils.js';

/**
 * Color Swatch Image Generator Module
 * 
 * This module handles the generation of a downloadable PNG image containing
 * a grid of unique color swatches from all color systems.
 */

/**
 * Gets all unique colors from pre-calculated advanced recommendations
 * @param {Object} advancedRecommendations - Pre-calculated color recommendations with colors array
 * @returns {Array} Array of unique color objects with hex values
 */
function getAllUniqueColors(advancedRecommendations) {
  try {
    // Use the pre-calculated colors (no need to regenerate)
    const colors = advancedRecommendations?.colors || [];

    // Filter to ensure all colors have hex values
    const validColors = colors.filter(color => color && color.hex);

    // Create a Map to deduplicate colors by hex value (case-insensitive)
    const uniqueColors = new Map();
    validColors.forEach(color => {
      const hexKey = color.hex.toLowerCase();
      if (!uniqueColors.has(hexKey)) {
        uniqueColors.set(hexKey, color);
      }
    });

    return Array.from(uniqueColors.values());
  } catch (error) {
    console.error('Error in getAllUniqueColors:', error);
    return [];
  }
}

/**
 * Generates a vertical "Wallet Card" / Story format image
 * @param {string} season - The season name
 * @param {Array} uniqueColors - Array of unique color objects
 * @param {Array} avoidColors - Array of avoid color objects
 * @param {Array} harmonyTips - Array of harmony tip objects
 * @param {Array} makeupProducts - Array of makeup product objects
 * @param {Object} categorizedColors - Categorized color palette object
 * @returns {string|null} Data URL of the generated PNG image, or null if error
 */
function generateWalletCardCanvas(season, uniqueColors, avoidColors, harmonyTips = [], makeupProducts = [], categorizedColors = null) {
  try {
    // Configuration
    const canvasWidth = 1080;
    const padding = 60;
    const backgroundColor = '#FFFFFF';
    const textColor = '#333333';

    // Grid Config
    const cols = 5;
    const swatchSize = 160;
    const gap = 20;

    // --- Data Mapping (Fix for Structure Mismatch) ---
    // recommendations.js returns: 
    // { top7: { anchors, accents, statements }, extended: { everyday, occasion, seasonal }, neutrals: { ... } }
    // We want to map this to a flat list for drawing.

    let displayCategories = {};
    const hasCategories = categorizedColors && Object.keys(categorizedColors).length > 0;

    if (hasCategories) {
      // Flatten the nested structure
      if (categorizedColors.top7) {
        if (categorizedColors.top7.anchors) displayCategories.anchors = categorizedColors.top7.anchors;
        if (categorizedColors.top7.accents) displayCategories.accents = categorizedColors.top7.accents;
        if (categorizedColors.top7.statements) displayCategories.statements = categorizedColors.top7.statements;
      }

      // Combine extended palettes into one large "Extended" group or keep separate?
      // Let's keep them somewhat separate but maybe group everyday + seasonal
      let extendedList = [];
      if (categorizedColors.extended) {
        if (categorizedColors.extended.everyday) extendedList.push(...categorizedColors.extended.everyday);
        if (categorizedColors.extended.seasonal) extendedList.push(...categorizedColors.extended.seasonal);
        if (categorizedColors.extended.occasion) extendedList.push(...categorizedColors.extended.occasion);
      }
      if (extendedList.length > 0) displayCategories.extended = extendedList;

      // Neutrals
      let neutralList = [];
      if (categorizedColors.neutrals) {
        if (categorizedColors.neutrals.basics) neutralList.push(...categorizedColors.neutrals.basics);
        if (categorizedColors.neutrals.layering) neutralList.push(...categorizedColors.neutrals.layering);
        if (categorizedColors.neutrals.grounding) neutralList.push(...categorizedColors.neutrals.grounding);
      }
      if (neutralList.length > 0) displayCategories.neutrals = neutralList;
    }

    // Check if we actually have data to display after mapping
    const validCategoryKeys = Object.keys(displayCategories).filter(k => displayCategories[k] && displayCategories[k].length > 0);
    const useCategorizedLayout = validCategoryKeys.length > 0;

    // --- Layout Calculations ---

    // 1. Header Height
    const headerHeight = 350; // Season name + subtitle

    // 2. Best Colors Grid Height (or Categorized Height)
    let colorSectionHeight = 0;

    if (useCategorizedLayout) {
      // Calculate height for each category section
      // Title (80) + Grid + Spacing(80)
      for (const key of validCategoryKeys) {
        const colors = displayCategories[key];
        const catRows = Math.ceil(colors.length / cols);
        const catHeight = 80 + (catRows * (swatchSize + gap)) + 80;
        colorSectionHeight += catHeight;
      }
      colorSectionHeight += 50; // Extra padding
    } else {
      // Fallback: Render ALL unique colors (no limit, flat grid)
      const displayColors = uniqueColors;
      const colorRows = Math.ceil(displayColors.length / cols);
      colorSectionHeight = (colorRows * (swatchSize + gap)) + 100; // +100 for spacing
    }


    // 3. Harmony Tips Height
    let harmonySectionHeight = 0;
    if (harmonyTips && Array.isArray(harmonyTips) && harmonyTips.length > 0) {
      harmonySectionHeight += 150; // Title "Outfit Inspirations"
      // Estimate height per tip (Title + Desc + Visuals)
      const tipCols = 2;
      const tipRows = Math.ceil(harmonyTips.length / tipCols);
      const tipRowHeight = 550; // Approximate height for a tip card/section
      harmonySectionHeight += (tipRows * tipRowHeight) + 50;
    }

    // 4. Makeup Section Height
    let makeupSectionHeight = 0;
    if (makeupProducts && Array.isArray(makeupProducts) && makeupProducts.length > 0) {
      makeupSectionHeight += 150; // Title
      const makeupCols = 2; // 2 cols layout
      const makeupRows = Math.ceil(makeupProducts.length / makeupCols);
      const makeupRowHeight = 250; // Height per item
      makeupSectionHeight += (makeupRows * makeupRowHeight) + 100;
    }

    // 5. Avoid Colors Height
    let avoidSectionHeight = 0;
    if (avoidColors && Array.isArray(avoidColors) && avoidColors.length > 0) {
      avoidSectionHeight += 150; // Title
      const avoidSwatchSize = 120;
      const avoidGap = 30;
      const avoidCols = Math.min(avoidColors.length, 6); // Max 6 per row
      const avoidRows = Math.ceil(avoidColors.length / 6); // Allow multiple rows if needed
      avoidSectionHeight += (avoidRows * (avoidSwatchSize + avoidGap + 60)) + 50; // +60 for text below
    }

    // 6. Footer Height
    const footerHeight = 100;

    // Total Dynamic Height
    const totalHeight = headerHeight + colorSectionHeight + harmonySectionHeight + makeupSectionHeight + avoidSectionHeight + footerHeight;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, totalHeight);

    // --- Draw Content ---
    let currentY = 120;

    // 1. Header
    ctx.fillStyle = textColor;
    ctx.font = 'bold 120px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(season, canvasWidth / 2, currentY);

    currentY += 80;
    ctx.font = '40px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('YOUR PERSONAL COLOR PALETTE', canvasWidth / 2, currentY);

    currentY += 150;

    // 2. Best Colors (Categorized or Flat)
    if (useCategorizedLayout) {
      // Draw Categorized Sections
      const categoryTitles = {
        anchors: "Anchors / Basics",
        accents: "Accents",
        statements: "Statement Colors",
        extended: "Extended Palette",
        neutrals: "Neutrals"
      };

      // Define standard order
      const categoryOrder = ['anchors', 'accents', 'statements', 'extended', 'neutrals'];

      categoryOrder.forEach(key => {
        // Skip if not in our valid list
        if (!validCategoryKeys.includes(key)) return;

        const colors = displayCategories[key];
        if (!colors || !Array.isArray(colors) || colors.length === 0) return; // SAFETY CHECK

        // Draw Category Title
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 50px "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'left';
        // Calculate grid start X to align title with grid
        const gridWidth = (cols * swatchSize) + ((cols - 1) * gap);
        const startX = (canvasWidth - gridWidth) / 2;

        ctx.fillText(categoryTitles[key] || "Colors", startX, currentY);
        currentY += 60; // Spacing after title

        colors.forEach((color, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;

          const x = startX + (col * (swatchSize + gap));
          const y = currentY + (row * (swatchSize + gap));

          // Draw swatch
          ctx.fillStyle = color.hex;
          ctx.fillRect(x, y, swatchSize, swatchSize);

          // Draw border
          ctx.strokeStyle = '#E0E0E0';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, swatchSize, swatchSize);
        });

        const catRows = Math.ceil(colors.length / cols);
        currentY += (catRows * (swatchSize + gap)) + 80; // Spacing for next section
      });

    } else {
      // Draw Flat Grid
      const displayColors = uniqueColors;
      const colorRows = Math.ceil(displayColors.length / cols);
      const gridWidth = (cols * swatchSize) + ((cols - 1) * gap);
      const startX = (canvasWidth - gridWidth) / 2;

      displayColors.forEach((color, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const x = startX + (col * (swatchSize + gap));
        const y = currentY + (row * (swatchSize + gap));

        // Draw swatch
        ctx.fillStyle = color.hex;
        ctx.fillRect(x, y, swatchSize, swatchSize);

        // Draw border
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, swatchSize, swatchSize);
      });
      currentY += (colorRows * (swatchSize + gap)) + 100;
    }


    // 3. Harmony Tips Section
    if (harmonyTips && Array.isArray(harmonyTips) && harmonyTips.length > 0) {
      // Section Title
      ctx.fillStyle = '#7B48FF'; // Brand color
      ctx.font = 'bold 60px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OUTFIT INSPIRATIONS', canvasWidth / 2, currentY);

      currentY += 100;

      const tipCols = 2;
      const tipWidth = (canvasWidth - (padding * 2) - gap) / tipCols;
      const tipStartX = padding;

      harmonyTips.forEach((tip, index) => {
        const row = Math.floor(index / tipCols);
        const col = index % tipCols;

        const x = tipStartX + (col * (tipWidth + gap));
        const y = currentY + (row * 550); // Fixed row height

        const centerX = x + (tipWidth / 2);
        let tipY = y + 50;

        // Tip Title
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 36px "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tip.title, centerX, tipY);

        tipY += 50;

        // Tip Description (Wrap text)
        ctx.fillStyle = '#666666';
        ctx.font = '24px Arial';
        const words = tip.description.split(' ');
        let line = '';
        const maxWidth = tipWidth - 40;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, centerX, tipY);
            line = words[n] + ' ';
            tipY += 35;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, centerX, tipY);

        tipY += 60;

        // Visual Stack
        const colors = tip.colors || [];
        const stackSize = 100;
        const stackOverlap = 40;
        const totalStackWidth = (colors.length * stackSize) - ((colors.length - 1) * stackOverlap);
        let stackX = centerX - (totalStackWidth / 2) + (stackSize / 2); // Center alignment adjustment

        colors.forEach((c, i) => {
          const cx = stackX + (i * (stackSize - stackOverlap));
          const cy = tipY + (stackSize / 2);

          ctx.beginPath();
          ctx.arc(cx, cy, stackSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = c.hex;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 4;
          ctx.stroke();
        });
        // Reset shadow
        ctx.shadowColor = 'transparent';

      });

      const tipRows = Math.ceil(harmonyTips.length / tipCols);
      currentY += (tipRows * 550) + 50;
    }

    // 4. Makeup Section (New!)
    if (makeupProducts && Array.isArray(makeupProducts) && makeupProducts.length > 0) {
      // Section Title
      ctx.fillStyle = '#E91E63'; // Pinkish for makeup
      ctx.font = 'bold 60px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MAKEUP ESSENTIALS', canvasWidth / 2, currentY); // Use a distinct title

      currentY += 100;

      const mkCols = 2; // 2 columns
      const mkWidth = (canvasWidth - (padding * 2) - 40) / mkCols;
      const mkStartX = padding;
      const mkRowHeight = 250;

      makeupProducts.forEach((prod, index) => {
        const row = Math.floor(index / mkCols);
        const col = index % mkCols;

        const x = mkStartX + (col * (mkWidth + 40));
        const y = currentY + (row * mkRowHeight);

        // Draw Product Container
        // Swatch on Left, Text on Right
        const swatchSize = 120;
        const swatchX = x + 20;
        const swatchY = y + 20;

        // Swatch
        ctx.beginPath();
        ctx.arc(swatchX + (swatchSize / 2), swatchY + (swatchSize / 2), swatchSize / 2, 0, 2 * Math.PI);
        ctx.fillStyle = prod.shadeHex || '#DDDDDD';
        ctx.fill();
        ctx.strokeStyle = '#EEEEEE';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text Details
        const textX = swatchX + swatchSize + 30;
        const textY = swatchY + 40;

        ctx.textAlign = 'left';

        // Product Type (Small Label)
        ctx.fillStyle = '#999999';
        ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(prod.name.toUpperCase(), textX, textY);

        // Brand (Main)
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 28px "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(prod.brand, textX, textY + 35);

        // Shade Name
        ctx.fillStyle = '#666666';
        ctx.font = 'italic 24px "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(prod.shadeName, textX, textY + 70);

      });

      const mkRows = Math.ceil(makeupProducts.length / mkCols);
      currentY += (mkRows * mkRowHeight) + 80;
    }


    // 5. Avoid Colors Section
    if (avoidColors && Array.isArray(avoidColors) && avoidColors.length > 0) {
      // Section Title
      ctx.fillStyle = '#D32F2F'; // Red color for warning
      ctx.font = 'bold 60px "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COLORS TO AVOID', canvasWidth / 2, currentY);

      currentY += 100;

      // Avoid Swatches
      const avoidSwatchSize = 120;
      const avoidGap = 30;
      const avoidCols = 6; // Fixed columns

      // Calculate centering
      const rowWidth = (Math.min(avoidColors.length, avoidCols) * avoidSwatchSize) + ((Math.min(avoidColors.length, avoidCols) - 1) * avoidGap);
      const avoidStartX = (canvasWidth - rowWidth) / 2;

      avoidColors.forEach((item, index) => {
        const row = Math.floor(index / avoidCols);
        const col = index % avoidCols;

        // Let's center the specific row.
        const itemsInThisRow = Math.min(avoidColors.length - (row * avoidCols), avoidCols);
        const thisRowWidth = (itemsInThisRow * avoidSwatchSize) + ((itemsInThisRow - 1) * avoidGap);
        const thisRowStartX = (canvasWidth - thisRowWidth) / 2;

        const x = thisRowStartX + (col * (avoidSwatchSize + avoidGap));
        const y = currentY + (row * (avoidSwatchSize + avoidGap + 60));

        // Get color hex
        const colorInfo = getColorRGB(item.name);
        const hex = colorInfo && colorInfo.rgb ? rgbToHex(colorInfo.rgb) : '#CCCCCC';

        // Draw swatch circle
        ctx.beginPath();
        ctx.arc(x + avoidSwatchSize / 2, y + avoidSwatchSize / 2, avoidSwatchSize / 2, 0, 2 * Math.PI);
        ctx.fillStyle = hex;
        ctx.fill();
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw X overlay
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 20);
        ctx.lineTo(x + avoidSwatchSize - 20, y + avoidSwatchSize - 20);
        ctx.moveTo(x + avoidSwatchSize - 20, y + 20);
        ctx.lineTo(x + 20, y + avoidSwatchSize - 20);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 8;
        ctx.stroke();

        // Color Name
        ctx.fillStyle = '#333333';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';

        // Wrap name if too long
        const nameWords = item.name.split(' ');
        if (nameWords.length > 1 && ctx.measureText(item.name).width > avoidSwatchSize) {
          ctx.fillText(nameWords[0], x + avoidSwatchSize / 2, y + avoidSwatchSize + 30);
          ctx.fillText(nameWords.slice(1).join(' '), x + avoidSwatchSize / 2, y + avoidSwatchSize + 55);
        } else {
          ctx.fillText(item.name, x + avoidSwatchSize / 2, y + avoidSwatchSize + 40);
        }
      });
    }

    // Footer / Branding
    ctx.fillStyle = '#999999';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by Skin Color Analyzer', canvasWidth / 2, totalHeight - 50);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error in generateWalletCardCanvas:', error);
    return null;
  }
}

/**
 * Creates a wallet card palette image
 * @param {string} season - The season name
 * @param {Object} advancedRecommendations - Pre-calculated advanced color recommendations
 * @param {Array} avoidColors - Array of colors to avoid
 * @param {Array} harmonyTips - Array of harmony tips
 * @param {Array} makeupProducts - Array of makeup products (New)
 * @param {Object} categorizedColors - Categorized color palette (New)
 * @returns {string|null} Data URL of the generated PNG image, or null if error
 */
export function createWalletCardImage(season, advancedRecommendations, avoidColors, harmonyTips = [], makeupProducts = [], categorizedColors = null) {
  try {
    const uniqueColors = getAllUniqueColors(advancedRecommendations);
    if (!uniqueColors.length) {
      console.warn('No colors found to generate wallet card');
      return null;
    }

    return generateWalletCardCanvas(season, uniqueColors, avoidColors, harmonyTips, makeupProducts, categorizedColors);
  } catch (error) {
    console.error('Error in createWalletCardImage:', error);
    return null;
  }
}

/**
 * Creates a full color palette image from pre-calculated color recommendations
 * @deprecated Use createWalletCardImage instead for the new format
 * @param {Object} advancedRecommendations - Pre-calculated advanced color recommendations
 * @returns {string|null} Data URL of the generated PNG image, or null if error
 */
export function createFullColorPaletteImage(advancedRecommendations) {
  try {
    const uniqueColors = getAllUniqueColors(advancedRecommendations);
    if (!uniqueColors.length) {
      console.warn('No colors found to generate palette image');
      return null;
    }

    // Fallback to old grid if needed, but we are moving to wallet card
    // For now, let's just return the wallet card with default params if called directly
    // Or keep the old logic if strictly needed. 
    // The user asked to "Modify this to create a slim 'Story' format", so we can just redirect.
    return createWalletCardImage('My Season', advancedRecommendations, []);
  } catch (error) {
    console.error('Error in createFullColorPaletteImage:', error);
    return null;
  }
}