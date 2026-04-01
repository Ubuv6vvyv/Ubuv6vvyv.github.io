// Main Skin Analyzer Script

// Global callback queue for external script coordination
window.skinAnalyzerCallbacks = [];
/**
 * Execute callback when skin analyzer is ready or queue it for later execution
 * @param {Function} callback - Function to execute when analyzer is ready
 */
window.skinAnalyzerExecuteWhenReady = function (callback) {
    if (window.skinAnalyzerReady) {
        callback(); // Execute immediately if ready
    } else {
        window.skinAnalyzerCallbacks.push(callback); // Queue for later
    }
};

// --- Module Imports ---
import {
    rgbToHex,
    rgbToHsl,
    hslToRgb
} from './modules/colorUtils.js';
import {
    standardizeColor
} from './modules/colorDataUtils.js';
import {
    calculateColorMetrics,
    analyzeMunsellSystem,
    analyzeColorFlow,
    analyzeFitzpatrick,
    enhancePantoneAnalysis,
    analyzeColorContrast,
    analyzeColorTemperature,
    analyzeColorClarity,
    determineComprehensiveSeason,
    analyzeAdvancedUndertone,
    generateOptimalHarmonies
} from './modules/colorAnalysis.js';
import {
    processSkinColor,
    showColorSelectionScreen
} from './modules/imageProcessing.js';
import {
    enhancedLabColorPalette,
    generateColorHarmonyTheoryRecommendations,
    generateAdvancedColorAnalysis
} from './modules/recommendations.js';
import {
    displayResults,
    displayFashionColors, // Now async
} from './modules/resultsDisplay.js';

// Import celebrityUtils to ensure its global functions are available
import './modules/celebrityUtils.js';

// --- Global Settings ---

// --- Constants ---
const MAX_TEXTURE_SIZE = 2048; // Conservative max size for browser processing
const CLASS_FILE_SELECTED = 'file-selected';
const CLASS_CELEBRATING = 'celebrating';
const CLASS_CLICKED = 'clicked';
const CLASS_DRAGOVER = 'dragover';
const CLASS_POP_ANIMATION = 'pop-animation';
const CLASS_ANIMATING = 'animating';
const CLASS_MESSAGE_APPEAR = 'message-appear';
const CLASS_ACTIVE = 'active';
const CLASS_COMPLETED = 'completed';
const CLASS_CLICKABLE = 'clickable';
const CLASS_UPLOAD_RIPPLE = 'upload-ripple';
const CLASS_CAMERA_SPARKLE = 'camera-sparkle';
const CLASS_CAMERA_FRAME = 'camera-frame';
const CLASS_SELFIE_ICON = 'selfie-icon';
const CLASS_ANALYZE_BUTTON = 'analyze-button';
const CLASS_BUTTON_CONTENT = 'button-content';
const CLASS_STEP_EMOJI = 'step-emoji';
const CLASS_STEP_MESSAGE = 'step-message';
const CLASS_IMAGE_PREVIEW_CONTAINER = 'image-preview-container';
const CLASS_SKIN_ANALYSIS_RESULTS = 'skin-analysis-results';
const CLASS_IMAGE_UPLOAD_FORM = 'image-upload-form';
const CLASS_UPLOAD_AREA = 'upload-area';
const CLASS_UPLOAD_OPTION = 'upload-option';
const CLASS_CLOSE_PREVIEW = 'close-preview';
const CLASS_SCA_PROGRESS_STEP = 'sca-progress-step';
const CLASS_SCA_PROGRESS_CONNECTOR = 'sca-progress-connector';
const CLASS_SKIN_ANALYZER_CONTAINER = 'skin-analyzer-container';

// --- UI Helper Functions (Moved from inline script) ---
import {
    updateProgressBar,
    showModal,
    handleClosePreview
} from './modules/uiUtils.js';

/**
 * Resizes an image if its dimensions exceed MAX_TEXTURE_SIZE.
 * @param {HTMLImageElement} imageElement - The image element to resize.
 * @returns {Promise<HTMLImageElement>} - A promise that resolves with the (potentially resized) image element.
 */
async function resizeImageIfNeeded(imageElement) {
    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;
    if (width <= MAX_TEXTURE_SIZE && height <= MAX_TEXTURE_SIZE) return imageElement;
    let newWidth = width;
    let newHeight = height;
    if (width > height) {
        if (width > MAX_TEXTURE_SIZE) {
            newWidth = MAX_TEXTURE_SIZE;
            newHeight = Math.floor(height * (MAX_TEXTURE_SIZE / width));
        }
    } else {
        if (height > MAX_TEXTURE_SIZE) {
            newHeight = MAX_TEXTURE_SIZE;
            newWidth = Math.floor(width * (MAX_TEXTURE_SIZE / height));
        }
    }
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get 2D context for resizing canvas');
        return imageElement;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageElement, 0, 0, newWidth, newHeight);
    return new Promise((resolve, reject) => {
        const resizedImage = new Image();
        resizedImage.onload = () => resolve(resizedImage);
        resizedImage.onerror = () => {
            console.error('Failed to load resized image from data URL.');
            reject(new Error('Failed to load resized image'));
        };
        resizedImage.src = canvas.toDataURL('image/jpeg', 0.95);
    });
}




function handleProgressStepClick(e) {
    const step = e.currentTarget;
    if (!step.classList.contains(CLASS_CLICKABLE)) return;
    const stepNumber = parseInt(step.getAttribute('data-step'));
    const currentStepElement = document.querySelector(`.${CLASS_SCA_PROGRESS_STEP}.${CLASS_ACTIVE}`);
    const currentStep = currentStepElement ? parseInt(currentStepElement.getAttribute('data-step')) : 1;
    if (stepNumber >= currentStep) return;
    const resultsElement = document.getElementById(CLASS_SKIN_ANALYSIS_RESULTS);
    const uploadForm = document.getElementById(CLASS_IMAGE_UPLOAD_FORM);
    const previewContainer = document.querySelector(`.${CLASS_IMAGE_PREVIEW_CONTAINER}`);
    if (resultsElement) resultsElement.innerHTML = '';
    if (previewContainer) previewContainer.style.display = 'none';
    if (uploadForm) uploadForm.style.display = 'none';
    if (stepNumber === 1) {
        if (uploadForm) uploadForm.style.display = 'block';
    } else if (stepNumber === 2) {
        const imageElement = document.getElementById('uploaded-image');
        if (imageElement && imageElement.src && imageElement.complete && imageElement.naturalHeight !== 0) {
            if (resultsElement) {
                showColorSelectionScreen(imageElement);
            } else {
                if (uploadForm) uploadForm.style.display = 'block';
                updateProgressBar(1);
                return;
            }
        } else {
            if (uploadForm) uploadForm.style.display = 'block';
            updateProgressBar(1);
            return;
        }
    } else if (stepNumber === 3) {
        const skinColorInfo = window.lastAnalyzedSkinColorInfo;
        if (skinColorInfo && resultsElement) {
            displayFashionColors(skinColorInfo, resultsElement);
        } else {
            if (uploadForm) uploadForm.style.display = 'block';
            updateProgressBar(1);
            return;
        }
    }
    updateProgressBar(stepNumber);
}

function handleProgressStepMouseEnter(e) {
    const step = e.currentTarget;
    if (step.classList.contains(CLASS_CLICKABLE)) {
        step.style.transform = 'scale(1.05)';
    }
}

function handleProgressStepMouseLeave(e) {
    e.currentTarget.style.transform = '';
}

/**
 * Sets up listeners for the progress bar steps
 */
function setupProgressBarListeners() {
    const steps = document.querySelectorAll('.sca-progress-step');
    steps.forEach(step => {
        step.removeEventListener('click', handleProgressStepClick);
        step.addEventListener('click', handleProgressStepClick);
        step.addEventListener('mouseenter', handleProgressStepMouseEnter);
        step.addEventListener('mouseleave', handleProgressStepMouseLeave);
    });
}

/**
 * Add sparkle effects to camera frame
 */
function addSparkleEffect() {
    const cameraFrame = document.querySelector('.camera-frame');
    if (cameraFrame) {
        for (let i = 0; i < 5; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'camera-sparkle';
            sparkle.style.top = `${Math.random() * 100}%`;
            sparkle.style.left = `${Math.random() * 100}%`;
            sparkle.style.animationDelay = `${Math.random() * 3}s`;
            cameraFrame.appendChild(sparkle);
        }
    }
}

// --- Upload and Form Handling Logic (Moved from inline script) ---
/**
 * Sets up event handlers for image upload, drag & drop, and form submission.
 */
function setupUploadHandlers() {
    const uploadForm = document.getElementById(CLASS_IMAGE_UPLOAD_FORM);
    const uploadArea = document.getElementById(CLASS_UPLOAD_AREA);
    const previewContainer = document.querySelector(`.${CLASS_IMAGE_PREVIEW_CONTAINER}`);
    const uploadedImage = document.getElementById('uploaded-image');
    const fileInput = document.getElementById('image-file');
    const loadingIndicator = document.getElementById('analysis-loading');
    const resultsArea = document.getElementById(CLASS_SKIN_ANALYSIS_RESULTS);
    const closeButton = previewContainer ? previewContainer.querySelector(`.${CLASS_CLOSE_PREVIEW}`) : null;
    const uploadOptions = document.querySelectorAll(`.${CLASS_UPLOAD_OPTION}`);
    addSparkleEffect();
    if (!uploadForm || !uploadArea || !previewContainer || !uploadedImage || !fileInput || !loadingIndicator || !resultsArea) {
        logError('One or more essential UI elements for upload handling are missing', new Error('Aborting setupUploadHandlers'));
        return;
    }
    if (closeButton) {
        closeButton.addEventListener('click', handleClosePreview);
    }
    if (uploadOptions) {
        uploadOptions.forEach(option => {
            option.addEventListener('click', handleUploadOptionClick);
        });
    }
    if (uploadArea) {
        uploadArea.addEventListener('click', handleUploadAreaClick);
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileInputChange);
    }
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadFormSubmit);
    }
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add(CLASS_DRAGOVER), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove(CLASS_DRAGOVER), false);
        });
        uploadArea.addEventListener('drop', handleUploadAreaDrop, false);
    }
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
}

function handleUploadOptionClick(e) {
    const option = e.currentTarget;
    const fileInput = document.getElementById('image-file');
    if (fileInput) fileInput.click();
    option.classList.add(CLASS_CLICKED);
    setTimeout(() => {
        option.classList.remove(CLASS_CLICKED);
    }, 300);
}

function handleUploadAreaClick(e) {
    const uploadArea = e.currentTarget;
    const fileInput = document.getElementById('image-file');
    if (e.target.closest(`.${CLASS_UPLOAD_OPTION}`)) return;
    if (e.target !== fileInput) {
        if (fileInput) fileInput.click();
        const ripple = document.createElement('span');
        ripple.className = CLASS_UPLOAD_RIPPLE;
        uploadArea.appendChild(ripple);
        const rect = uploadArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        setTimeout(() => {
            ripple.remove();
        }, 700);
    }
}

function handleFileInputChange(e) {
    const fileInput = e.currentTarget;
    const uploadArea = document.getElementById(CLASS_UPLOAD_AREA);
    if (fileInput.files && fileInput.files.length > 0) {
        uploadArea.classList.add(CLASS_FILE_SELECTED);
        const selfieIcon = document.querySelector(`.${CLASS_SELFIE_ICON}`);
        if (selfieIcon) {
            selfieIcon.classList.add(CLASS_CELEBRATING);
            selfieIcon.innerHTML = '<span>ðŸ“¸</span>';
        }
        const uploadForm = document.getElementById(CLASS_IMAGE_UPLOAD_FORM);
        if (uploadForm) {
            uploadForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    }
}

async function handleUploadFormSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('image-file');
    const uploadForm = document.getElementById(CLASS_IMAGE_UPLOAD_FORM);
    const previewContainer = document.querySelector(`.${CLASS_IMAGE_PREVIEW_CONTAINER}`);
    const loadingIndicator = document.getElementById('analysis-loading');
    const resultsArea = document.getElementById(CLASS_SKIN_ANALYSIS_RESULTS);
    const uploadedImage = document.getElementById('uploaded-image');
    if (fileInput.files && fileInput.files.length > 0) {
        try {
            const analyzeButton = document.querySelector(`.${CLASS_ANALYZE_BUTTON}`);
            if (analyzeButton) {
                analyzeButton.classList.add('loading');
                analyzeButton.querySelector(`.${CLASS_BUTTON_CONTENT}`).innerHTML = '<span class="button-emoji">ðŸ”</span><span>Finding your colors...</span>';
            }
            if (previewContainer) previewContainer.style.display = 'block';
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            if (resultsArea) resultsArea.innerHTML = '';
            const file = fileInput.files[0];
            const imageUrl = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
                if (!uploadedImage) { reject(new Error('Uploaded image element not found')); return; }
                uploadedImage.onload = () => {
                    URL.revokeObjectURL(imageUrl);
                    resolve();
                };
                uploadedImage.onerror = () => {
                    console.error('Error loading uploaded image into <img>.');
                    URL.revokeObjectURL(imageUrl);
                    reject(new Error('Failed to load image for preview.'));
                };
                uploadedImage.src = imageUrl;
            });
            const processedImageElement = await resizeImageIfNeeded(uploadedImage);
            if (processedImageElement !== uploadedImage && processedImageElement.src) {
                uploadedImage.src = processedImageElement.src;
            }
            if (uploadedImage.naturalWidth > 0) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = uploadedImage.naturalWidth;
                tempCanvas.height = uploadedImage.naturalHeight;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                    tempCtx.drawImage(uploadedImage, 0, 0);
                    const imageDataURL = tempCanvas.toDataURL('image/jpeg', 0.9);
                    window.currentUploadedImageDataURL = imageDataURL;
                    try {
                        sessionStorage.setItem('currentUploadedImageDataURL', imageDataURL);
                    } catch (e) {
                        console.warn('Could not save image to sessionStorage:', e);
                    }
                } else {
                    console.error('Failed to get context to store image Data URL.');
                    window.currentUploadedImageDataURL = uploadedImage.src;
                }
            } else {
                window.currentUploadedImageDataURL = uploadedImage.src;
            }
            await processSkinColor(uploadedImage);
        } catch (error) {
            console.error('Error processing image or during skin color analysis:', error);
            alert('Error processing image. Please try a different image or check the console for details. Error: ' + error.message);
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    } else {
        alert('Please select an image file first.');
    }
}

function handleUploadAreaDrop(e) {
    const dt = e.dataTransfer;
    const fileInput = document.getElementById('image-file');
    const uploadForm = document.getElementById(CLASS_IMAGE_UPLOAD_FORM);
    if (dt && dt.files && dt.files.length > 0) {
        fileInput.files = dt.files;
        uploadForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
}

// --- Core Analysis Logic (Orchestrates Modules) ---

/**
 * Run color analysis based on selected colors
 * @param {Object} colorSelections - Object containing selected skin, hair, and eye colors
 */
export function runColorAnalysis(colorSelections) {
    const resultsElement = document.getElementById('skin-analysis-results');
    if (!resultsElement) {
        logError("Results element not found");
        return;
    }

    if (!colorSelections || !colorSelections.skinRGB) {
        const error = new Error("No skin color selected");
        logError("Invalid color selections provided", error, { colorSelections });
        resultsElement.innerHTML = '<div class="error-message">Error: No skin color selected</div>';
        updateProgressBar(2); // Go back to selection step
        return;
    }

    try {
        // Get selected colors
        const skinRGB = colorSelections.skinRGB;
        const hairRGB = colorSelections.hairRGB || [0, 0, 0]; // Default to black if not provided
        const eyeRGB = colorSelections.eyeRGB || [0, 0, 0]; // Default to black if not provided

        // Create standardized color objects
        const skinColor = standardizeColor({
            rgb: skinRGB,
            hex: rgbToHex(skinRGB),
            name: "Skin Color"
        });

        const hairColor = standardizeColor({
            rgb: hairRGB,
            hex: rgbToHex(hairRGB),
            name: "Hair Color"
        });

        const eyeColor = standardizeColor({
            rgb: eyeRGB,
            hex: rgbToHex(eyeRGB),
            name: "Eye Color"
        });

        // Perform all analyses
        const skinMetrics = calculateColorMetrics(skinRGB);

        // Create standardized skinColorInfo object with all needed properties
        const skinColorInfo = {
            rgb: skinColor.rgb,
            hairRgb: hairColor.rgb,
            eyeRgb: eyeColor.rgb,
            hex: skinColor.hex,
            hairHex: hairColor.hex,
            eyeHex: eyeColor.hex,
            metrics: skinMetrics,
            hsl: skinMetrics.hsl,
            // Add standardized color objects too for flexibility
            skinColor: skinColor,
            hairColor: hairColor,
            eyeColor: eyeColor
        };

        // Advanced undertone analysis
        skinColorInfo.advancedUndertone = analyzeAdvancedUndertone(skinRGB, hairRGB, eyeRGB);

        skinColorInfo.contrastAnalysis = analyzeColorContrast(skinRGB, hairRGB, eyeRGB);
        skinColorInfo.temperatureAnalysis = analyzeColorTemperature(skinRGB, hairRGB, eyeRGB);
        skinColorInfo.clarityAnalysis = analyzeColorClarity(skinRGB, hairRGB, eyeRGB);
        skinColorInfo.comprehensiveSeason = determineComprehensiveSeason(skinRGB, hairRGB, eyeRGB);

        skinColorInfo.seasonal = {
            season: skinColorInfo.comprehensiveSeason.season,
            temperature: skinColorInfo.temperatureAnalysis.temperature,
            intensity: skinColorInfo.clarityAnalysis.clarity,
            description: skinColorInfo.comprehensiveSeason.description
        };

        skinColorInfo.munsell = analyzeMunsellSystem(skinMetrics);
        skinColorInfo.colorFlow = analyzeColorFlow(skinMetrics);
        skinColorInfo.fitzpatrick = analyzeFitzpatrick(skinMetrics);
        // enhancePantoneAnalysis now includes Monk Scale analysis internally
        const pantoneResult = enhancePantoneAnalysis(skinMetrics);
        skinColorInfo.pantone = pantoneResult;
        skinColorInfo.monkScale = pantoneResult.monkScale; // Extract Monk Scale data 

        // Generate enhanced LAB color palette FIRST
        const seasonName = skinColorInfo.comprehensiveSeason ? skinColorInfo.comprehensiveSeason.season : null;
        skinColorInfo.enhancedPalette = enhancedLabColorPalette(skinRGB, hairRGB, eyeRGB, skinMetrics, seasonName);

        // Store parameters from generateOptimalHarmonies
        skinColorInfo.optimalHarmoniesParameters = generateOptimalHarmonies(skinColorInfo);

        // Explicitly generate the harmony theory colors
        // These results include .allColors and .harmonies (sets of colors)
        skinColorInfo.harmonyTheoryCollections = generateColorHarmonyTheoryRecommendations(skinColorInfo, {});

        // Generate advanced color analysis - SINGLE SOURCE OF TRUTH for all color systems
        skinColorInfo.advancedRecommendations = generateAdvancedColorAnalysis(skinColorInfo);

        // Use the unified color recommendations for scientific clothing recommendations
        if (skinColorInfo.advancedRecommendations && skinColorInfo.advancedRecommendations.colors) {
            skinColorInfo.scientificClothingRecommendations = skinColorInfo.advancedRecommendations.colors.map(item => standardizeColor(item));
        } else if (skinColorInfo.enhancedPalette && Array.isArray(skinColorInfo.enhancedPalette)) {
            // Fallback to enhanced palette if advanced recommendations failed
            skinColorInfo.scientificClothingRecommendations = skinColorInfo.enhancedPalette.map(item => standardizeColor(item));
        } else if (skinColorInfo.harmonyTheoryCollections && skinColorInfo.harmonyTheoryCollections.allColors &&
            Array.isArray(skinColorInfo.harmonyTheoryCollections.allColors)) {
            // Final fallback to harmony theory colors
            skinColorInfo.scientificClothingRecommendations = skinColorInfo.harmonyTheoryCollections.allColors.map(item => standardizeColor(item));
        }



        window.lastAnalyzedSkinColorInfo = skinColorInfo; // Store for navigation

        // Use a minimal delay just to ensure the loading indicator renders

        // Use a minimal delay just to ensure the loading indicator renders
        setTimeout(async () => {
            try {
                // Hide upload form and preview container when showing results
                const uploadForm = document.getElementById('image-upload-form');
                const previewContainer = document.querySelector('.image-preview-container');
                if (uploadForm) uploadForm.style.display = 'none';
                if (previewContainer) previewContainer.style.display = 'none';

                await displayResults(skinColorInfo); // displayResults calls displayFashionColors, which is now async
            } catch (displayError) {
                logError("Error during displayResults call", displayError);
                resultsElement.innerHTML = `
                    <div class="error-message">
                        <h3>Error Displaying Results</h3>
                        <p>${displayError.message}</p>
                        <button class="try-again-btn" onclick="updateProgressBar(2)">Try Again</button>
                    </div>`;
            }
        }, 50);

    } catch (analysisError) {
        logError("Error during color analysis", analysisError);
        if (resultsElement) {
            resultsElement.innerHTML = `
                <div class="error-message">
                    <h3>Analysis Error</h3>
                    <p>${analysisError.message}</p>
                    <button class="try-again-btn" onclick="updateProgressBar(2)">Try Again</button>
                </div>`;
        }
        updateProgressBar(2); // Go back to selection step on error
    }
}

// Flag to indicate initialization status
window.isSkinAnalyzerInitialized = false;
window.skinAnalyzerReady = false;

// --- Initialization ---
/**
 * Main initialization function for the skin analyzer application.
 * Sets up UI, loads data, and prepares for analysis.
 */
async function initSkinAnalyzer() {
    try {
        // Ensure DOM is ready before querying elements for setupUploadHandlers
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        // Add step-1 class to body element on initialization
        document.body.classList.add('step-1');

        setupUploadHandlers();       // Set up image upload and form interaction handlers
        setupProgressBarListeners(); // Set up progress bar click listeners

        // Attempt to load foundation data, but don't block initialization if it fails
        try {
            // Foundation data loaded
        } catch (error) {
            // Handle foundation data loading error
        }

        // Other initializations can go here
        // e.g., pre-loading other necessary resources or setting up UI elements



        window.skinAnalyzerReady = true; // Signal that the main components are ready

        // Process any queued callbacks
        window.skinAnalyzerCallbacks.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error("Error executing queued callback:", e);
            }
        });
        window.skinAnalyzerCallbacks = []; // Clear queue after execution

    } catch (error) {
        console.error("Fatal error during Skin Analyzer initialization:", error);
        // Optionally, display a user-friendly error message on the page
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('div');
            errorMsg.textContent = 'Error initializing the Color Analyzer. Please refresh the page. Check console for details.';
            errorMsg.style.color = 'red';
            errorMsg.style.padding = '20px';
            errorMsg.style.textAlign = 'center';
            errorMsg.style.fontWeight = 'bold';
            body.prepend(errorMsg);
        }
    }
}

// Event listener for analysis analysis requests from imageProcessing.js (Breaking Circular Dependency)
document.addEventListener('sca:analyze', function (e) {
    if (e.detail && e.detail.colorData) {
        runColorAnalysis(e.detail.colorData);
    }
});

// RESTORE SESSION LOGIC
function checkAndRestoreSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPaymentSuccess = urlParams.has('payment_success'); // We might want to restore if they just logged in too?
    // Actually, we should always try to restore if it's recent (e.g. < 1 hour)

    try {
        const storedInfo = localStorage.getItem('sca_skinColorInfo');
        const storedTime = localStorage.getItem('sca_analysisTime');

        if (storedInfo && storedTime) {
            const timeDiff = Date.now() - parseInt(storedTime);
            // Valid for 24 hours
            if (timeDiff < 24 * 60 * 60 * 1000) {
                const skinColorInfo = JSON.parse(storedInfo);
                window.lastAnalyzedSkinColorInfo = skinColorInfo;

                // Restore image if possible
                const storedImage = sessionStorage.getItem('currentUploadedImageDataURL');
                if (storedImage) {
                    window.currentUploadedImageDataURL = storedImage;
                }

                // If we are logged in OR payment success, automatically show results
                const isLoggedIn = typeof sca_ajax_object !== 'undefined' && sca_ajax_object.is_user_logged_in;
                if (isPaymentSuccess || isLoggedIn) {
                    // Check if we are already showing results? No, we are checking on init.
                    // But we need to make sure UI is ready.
                    window.skinAnalyzerCallbacks.push(() => {
                        // Only auto-show if we are on step 1 (upload)
                        const mainContainer = document.querySelector('.skin-analyzer-container');
                        if (!mainContainer.classList.contains('step-3')) {
                            displayResults(skinColorInfo, storedImage);
                            updateProgressBar(3);
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error restoring session:", e);
    }
}

// --- Global API & Entry Point ---
/**
 * Expose a global API for the skin analyzer, primarily for ensuring initialization.
 */
window.skinAnalyzer = {
    // Methods from first definition
    isReady: function () {
        return window.skinAnalyzerReady;
    },
    ensureInitialized: async function (callback, maxRetries = 10, delay = 100) {
        if (window.skinAnalyzerReady) {
            if (callback && typeof callback === 'function') callback();
            return;
        }

        // If not ready, queue the callback. InitSkinAnalyzer will process it.
        if (callback && typeof callback === 'function') {
            if (!window.skinAnalyzerCallbacks.includes(callback)) {
                window.skinAnalyzerCallbacks.push(callback);
            }
        }

        // If initSkinAnalyzer hasn't started, start it.
        // This check prevents multiple initializations.
        if (!window.skinAnalyzerInitializing) {
            window.skinAnalyzerInitializing = true;
            initSkinAnalyzer().catch(err => {
                console.error("Error during ensureInitialized's call to initSkinAnalyzer:", err);
                window.skinAnalyzerInitializing = false; // Allow retry if it failed catastrophically
            });
        }
    },
    // Exposed key functions for direct access
    processSkinColor: processSkinColor,
    runColorAnalysis: runColorAnalysis,
    updateProgressBar: updateProgressBar,
    displayResults: displayResults,
    displayFashionColors: displayFashionColors,
    showModal: showModal
};

// Automatically initialize when the script is loaded and DOM is ready
// This ensures that if the script is loaded defer/async, it still initializes correctly.
if (document.readyState === 'complete' || (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
    window.skinAnalyzer.ensureInitialized();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        window.skinAnalyzer.ensureInitialized();
    });
}

// Initialize on document ready or when Skin Analyzer is ready to use
window.addEventListener('DOMContentLoaded', () => {
    initSkinAnalyzer()
        .then(() => {
            // Dispatch ready event for WordPress integration
            const readyEvent = new CustomEvent('skin-analyzer-ready');
            document.dispatchEvent(readyEvent);
            window.skinAnalyzerReady = true;

            // Execute any queued callbacks
            if (window.skinAnalyzerCallbacks && window.skinAnalyzerCallbacks.length > 0) {
                window.skinAnalyzerCallbacks.forEach(callback => {
                    try {
                        callback();
                    } catch (e) {
                        console.error("Error executing callback:", e);
                    }
                });
                window.skinAnalyzerCallbacks = []; // Clear the queue
            }
        })
        .catch(error => {
            console.error('Skin Analyzer initialization failed:', error);
        });
});

// Expose the main functions for testing purposes
// This allows us to test for seasonal color analysis bias
window.determineComprehensiveSeason = function (skinRGB, hairRGB, eyeRGB) {
    try {
        // Import the functions from colorAnalysis.js if they're not already available
        if (typeof analyzeColorTemperature !== 'function' ||
            typeof analyzeColorClarity !== 'function' ||
            typeof analyzeColorContrast !== 'function') {

            console.warn("Analysis functions not directly available. Using module imports.");

            // Return the result from the module's function
            return determineComprehensiveSeason(skinRGB, hairRGB, eyeRGB);
        }

        // Use the imported functions to perform the analysis
        const contrast = analyzeColorContrast(skinRGB, hairRGB, eyeRGB);
        const temperature = analyzeColorTemperature(skinRGB, hairRGB, eyeRGB);
        const clarity = analyzeColorClarity(skinRGB, hairRGB, eyeRGB);

        // Return the result
        return determineComprehensiveSeason(skinRGB, hairRGB, eyeRGB);
    } catch (error) {
        console.error("Error in test function:", error);
        return {
            season: "Error",
            subtype: "Analysis Failed",
            error: error.message
        };
    }
}; 
