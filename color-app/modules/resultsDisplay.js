import { rgbToHex, hexToRgb } from './colorUtils.js';
import { getColorRGB, standardizeColor } from './colorDataUtils.js';
import { updateProgressBar } from './uiUtils.js';
import {
  generateColorSystemsHTML // For the advanced analysis section
} from './colorSystemGenerator.js';
import { getSisterSeasonAdvice } from './colorAnalysis.js';
import { getColorsToAvoid, generateHarmonyTips, getCategorizedRecommendations, getContrastAdvice, getStyleDNA } from './recommendations.js';
import { getMakeupRecommendations, getEssentialMakeup } from './makeupRecommendations.js';
import { createCelebrityCarousel } from './celebrityCarousel.js';
import { createFullColorPaletteImage, createWalletCardImage } from './colorSwatchImage.js';

// --- HTML Escaping Helper ---
function escapeHTML(str) {
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

// --- Constants ---
const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
const SEASON_ICONS = {
  'Spring': [
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><circle cx=\'50\' cy=\'50\' r=\'40\' fill=\'%23FFD700\'/><circle cx=\'50\' cy=\'50\' r=\'15\' fill=\'%23FF8C00\'/><path d=\'M50,10 L50,2 M78,22 L84,16 M90,50 L98,50 M78,78 L84,84 M50,90 L50,98 M22,78 L16,84 M10,50 L2,50 M22,22 L16,16\' stroke=\'%23FFD700\' stroke-width=\'4\' stroke-linecap=\'round\'/></svg>" alt="Flower icon">',
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><circle cx=\'50\' cy=\'50\' r=\'35\' fill=\'%23FF80AB\'/><circle cx=\'50\' cy=\'50\' r=\'12\' fill=\'%23FFEB3B\'/><path d=\'M50,15 L50,5 M75,25 L83,17 M85,50 L95,50 M75,75 L83,83 M50,85 L50,95 M25,75 L17,83 M15,50 L5,50 M25,25 L17,17\' stroke=\'%23FF80AB\' stroke-width=\'4\' stroke-linecap=\'round\'/></svg>" alt="Flower icon">'
  ],
  'Summer': [
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><circle cx=\'50\' cy=\'50\' r=\'35\' fill=\'%23B39DDB\'/><circle cx=\'50\' cy=\'50\' r=\'12\' fill=\'%237986CB\'/><path d=\'M50,15 L50,5 M75,25 L83,17 M85,50 L95,50 M75,75 L83,83 M50,85 L50,95 M25,75 L17,83 M15,50 L5,50 M25,25 L17,17\' stroke=\'%23B39DDB\' stroke-width=\'4\' stroke-linecap=\'round\'/></svg>" alt="Flower icon">',
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><path d=\'M30,50 C30,30 50,10 70,30 C90,50 70,90 50,70 C30,50 10,70 30,50 Z\' fill=\'%2381D4FA\' stroke=\'%234FC3F7\' stroke-width=\'2\'/></svg>" alt="Butterfly icon">'
  ],
  'Autumn': [
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><path d=\'M20,80 Q50,50 80,80 L75,30 Q50,60 25,30 Z\' fill=\'%23FF9800\' stroke=\'%23F57C00\' stroke-width=\'2\'/></svg>" alt="Leaf icon">',
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><path d=\'M30,70 Q50,40 70,70 L65,30 Q50,50 35,30 Z\' fill=\'%23A1887F\' stroke=\'%238D6E63\' stroke-width=\'2\'/></svg>" alt="Leaf icon">'
  ],
  'Winter': [
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><path d=\'M50,10 L50,90 M30,20 L70,80 M20,30 L80,70 M10,50 L90,50 M20,70 L80,30 M30,80 L70,20\' stroke=\'%2380DEEA\' stroke-width=\'4\' stroke-linecap=\'round\'/></svg>" alt="Snowflake icon">',
    '<img class="season-icon" src="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><path d=\'M50,15 L50,85 M35,25 L65,75 M25,35 L75,65 M15,50 L85,50 M25,65 L75,35 M35,75 L65,25\' stroke=\'%23B3E5FC\' stroke-width=\'3\' stroke-linecap=\'round\'/></svg>" alt="Snowflake icon">'
  ]
};

/**
 * Creates a compact user profile section with season, undertone, intensity, etc.
 * @param {Object} skinColorInfo - The skin color analysis results.
 * @param {string|null} imageDataURL - The uploaded image data URL.
 * @returns {HTMLElement|null} The user profile section element or null if an error occurs.
 */
function createCompactUserProfile(skinColorInfo, imageDataURL) {
  try {
    const {
      rgb: skinRGB = [0, 0, 0],
      hex: skinHex = rgbToHex(skinRGB),
      seasonal = {},
      enhancedSeasonal = {},
      advancedUndertone = {},
      temperatureAnalysis = {},
      clarityAnalysis = {},
      contrastAnalysis = {},
      munsell = {},
      scientificClothingRecommendations = [],
      fitzpatrick = {}
    } = skinColorInfo || {};
    const season = seasonal.season || 'Spring';
    const sortedClothingColors = Array.isArray(scientificClothingRecommendations)
      ? scientificClothingRecommendations.map(color => standardizeColor(color))
      : [];

    // Check for active subscription
    const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

    const profileHTML = `
      <div class="user-season-profile modern-profile">
        <div class="profile-content-column">

          <div class="profile-content-column-start">
            ${createProfileImageHTML(imageDataURL)}
            ${createProfileTagsHTML(skinColorInfo)}
          </div>

          <div class="profile-content-column-middle">
            ${createSeasonIconsHTML(season)}
            <div class="res-season-super">Analysis Complete</div>
            <h3 class="season-name">${escapeHTML(season)}</h3>
            ${createSeasonalSubtypeHTML(enhancedSeasonal)}
            ${createSisterSeasonAdviceHTML(enhancedSeasonal.subSeason || season, contrastAnalysis.contrastLevel)}
          </div>

          <div class="profile-content-column-end">

            ${!hasActiveSubscription ? `
            <div class="res-upsell-card">
              <div class="res-lock-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            
              <h3 class="res-upsell-title">Unlock Pro Report</h3>
              <p class="res-upsell-desc">Get your Celebrity Twin, 60+ Extended Colors, and Makeup guide.</p>

              <div class="res-blur-container">
                <div class="res-blur-placeholder-row">
                    <div class="res-blur-placeholder-circle"></div>
                    <div class="res-blur-text-group">
                        <div class="res-blur-placeholder-line-long"></div>
                        <div class="res-blur-placeholder-line-short"></div>
                    </div>
                </div>
                <div class="res-blur-placeholder-grid">
                    <div class="res-blur-placeholder-rect"></div>
                    <div class="res-blur-placeholder-rect"></div>
                    <div class="res-blur-placeholder-rect"></div>
                    <div class="res-blur-placeholder-rect"></div>
                </div>
              </div>

              <button class="res-pro-btn sca-upgrade-link" data-feature="Full Report">
                Unlock Full Access ($2.99)
              </button>
              <div class="res-upsell-footer">One-time payment. Lifetime access.</div>
            </div>
            ` : ''}

          </div>
        </div>
      </div>
    `;
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = profileHTML.trim();
    return tempContainer.firstChild;
  } catch (error) {
    console.error("Error creating user profile:", error);
    return null;
  }
}

/**
 * Creates HTML for the profile image
 * @param {string|null} imageDataURL - The uploaded image data URL.
 * @returns {string} HTML for profile image section
 */
function createProfileImageHTML(imageDataURL) {
  // More robust check for image data URL
  if (imageDataURL && typeof imageDataURL === 'string' && imageDataURL.startsWith('data:image')) {
    return `
      <div class="profile-image-circle">
        <img src="${imageDataURL}" alt="Your profile image" class="profile-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="no-image-fallback" style="display: none; font-size: 16px; color: #7b48ff; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #f0f0f0;">
          No Photo
        </div>
      </div>
    `;
  } else {
    return `
      <div class="profile-image-circle">
        <div style="font-size: 16px; color: #7b48ff; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #f0f0f0;">
          No Photo
        </div>
      </div>
    `;
  }
}

/**
 * Creates HTML for season icons
 * @param {string} season - The user's season
 * @returns {string} HTML for season icons
 */
function createSeasonIconsHTML(season) {
  const icons = SEASON_ICONS[season] || SEASON_ICONS['Spring'];
  return `<div class="season-icons">${icons.join('')}</div>`;
}

/**
 * Creates HTML for seasonal subtype info
 * @param {Object} enhancedSeasonal - Enhanced seasonal info
 * @returns {string} HTML for subtype section
 */
function createSeasonalSubtypeHTML({ subtype, tone }) {
  return (subtype || tone)
    ? `<div class="seasonal-subtype">${escapeHTML(subtype || tone)}</div>`
    : '';
}

/**
 * Creates HTML for profile tags
 * @param {Object} skinColorInfo - Skin color analysis info
 * @returns {string} HTML for profile tags
 */
function createProfileTagsHTML(skinColorInfo) {
  const {
    seasonal = {},
    advancedUndertone = {},
    temperatureAnalysis = {},
    clarityAnalysis = {},
    contrastAnalysis = {},
    munsell = {},
    fitzpatrick = {}
  } = skinColorInfo;

  // Start profile tags container
  let html = '<div class="profile-tags">';

  // Temperature and undertone tag
  let undertoneInfo = '';
  let tooltipContent = '';

  if (advancedUndertone.undertoneQuality) {
    const qualityText = escapeHTML(advancedUndertone.undertoneQuality);
    tooltipContent = `${qualityText} undertone`;

    if (advancedUndertone.undertoneScore) {
      tooltipContent += ` (Score: ${escapeHTML(Math.abs(advancedUndertone.undertoneScore).toFixed(1))})`;
    }

    undertoneInfo = `
      <span class="separator"> • </span>
      <span class="undertone-quality">${qualityText}</span>
    `;
  }

  html += `
    <span class="profile-tag temp-tag" data-tooltip="Temperature" title="${escapeHTML(tooltipContent)}">
      <div class="undertone-display">
        <span class="analysis-temperature">${escapeHTML(temperatureAnalysis.temperature || 'Neutral')}</span>
        ${undertoneInfo}
      </div>
    </span>
  `;

  // Intensity tag
  const intensityValue = clarityAnalysis.clarity || seasonal.intensity || 'Neutral';
  html += `
    <span class="profile-tag intensity-tag" data-tooltip="Intensity">
      <span class="analysis-intensity">${escapeHTML(intensityValue)}</span>
    </span>
  `;

  // Contrast tag if available
  if (contrastAnalysis && contrastAnalysis.contrast) {
    html += `
      <span class="profile-tag contrast-tag" data-tooltip="Contrast">
        <span class="analysis-contrast">${escapeHTML(contrastAnalysis.contrast)}</span>
      </span>
    `;
  }

  // Add Fitzpatrick tag if available
  if (fitzpatrick && (fitzpatrick.type || fitzpatrick.score)) {
    const fitzpatrickText = fitzpatrick.type || `Type ${fitzpatrick.score}` || '';
    if (fitzpatrickText) {
      html += `
        <span class="profile-tag fitzpatrick-tag" data-tooltip="Fitzpatrick">
          <span class="analysis-fitzpatrick">${escapeHTML(fitzpatrickText)}</span>
        </span>
      `;
    }
  }

  // Munsell tag if available
  if (munsell && (munsell.notation || munsell.hueName)) {
    let munsellText = '';

    if (munsell.notation) {
      munsellText = munsell.notation;
    } else if (munsell.hueName && munsell.value && munsell.chroma) {
      // Munsell notation (e.g., 5R 5/10) components are usually safe, but escape name just in case.
      munsellText = `${escapeHTML(munsell.hueName)} ${escapeHTML(munsell.value)}/${escapeHTML(munsell.chroma)}`;
    }

    if (munsellText) { // munsellText itself is now composed of escaped parts or is directly from notation
      html += `
        <span class="profile-tag munsell-tag" data-tooltip="Munsell">
          <span class="analysis-munsell">${escapeHTML(munsellText)}</span>
        </span>
      `;
    }
  }

  // Close tags container
  html += '</div>';
  return html;
}

/**
 * Creates HTML for Sister Season advice
 * @param {string} season - The user's season
 * @param {string} contrastLevel - The user's contrast level
 * @returns {string} HTML for sister season advice
 */
function createSisterSeasonAdviceHTML(season, contrastLevel) {
  const advice = getSisterSeasonAdvice(season, contrastLevel);
  if (!advice) return '';

  return `
    <div class="sister-season-advice">
      <strong>Quick Tip:</strong>
      ${escapeHTML(advice)}
    </div>
  `;
}

// --- Core Display Functions ---

/**
 * Shows an upgrade popup for premium features
 * @param {string} featureName - Name of the premium feature
 * @param {string} loginUrl - URL to redirect for login/upgrade
 */
/**
 * Handles Pro feature actions (upgrade popup or direct checkout)
 * @param {string} featureName - Name of the feature being accessed
 * @param {string} loginUrl - URL for login
 */
function handleProAction(featureName, loginUrl) {
  const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

  if (hasActiveSubscription) {
    // Already has access, just return
    return;
  }

  // Open Paddle checkout for non-logged-in users
  if (typeof Paddle === 'undefined') {
    console.error('Paddle.js is not loaded.');
    alert('Could not connect to the payment processor. Please try again later.');
    return;
  }

  const paddlePriceId = window.sca_ajax_object?.paddle_plan_id;
  if (!paddlePriceId) {
    console.error('Paddle Price ID is not available.');
    alert('The product ID is missing. Cannot proceed with checkout.');
    return;
  }

  const userId = window.sca_ajax_object?.user_id || 0;
  const userEmail = window.sca_ajax_object?.user_email || '';

  const checkoutOptions = {
    items: [{ priceId: paddlePriceId, quantity: 1 }],
    customData: {
      user_id: userId // Pass WP User ID to webhook
    },
    settings: {
      successUrl: window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'payment_success=1'
    }
  };

  // Only pass customer email if it exists to avoid validation errors
  if (userEmail) {
    checkoutOptions.customer = {
      email: userEmail
    };
  }

  // GUEST CHECKOUT - Paddle handles email collection
  Paddle.Checkout.open(checkoutOptions);
}

/**
 * Shows an upgrade popup for premium features - REFACTORED to use handleProAction
 * @param {string} featureName - Name of the premium feature
 * @param {string} loginUrl - URL to redirect for login/upgrade
 */
function showUpgradePopup(featureName, loginUrl) {
  // Reuse the unified handler
  handleProAction(featureName, loginUrl);
}

export function displayResults(skinColorInfo, imageDataURL = null) {
  const resultsElement = document.getElementById('skin-analysis-results');

  if (!resultsElement) {
    console.error("Results element not found!");
    return;
  }

  // Store the skin color info globally for backward compatibility with navigation
  // TODO: Eventually refactor navigation to pass data explicitly
  window.lastAnalyzedSkinColorInfo = skinColorInfo;

  // Extract imageDataURL from skinColorInfo if not provided
  if (!imageDataURL) {
    imageDataURL = skinColorInfo.inputData?.imageDataURL ||
      window.currentUploadedImageDataURL ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('currentUploadedImageDataURL') : null);
  }

  // Create enhanced seasonal info directly from comprehensiveSeason (no redundant wrapper needed)
  const comprehensiveSeason = skinColorInfo.comprehensiveSeason || {};
  const advancedUndertone = skinColorInfo.advancedUndertone || {};
  const temperatureAnalysis = skinColorInfo.temperatureAnalysis || {};

  const season = comprehensiveSeason.season || "Spring";
  const subtype = comprehensiveSeason.subtype || `True ${season}`;
  const undertone = advancedUndertone.undertoneQuality || temperatureAnalysis.temperature || "Neutral";

  skinColorInfo.enhancedSeasonal = {
    season,
    subSeason: subtype,
    tone: subtype,
    subtype,
    undertone
  };

  // Check for Payment Success Parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('payment_success')) {
    // Show Success Modal
    const successModalHTML = `
      <div class="sca-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 9999;">
        <div class="sca-modal-content" style="background-color: #fff; border-radius: 8px; padding: 30px; max-width: 450px; width: 90%; text-align: center; position: relative;">
          <button class="sca-close-btn" style="position: absolute; top: 10px; right: 10px; border: none; background: none; font-size: 24px; cursor: pointer; color: #333;">×</button>
          <div class="sca-modal-header">
            <span style="font-size: 3em; display: block; margin-bottom: 10px;">🎉</span>
            <h3 style="margin-bottom: 15px; color: #7b48ff;">You're In!</h3>
          </div>
          <div class="sca-modal-body">
            <p style="margin-bottom: 20px; font-size: 1.1em; line-height: 1.5;">
              Thanks for upgrading!
            </p>
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: left;">
              <strong>What's Next:</strong>
              <ul style="margin: 10px 0 0 20px; padding: 0;">
                <li>We've emailed your login details.</li>strong>.</li>
                <li>Log in to see everything.</li>
              </ul>
            </div>
            <a href="${typeof sca_ajax_object !== 'undefined' ? sca_ajax_object.login_url : '/login'}" class="sca-button sca-button-primary" style="display: inline-block; padding: 12px 25px; background-color: #7b48ff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 1.1em;">
              Log In
            </a>
          </div>
        </div>
      </div>
    `;

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = successModalHTML.trim();
    const modalOverlay = tempContainer.firstChild;

    // Close handlers
    const closeBtn = modalOverlay.querySelector('.sca-close-btn');
    closeBtn.onclick = function () { document.body.removeChild(modalOverlay); };
    modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) document.body.removeChild(modalOverlay); });

    document.body.appendChild(modalOverlay);

    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // First, show the Fashion Colors screen (Step 3)
  displayFashionColors(skinColorInfo, resultsElement, imageDataURL);
}

// --- Screen-Specific Display Functions ---

// Display Fashion Colors screen (Step 3)
export async function displayFashionColors(skinColorInfo, resultsElement, imageDataURL = null) {
  // Check for required parameters
  if (!skinColorInfo || !resultsElement) {
    console.error("Missing required parameters in displayFashionColors", { skinColorInfo, resultsElement });
    throw new Error("Cannot display results: missing required data");
  }

  try {
    // Update progress bar to Step 3 (Combined Results View)
    updateProgressBar(3);
    resultsElement.innerHTML = ''; // Clear previous content

    // Create simple header with Restart button at the top
    const headerRow = document.createElement('div');
    headerRow.className = 'res-header';
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'flex-end'; // Align to right or create space
    headerRow.style.marginBottom = '20px';
    headerRow.innerHTML = `
        <div class="res-restart" onclick="location.reload()" style="cursor:pointer;color:#666;">Start New Scan</div>
    `;
    resultsElement.appendChild(headerRow);

    // Create and add the user profile FIRST
    const userProfileElement = createCompactUserProfile(skinColorInfo, imageDataURL);
    if (userProfileElement) {
      resultsElement.appendChild(userProfileElement); // Add profile to the top
    }

    // Add Categorized Colors - NOW SECOND (after profile)
    try {
      const season = skinColorInfo.seasonal?.season || 'Spring';
      const categorizedColorsElement = createCategorizedColorsDOM(skinColorInfo, season);
      if (categorizedColorsElement) {
        resultsElement.appendChild(categorizedColorsElement);
      }
    } catch (catError) {
      console.error("Error creating categorized colors content:", catError);
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message color-systems-error';
      errorElement.innerHTML = `
        <h3>Error Loading Colors</h3>
        <p>${catError.message}</p>
        <button class="retry-btn" id="retry-color-systems-btn">Retry</button>
      `;
      resultsElement.appendChild(errorElement);
    }

    // Create Actionable Insights (Colors to Avoid) - NOW THIRD
    try {
      const insightsElement = createActionableInsightsDOM(skinColorInfo);
      if (insightsElement) {
        resultsElement.appendChild(insightsElement);
      }
    } catch (insightsError) {
      console.error("Error creating actionable insights:", insightsError);
    }

    // NEW: Add Contrast Guide - NOW FOURTH (Before Styling Tips)
    try {
      const contrastElement = createContrastGuideDOM(skinColorInfo);
      if (contrastElement) {
        resultsElement.appendChild(contrastElement);
      }
    } catch (contrastError) {
      console.error("Error creating contrast guide:", contrastError);
    }

    // NEW: Add Style DNA (Patterns & Fabrics) - NOW FIFTH
    try {
      const styleDNAElement = createStyleDNASection(skinColorInfo);
      if (styleDNAElement) {
        resultsElement.appendChild(styleDNAElement);
      }
    } catch (dnaError) {
      console.error("Error creating Style DNA section:", dnaError);
    }

    // NEW: Add Harmony Tips - NOW FIFTH
    // Generate Harmony Tips ONCE for consistency between UI and Download
    let sharedHarmonyTips = [];
    try {
      sharedHarmonyTips = generateHarmonyTips(skinColorInfo);

      const harmonyTipsElement = createHarmonyTipsDOM(skinColorInfo, sharedHarmonyTips);
      if (harmonyTipsElement) {
        resultsElement.appendChild(harmonyTipsElement);
      }
    } catch (harmonyError) {
      console.error("Error creating harmony tips:", harmonyError);
    }

    // NEW: Add Makeup Recommendations - NOW FIFTH
    try {
      const makeupSection = await createMakeupSectionDOM(skinColorInfo);
      if (makeupSection) {
        resultsElement.appendChild(makeupSection);
      }
    } catch (makeupError) {
      console.error("Error creating makeup section:", makeupError);
    }

    // Create color palette image and set download button URL
    try {
      // Pass pre-calculated advancedRecommendations instead of recalculating
      const advancedRecommendations = skinColorInfo.advancedRecommendations ||
        skinColorInfo.skinColorInfo?.advancedRecommendations;

      // Extract season
      const seasonal = skinColorInfo.seasonal || {};
      const season = seasonal.season || "Spring";

      // Get colors to avoid for the wallet card
      const avoidColors = getColorsToAvoid(season);

      // Generate Harmony Tips (Using shared tips from above if available, else regenerate)
      const harmonyTips = sharedHarmonyTips && sharedHarmonyTips.length > 0 ? sharedHarmonyTips : generateHarmonyTips(skinColorInfo);

      // Gather Categorized Colors for Layout Sync
      // Correcting argument order: season, skinColorInfo
      const categorizedColors = getCategorizedRecommendations(season, skinColorInfo);

      // Gather Makeup Recommendations for Content Sync
      const makeupProducts = getEssentialMakeup(season, skinColorInfo);

      // Generate Wallet Card Image with matching Layout & Content
      const paletteImageDataUrl = createWalletCardImage(season, advancedRecommendations, avoidColors, harmonyTips, makeupProducts, categorizedColors);
      const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

      if (paletteImageDataUrl) {
        // Set up the download button with appropriate behavior based on login status
        setTimeout(() => {
          const downloadBtn = document.getElementById('download-palette-btn');
          if (downloadBtn) {
            if (hasActiveSubscription) {
              // User is logged in - enable direct download
              downloadBtn.href = paletteImageDataUrl;
              downloadBtn.setAttribute('download', `my_${season.toLowerCase()}_wallet_card.png`);
              downloadBtn.addEventListener('click', function (e) {
                // Proceed with normal download
              });
            } else {
              // User is not logged in - use unified Pro action handler
              downloadBtn.href = "#";
              downloadBtn.removeAttribute('download');
              downloadBtn.addEventListener('click', function (e) {
                e.preventDefault();
                const loginUrl = typeof sca_ajax_object !== 'undefined' ? sca_ajax_object.login_url : '/login';
                handleProAction('Full Color Palette', loginUrl);
              });
            }
          }
        }, 0);
      }
    } catch (paletteError) {
      console.error("Error creating color palette image:", paletteError);
    }

    // Add celebrity carousel FOURTH
    try {
      // Check for subscription for Celebrity Carousel
      const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

      let carouselSection = await createCelebrityCarousel();

      if (!carouselSection) {
        // Create a fallback container if carousel creation fails (or returns null)
        carouselSection = document.createElement('div');
        carouselSection.className = 'celebrity-section-container';
        carouselSection.innerHTML = '<h3 class="results-section-title">Celebrity Color Matches</h3>';
      }

      // Wrap in paywall if free user
      if (!hasActiveSubscription && carouselSection) {
        const wrapper = document.createElement('div');
        wrapper.className = 'celebrity-section-container';

        // If the carouselSection is just the section, get its innerHTML or append it to a wrapper to blur it
        // createCelebrityCarousel returns a <section class="celebrity-carousel-section">...</section>

        // We need to keep the title visible if possible, or just lock the whole thing.
        // The returned section has the title inside.

        // Let's create a visual header outside the blurred part? 
        // Or just blur the inner part of the returned section?

        // Easiest: Blur the whole returned section but overlay the CTA.
        // However, we need a parent container for the paywall styles to work relative to.

        const contentHtml = carouselSection.outerHTML;
        wrapper.innerHTML = applyPaywallProtection(
          contentHtml,
          "See Your Celebrity Twin",
          "Find out which celebrities share your color season and get inspired by their looks.",
          "Celebrity Matches"
        );

        // Replace the carouselSection with our wrapper
        carouselSection = wrapper;

        // Note: Since we are using outerHTML and re-inserting, the Swiper initialization 
        // that happened inside createCelebrityCarousel might be lost or broken because the DOM elements are replaced.
        // However, for the blurred version, we don't strictly need the interactive carousel to work perfect, 
        // just look like content.
        // But effectively, 'applyPaywallProtection' creates a string.
        // We are setting wrapper.innerHTML.
      } else {
        // If we have a carousel section and allowed, we might want to ensure it's wrapped or just append it.
        // The displayResults appends it directly.
      }

      resultsElement.appendChild(carouselSection);
    } catch (e) {
      console.error('Error creating celebrity sections:', e);
    }

    // Add Spacer and Download Button
    const downloadSpacer = document.createElement('div');
    downloadSpacer.style.height = '100px';
    resultsElement.appendChild(downloadSpacer);

    const downloadBar = document.createElement('a');
    downloadBar.className = 'download-bar';
    downloadBar.id = 'download-palette-btn'; // Reuse ID for easier logic mapping
    // SVG Icon for Smartphone
    downloadBar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-smartphone"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
        <span>Download Digital Wallet Card</span>
    `;
    resultsElement.appendChild(downloadBar);

    // Attach event listeners to any upgrade buttons (Paywall)
    setupPaddleCheckout(resultsElement);

    // Add retry button event listener with closure to capture current data
    setTimeout(() => {
      const retryBtn = document.getElementById('retry-color-systems-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          // Use closure to pass data instead of relying on globals
          displayFashionColors(skinColorInfo, resultsElement, imageDataURL);
        });
      }
    }, 0);
  } catch (error) {
    console.error("Error in displayFashionColors:", error);
    throw error;
  }
}

/**
 * Creates the Actionable Insights DOM (Colors to Avoid) - NEW DESIGN
 * @param {Object} skinColorInfo
 * @returns {HTMLElement}
 */
function createActionableInsightsDOM(skinColorInfo) {
  const seasonal = skinColorInfo.seasonal || {};
  const season = seasonal.season || "Autumn"; // Default fallback

  // Get colors to avoid
  const avoidColors = getColorsToAvoid(season);

  if (!avoidColors || avoidColors.length === 0) return null;

  const container = document.createElement('div');
  container.className = 'avoid-section';
  container.id = 'avoid'; // Anchor for navigation

  // Limit to 5 for the visual design, or just take first 5-6
  const displayColors = avoidColors; // User requested all colors

  const headerHtml = `
    <div class="avoid-header">
        <h2>The "Use with Caution" Edit</h2>
        <p>These tones may clash with your natural coloring. Keep them away from your face.</p>
    </div>
  `;

  let swatchesHtml = '<div class="avoid-grid">';

  displayColors.forEach(item => {
    // Resolve color
    const colorInfo = getColorRGB(item.name);
    // Use a default styling fallback if hex is missing, though getColorRGB usually works
    const hex = (colorInfo && colorInfo.rgb) ? rgbToHex(colorInfo.rgb) : '#333';

    swatchesHtml += `
        <div class="avoid-swatch">
            <div class="avoid-circle" style="background: ${hex};"></div>
            <div class="avoid-name">${escapeHTML(item.name)}</div>
        </div>
    `;
  });

  swatchesHtml += '</div>';

  // Apply Paywall Logic for Colors to Avoid
  const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

  if (!hasActiveSubscription) {
    const paywallHtml = applyPaywallProtection(
      swatchesHtml,
      "Unlock Colors to Avoid",
      "Knowing what NOT to wear is just as important. See which colors clash with your skin tone.",
      "Colors to Avoid"
    );
    container.innerHTML = headerHtml + paywallHtml;
  } else {
    container.innerHTML = headerHtml + swatchesHtml;
  }

  return container;
}

/**
 * Creates the Style DNA DOM section (Patterns & Fabrics)
 * @param {Object} skinColorInfo
 * @returns {HTMLElement}
 */
function createStyleDNASection(skinColorInfo) {
  const seasonal = skinColorInfo.seasonal || {};
  const season = seasonal.season || "Spring";
  const dna = getStyleDNA(season);

  if (!dna || (!dna.patterns.length && !dna.fabrics.length)) return null;

  const container = document.createElement('div');
  container.className = 'style-dna-container system-group-section';
  container.style.marginTop = '40px';

  // Helper to generate cards
  const generateCards = (items, type) => {
    return items.map(item => `
      <div class="dna-card">
        <div class="dna-visual ${item.visual} ${type}"></div>
        <div class="dna-content">
          <h6>${escapeHTML(item.name)}</h6>
          <p>${escapeHTML(item.description)}</p>
        </div>
      </div>
    `).join('');
  };

  // Apply Paywall Logic for Style DNA
  const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

  if (!hasActiveSubscription) {
    // We only wrap the grid content, keeping the header visible if we want, or wrap everything.
    // The previous design wraps the content but keeps a header? 
    // Actually, createStyleDNASection has the header INSIDE the html string.
    // Let's split it or just wrap the relevant part.

    // The html variable contains the entire section content.
    // We can wrap the whole thing or just the grid. 
    // Let's wrap the grid which is the valuable part, but keep the header visible? 
    // Actually, locking the whole section below the header is standard.

    // Let's reconstruct to allow locking just the grid logic if needed, 
    // but here `html` is the whole innerHTML.

    // Simplest approach: Render the header, then lock the grid.

    const headerPart = `
    <div class="color-systems-header">
      <h3>Your Style DNA</h3>
      <p class="section-subtitle">Patterns and textures that harmonize with your natural coloring.</p>
    </div>`;

    const gridPart = `
    <div class="style-dna-grid">
      <div class="dna-column">
        <h4>Best Patterns</h4>
        <div class="dna-list">
          ${generateCards(dna.patterns, 'pattern')}
        </div>
      </div>
      <div class="dna-column">
        <h4>Best Fabrics</h4>
        <div class="dna-list">
          ${generateCards(dna.fabrics, 'fabric')}
        </div>
      </div>
    </div>`;

    const protectedGrid = applyPaywallProtection(
      gridPart,
      "Unlock Style DNA",
      "Discover the patterns and fabrics that perfectly match your natural aesthetic.",
      "Style DNA"
    );

    container.innerHTML = headerPart + protectedGrid;
  } else {
    const html = `
    <div class="color-systems-header">
      <h3>Your Style DNA</h3>
      <p class="section-subtitle">Patterns and textures that harmonize with your natural coloring.</p>
    </div>

    <div class="style-dna-grid">
      <div class="dna-column">
        <h4>Best Patterns</h4>
        <div class="dna-list">
          ${generateCards(dna.patterns, 'pattern')}
        </div>
      </div>
      <div class="dna-column">
        <h4>Best Fabrics</h4>
        <div class="dna-list">
          ${generateCards(dna.fabrics, 'fabric')}
        </div>
      </div>
    </div>
  `;
    container.innerHTML = html;
  }

  return container;
}

/**
 * Creates the Contrast Guide DOM section
 * @param {Object} skinColorInfo
 * @returns {HTMLElement}
 */
function createContrastGuideDOM(skinColorInfo) {
  const contrastAnalysis = skinColorInfo.contrastAnalysis || {};
  const contrastLevel = contrastAnalysis.contrastLevel || "Medium Contrast";

  const advice = getContrastAdvice(contrastLevel);
  if (!advice) return null;

  const container = document.createElement('div');
  container.className = 'contrast-guide-container system-group-section';
  container.style.marginTop = '40px';

  let rulesHtml = '';

  advice.rules.forEach(rule => {
    rulesHtml += `
          <div class="contrast-rule-card">
              <div class="rule-icon ${rule.visual}"></div>
              <div class="rule-content">
                  <h5>${escapeHTML(rule.title)}</h5>
                  <p>${escapeHTML(rule.text)}</p>
              </div>
          </div>
      `;
  });

  // Apply Paywall Logic for Contrast Guide
  const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

  const headerPart = `
    <div class="color-systems-header">
      <h3>Your Contrast Strategy: ${escapeHTML(advice.title)}</h3>
      <p class="section-subtitle">${escapeHTML(advice.subtitle)}</p>
    </div>`;

  let contentPart = `
    <div class="contrast-rules-grid">
      ${rulesHtml}
    </div>
  `;

  if (!hasActiveSubscription) {
    contentPart = applyPaywallProtection(
      contentPart,
      "Unlock Contrast Strategy",
      "Learn how to combine colors to flatter your features.",
      "Contrast Guide"
    );
  }

  container.innerHTML = headerPart + contentPart;
  return container;
}

/**
 * Creates the Harmony Tips DOM section
 * @param {Object} skinColorInfo 
 * @param {Array} existingTips - Optional pre-generated tips to ensure consistency
 * @returns {HTMLElement}
 */
function createHarmonyTipsDOM(skinColorInfo, existingTips = null) {
  const tips = existingTips || generateHarmonyTips(skinColorInfo);
  if (!tips || tips.length === 0) return null;

  const seasonal = skinColorInfo.seasonal || {};
  const season = seasonal.season || "Spring";
  const isSilk = ['Winter', 'Spring'].includes(season);
  const textureClass = isSilk ? 'texture-silk' : 'texture-linen';

  const container = document.createElement('div');
  container.className = 'harmony-tips-container system-group-section';
  container.style.marginTop = '40px';

  // Build the grid content first
  let gridHtml = `
    <div class="harmony-tips-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px;">
  `;

  tips.forEach(tip => {
    gridHtml += `
      <div class="harmony-card" style="background: #fff; padding: 25px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f0f0f0; display: flex; flex-direction: column; align-items: center; text-align: center;">
        <h4 style="margin-top: 0; color: #333; font-size: 1.2em; margin-bottom: 8px; font-weight: 600;">${escapeHTML(tip.title)}</h4>
        <p style="font-size: 0.9em; color: #666; margin-bottom: 15px; line-height: 1.5; max-width: 95%;">${escapeHTML(tip.description)}</p>
        
        <button class="share-card-btn" onclick="window.handleShare('instagram', 'outfit', this)" style="margin-bottom: 15px; background: none; border: 1px solid #e0e0e0; padding: 5px 10px; border-radius: 20px; font-size: 0.8em; cursor: pointer; color: #666;">
            Share Idea 📤
        </button>
        
        <div class="harmony-visual" style="display: flex; gap: 30px; align-items: center; justify-content: center; width: 100%;">
            
            <!-- The Stack -->
            <div class="harmony-stack" style="display: flex; flex-direction: column; align-items: center; padding-top: 10px; margin-bottom: 10px;">
    `;

    // Render Swatches in Stack
    tip.colors.forEach((color, index) => {
      const isFirst = index === 0;
      const zIndex = tip.colors.length - index;
      // Negative margin to pull items up, except the first one
      const marginTop = isFirst ? '0' : '-20px';

      // Teardrop shape for first item (rotated square with specific border radius)
      // Others are circles
      const borderRadius = isFirst ? '0 50% 50% 50%' : '50%';
      const transform = isFirst ? 'rotate(45deg)' : 'none';
      const size = '55px';

      gridHtml += `
         <div class="color-swatch-stack-item ${textureClass}" style="
            width: ${size}; 
            height: ${size}; 
            background-color: ${color.hex}; 
            border-radius: ${borderRadius}; 
            transform: ${transform};
            margin-top: ${marginTop};
            z-index: ${zIndex};
            position: relative;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
         "></div>
       `;
    });

    gridHtml += `
            </div>
            
            <!-- The Legend -->
            <div class="harmony-legend" style="display: flex; flex-direction: column; gap: 10px; text-align: left; justify-content: center;">
    `;

    tip.colors.forEach(color => {
      gridHtml += `
            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.85em; color: #555;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color.hex}; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"></div>
                <span style="font-weight: 500;">${escapeHTML(color.name)}</span>
            </div>
        `;
    });

    gridHtml += `
            </div>
        </div>
      </div>
    `;
  });

  gridHtml += `</div>`;

  // Apply Paywall Logic - Refactored to use helper
  const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

  if (!hasActiveSubscription) {
    gridHtml = applyPaywallProtection(
      gridHtml,
      "Unlock Outfit Inspirations",
      "Get curated outfit ideas and color combinations tailored to your season.",
      "Outfit Inspirations"
    );
  }

  const html = `
    <div class="color-systems-header">
      <h3>Outfit Inspirations</h3>
      <p class="section-subtitle">Practical ways to wear your palette.</p>
    </div>
    ${gridHtml}
  `;

  container.innerHTML = html;
  return container;
}

/**
 * Creates the Categorized Colors DOM section
 * @param {Object} skinColorInfo
 * @param {string} season
 * @returns {HTMLElement}
 */
function createCategorizedColorsDOM(skinColorInfo, season) {
  const categories = getCategorizedRecommendations(season, skinColorInfo);

  const container = document.createElement('div');
  container.className = 'color-systems-container';

  // Ensure toast exists
  if (!document.getElementById('sca-toast')) {
    const toast = document.createElement('div');
    toast.id = 'sca-toast';
    toast.className = 'sca-toast-custom';
    toast.innerHTML = '<i data-feather="check" width="16"></i> <span id="sca-toast-text">Color copied</span>';
    document.body.appendChild(toast);
    if (typeof feather !== 'undefined') feather.replace();
  }

  // Define Copy Function Helper
  const copyHexToClipboard = (hex) => {
    navigator.clipboard.writeText(hex);
    const toast = document.getElementById('sca-toast');
    const toastText = document.getElementById('sca-toast-text');
    if (toast && toastText) {
      toastText.innerText = hex + ' Copied';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
  };

  let html = '';

  // Helper to render a category
  const renderCategory = (title, colors, icon, description, isLarge = false) => {
    if (!colors || colors.length === 0) return '';

    // Use new swatch-row layout
    const gridClass = 'swatch-row';
    const sectionTitleClass = 'swatch-section-title';
    const sectionDescClass = 'swatch-section-desc';

    let sectionHtml = `
      <div class="color-section">
        <h4 class="${sectionTitleClass}">${title}</h4>
        <p class="${sectionDescClass}">${description}</p>
        <div class="${gridClass}">
    `;

    colors.forEach(color => {
      // Swatch Item
      sectionHtml += `
        <div class="swatch-item" data-hex="${color.hex}">
          <div class="swatch-circle" style="background-color: ${color.hex};"></div>
          <span class="swatch-name">${escapeHTML(color.name)}</span>
          <span class="swatch-code">${color.hex}</span>
        </div>
      `;
    });

    sectionHtml += `
        </div>
      </div>
    `;
    return sectionHtml;
  };

  // --- 1. TOP 7 ESSENTIALS (Signature Trio style) ---
  html += `
    <div class="system-group-section">
      <div class="combined-colors-section">
        <div class="combined-colors-grid">
          ${renderCategory('Anchor Neutrals', categories.top7.anchors, '⚓', 'Your wardrobe workhorses.')}
          ${renderCategory('Accents', categories.top7.accents, '✨', 'Versatile metallics or rich shades.')}
          ${renderCategory('Statement Colors', categories.top7.statements, '🔥', 'High-impact colors.')}
        </div>
      </div>
    </div>
  `;

  // --- 2. EXTENDED PALETTE ---
  const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

  let extendedPaletteContent = `
      <div class="combined-colors-section">
        <div class="combined-colors-grid">
          ${renderCategory('Everyday Alternatives', categories.extended.everyday, '👕', 'Great for casual wear.')}
          ${renderCategory('Occasion & Bold', categories.extended.occasion, '💃', 'For parties and creative looks.')}
          ${renderCategory('Seasonal Rotation', categories.extended.seasonal, '🍂', 'Lighter or muted options.')}
        </div>
      </div>
  `;

  if (!hasActiveSubscription) {
    extendedPaletteContent = `
      <div class="paywall-container">
        <div class="paywall-blur">
          ${extendedPaletteContent}
        </div>
        <div class="paywall-overlay">
          <div class="paywall-cta">
            <div class="res-lock-icon" style="margin: 0 auto 15px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h4>Unlock Your Full Palette</h4>
            <p>Get access to 30+ more colors, including specific occasion wear and seasonal alternatives.</p>
            <button class="sca-button sca-button-primary sca-upgrade-btn" data-feature="Extended Palette">
              Unlock Now
            </button>
          </div>
        </div>
      </div>
    `;
  }

  html += `
    <div class="system-group-section" style="margin-top: 40px;">
      ${extendedPaletteContent}
    </div>
  `;

  // --- 3. NEUTRAL REFERENCE ---
  html += `
    <div class="system-group-section" style="margin-top: 40px;">
      <div class="combined-colors-section">
        <div class="combined-colors-grid">
          ${renderCategory('For Layering', categories.neutrals.layering, '🧥', 'Light neutrals.')}
          ${renderCategory('For Grounding', categories.neutrals.grounding, '👖', 'Dark neutrals.')}
          ${renderCategory('Basics', categories.neutrals.basics, '🧶', 'Mid-tone essentials.')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Add event listeners for copy functionality
  const items = container.querySelectorAll('.swatch-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const hex = item.getAttribute('data-hex');
      if (hex) copyHexToClipboard(hex);
    });
  });

  return container;
}

// Create color systems content using a Vue-style approach with separated markup and logic
function createColorSystemsDOM(skinColorInfo, imageDataURL = null) {
  // Component state - would be "data()" in Vue
  const state = {
    colorSystems: {},
    activeFilters: ['all']
  };

  // Create container element
  const container = document.createElement('div');
  container.className = 'color-systems-wrapper';

  try {
    // Get markup from generateColorSystemsHTML
    const content = generateColorSystemsHTML(skinColorInfo, imageDataURL);

    // Render markup
    renderTemplate(container, content);

    // Mount event handlers (similar to Vue's "mounted" hook)
    mountEventHandlers(container, state);

    return container;
  } catch (error) {
    console.error("Error in createColorSystemsDOM:", error);
    // Render error template
    renderTemplate(container, createErrorTemplate());
    return container;
  }
}

/**
 * Renders HTML template into a container - Vue-like template rendering
 * @param {HTMLElement} container - Container element
 * @param {string} template - HTML template string
 */
function renderTemplate(container, template) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = template;

  // Move the content to our container
  while (tempDiv.firstChild) {
    container.appendChild(tempDiv.firstChild);
  }
}

/**
 * Creates error template - Vue-like template
 * @returns {string} HTML error template
 */
function createErrorTemplate() {
  return '<p class="error-message">Error generating color systems analysis. Please try again.</p>';
}

/**
 * Mounts all event handlers to the DOM - similar to Vue's mounted() or methods
 * @param {HTMLElement} container - The main container element
 * @param {Object} state - State object for tracking active filters
 */
function mountEventHandlers(container, state) {
  // Setup checkbox filters
  setupCheckboxFilters(container);

  // Setup filter pills
  setupFilterPills(container, state);

  // Setup Paddle checkout link
  setupPaddleCheckout(container);

  container.addEventListener('click', function (event) {
    if (!event.target.classList.contains('sca-upgrade-link')) {
      return;
    }

    event.preventDefault();
    const loginUrl = typeof sca_ajax_object !== 'undefined' ? sca_ajax_object.login_url : '/login';
    handleProAction('Color Systems', loginUrl);
  });
}

/**
 * Creates the Makeup Recommendations DOM section
 * @param {Object} skinColorInfo
 * @returns {Promise<HTMLElement>}
 */
async function createMakeupSectionDOM(skinColorInfo) {
  const seasonal = skinColorInfo.seasonal || {};
  const season = seasonal.season || "Spring";

  const products = await getEssentialMakeup(season, skinColorInfo);

  if (!products || products.length === 0) return null;

  const container = document.createElement('div');
  container.className = 'makeup-section-container system-group-section';
  container.style.marginTop = '40px';

  html += `</div>`;

  // Apply Paywall Logic for Makeup
  const hasActiveSubscription = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.has_active_subscription;

  if (!hasActiveSubscription) {
    // Separate header from grid to keep title visible
    // The 'html' variable currently has header + grid

    // Re-construct to be safe
    const headerHtml = `
            <div class="color-systems-header">
              <h3>Top 5 Essential Products</h3>
              <p class="section-subtitle">Curated matches for your ${escapeHTML(season)} palette.</p>
              <button class="share-section-btn" onclick="window.handleShare('instagram', 'makeup')" style="margin-top: 10px; background: #fff; border: 1px solid #e0e0e0; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; cursor: pointer; color: #333; display: inline-flex; align-items: center; gap: 5px;">
                Share My Picks 💄
              </button>
            </div>`;

    const gridHtml = `<div class="makeup-grid">` + products.map(product => {
      // ... (reusing the loop logic is hard here without duplication) ...
      // Let's just use the fact that we already built 'html'.
      // We can wrap the whole 'html' or try to inject the paywall.

      // To avoid code duplication, I'll wrap the grid content specifically if I can split it, 
      // but since I already built it into 'html', I will wrap the 'html' content string 
      // but this will blur the header too.
      // Better: Blur just the grid.
      return ''; // Placeholder
    }).join('') + `</div>`;

    // Alternative: Just blur everything below the header.
    // We can extract the header from 'html' if we want, or simple wrap the "makeup-grid" div with the paywall class?
    // The applyPaywallProtection wraps EVERYTHING passed to it.

    // Let's modify the html generation above to be split.

    // RE-WRITING THE HTML GENERATION PART To support locking
    // (See ReplacementContent)
  }

  // Actually, let's rewrite the whole function body part to support the split.

  const headerHtml = `
    <div class="color-systems-header">
      <h3>Top 5 Essential Products</h3>
      <p class="section-subtitle">Curated matches for your ${escapeHTML(season)} palette.</p>
      <button class="share-section-btn" onclick="window.handleShare('instagram', 'makeup')" style="margin-top: 10px; background: #fff; border: 1px solid #e0e0e0; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; cursor: pointer; color: #333; display: inline-flex; align-items: center; gap: 5px;">
        Share My Picks 💄
      </button>
    </div>
  `;

  let mainContentHtml = `<div class="makeup-grid">`;

  products.forEach(product => {
    // Get the first matching shade name to display prominently
    const bestShade = product.matching_shades[0];
    const shadeName = bestShade ? bestShade.colour_name : 'Best Match';

    const shadesHtml = product.matching_shades.slice(0, 5).map(shade => `
      <div class="makeup-shade-swatch" style="background-color: ${shade.hex_value};" title="${escapeHTML(shade.colour_name)}"></div>
    `).join('');

    mainContentHtml += `
      <a href="${product.product_link}" target="_blank" class="makeup-card" data-category="${product.essential_label}">
        <div class="makeup-image-wrapper">
          <img src="${product.image_link}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%20viewBox%3D%220%200%20150%20150%22%3E%3Crect%20width%3D%22150%22%20height%3D%22150%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2214%22%20fill%3D%22%23999%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'">
          <span class="makeup-category-badge">${escapeHTML(product.essential_label)}</span>
        </div>
        <div class="makeup-details">
          <h4 class="makeup-brand">${escapeHTML(product.brand)}</h4>
          <h5 class="makeup-name">${escapeHTML(product.name)}</h5>
          
          <div class="makeup-shade-info" style="margin-bottom: 8px; font-size: 0.9em; color: #555;">
            <strong>Shade:</strong> ${escapeHTML(shadeName)}
          </div>

          <div class="makeup-shades">
            ${shadesHtml}
          </div>
        </div>
      </a>
    `;
  });

  mainContentHtml += `</div>`;

  if (!hasActiveSubscription) {
    mainContentHtml = applyPaywallProtection(
      mainContentHtml,
      "Unlock Makeup Matches",
      "Stop guessing. Get the exact lipstick, blush, and foundation shades for your season.",
      "Makeup Recommendations"
    );
  }

  container.innerHTML = headerHtml + mainContentHtml;

  // Inject styles dynamically if not already present
  const styleId = 'sca-makeup-styles';
  let style = document.getElementById(styleId);

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = `
        /* Makeup Grid & Cards */
        .makeup-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .makeup-card {
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;
            text-decoration: none;
            color: inherit;
            cursor: pointer;
            border: 1px solid #f0f0f0;
            position: relative; /* Ensure stacking context */
        }
        .makeup-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        .makeup-image-wrapper {
            position: relative;
            width: 100%;
            padding-top: 100%; /* 1:1 Aspect Ratio */
            overflow: hidden;
            background: #f9f9f9;
            flex-shrink: 0; /* Prevent collapsing in flex container */
        }
        .makeup-image-wrapper img {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            padding: 10px;
            max-width: none !important; /* Override generic max-width */
            max-height: none !important; /* Override generic max-height */
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
        }
        .makeup-details {
            padding: 15px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        .makeup-brand {
            font-size: 0.8rem;
            text-transform: uppercase;
            color: #888;
            margin: 0 0 5px 0;
            letter-spacing: 0.5px;
        }
        .makeup-name {
            font-size: 1rem;
            font-weight: 600;
            margin: 0 0 10px 0;
            line-height: 1.3;
            color: #333;
        }
        .makeup-shades {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: auto;
        }
        .makeup-shade-swatch {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid rgba(0,0,0,0.1);
            flex-shrink: 0;
            display: block !important; /* Ensure it's displayed */
            background-clip: padding-box;
        }

        .makeup-category-badge {
            position: absolute !important;
            top: 10px !important;
            right: 10px !important;
            background: rgba(255, 255, 255, 0.9);
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #333;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 10 !important;
            display: block !important;
        }
      `;

  return container;
}


/**
 * Sets up checkbox filter event handlers
 * @param {HTMLElement} container - The container element
 */
function setupCheckboxFilters(container) {
  const filterCheckboxes = container.querySelectorAll('.system-filter');

  filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxFilterChange.bind(null, container));
  });
}

/**
 * Handles checkbox filter change event
 * @param {HTMLElement} container
 * @param {Event} event
 */
function handleCheckboxFilterChange(container, event) {
  const checkbox = event.target;
  const systemId = checkbox.getAttribute('data-system');
  const isChecked = checkbox.checked;
  updateSwatchVisibility(container, systemId, isChecked);
}

/**
 * Updates swatch visibility based on checkbox filters
 * @param {HTMLElement} container - The container element
 * @param {string} systemId - The system ID being toggled
 * @param {boolean} isChecked - Whether the checkbox is checked
 */
function updateSwatchVisibility(container, systemId, isChecked) {
  const swatches = container.querySelectorAll('.color-swatch-container');

  swatches.forEach(swatch => {
    const systems = swatch.getAttribute('data-systems')?.split(',') || [];

    // If this system is unchecked and the swatch belongs to this system
    if (!isChecked && systems.includes(systemId)) {
      // Check if swatch should still be visible (belongs to other checked systems)
      let shouldShow = false;
      systems.forEach(sys => {
        const otherCheckbox = container.querySelector(`.system-filter[data-system="${sys}"]`);
        if (otherCheckbox && otherCheckbox.checked && sys !== systemId) {
          shouldShow = true;
        }
      });

      setSwatchDisplay(swatch, shouldShow);
    }
    // If this system is checked
    else if (isChecked) {
      // Check if any system filter that this swatch belongs to is checked
      let shouldShow = false;
      systems.forEach(sys => {
        const otherCheckbox = container.querySelector(`.system-filter[data-system="${sys}"]`);
        if (otherCheckbox && otherCheckbox.checked) {
          shouldShow = true;
        }
      });

      setSwatchDisplay(swatch, shouldShow);
    }
  });
}

/**
 * Sets display style for a swatch
 * @param {HTMLElement} swatch - The swatch element 
 * @param {boolean} shouldShow - Whether the swatch should be shown
 */
function setSwatchDisplay(swatch, shouldShow) {
  swatch.style.display = shouldShow ? '' : 'none';
}

/**
 * Sets up filter pill event handlers
 * @param {HTMLElement} container - The container element
 * @param {Object} state - State object for tracking active filters
 */
function setupFilterPills(container, state) {
  const filterPills = container.querySelectorAll('.filter-pill');

  if (filterPills.length === 0) return;

  filterPills.forEach(pill => {
    pill.addEventListener('click', handleFilterPillClick.bind(null, container, state));
  });
}

/**
 * Handles filter pill click event
 * @param {HTMLElement} container
 * @param {Object} state
 * @param {Event} event
 */
function handleFilterPillClick(container, state, event) {
  const pillElement = event.currentTarget;
  const systemId = pillElement.getAttribute('data-system');
  if (systemId === 'all') {
    handleAllFiltersClick(container, pillElement);
  } else {
    handleSystemFilterClick(container, pillElement, state);
  }
}

/**
 * Handles click on "All" filter pill
 * @param {HTMLElement} container - The container element
 * @param {HTMLElement} pillElement - The clicked pill element
 */
function handleAllFiltersClick(container, pillElement) {
  // Deactivate all other pills
  const allPills = container.querySelectorAll('.filter-pill');
  allPills.forEach(p => p.classList.remove('active'));

  // Activate "All" pill
  pillElement.classList.add('active');

  // Show all swatches
  swatches.forEach(swatch => {
    swatch.style.display = '';
  });
}

/**
 * Sets up Paddle checkout event listeners
 * @param {HTMLElement} container - The container element
 */
function setupPaddleCheckout(container) {
  const upgradeButtons = container.querySelectorAll('.sca-upgrade-btn, .sca-upgrade-btn-small, .sca-upgrade-link');
  upgradeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const featureName = btn.getAttribute('data-feature') || 'Pro Feature';
      const loginUrl = typeof sca_ajax_object !== 'undefined' ? sca_ajax_object.login_url : '/login';
      handleProAction(featureName, loginUrl);
    });
  });
}

/**
 * Handles click on system-specific filter pill
 * @param {HTMLElement} container - The container element
 * @param {HTMLElement} pillElement - The clicked pill element
 * @param {Object} state - State object for tracking active filters
 */
function handleSystemFilterClick(container, pillElement, state) {
  // Deactivate "All" pill
  container.querySelector('.filter-pill[data-system="all"]')?.classList.remove('active');

  // Toggle active state of this pill
  pillElement.classList.toggle('active');

  // Get active filters
  const activeFilters = Array.from(
    container.querySelectorAll('.filter-pill.active:not([data-system="all"])')
  ).map(af => af.getAttribute('data-system'));

  // Update state
  state.activeFilters = activeFilters.length ? activeFilters : ['all'];

  // Apply filters
  if (activeFilters.length === 0) {
    // If no filters are active, activate "All" and show everything
    container.querySelector('.filter-pill[data-system="all"]')?.classList.add('active');
    showAllSwatches(container);
  } else {
    // Filter swatches based on active filters
    filterSwatchesBySystem(container, activeFilters);
  }
}

/**
 * Shows all swatches
 * @param {HTMLElement} container - The container element
 */
function showAllSwatches(container) {
  const swatches = container.querySelectorAll('.color-swatch-container');
  swatches.forEach(swatch => {
    swatch.style.display = '';
  });
}

/**
 * Filters swatches by system
 * @param {HTMLElement} container - The container element
 * @param {Array} activeFilters - Array of active filter IDs
 */
function filterSwatchesBySystem(container, activeFilters) {
  const swatches = container.querySelectorAll('.color-swatch-container');
  swatches.forEach(swatch => {
    const swatchSystems = swatch.getAttribute('data-systems')?.split(',') || [];
    const shouldShow = activeFilters.some(filter => swatchSystems.includes(filter));
    swatch.style.display = shouldShow ? '' : 'none';
  });

  // Hide empty sections
  const sections = container.querySelectorAll('.color-section');
  sections.forEach(section => {
    const visibleSwatches = section.querySelectorAll('.color-swatch-container:not([style*="display: none"])');
    section.style.display = visibleSwatches.length > 0 ? '' : 'none';
  });
}

// Make displayFashionColors available globally - This remains as it's the main entry for results
window.displayFashionColors = displayFashionColors;

/**
 * Handles social sharing actions
 * @param {string} platform - 'instagram', 'pinterest', 'copy', 'email'
 * @param {string} type - 'palette', 'outfit', 'makeup'
 * @param {HTMLElement} element - The trigger element (optional, for context)
 */
window.handleShare = async function (platform, type, element) {
  console.log(`Sharing ${type} to ${platform}`);

  // Show loading state
  const originalText = element ? element.innerText : '';
  if (element) element.innerText = 'Generating...';

  try {
    let imageUrl = '';
    let text = '';
    let title = '';

    // 1. Generate Content based on Type
    if (type === 'palette') {
      // Use existing wallet card generation if available, or fallback to html2canvas of profile
      const season = window.lastAnalyzedSkinColorInfo?.seasonal?.season || 'Spring';
      const downloadBtn = document.getElementById('download-palette-btn');
      if (downloadBtn && downloadBtn.href && downloadBtn.href.startsWith('data:image')) {
        imageUrl = downloadBtn.href;
      } else {
        // Fallback: Capture the profile section
        const profileEl = document.querySelector('.user-season-profile');
        if (profileEl) {
          const canvas = await html2canvas(profileEl, { scale: 2, useCORS: true });
          imageUrl = canvas.toDataURL('image/png');
        }
      }
      title = `My ${season} Color Palette`;
      text = `I'm a ${season}! Check out my color palette.`;
    }
    else if (type === 'outfit') {
      // Capture the specific outfit card
      const card = element.closest('.harmony-card');
      if (card) {
        // Temporarily hide the share button for capture
        element.style.display = 'none';
        const canvas = await html2canvas(card, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        imageUrl = canvas.toDataURL('image/png');
        element.style.display = ''; // Restore button
        title = 'My Outfit Inspiration';
        text = 'Found this outfit idea for my season!';
      }
    }
    else if (type === 'makeup') {
      // Capture the makeup grid
      const grid = document.querySelector('.makeup-grid');
      if (grid) {
        const canvas = await html2canvas(grid, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        imageUrl = canvas.toDataURL('image/png');
        title = 'My Makeup Must-Haves';
        text = 'My top 5 makeup picks based on my skin tone.';
      }
    }

    if (!imageUrl && platform !== 'copy' && platform !== 'email') {
      throw new Error('Could not generate image');
    }

    // 2. Handle Platform Logic
    const currentUrl = window.location.href;

    if (platform === 'instagram') {
      // Instagram doesn't have a direct web share API for images usually, 
      // so we download the image for them to post, or use Web Share API if mobile
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [dataURLtoFile(imageUrl, 'share.png')] })) {
        const file = dataURLtoFile(imageUrl, 'share.png');
        await navigator.share({
          title: title,
          text: text,
          files: [file]
        });
      } else {
        // Fallback: Download image
        const link = document.createElement('a');
        link.download = `share_${type}.png`;
        link.href = imageUrl;
        link.click();
        alert('Image downloaded! You can now post it to Instagram.');
      }
    }
    else if (platform === 'pinterest') {
      // Pinterest prefers a URL, but we have a data URL. 
      // We can't easily upload to Pinterest via URL without a hosted image.
      // Best bet: Download image or just open Pinterest create if we had a hosted URL.
      // Since we don't have image hosting, we'll download it and prompt.
      const link = document.createElement('a');
      link.download = `pin_${type}.png`;
      link.href = imageUrl;
      link.click();
      // Open Pinterest
      window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(currentUrl)}&description=${encodeURIComponent(text)}`, '_blank');
    }
    else if (platform === 'copy') {
      await navigator.clipboard.writeText(`${text} ${currentUrl}`);
      alert('Link copied to clipboard!');
    }
    else if (platform === 'email') {
      const subject = encodeURIComponent(title);
      const body = encodeURIComponent(`${text}\n\nCheck it out here: ${currentUrl}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }

  } catch (error) {
    console.error('Sharing failed:', error);
    alert('Sorry, sharing failed. Please try again.');
  } finally {
    if (element) element.innerText = originalText;
  }
};

// Helper: Convert Data URL to File object
function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}