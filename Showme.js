(function() {
    try {
        // Unlock form elements: Disable read-only, required, and enable submit buttons
        function modifyFormElements(element) {
            let modified = false;

            // Disable read-only attributes
            if (element.hasAttribute('readonly')) {
                element.removeAttribute('readonly');
                modified = true;
            }

            // Allow multiple selections for select elements
            if (element.tagName === 'SELECT' && !element.multiple) {
                element.multiple = true;
                modified = true;
            }

            // Remove required attributes
            if (element.hasAttribute('required')) {
                element.removeAttribute('required');
                modified = true;
            }

            // Enable disabled submit buttons
            if (element.tagName === 'BUTTON' && element.type === 'submit' && element.disabled) {
                element.disabled = false;
                modified = true;
            }

            if (element.tagName === 'INPUT' && element.type === 'submit' && element.disabled) {
                element.disabled = false;
                modified = true;
            }

            if (modified) {
                element.classList.add('highlight-unlocked');
            }
        }

        // Apply modifications to all form elements
        const formElements = document.querySelectorAll('input, textarea, select, button, label');
        formElements.forEach(modifyFormElements);

        // Reveal all hidden elements
        function revealHiddenElements(element) {
            let modified = false;

            // Unhide elements with display: none
            if (window.getComputedStyle(element).display === 'none') {
                element.style.display = 'block';
                modified = true;
            }

            // Unhide elements with visibility: hidden
            if (window.getComputedStyle(element).visibility === 'hidden') {
                element.style.visibility = 'visible';
                modified = true;
            }

            // Unhide elements with opacity: 0
            if (window.getComputedStyle(element).opacity === '0') {
                element.style.opacity = '1';
                modified = true;
            }

            // Enable pointer-events for hidden elements
            if (window.getComputedStyle(element).pointerEvents === 'none') {
                element.style.pointerEvents = 'auto';
                modified = true;
            }

            // Unhide overlay and modal elements
            if (element.tagName === 'IFRAME' || element.tagName === 'DIV' || element.tagName === 'SECTION') {
                if (element.style.zIndex === '0' || element.style.zIndex === '') {
                    element.style.zIndex = '9999'; // Ensure it's above other content
                    modified = true;
                }
            }

            // Reveal hidden form data (e.g., hidden input fields)
            if (element.tagName === 'INPUT' && element.type === 'hidden') {
                element.style.display = 'inline-block'; // Make hidden inputs visible
                modified = true;
            }

            // Remove the 'hidden' attribute from elements
            if (element.hasAttribute('hidden')) {
                element.removeAttribute('hidden');
                modified = true;
            }

            // Reveal hidden data-* attributes
            if (element.hasAttribute('data-hidden')) {
                element.removeAttribute('data-hidden');
                modified = true;
            }

            // If modified, add a class to mark as unlocked
            if (modified) {
                element.classList.add('highlight-unlocked');
            }
        }

        // Apply revealing to all elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(revealHiddenElements);

        // Listen for dynamically added elements to unhide them
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        revealHiddenElements(node);
                        const nestedElements = node.querySelectorAll('*');
                        nestedElements.forEach(revealHiddenElements);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Set protection-related flags
        window.isProtected = false;
        window.protection = false;
        window.protected = false;
        window.securityCheck = false;
        window.isSecured = false;
        window.isRestricted = false;

        // Override protection functions
        window.preventInspect = () => {};
        window.preventDebugger = () => {};
        window.preventDevTools = () => {};
        window.checkDevTools = () => {};
        window.detectDevTools = () => {};

        // Disable context menu prevention
        document.oncontextmenu = null;
        window.oncontextmenu = null;
        document.body.oncontextmenu = null;

        // Disable selection prevention
        document.onselectstart = null;
        window.onselectstart = null;
        document.body.onselectstart = null;

        // Disable copy prevention
        document.oncopy = null;
        window.oncopy = null;
        document.body.oncopy = null;

        // Remove noprint class
        document.body.classList.remove('noprint');

        // Enable right-click
        document.addEventListener('contextmenu', (e) => e.stopPropagation(), true);

        // Enable copy
        document.addEventListener('copy', (e) => e.stopPropagation(), true);

        // Enable selection
        document.addEventListener('selectstart', (e) => e.stopPropagation(), true);

        // Enable drag
        document.addEventListener('dragstart', (e) => e.stopPropagation(), true);

        // Remove Content Security Policy
        document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());

        // Remove blocking stylesheets
        try {
            Array.from(document.styleSheets).forEach(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules || []);
                    rules.forEach((rule, index) => {
                        if (rule.style && (
                            rule.style.pointerEvents === 'none' ||
                            rule.style.userSelect === 'none' ||
                            rule.style.visibility === 'hidden' ||
                            rule.style.display === 'none' ||
                            rule.style.opacity === '0' ||
                            rule.selectorText?.includes(':disabled') ||
                            rule.selectorText?.includes('.disabled') ||
                            rule.selectorText?.includes('[disabled]') ||
                            rule.selectorText?.includes(':not') ||
                            rule.selectorText?.includes('::before') ||
                            rule.selectorText?.includes('::after')
                        )) {
                            try {
                                sheet.deleteRule(index);
                            } catch (e) {}
                        }
                    });
                } catch (e) {
                    // Ignore cross-origin stylesheet errors
                }
            });
        } catch (e) {
            console.warn('Error handling stylesheets:', e);
        }

        // Stop all possible timers
        const highestTimeoutId = window.setTimeout(() => {}, 0);
        for (let i = 0; i <= highestTimeoutId; i++) {
            window.clearTimeout(i);
            window.clearInterval(i);
        }

        // Stop animations
        const highestAnimationFrame = requestAnimationFrame(() => {});
        for (let i = 0; i <= highestAnimationFrame; i++) {
            cancelAnimationFrame(i);
        }

        // Cancel running animations
        document.getAnimations().forEach(animation => animation.cancel());

        // Override timer functions
        window.setInterval = function() { return null; };
        window.setTimeout = function() { return null; };
        window.requestAnimationFrame = function() { return null; };

        // Add anti-lock stylesheet
        const antiLockStyle = document.createElement('style');
        antiLockStyle.textContent = `
            * {
                user-select: auto !important;
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
                pointer-events: auto !important;
                cursor: auto !important;
                overflow: auto !important;
                opacity: 1 !important;
                visibility: visible !important;
                clip: auto !important;
                clip-path: none !important;
                mask: none !important;
                filter: none !important;
                backdrop-filter: none !important;
                mix-blend-mode: normal !important;
            }
            html, body {
                overflow: auto !important;
                position: static !important;
                transform: none !important;
                perspective: none !important;
                scroll-behavior: auto !important;
                touch-action: auto !important;
            }
            iframe {
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
                z-index: auto !important;
            }
        `;
        document.head.appendChild(antiLockStyle);

        // Remove all possible restrictive attributes
        const attributes = [
            'disabled', 'readonly', 'required', 'maxLength', 'pattern',
            'min', 'max', 'minlength', 'maxlength', 'autocomplete',
            'contenteditable', 'draggable', 'spellcheck', 'translate',
            'aria-disabled', 'aria-hidden', 'aria-invalid', 'data-disabled', 'data-readonly', 'data-hidden',
            'hidden', 'tabindex', 'inputmode', 'loading', 'sandbox', 'security', 'restrict'
        ];

        // Remove all data-* and aria-* attributes
        Array.from(document.querySelectorAll('*')).forEach(element => {
            let modified = false;
            attributes.forEach(attr => {
                if (element.hasAttribute(attr)) {
                    element.removeAttribute(attr);
                    modified = true;
                }
            });

            // Convert restricted input types
            if (element.tagName === 'INPUT') {
                const restrictedTypes = [
                    'email', 'url', 'number', 'tel', 'date', 'time',
                    'datetime-local', 'hidden', 'month', 'week', 'color',
                    'range', 'search', 'file', 'image', 'password'
                ];
                if (restrictedTypes.includes(element.type)) {
                    element.type = 'text';
                    modified = true;
                }
            }

            // Remove inline styles that might hide elements
            const computedStyle = window.getComputedStyle(element);
            const styleProperties = {
                visibility: 'visible',
                display: computedStyle.display === 'none' ? 'block' : computedStyle.display,
                opacity: '1',
                pointerEvents: 'auto',
                userSelect: 'auto',
                cursor: 'auto',
                position: computedStyle.position === 'fixed' ? 'relative' : computedStyle.position,
                zIndex: 'auto',
                transform: 'none',
                filter: 'none',
                mixBlendMode: 'normal',
                clipPath: 'none',
                mask: 'none',
                webkitMask: 'none',
                overflow: 'visible',
                height: computedStyle.height === '0px' ? 'auto' : computedStyle.height,
                width: computedStyle.width === '0px' ? 'auto' : computedStyle.width,
                maxHeight: 'none',
                maxWidth: 'none',
                minHeight: '0',
                minWidth: '0'
            };

            Object.entries(styleProperties).forEach(([property, value]) => {
                element.style[property] = value;
            });

            // Remove all event listeners that might block actions
            const events = [
                'click', 'mousedown', 'mouseup', 'mousemove',
                'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
                'touchstart', 'touchend', 'touchmove', 'touchcancel',
                'dragstart', 'drag', 'dragend', 'drop',
                'contextmenu', 'selectstart', 'select', 'copy',
                'cut', 'paste', 'keydown', 'keyup', 'keypress',
                'wheel', 'scroll', 'focus', 'blur'
            ];

            events.forEach(event => {
                element[`on${event}`] = null;
            });

            // Remove iframe restrictions
            if (element.tagName === 'IFRAME') {
                element.removeAttribute('sandbox');
                element.style.pointerEvents = 'auto';
                try {
                    element.contentWindow.eval = window.eval;
                } catch (e) {}
            }

            if (modified) {
                element.classList.add('highlight-unlocked');
            }
        });

        // Remove overlay elements
        const overlaySelectors = [
            '[class*="modal"]',
            '[class*="overlay"]',
            '[class*="dialog"]',
            '[class*="backdrop"]',
            '[class*="drawer"]',
            '[class*="popup"]',
            '[class*="lightbox"]',
            '[class*="toast"]',
            '[role="dialog"]',
            '[role="alertdialog"]',
            '[aria-modal="true"]',
            '[class*="paywall"]',
            '[class*="premium"]',
            '[class*="restricted"]',
            '[class*="blocked"]',
            '[id*="modal"]',
            '[id*="overlay"]',
            '[id*="dialog"]',
            '[id*="paywall"]',
            '[id*="premium"]'
        ];

        document.querySelectorAll(overlaySelectors.join(',')).forEach(overlay => {
            if (parseInt(window.getComputedStyle(overlay).zIndex) > 0) {
                overlay.remove();
            }
        });

        // Override additional protection methods
        try {
            // Disable common protection functions
            window.eval = new Proxy(window.eval, {
                apply: function(target, thisArg, args) {
                    if (args[0].includes('debugger')) return;
                    return target.apply(thisArg, args);
                }
            });

            // Override fetch to prevent re-locking
            window.fetch = function(url, options) {
                if (url.includes('security') || url.includes('protection')) return Promise.resolve(new Response());
                return originalFetch.apply(this, arguments);
            };

            // Override XHR
            window.XMLHttpRequest = function() {
                const xhr = new originalXHR();
                xhr.open = function(method, url) {
                    if (url.includes('security') || url.includes('protection')) return;
                    return originalXHR.prototype.open.apply(this, arguments);
                };
                return xhr;
            };

            // Prevent history manipulation
            window.history.pushState = function() {
                return originalPushState.apply(this, arguments);
            };
            window.history.replaceState = function() {
                return originalReplaceState.apply(this, arguments);
            };
        } catch (e) {
            console.log("Unable to override all security measures", e);
        }
    } catch (e) {
        console.error("Error while unlocking elements:", e);
    }
})();
