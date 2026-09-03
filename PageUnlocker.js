javascript:(function() {
       const toolbarStyles = document.createElement('style');
    toolbarStyles.textContent = `
        #unlocker-toolbar {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(40, 44, 52, 0.97);
            border: 1px solid #528bff;
            border-radius: 4px;
            padding: 8px;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 12px;
            color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            user-select: none;
            display: flex;
            gap: 8px;
            align-items: center;
            cursor: move;
        }
        #unlocker-toolbar button {
            background: #528bff;
            border: none;
            border-radius: 3px;
            color: white;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 11px;
        }
        #unlocker-toolbar button:hover {
            background: #3578ff;
        }
        .unlocked-code {
            font-size: 0.8em;
            color: #abb2bf;
            background: #282c34;
            padding: 8px;
            margin: 4px 0;
            border-radius: 4px;
            display: none;
        }
        .highlight-unlocked {
            border: 2px solid #ff4d4d !important;
            background-color: rgba(255,77,77,0.1) !important;
        }
    `;
    document.head.appendChild(toolbarStyles);

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'unlocker-toolbar';
    toolbar.innerHTML = `
        <span>Unlocker Tools:</span>
        <button id="toggle-code">Toggle Code</button>
        <button id="toggle-highlights">Toggle Highlights</button>
        <button id="move-code">Move Code</button>
    `;
    document.body.appendChild(toolbar);

    // Make toolbar draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    toolbar.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === toolbar) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            toolbar.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
    }

    function dragEnd() {
        isDragging = false;
    }

    function unlockElements() {
        // Neutralize Content Security Policy
        const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (meta) meta.remove();

        // Remove all blocking stylesheets
        Array.from(document.styleSheets).forEach(sheet => {
            try {
                Array.from(sheet.cssRules || []).forEach(rule => {
                    if (rule.style && (
                        rule.style.pointerEvents === 'none' ||
                        rule.style.userSelect === 'none' ||
                        rule.style.visibility === 'hidden' ||
                        rule.style.display === 'none' ||
                        rule.style.opacity === '0' ||
                        rule.selectorText?.includes(':disabled')
                    )) {
                        sheet.deleteRule(Array.prototype.indexOf.call(sheet.cssRules, rule));
                    }
                });
            } catch (e) {
                // Cross-origin stylesheet - ignore
            }
        });

        const elements = Array.from(document.getElementsByTagName("*"));
        let codeElements = [];
        
        // Stop ALL possible timing functions
        // Clear regular intervals/timeouts
        const highestTimeoutId = window.setTimeout(() => {}, 0);
        for (let i = 0; i <= highestTimeoutId; i++) {
            window.clearTimeout(i);
            window.clearInterval(i);
        }

        // Stop requestAnimationFrame
        const highestAnimationFrame = requestAnimationFrame(() => {});
        for (let i = 0; i <= highestAnimationFrame; i++) {
            cancelAnimationFrame(i);
        }

        // Clear any running Web Animations API animations
        document.getAnimations().forEach(animation => animation.cancel());

        // Prevent future setInterval/setTimeout
        const originalSetInterval = window.setInterval;
        const originalSetTimeout = window.setTimeout;
        window.setInterval = function() { return null; };
        window.setTimeout = function() { return null; };
        window.requestAnimationFrame = function() { return null; };

        // Remove scroll event listeners
        window.onscroll = null;
        window.onwheel = null;
        window.ontouchmove = null;
        document.onscroll = null;
        document.onwheel = null;
        document.ontouchmove = null;

        elements.forEach(element => {
            let modified = false;

            // Handle JavaScript code
            if (element.tagName === 'SCRIPT' && element.textContent.trim().length > 0) {
                const codeContainer = document.createElement('pre');
                codeContainer.className = 'unlocked-code';
                codeContainer.textContent = element.textContent;
                element.parentNode.insertBefore(codeContainer, element.nextSibling);
                codeElements.push(codeContainer);
                modified = true;
            }

            // Remove ALL possible restrictive attributes
            [
                'disabled', 'readonly', 'required', 'maxLength', 'pattern',
                'min', 'max', 'minlength', 'maxlength', 'autocomplete',
                'data-readonly', 'aria-hidden', 'aria-disabled',
                'data-disabled', 'data-hidden', 'hidden', 'style',
                'tabindex', 'inputmode', 'loading', 'draggable',
                'contenteditable', 'spellcheck', 'translate',
                'data-*', // Remove all data attributes
                'aria-*'  // Remove all ARIA attributes
            ].forEach(attr => {
                if (attr.endsWith('*')) {
                    // Handle wildcard attributes
                    const prefix = attr.slice(0, -1);
                    Array.from(element.attributes).forEach(({name}) => {
                        if (name.startsWith(prefix)) {
                            element.removeAttribute(name);
                            modified = true;
                        }
                    });
                } else if (element.hasAttribute(attr)) {
                    element.removeAttribute(attr);
                    modified = true;
                }
            });

            // Convert all restrictive input types to text
            if (element.tagName === 'INPUT') {
                const restrictedTypes = [
                    'email', 'url', 'number', 'tel', 'date', 'time',
                    'datetime-local', 'hidden', 'month', 'week', 'color',
                    'range', 'search', 'file', 'image'
                ];
                if (restrictedTypes.includes(element.type)) {
                    element.type = 'text';
                    modified = true;
                }
            }

            // Remove inline styles that might hide/block elements
            const computedStyle = window.getComputedStyle(element);
            const styleProperties = {
                visibility: 'visible',
                display: ['none', 'hidden'].includes(computedStyle.display) ? 'block' : computedStyle.display,
                opacity: '1',
                pointerEvents: 'auto',
                userSelect: 'auto',
                cursor: 'auto',
                clip: 'auto',
                clipPath: 'none',
                filter: 'none',
                transform: 'none',
                position: computedStyle.position === 'fixed' ? 'relative' : computedStyle.position,
                zIndex: 'auto',
                overflow: 'visible',
                height: computedStyle.height === '0px' ? 'auto' : computedStyle.height,
                width: computedStyle.width === '0px' ? 'auto' : computedStyle.width,
                maxHeight: 'none',
                maxWidth: 'none',
                minHeight: '0',
                minWidth: '0',
                perspective: 'none',
                backfaceVisibility: 'visible',
                background: computedStyle.background,
                marginLeft: '0',
                marginRight: '0',
                padding: computedStyle.padding,
                border: computedStyle.border
            };

            Object.entries(styleProperties).forEach(([property, value]) => {
                element.style[property] = value;
            });

            // Enable all mouse/touch events
            element.onclick = null;
            element.onmousedown = null;
            element.onmouseup = null;
            element.onmousemove = null;
            element.onmouseenter = null;
            element.onmouseleave = null;
            element.onmouseover = null;
            element.onmouseout = null;
            element.ontouchstart = null;
            element.ontouchend = null;
            element.ontouchmove = null;
            element.ondragstart = null;
            element.ondrag = null;
            element.ondragend = null;
            element.oncontextmenu = null;

            // Remove possible overlay techniques
            element.style.mixBlendMode = 'normal';
            element.style.isolation = 'auto';
            element.style.mask = 'none';
            element.style.webkitMask = 'none';

            // Handle iframes
            if (element.tagName === 'IFRAME') {
                element.style.pointerEvents = 'auto';
                element.style.visibility = 'visible';
                element.removeAttribute('sandbox');
            }

            if (modified) {
                element.classList.add('highlight-unlocked');
            }
        });

        // Remove all modal/overlay elements
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
            '[aria-modal="true"]'
        ];

        document.querySelectorAll(overlaySelectors.join(',')).forEach(overlay => {
            if (parseInt(window.getComputedStyle(overlay).zIndex) > 0) {
                overlay.remove();
            }
        });

document.getElementById('toggle-code').addEventListener('click', () => {
            codeElements.forEach(el => {
                el.style.display = el.style.display === 'none' ? 'block' : 'none';
            });
        });

        document.getElementById('toggle-highlights').addEventListener('click', () => {
            document.querySelectorAll('.highlight-unlocked').forEach(el => {
                el.classList.toggle('highlight-unlocked');
            });
        });

        document.getElementById('move-code').addEventListener('click', () => {
            const codeContainer = document.createElement('div');
            codeContainer.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; max-height: 30vh; overflow-y: auto; background: #282c34; padding: 10px; border-top: 2px solid #528bff;';
            document.body.appendChild(codeContainer);
            
            codeElements.forEach(el => {
                codeContainer.appendChild(el);
                el.style.display = 'block';
            });
        });

        // Enable scroll on all elements
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        document.documentElement.style.position = 'static';
        document.body.style.position = 'static';

        // Remove scroll-blocking CSS
        const scrollStyle = document.createElement('style');
        scrollStyle.textContent = `
            html, body {
                overflow: auto !important;
                position: static !important;
                width: auto !important;
                height: auto !important;
                touch-action: auto !important;
            }
            * {
                scroll-behavior: auto !important;
                overscroll-behavior: auto !important;
                scroll-snap-type: none !important;
                scroll-snap-align: none !important;
            }
        `;
        document.head.appendChild(scrollStyle);

        // [Previous toolbar event listeners and code management remain the same...]
    }

    // Execute the unlock
    unlockElements();
})();
