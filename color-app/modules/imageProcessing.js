import { updateProgressBar, showModal } from './uiUtils.js';


// Constants
const STEP_UPLOAD = 1;
const STEP_COLOR_SELECTION = 2;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const COLOR_TYPES = Object.freeze(['skin', 'hair', 'eye', 'manual-wb']);

// Skin tone validation thresholds
const PLAUSIBLE_SKIN_TONE_RANGE_MIN = 15; // Minimum RGB range to avoid grey/achromatic colors
const BLUE_DOMINANCE_THRESHOLD = 50; // Max blue excess to avoid background/reflections
const GREEN_DOMINANCE_THRESHOLD = 50; // Max green excess to avoid background/reflections
const OVEREXPOSURE_THRESHOLD = 240; // Max RGB value to avoid glare/overexposure
const UNDEREXPOSURE_THRESHOLD = 30; // Min RGB value to avoid shadows

const SELECTORS = Object.freeze({
    loadingIndicator: 'analysis-loading',
    results: 'skin-analysis-results',
    imagePreview: '.image-preview-container',
    uploadForm: 'image-upload-form',
    colorSelectionTemplate: 'color-selection-template',
    backToUpload: '#back-to-upload',
    zoomIn: '.zoom-in',
    zoomOut: '.zoom-out',
    analyzeButton: '#analyze-button',
    colorPickerCanvas: '#color-picker-canvas',
    colorSelectionScreen: '.color-selection-screen',
    imageContainer: '.image-container',
    crosshair: '.crosshair',
    resetButton: '.reset-button',
});

// Secure global state management
const state = {
    _selectedColorType: 'skin',
    _selectedColors: {
        skin: null,
        hair: null,
        skin: null,
        hair: null,
        eye: null,
        whiteBalance: null
    },
    _zoomLevel: 1,
    _crosshairVisible: false,

    get selectedColorType() {
        return this._selectedColorType;
    },
    set selectedColorType(value) {
        if (!COLOR_TYPES.includes(value)) {
            console.error('Invalid color type:', value);
            return;
        }
        this._selectedColorType = value;
    },

    getSelectedColor(type) {
        if (!COLOR_TYPES.includes(type)) {
            console.error('Invalid color type:', type);
            return null;
        }
        return this._selectedColors[type];
    },

    setSelectedColor(type, rgb) {
        if (!COLOR_TYPES.includes(type)) {
            console.error('Invalid color type:', type);
            return;
        }
        if (!Array.isArray(rgb) || rgb.length !== 3 || !rgb.every(val => Number.isInteger(val) && val >= 0 && val <= 255)) {
            console.error('Invalid RGB value:', rgb);
            return;
        }
        this._selectedColors[type] = rgb;
    },

    get zoomLevel() {
        return this._zoomLevel;
    },
    set zoomLevel(value) {
        if (typeof value !== 'number' || value < MIN_ZOOM || value > MAX_ZOOM) {
            console.error('Invalid zoom level:', value);
            return;
        }
        this._zoomLevel = value;
    },

    resetColor(type) {
        if (!COLOR_TYPES.includes(type)) {
            console.error('Invalid color type:', type);
            return;
        }
        this._selectedColors[type] = null;
    }
};

// Helper functions with input validation
function getById(id) {
    if (typeof id !== 'string') {
        console.error('Invalid ID type:', typeof id);
        return null;
    }
    return document.getElementById(id);
}

function setDisplay(element, display) {
    if (!(element instanceof Element)) {
        console.error('Invalid element:', element);
        return;
    }
    if (typeof display !== 'string') {
        console.error('Invalid display value:', display);
        return;
    }
    element.style.display = display;
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function validateRGB(rgb) {
    return Array.isArray(rgb) &&
        rgb.length === 3 &&
        rgb.every(val => Number.isInteger(val) && val >= 0 && val <= 255);
}

function handleBackToUpload() {
    const uploadForm = getById(SELECTORS.uploadForm);
    setDisplay(uploadForm, 'block');
    const resultsElement = getById(SELECTORS.results);
    if (resultsElement) resultsElement.innerHTML = '';
    updateProgressBar(STEP_UPLOAD);
}

function handleSelectButtonClick(event, parentElement) {
    const type = event.target.dataset.type;
    if (!type) return;

    state.selectedColorType = type;

    // Update active states
    parentElement.querySelectorAll('.select-button').forEach(button => {
        button.classList.toggle('active', button.dataset.type === type);
    });

    parentElement.querySelectorAll('.color-selector').forEach(selector => {
        selector.classList.toggle('active', selector.id === `${type}-selector`);
    });
}

function handleCanvasClick(event, canvas, ctx, parentElement) {
    if (!(event instanceof MouseEvent) || !(canvas instanceof HTMLCanvasElement) ||
        !(ctx instanceof CanvasRenderingContext2D) || !(parentElement instanceof Element)) {
        console.error('Invalid parameters in handleCanvasClick');
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width / state.zoomLevel);
    const scaleY = canvas.height / (rect.height / state.zoomLevel);
    const x = Math.floor((event.clientX - rect.left) * scaleX / state.zoomLevel);
    const y = Math.floor((event.clientY - rect.top) * scaleY / state.zoomLevel);

    // Validate coordinates are within canvas bounds
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
        console.error('Click coordinates out of bounds');
        return;
    }

    try {
        // Use averaging sampler instead of single pixel
        const rgb = getAveragePixelData(ctx, x, y, 5); // 5px radius = 11x11 area

        if (!validateRGB(rgb)) {
            console.error('Invalid RGB data from canvas');
            return;
        }

        if (state.selectedColorType === 'manual-wb') {
            applyManualWhiteBalance(canvas, rgb);
            // Switch back to skin after setting WB
            state.selectedColorType = 'skin';
            updateUIForManualWB();
            return;
        }

        state.setSelectedColor(state.selectedColorType, rgb);

        // Update UI with sanitized values
        const previewElement = parentElement.querySelector(`#${sanitizeHTML(state.selectedColorType)}-preview`);
        if (previewElement) {
            const safeRgbStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
            previewElement.style.backgroundColor = safeRgbStyle;
            previewElement.classList.add('has-color');

            // Use requestAnimationFrame for animations instead of setTimeout
            requestAnimationFrame(() => {
                previewElement.style.transform = 'scale(1.1)';
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        previewElement.style.transform = '';
                    }, 200);
                });
            });
        }

        // Auto-advance to next unselected color
        const nextUnselectedType = COLOR_TYPES.find(type => !state.getSelectedColor(type));
        if (nextUnselectedType) {
            // Deactivate current button and selector
            parentElement.querySelectorAll('.select-button').forEach(button => {
                button.classList.remove('active');
            });
            parentElement.querySelectorAll('.color-selector').forEach(selector => {
                selector.classList.remove('active');
            });

            // Activate next button and selector
            const nextButton = parentElement.querySelector(`button[data-type="${nextUnselectedType}"]`);
            const nextSelector = parentElement.querySelector(`#${nextUnselectedType}-selector`);
            if (nextButton && nextSelector) {
                state.selectedColorType = nextUnselectedType;
                nextButton.classList.add('active');
                nextSelector.classList.add('active');

                // Add highlight animation to next selector
                nextSelector.style.transform = 'translateY(-5px)';
                setTimeout(() => {
                    nextSelector.style.transform = '';
                }, 300);
            }
        }

        const analyzeButton = parentElement.querySelector(SELECTORS.analyzeButton);
        checkAnalyzeButtonState(analyzeButton);
    } catch (error) {
        console.error('Error processing canvas click:', error);
    }
}

function handleAnalyzeButtonClick() {
    const colorData = {
        skinRGB: state.getSelectedColor('skin'),
        hairRGB: state.getSelectedColor('hair'),
        eyeRGB: state.getSelectedColor('eye')
    };

    // Validate all colors before analysis
    if (!Object.values(colorData).every(rgb => validateRGB(rgb))) {
        console.error('Invalid color data for analysis');
        return;
    }

    // Validate skin color is plausible (not shadows, glare, or background)
    const skinRGB = colorData.skinRGB;
    const [r, g, b] = skinRGB;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const range = max - min;

    // Check for common invalid selections
    if (range < PLAUSIBLE_SKIN_TONE_RANGE_MIN) {
        // Too grey/achromatic - likely a shadow or neutral background
        // Too grey/achromatic - likely a shadow or neutral background
        showModal("Clearer Photo Needed", "The skin color you selected appears to be too grey or in a shadow.<br><br>Please select a well-lit area of your cheek or forehead for accurate results.");
        return;
    }

    if (b > r && b > g && (b - r > BLUE_DOMINANCE_THRESHOLD)) {
        // Too blue - likely clicked on background, clothing, or blue light reflection
        // Too blue - likely clicked on background, clothing, or blue light reflection
        showModal("Check Lighting", "The skin color you selected appears to be too blue.<br><br>Please avoid areas with blue lighting or reflections. Try selecting a natural, well-lit area of your face.");
        return;
    }

    if (g > r && g > b && (g - r > GREEN_DOMINANCE_THRESHOLD)) {
        // Too green - likely background or green light reflection
        // Too green - likely background or green light reflection
        showModal("Check Lighting", "The skin color you selected appears to be too green.<br><br>Please select directly from your skin, avoiding any background or reflected light.");
        return;
    }

    if (max > OVEREXPOSURE_THRESHOLD) {
        // Too bright - likely a light glare or overexposed area
        // Too bright - likely a light glare or overexposed area
        showModal("Reduce Glare", "The area you selected appears to be overexposed or has a light glare.<br><br>Please select a naturally lit area without direct bright light.");
        return;
    }

    if (max < UNDEREXPOSURE_THRESHOLD) {
        // Too dark - likely a deep shadow
        // Too dark - likely a deep shadow
        showModal("More Light Needed", "The area you selected appears to be in a shadow.<br><br>Please select a well-lit area of your face for accurate color analysis.");
        return;
    }

    // Dispatch event to trigger analysis in parent orchestrator
    const event = new CustomEvent('sca:analyze', {
        detail: { colorData: colorData },
        bubbles: true
    });
    document.dispatchEvent(event);
}

function updateCrosshair(event, container) {
    const crosshair = container.querySelector(SELECTORS.crosshair);
    if (!crosshair) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    crosshair.style.left = `${x}px`;
    crosshair.style.top = `${y}px`;
}

function handleResetButtonClick(event, parentElement) {
    event.stopPropagation();
    const type = event.target.dataset.type;
    if (!type) return;

    state.resetColor(type);

    const previewElement = parentElement.querySelector(`#${type}-preview`);
    if (previewElement) {
        previewElement.style.backgroundColor = '#f0f0f0';
        previewElement.classList.remove('has-color');
    }

    const analyzeButton = parentElement.querySelector(SELECTORS.analyzeButton);
    checkAnalyzeButtonState(analyzeButton);
}

function handleKeyboardNavigation(event, parentElement) {
    if (event.key === 'Tab' || event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();

        const currentIndex = COLOR_TYPES.indexOf(state.selectedColorType);
        let nextIndex;

        if (event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + COLOR_TYPES.length) % COLOR_TYPES.length;
        } else {
            nextIndex = (currentIndex + 1) % COLOR_TYPES.length;
        }

        const nextType = COLOR_TYPES[nextIndex];
        const nextButton = parentElement.querySelector(`button[data-type="${nextType}"]`);
        if (nextButton) nextButton.click();
    }
}

function checkAnalyzeButtonState(button) {
    if (!button) return;

    // Only check for required colors (skin, hair, eye)
    const requiredTypes = ['skin', 'hair', 'eye'];
    const allColorsSelected = requiredTypes.every(type => state.getSelectedColor(type));

    button.disabled = !allColorsSelected;

    if (allColorsSelected) {
        button.textContent = 'Find Your Best Colors';
        button.classList.add('ready');
    } else {
        const remaining = requiredTypes.filter(type => !state.getSelectedColor(type)).length;
        button.textContent = `Select ${remaining} more color${remaining > 1 ? 's' : ''}`;
        button.classList.remove('ready');
        button.style.animation = '';
    }
}

// Define processSkinColor before exports
async function processSkinColor(imageElement) {
    const loadingIndicator = getById(SELECTORS.loadingIndicator);
    setDisplay(loadingIndicator, 'none');
    showColorSelectionScreen(imageElement);
    return null;
}

// Export functions for ES module usage
/**
 * Get average pixel data from a square area
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - Center x coordinate
 * @param {number} y - Center y coordinate
 * @param {number} radius - Radius of the square (e.g., 2 means 5x5 square)
 * @returns {number[]} Average RGB values [r, g, b]
 */
function getAveragePixelData(ctx, x, y, radius) {
    const size = radius * 2 + 1;
    const startX = Math.max(0, x - radius);
    const startY = Math.max(0, y - radius);

    // Adjust width/height if close to edges
    const width = Math.min(ctx.canvas.width - startX, size);
    const height = Math.min(ctx.canvas.height - startY, size);

    if (width <= 0 || height <= 0) return [0, 0, 0];

    const imageData = ctx.getImageData(startX, startY, width, height);
    const data = imageData.data;

    let r = 0, g = 0, b = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
    }

    if (count === 0) return [0, 0, 0];

    return [
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count)
    ];
}

/**
 * Apply manual white balance based on a selected neutral reference color
 * @param {HTMLCanvasElement} canvas - The canvas to correct
 * @param {number[]} referenceRGB - The RGB values of the selected neutral point
 */
function applyManualWhiteBalance(canvas, referenceRGB) {
    const ctx = canvas.getContext('2d');
    const [refR, refG, refB] = referenceRGB;

    // Avoid division by zero
    if (refR < 10 || refG < 10 || refB < 10) {
        if (refR < 10 || refG < 10 || refB < 10) {
            showModal("Reference Too Dark", "Selected area is too dark to use as a white balance reference. Please select a lighter neutral area.");
            return;
        }
        return;
    }

    // Target is the average of the channels (making it neutral gray)
    const target = (refR + refG + refB) / 3;

    // Calculate scaling factors
    const scaleR = target / refR;
    const scaleG = target / refG;
    const scaleB = target / refB;

    // Apply correction to the entire canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * scaleR);     // R
        data[i + 1] = Math.min(255, data[i + 1] * scaleG); // G
        data[i + 2] = Math.min(255, data[i + 2] * scaleB); // B
    }

    ctx.putImageData(imageData, 0, 0);
    state._selectedColors.whiteBalance = { scaleR, scaleG, scaleB };
    ctx.putImageData(imageData, 0, 0);
    state._selectedColors.whiteBalance = { scaleR, scaleG, scaleB };
    showModal("Color Calibrated", "White balance updated! Please re-select your skin, hair, and eye colors.");

    // Reset other selections as the image has changed
    ['skin', 'hair', 'eye'].forEach(type => state.resetColor(type));
    document.querySelectorAll('.color-preview').forEach(el => {
        el.style.backgroundColor = '#f0f0f0';
        el.classList.remove('has-color');
    });
}

function updateUIForManualWB() {
    const wbButton = document.getElementById('manual-wb-button');
    if (wbButton) {
        wbButton.classList.remove('active');
        wbButton.textContent = 'Set White Balance';
    }

    // Reset active states for other buttons
    document.querySelectorAll('.select-button').forEach(btn => {
        if (btn.dataset.type === 'skin') btn.click();
    });
}

export { processSkinColor, showColorSelectionScreen };

// Expose to global scope for WordPress/non-module scripts
window.processSkinColor = processSkinColor;

function showColorSelectionScreen(imageElement) {
    const resultsElement = getById(SELECTORS.results);
    if (!resultsElement) return;

    setDisplay(document.querySelector(SELECTORS.imagePreview), 'none');
    setDisplay(getById(SELECTORS.uploadForm), 'none');
    updateProgressBar(STEP_COLOR_SELECTION);

    resultsElement.innerHTML = '';
    const template = getById(SELECTORS.colorSelectionTemplate);
    if (!template) {
        resultsElement.innerHTML = '<p style="color: red;">Error: UI Template is missing.</p>';
        return;
    }

    const clone = template.content.cloneNode(true);
    resultsElement.appendChild(clone);

    const selectionScreenElement = resultsElement.querySelector(SELECTORS.colorSelectionScreen);
    if (!selectionScreenElement) return;

    const canvasElement = selectionScreenElement.querySelector(SELECTORS.colorPickerCanvas);
    if (canvasElement) {
        initColorPicker(imageElement, canvasElement, selectionScreenElement);
    }

    const zoomInButton = selectionScreenElement.querySelector(SELECTORS.zoomIn);
    const zoomOutButton = selectionScreenElement.querySelector(SELECTORS.zoomOut);
    setupZoomControls(zoomInButton, zoomOutButton, canvasElement);

    const backButton = selectionScreenElement.querySelector(SELECTORS.backToUpload);
    if (backButton) {
        backButton.addEventListener('click', handleBackToUpload);
    }

    // Setup keyboard navigation
    document.addEventListener('keydown', (e) => handleKeyboardNavigation(e, selectionScreenElement));

    // Setup reset buttons
    selectionScreenElement.querySelectorAll(SELECTORS.resetButton).forEach(button => {
        button.addEventListener('click', (e) => handleResetButtonClick(e, selectionScreenElement));
    });

    // Add Manual WB Button if not present
    const controlsArea = selectionScreenElement.querySelector('.controls-area') || selectionScreenElement.querySelector('.color-selection-controls');
    if (controlsArea && !controlsArea.querySelector('#manual-wb-button')) {
        const wbBtn = document.createElement('button');
        wbBtn.id = 'manual-wb-button';
        wbBtn.className = 'secondary-button';
        wbBtn.textContent = 'Set White Balance';
        wbBtn.style.marginTop = '10px';
        wbBtn.onclick = () => {
            state.selectedColorType = 'manual-wb';
            wbBtn.classList.add('active');
            wbBtn.textContent = 'Click a Neutral/White Area';
            showModal("Manual Calibration", "Please click on a white or neutral gray area in the photo to calibrate colors.");
        };
        controlsArea.appendChild(wbBtn);
    }

    // Setup crosshair
    const imageContainer = selectionScreenElement.querySelector(SELECTORS.imageContainer);
    if (imageContainer) {
        imageContainer.addEventListener('mousemove', (e) => updateCrosshair(e, imageContainer));
        imageContainer.addEventListener('mouseenter', () => {
            const crosshair = imageContainer.querySelector(SELECTORS.crosshair);
            if (crosshair) crosshair.style.display = 'block';
        });
        imageContainer.addEventListener('mouseleave', () => {
            const crosshair = imageContainer.querySelector(SELECTORS.crosshair);
            if (crosshair) crosshair.style.display = 'none';
        });
    }
}

function initColorPicker(imageElement, canvas, parentElement) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    // Set canvas dimensions to match container size while maintaining aspect ratio
    const container = canvas.parentElement;
    if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight || containerWidth * 0.75; // Fallback height if not set

        const imageAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        let canvasWidth, canvasHeight;

        if (imageAspectRatio > containerAspectRatio) {
            // Image is wider than container
            canvasWidth = containerWidth;
            canvasHeight = containerWidth / imageAspectRatio;
        } else {
            // Image is taller than container
            canvasHeight = containerHeight;
            canvasWidth = containerHeight * imageAspectRatio;
        }

        // Set canvas dimensions
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Draw image to fit canvas
        ctx.drawImage(imageElement, 0, 0, canvasWidth, canvasHeight);



        // Initial zoom level is 1 since we're already properly scaled
        state.zoomLevel = 1;
        canvas.style.transform = 'scale(1)';
    }

    // Setup event listeners
    parentElement.querySelectorAll('.select-button').forEach(button => {
        button.addEventListener('click', event => handleSelectButtonClick(event, parentElement));
    });
    canvas.addEventListener('click', event => handleCanvasClick(event, canvas, ctx, parentElement));
    const analyzeButton = parentElement.querySelector(SELECTORS.analyzeButton);
    if (analyzeButton) {
        analyzeButton.addEventListener('click', handleAnalyzeButtonClick);
        checkAnalyzeButtonState(analyzeButton);
    }
}

function setupZoomControls(zoomInButton, zoomOutButton, canvas) {
    if (!zoomInButton || !zoomOutButton || !canvas) return;
    zoomInButton.addEventListener('click', handleZoomInClick.bind(null, canvas));
    zoomOutButton.addEventListener('click', handleZoomOutClick.bind(null, canvas));
}

function handleZoomInClick(canvas) {
    state.zoomLevel += ZOOM_STEP;
    updateCanvasZoom(canvas);
}

function handleZoomOutClick(canvas) {
    if (state.zoomLevel > ZOOM_STEP) {
        state.zoomLevel -= ZOOM_STEP;
        updateCanvasZoom(canvas);
    }
}

function updateCanvasZoom(canvas) {
    if (!canvas) return;
    canvas.style.transform = `scale(${state.zoomLevel})`;
    canvas.style.transformOrigin = 'top left';
    const container = canvas.closest(SELECTORS.imageContainer);
    if (container) {
        container.style.overflow = state.zoomLevel > 1 ? 'auto' : 'hidden';
    }
}