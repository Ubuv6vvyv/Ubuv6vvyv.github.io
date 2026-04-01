// UI Utility Functions for Skin Analyzer
// This module contains shared UI logic to avoid circular dependencies and duplication.

// Constants for classes
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


/**
 * Update the progress bar to show the current step
 * @param {number} currentStep - Current step number
 * @param {boolean} animated - Whether to animate the transition
 */
export function updateProgressBar(currentStep, animated = true) {
    const progressSteps = document.querySelectorAll('.sca-progress-step');
    let previousActiveStep = null;

    // Find the previously active step
    progressSteps.forEach(step => {
        if (step.classList.contains('active')) {
            previousActiveStep = parseInt(step.getAttribute('data-step'));
        }
    });

    // Update step classes
    progressSteps.forEach(step => {
        const stepNumber = parseInt(step.getAttribute('data-step'));

        step.classList.remove('active', 'completed', 'clickable');

        if (stepNumber === currentStep) {
            step.classList.add('active');

            // Add animation to active step if this is a forward progression
            if (animated && previousActiveStep !== null && stepNumber > previousActiveStep) {
                // Add celebration effect
                addCelebrationEffect(step);

                // Animate the emoji
                const emojiElement = step.querySelector('.step-emoji');
                if (emojiElement) {
                    emojiElement.classList.add('celebrating');
                    setTimeout(() => {
                        emojiElement.classList.remove('celebrating');
                    }, 2000);
                }
            }
        }
        else if (stepNumber < currentStep) {
            step.classList.add('completed', 'clickable');

            // Animate connector if moving forward
            if (animated && previousActiveStep !== null && currentStep > previousActiveStep && stepNumber === currentStep - 1) {
                const connector = step.nextElementSibling;
                if (connector && connector.classList.contains('sca-progress-connector')) {
                    connector.classList.add('animating');
                    setTimeout(() => {
                        connector.classList.remove('animating');
                    }, 1000);
                }
            }
        }
    });

    // Update encouraging message animation if progressing
    if (animated && previousActiveStep !== null && currentStep > previousActiveStep) {
        const activeStep = document.querySelector(`.sca-progress-step[data-step="${currentStep}"]`);
        if (activeStep) {
            const messageElement = activeStep.querySelector('.step-message');
            if (messageElement) {
                messageElement.classList.add('message-appear');
                setTimeout(() => {
                    messageElement.classList.remove('message-appear');
                }, 2000);
            }
        }
    }

    // Update main container class based on current step
    const mainContainer = document.querySelector('.skin-analyzer-container');
    if (mainContainer) {
        // Remove all step classes
        mainContainer.classList.remove('step-1', 'step-2', 'step-3');
        // Add current step class
        mainContainer.classList.add(`step-${currentStep}`);

        // Also add step class to body element
        document.body.classList.remove('step-1', 'step-2', 'step-3');
        document.body.classList.add(`step-${currentStep}`);
    }
}

/**
 * Add celebration effect to a step element
 * @param {HTMLElement} stepElement - The step element to add celebration to
 */
function addCelebrationEffect(stepElement) {
    // Add pop animation to the step
    stepElement.classList.add('pop-animation');
    setTimeout(() => {
        stepElement.classList.remove('pop-animation');
    }, 700);
}

/**
 * Show a custom modal dialog
 * @param {string} title - The title of the modal
 * @param {string} message - The message content (HTML supported)
 */
export function showModal(title, message) {
    // Check if modal container exists
    let overlay = document.querySelector('.sca-modal-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sca-modal-overlay';
        overlay.innerHTML = `
            <div class="sca-modal">
                <h3 class="sca-modal-title"></h3>
                <div class="sca-modal-message"></div>
                <button class="sca-modal-close">Got it</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Add event listeners
        const closeBtn = overlay.querySelector('.sca-modal-close');
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.visibility = 'hidden';
            }, 300);
        });

        // Close on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.style.visibility = 'hidden';
                }, 300);
            }
        });
    }

    // Update content
    const titleEl = overlay.querySelector('.sca-modal-title');
    const messageEl = overlay.querySelector('.sca-modal-message');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.innerHTML = message;

    // Show modal
    overlay.style.visibility = 'visible';
    // Small delay to allow transition
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
}

/**
 * Closes the image preview and clears results.
 */
export function handleClosePreview() {
    const previewContainer = document.querySelector(`.${CLASS_IMAGE_PREVIEW_CONTAINER}`);
    if (previewContainer) previewContainer.style.display = 'none';
    const uploadedImage = document.getElementById('uploaded-image');
    if (uploadedImage) uploadedImage.src = '';
    const resultsArea = document.getElementById(CLASS_SKIN_ANALYSIS_RESULTS);
    if (resultsArea) resultsArea.innerHTML = '';

    // Reset step classes on container and body
    const mainContainer = document.querySelector('.skin-analyzer-container');
    if (mainContainer) {
        mainContainer.classList.remove('step-2', 'step-3');
        mainContainer.classList.add('step-1');
    }
    document.body.classList.remove('step-2', 'step-3');
    document.body.classList.add('step-1');

    // Update progress bar to step 1
    updateProgressBar(1, false);
}
    
