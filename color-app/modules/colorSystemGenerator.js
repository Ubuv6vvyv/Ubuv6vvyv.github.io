/**
 * Color System Generator Module
 * 
 * This module handles the generation of HTML for various color systems
 * used in the advanced color analysis section.
 */

import { rgbToHex, escapeHTML, hexToRgb } from './colorUtils.js';

// Export only the HTML generation function
export {
  generateColorSystemsHTML
};

/**
 * Generates HTML for the color systems section of the advanced analysis
 * @param {Object} skinColorInfo - Complete skin color analysis info
 * @param {string|null} imageDataURL - The uploaded image data URL
 * @returns {string} HTML content for the color systems section
 */
function generateColorSystemsHTML(skinColorInfo, imageDataURL = null) {
  if (!skinColorInfo) {
    return '<p>No skin color information available. Please complete the analysis first.</p>';
  }

  try {
    // Use pre-calculated advanced recommendations from analysis phase
    const advancedRecommendations = skinColorInfo.advancedRecommendations || { personalColors: [], analyticalColors: [], systemsData: {} };
    const { personalColors, analyticalColors, systemsData } = advancedRecommendations;
    const season = skinColorInfo.seasonal?.season || 'Spring';

    const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;
    const loginUrl = typeof sca_ajax_object !== 'undefined' ? sca_ajax_object.login_url : '#';

    let html = `
      <div class="color-systems-container">
        
        <!-- Personal Colors Section -->
        <div class="system-group-section">
          <div class="color-systems-header">
            <h3>Colors That Make You Look Amazing</h3>
          </div>
          
          <div class="combined-colors-section">
            <div class="combined-colors-grid">
              ${createPersonalPaletteGrid(personalColors, systemsData, hasActiveSubscription, loginUrl, season)}
            </div>
          </div>
        </div>

        <!-- Analytical Tools Section -->
        <div class="system-group-section">
          <div class="color-systems-header">
            <h3>More Great Choices</h3>
          </div>

          <div class="analytical-tools-grid">
            ${createAnalyticalGrids(analyticalColors, systemsData, hasActiveSubscription, loginUrl, season)}
          </div>
        </div>

      </div>
    `;

    return html;
  } catch (error) {
    console.error("Error in generateColorSystemsHTML:", error);
    return '<p>Oops! Something went wrong. Please try again!</p>';
  }
}

/**
 * Creates HTML for the personal palette grid (Zyla, HoC, CMB)
 */
function createPersonalPaletteGrid(colors, systemsData, hasActiveSubscription, loginUrl, season) {
  if (!colors || !Array.isArray(colors) || colors.length === 0) {
    return '<div class="no-colors-message">No personal color recommendations available</div>';
  }

  // Filter out any non-personal systems just in case
  const personalSystemKeys = ['zyla', 'houseOfColor', 'colorMeBeautiful'];

  // Categorize Colors based on overlap AND context compatibility
  const consensusMatches = []; // Recommended by 2+ systems with compatible context
  const systemMatches = []; // Recommended by 1 system

  colors.forEach(color => {
    // Count how many PERSONAL systems recommend this
    // Note: color.systems is now an array of objects { id, context }
    const personalSystems = color.systems ? color.systems.filter(s => personalSystemKeys.includes(s.id)) : [];

    if (personalSystems.length >= 2) {
      // Check for context compatibility (e.g., all "Autumn" or all "Warm")
      const contexts = personalSystems.map(s => s.context.toLowerCase());
      const isCompatible = checkContextCompatibility(contexts);

      if (isCompatible) {
        consensusMatches.push(color);
      } else {
        // If contexts conflict (e.g. Winter vs Autumn), treat as separate recommendations
        systemMatches.push(color);
      }
    } else {
      systemMatches.push(color);
    }
  });

  // Sort function
  const sortColors = (a, b) => {
    const aCount = a.systems ? a.systems.length : 0;
    const bCount = b.systems ? b.systems.length : 0;
    return bCount - aCount;
  };

  consensusMatches.sort(sortColors);
  systemMatches.sort(sortColors);

  let html = '<div class="advanced-color-grid-wrapper">';

  if (consensusMatches.length > 0) {
    // Determine dominant context for the title
    const dominantContext = getDominantContext(consensusMatches);
    html += renderColorSection(`${dominantContext} Top Matches`, consensusMatches, "🔥", systemsData, hasActiveSubscription, true, season);
  }

  if (systemMatches.length > 0) {
    html += renderColorSection("More Good Matches", systemMatches, "✨", systemsData, hasActiveSubscription, true, season);
  }

  html += '</div>';
  return html;
}

/**
 * Helper to check if contexts are compatible
 */
function checkContextCompatibility(contexts) {
  if (contexts.length < 2) return true;

  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const foundSeasons = new Set();

  contexts.forEach(ctx => {
    seasons.forEach(season => {
      if (ctx.includes(season)) foundSeasons.add(season);
    });
  });

  // If multiple different seasons are found, it's incompatible (e.g. Winter + Autumn)
  if (foundSeasons.size > 1) return false;

  return true;
}

/**
 * Helper to get dominant context for title
 */
function getDominantContext(colors) {
  const counts = {};
  colors.forEach(c => {
    c.systems.forEach(s => {
      if (s.context) {
        const ctx = s.context.split(' ')[1] || s.context.split(' ')[0]; // Try to get Season
        if (['Spring', 'Summer', 'Autumn', 'Winter'].includes(ctx)) {
          counts[ctx] = (counts[ctx] || 0) + 1;
        }
      }
    });
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : "Cross-System";
}

/**
 * Creates HTML for analytical tools (Pantone, Munsell, etc.)
 */
function createAnalyticalGrids(colors, systemsData, hasActiveSubscription, loginUrl, season) {
  if (!colors || !Array.isArray(colors) || colors.length === 0) {
    return '';
  }

  // Group by system
  const systemGroups = {};
  colors.forEach(color => {
    if (color.systems) {
      color.systems.forEach(sysObj => {
        const sysId = sysObj.id;
        if (!systemGroups[sysId]) systemGroups[sysId] = [];
        // Clone color to avoid mutating original if used elsewhere
        systemGroups[sysId].push(color);
      });
    }
  });

  let html = '<div class="analytical-grids-container">';

  // Render Pantone
  if (systemGroups['pantone']) {
    html += renderColorSection("Pantone Matches", systemGroups['pantone'], "🌈", systemsData, hasActiveSubscription, false, season);
  }

  // Render Munsell
  if (systemGroups['munsell']) {
    html += renderColorSection("Munsell Notation", systemGroups['munsell'], "📚", systemsData, hasActiveSubscription, false, season);
  }

  // Render Color Harmony
  if (systemGroups['colorHarmony']) {
    html += renderColorSection("Color Harmony", systemGroups['colorHarmony'], "🎨", systemsData, hasActiveSubscription, false, season);
  }

  // Render Monk Scale
  if (systemGroups['monkScale']) {
    html += renderColorSection("Monk Scale", systemGroups['monkScale'], "🏽", systemsData, hasActiveSubscription, false, season);
  }

  html += '</div>';
  return html;
}

/**
 * Generic function to render a section of colors
 */
function renderColorSection(title, colorList, icon, systemsData, hasActiveSubscription, showSystemTags, season) {
  if (!colorList || colorList.length === 0) return '';

  const restrictedSystemKeys = ['munsell', 'scicolor'];

  let sectionHtml = `
    <div class="color-section">
      <h4 class="color-section-title">${title}</h4>
      <div class="advanced-color-grid">
  `;

  colorList.forEach(color => {
    // Handle new system object structure
    const systemIds = color.systems ? color.systems.map(s => s.id) : [];
    const systemClasses = systemIds.map(sys => `system-${sys}`).join(' ');
    const systemsAttribute = systemIds.length > 0 ? `data-systems="${systemIds.join(',')}"` : '';

    const isRestrictedSwatch = !hasActiveSubscription && systemIds.some(sid => restrictedSystemKeys.includes(sid));

    let swatchOverlayHTML = '';
    if (isRestrictedSwatch) {
      const systemName = systemIds.map(sid => systemsData[sid]?.name).find(name => name) || 'these';
      swatchOverlayHTML = `
        <div class="sca-swatch-overlay glass-overlay">
          <div class="lock-icon-container">
            <span class="lock-icon">🔒</span>
          </div>
          <div class="overlay-content">
            <div class="overlay-title">Unlock ${escapeHTML(systemName)}</div>
            <button class="sca-upgrade-btn-small sca-upgrade-link">Unlock Now</button>
          </div>
        </div>
      `;
    }

    const rgb = color.rgb || hexToRgb(color.hex);

    // Calculate CMYK (simplified)
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const k = 1 - Math.max(r, g, b);
    const c = k === 1 ? 0 : Math.round(((1 - r - k) / (1 - k)) * 100);
    const m = k === 1 ? 0 : Math.round(((1 - g - k) / (1 - k)) * 100);
    const y = k === 1 ? 0 : Math.round(((1 - b - k) / (1 - k)) * 100);
    const kVal = Math.round(k * 100);

    // Determine text color for contrast
    const brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000);
    const textColor = brightness > 125 ? 'black' : 'white';

    let innerContent = '';
    if (!isRestrictedSwatch) {
      innerContent = `
        <div class="color-swatch-inner">
          <h4 class="color-name">${escapeHTML(color.name)}</h4>
          <div class="color-details">
             <span class="color-value">${color.hex}</span>
             <span class="color-value">RGB: ${rgb.join(', ')}</span>
          </div>
        </div>
      `;

      // Only show system tags if requested (e.g. for Personal Palette)
      if (showSystemTags && color.systems && color.systems.length > 0) {
        // Generate rich tooltips with context
        const systemInfo = color.systems.map(s => {
          let icon = '';
          if (s.id === 'zyla') icon = '👁️';
          if (s.id === 'houseOfColor') icon = '🏠';
          if (s.id === 'colorMeBeautiful') icon = '💄';

          return `<span title="${systemsData[s.id]?.name}: ${s.context}">${icon}</span>`;
        }).join(' ');


      }
    }

    // Determine texture class based on season
    const isSilk = ['Winter', 'Spring'].includes(season);
    const textureClass = isSilk ? 'texture-silk' : 'texture-linen';

    sectionHtml += `
      <div class="color-swatch-container ${systemClasses} ${textureClass}" ${systemsAttribute} style="background-color: ${isRestrictedSwatch ? '#f0f0f0' : color.hex}; color: ${textColor}">
        ${innerContent}
        ${swatchOverlayHTML}
      </div>
    `;
  });

  sectionHtml += `
      </div>
    </div>
  `;
  return sectionHtml;
}
