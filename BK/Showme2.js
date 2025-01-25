!function() {
    const CONFIG = Object.freeze({
        revealHidden: true,
        unblockInteractions: true,
        removePaywalls: true,
        removeRestrictions: true,
        bypassTimers: true,
        debug: true,
        styles: {
            revealedElementBorder: 'thin solid rgba(255, 0, 0, 0.4)', // Very thin, semi-transparent red
            criticalElementBorder: 'thin solid rgba(255, 153, 0, 0.3)', // Soft orange for critical elements
            debugTextColor: '#333'
        }
    });

    const Utils = {
        log(message) {
            if (CONFIG.debug) console.log(`[Page Unlocker]: ${message}`);
        },
        
        selectElements() {
            return Array.from(document.querySelectorAll('*'))
                .filter(el => !['SCRIPT', 'STYLE', 'HTML', 'HEAD', 'BODY']
                    .includes(el.tagName));
        },

        applyStyles(element, styles) {
            Object.assign(element.style, styles);
        }
    };

    class ElementModifier {
        constructor(element) {
            this.element = element;
            this.wasModified = false;
            this.modificationReasons = [];
        }

        revealHidden() {
            try {
                // Enhanced hidden element detection
                const computedStyle = window.getComputedStyle(this.element);
                const hidingConditions = [
                    computedStyle.display === 'none',
                    computedStyle.visibility === 'hidden',
                    parseFloat(computedStyle.opacity) === 0,
                    this.element.hidden,
                    this.element.classList.contains('hidden'),
                    this.element.classList.contains('invisible')
                ];

                if (hidingConditions.some(Boolean)) {
                    // Comprehensive reveal strategy
                    this.element.style.display = 'block';
                    this.element.style.visibility = 'visible';
                    this.element.style.opacity = '1';
                    this.element.style.position = 'relative';
                    this.element.style.left = 'auto';
                    this.element.style.top = 'auto';

                    // Remove hiding classes
                    ['hidden', 'invisible', 'sr-only'].forEach(cls => {
                        this.element.classList.remove(cls);
                    });

                    this.wasModified = true;
                    this.modificationReasons.push('Hidden Element Revealed');
                }
            } catch (error) {
                Utils.log('Advanced visibility restoration failed');
            }
        }

        unblockInteractions() {
            try {
                // Comprehensive interaction unblocking
                const blockingAttributes = [
                    'disabled', 'readonly', 'aria-disabled', 
                    'data-disabled', 'data-readonly', 
                    'aria-hidden', 'data-interactive-blocked'
                ];

                blockingAttributes.forEach(attr => {
                    this.element.removeAttribute(attr);
                });

                // Input element special handling
                if (this.element instanceof HTMLInputElement) {
                    this.element.readOnly = false;
                    this.element.disabled = false;
                    
                    // Expand input type restoration
                    const restrictedTypes = [
                        'hidden', 'password', 'readonly', 
                        'email-blocked', 'tel-locked'
                    ];

                    if (restrictedTypes.includes(this.element.type)) {
                        this.element.type = 'text';
                    }
                }

                // Enhanced form and button handling
                if (this.element.tagName === 'BUTTON' || 
                    this.element.tagName === 'FORM' ||
                    this.element.getAttribute('role') === 'button') {
                    
                    if (this.element.tagName === 'BUTTON') {
                        this.element.disabled = false;
                    }

                    // Remove form submission blockers
                    if (this.element.tagName === 'FORM') {
                        this.element.onsubmit = null;
                    }
                }

                // Restore interactivity
                this.element.style.pointerEvents = 'auto';
                this.element.style.cursor = 'pointer';

                this.wasModified = true;
                this.modificationReasons.push('Interactions Unblocked');
            } catch (error) {
                Utils.log('Interaction unblocking failed');
            }
        }

        removePaywalls() {
            const paywallSelectors = [
                '[class*="paywall"]', '[class*="subscribe"]', 
                '[class*="premium"]', '[id*="overlay"]',
                '.modal', '.popup', '.restrict-access', 
                '[data-paywall]'
            ];

            try {
                const isPaywall = paywallSelectors.some(selector => 
                    this.element.matches(selector) || 
                    (this.element.style.position === 'fixed' && 
                     parseInt(this.element.style.zIndex, 10) > 100)
                );

                if (isPaywall) {
                    this.element.remove();
                    this.wasModified = true;
                    this.modificationReasons.push('Paywall Removed');
                }
            } catch (error) {
                Utils.log('Paywall removal failed');
            }
        }

        neutralizeEventListeners() {
            try {
                const eventTypes = [
                    'click', 'mousedown', 'mouseup', 'keydown', 
                    'keypress', 'submit', 'contextmenu'
                ];

                eventTypes.forEach(eventType => {
                    const originalListener = this.element[`on${eventType}`];
                    if (originalListener) {
                        this.element[`on${eventType}`] = null;
                    }
                });
            } catch (error) {
                Utils.log('Event listener neutralization failed');
            }
        }

        highlight() {
            if (this.wasModified) {
                // Minimal, thin border highlighting
                this.element.style.border = CONFIG.styles.revealedElementBorder;
                
                // Optional debug attribute for tracking
                this.element.setAttribute('data-unlocker-mod', 
                    this.modificationReasons.join(', '));
            }
        }
    }

    function comprehensiveUnlock() {
        const debugOverlay = createDebugOverlay();
        let modificationCount = 0;
        let modifiedElements = [];

        // Accelerated timer modification
        if (CONFIG.bypassTimers) {
            window.setTimeout = (cb, delay) => 
                Function.prototype.call.call(
                    window.setTimeout, 
                    window, 
                    cb, 
                    Math.min(delay, 50)
                );
        }

        // Batch process elements
        Utils.selectElements().forEach(element => {
            const modifier = new ElementModifier(element);

            if (CONFIG.revealHidden) modifier.revealHidden();
            if (CONFIG.unblockInteractions) modifier.unblockInteractions();
            if (CONFIG.removePaywalls) modifier.removePaywalls();
            
            modifier.neutralizeEventListeners();
            modifier.highlight();

            if (modifier.wasModified) {
                modificationCount++;
                modifiedElements.push({
                    element: element,
                    reasons: modifier.modificationReasons
                });
            }
        });

        // Update debug overlay
        updateDebugOverlay(debugOverlay, modificationCount, modifiedElements);
    }

    function createDebugOverlay() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '999999',
            backgroundColor: 'rgba(255,255,255,0.9)',
            color: CONFIG.styles.debugTextColor,
            padding: '10px',
            borderRadius: '5px',
            maxWidth: '300px',
            fontSize: '12px',
            display: CONFIG.debug ? 'block' : 'none',
            border: '1px solid rgba(0,0,0,0.1)'
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function updateDebugOverlay(overlay, modificationCount, modifiedElements) {
        if (CONFIG.debug) {
            const summaryHTML = `
                <strong style="color: red;">Page Unlocker Report</strong><br>
                Total Elements Modified: ${modificationCount}<br>
                Timestamp: ${new Date().toLocaleString()}<br>
                <details>
                    <summary>Modified Elements (${modifiedElements.length})</summary>
                    <ul style="max-height: 200px; overflow-y: auto;">
                        ${modifiedElements.slice(0,10).map(mod => 
                            `<li>${mod.element.tagName}: ${mod.reasons.join(', ')}</li>`
                        ).join('')}
                    </ul>
                </details>
            `;
            overlay.innerHTML = summaryHTML;
        }
    }

    function neutralizeGlobalEventListeners() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            const neutralizedListener = (event) => {
                event.stopPropagation = () => {};
                event.preventDefault = () => {};
                return listener.call(this, event);
            };
            return originalAddEventListener.call(this, type, neutralizedListener, options);
        };
    }

    function initializeUnlocker() {
        try {
            neutralizeGlobalEventListeners();
            setTimeout(comprehensiveUnlock, 200);
            Utils.log('Advanced page unlocking initiated');
        } catch (error) {
            console.error('Advanced page unlocker critical error:', error);
        }
    }

    initializeUnlocker();
}();
