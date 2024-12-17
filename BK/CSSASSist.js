javascript:(function(){
    // Create the main panel container
    const panel = document.createElement("div");
    panel.setAttribute('id', 'css-helper-panel');
    
    // Comprehensive styling for the panel
    Object.assign(panel.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '450px',
        background: 'rgba(255,255,255,0.95)',
        color: '#333',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: '99999',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        maxHeight: '90vh'
    });

    // Comprehensive HTML for the panel
    panel.innerHTML = `
        <div id="panel-header" style="display:flex;justify-content:space-between;align-items:center;padding:10px;background-color:#f0f0f0;border-top-left-radius:10px;border-top-right-radius:10px;">
            <h3 style="margin:0;font-size:16px;">🎨 Advanced CSS Editor</h3>
            <div>
                <button id="minimize-panel" style="background:none;border:none;cursor:pointer;font-size:20px;margin-right:10px;">🗕</button>
                <button id="close-panel" style="background:none;border:none;cursor:pointer;font-size:20px;">✖</button>
            </div>
        </div>
        <div id="panel-content">
            <div style="padding:10px;max-height:70vh;overflow-y:auto;">
                <p id="selected-element-name" style="font-weight:bold;color:#666;margin-bottom:10px;">No Element Selected</p>
                
                <div style="display:flex;gap:10px;margin-bottom:10px;">
                    <button id="clear-selection" style="flex-grow:1;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Clear Selection</button>
                    <button id="toggle-text-edit" style="flex-grow:1;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Toggle Text Edit</button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                    <div>
                        <h4>Font Size: <span id="font-size-value">16px</span></h4>
                        <input type="range" id="font-size" min="10" max="50" value="16" style="width:100%;">
                        
                        <h4>Margin: <span id="margin-value">0px</span></h4>
                        <input type="range" id="margin-helper" min="0" max="50" value="0" style="width:100%;">
                        
                        <h4>Padding: <span id="padding-value">0px</span></h4>
                        <input type="range" id="padding-helper" min="0" max="50" value="0" style="width:100%;">
                        
                        <h4>Border Width: <span id="border-value">0px</span></h4>
                        <input type="range" id="border-helper" min="0" max="20" value="0" style="width:100%;">
                    </div>
                    <div>
                        <h4>Opacity: <span id="opacity-value">1</span></h4>
                        <input type="range" id="opacity-helper" min="0.1" max="1" step="0.1" value="1" style="width:100%;">
                        
                        <h4>Font Weight: <span id="font-weight-value">400</span></h4>
                        <input type="range" id="font-weight" min="100" max="900" step="100" value="400" style="width:100%;">
                        
                        <h4>Text Color</h4>
                        <input type="color" id="text-color-picker" style="width:100%;">
                        
                        <h4>Background Color</h4>
                        <input type="color" id="bg-color-picker" style="width:100%;">
                    </div>
                </div>

                <div style="margin-top:15px;">
                    <h4>Text Alignment:</h4>
                    <div style="display:flex;gap:10px;">
                        <button class="align-btn" data-align="left" style="flex-grow:1;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Left</button>
                        <button class="align-btn" data-align="center" style="flex-grow:1;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Center</button>
                        <button class="align-btn" data-align="right" style="flex-grow:1;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Right</button>
                    </div>
                </div>

                <div style="margin-top:15px;">
                    <h4>Advanced Tools</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;">
                        <button id="gradient-helper" style="width:100%;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Gradient</button>
                        <button id="box-shadow-helper" style="width:100%;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Box Shadow</button>
                        <button id="toggle-monospace" style="width:100%;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Monospace</button>
                        <button id="download-changes" style="width:100%;padding:5px;background-color:#f0f0f0;border:1px solid #ddd;border-radius:4px;">Download Page</button>
                    </div>
                </div>

                <div id="gradient-settings" style="display:none;margin-top:15px;">
                    <h4>Gradient Settings</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label>Color 1: <input type="color" id="gradient-color1"></label>
                            <label>Color 2: <input type="color" id="gradient-color2"></label>
                        </div>
                        <div>
                            <h4>Angle: <span id="gradient-angle-value">45°</span></h4>
                            <input type="range" id="gradient-angle" min="0" max="360" value="45" style="width:100%;">
                        </div>
                    </div>
                </div>

                <div id="box-shadow-settings" style="display:none;margin-top:15px;">
                    <h4>Box Shadow Settings</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <label>Horizontal Offset: <input type="range" id="shadow-x" min="-50" max="50" value="0" style="width:100%;"></label>
                            <label>Vertical Offset: <input type="range" id="shadow-y" min="-50" max="50" value="0" style="width:100%;"></label>
                        </div>
                        <div>
                            <label>Blur Radius: <input type="range" id="shadow-blur" min="0" max="50" value="0" style="width:100%;"></label>
                            <label>Spread Radius: <input type="range" id="shadow-spread" min="-50" max="50" value="0" style="width:100%;"></label>
                            <label>Shadow Color: <input type="color" id="shadow-color" value="#000000"></label>
                        </div>
                    </div>
                </div>

                <div style="margin-top:15px; text-align:center;">
                    <small style="color:#666;">Tip: Ctrl+Shift+D to toggle panel visibility</small>
                </div>
            </div>
        </div>
    `;

    // Append panel to body
    document.body.appendChild(panel);

    // Minimize panel functionality
    const minimizeBtn = document.getElementById('minimize-panel');
    const closeBtn = document.getElementById('close-panel');
    const panelContent = document.getElementById('panel-content');
    let isMinimized = false;

    minimizeBtn.addEventListener('click', () => {
        if (isMinimized) {
            panelContent.style.display = 'block';
            panel.style.height = 'auto';
            minimizeBtn.textContent = '🗕';
            isMinimized = false;
        } else {
            panelContent.style.display = 'none';
            panel.style.height = '50px';
            minimizeBtn.textContent = '🗗';
            isMinimized = true;
        }
    });

    // Close panel functionality
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(panel);
    });

    // Element selection logic
    let selectedElement = null;

    // Prevents selecting the panel or its children
    function isValidSelection(element) {
        return element && !panel.contains(element);
    }

    // Improved element selection function
    function selectElement(element) {
        // Deselect previous element
        if (selectedElement) {
            selectedElement.style.outline = '';
        }

        // If clicking the same element or invalid selection, deselect
        if (selectedElement === element || !isValidSelection(element)) {
            selectedElement = null;
            document.getElementById('selected-element-name').innerText = 'No Element Selected';
            return;
        }

        // Select new element
        selectedElement = element;
        selectedElement.style.outline = '2px solid red';
        document.getElementById('selected-element-name').innerText = `Selected: ${element.tagName}`;
    }

    // Event delegation for element selection
    document.addEventListener('click', (e) => {
        if (panel.contains(e.target)) return;
        e.preventDefault();
        selectElement(e.target);
    });

    // Utility function to create input listeners
    function createInputListener(inputId, styleProperty, displayId, formatter = (val) => val) {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);

        input.addEventListener('input', () => {
            if (display) {
                display.innerText = formatter(input.value);
            }

            if (selectedElement) {
                selectedElement.style[styleProperty] = formatter(input.value);
            }
        });
    }

    // Attach input listeners for various properties
    const inputMappings = [
        { input: 'font-size', style: 'fontSize', display: 'font-size-value', formatter: val => `${val}px` },
        { input: 'margin-helper', style: 'margin', display: 'margin-value', formatter: val => `${val}px` },
        { input: 'padding-helper', style: 'padding', display: 'padding-value', formatter: val => `${val}px` },
        { input: 'border-helper', style: 'borderWidth', display: 'border-value', formatter: val => `${val}px` },
        { input: 'opacity-helper', style: 'opacity', display: 'opacity-value' },
        { input: 'font-weight', style: 'fontWeight', display: 'font-weight-value' }
    ];

    inputMappings.forEach(mapping => {
        createInputListener(
            mapping.input, 
            mapping.style, 
            mapping.display, 
            mapping.formatter
        );
    });

    // Color pickers
    document.getElementById('text-color-picker').addEventListener('input', (e) => {
        if (selectedElement) {
            selectedElement.style.color = e.target.value;
        }
    });

    document.getElementById('bg-color-picker').addEventListener('input', (e) => {
        if (selectedElement) {
            selectedElement.style.backgroundColor = e.target.value;
        }
    });

    // Text alignment buttons
    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (selectedElement) {
                selectedElement.style.textAlign = btn.dataset.align;
            }
        });
    });

    // Clear selection button
    document.getElementById('clear-selection').addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.outline = '';
            selectedElement = null;
            document.getElementById('selected-element-name').innerText = 'No Element Selected';
            
            // Reset all form inputs
            ['font-size', 'margin-helper', 'padding-helper', 'border-helper', 'opacity-helper', 'font-weight']
                .forEach(id => {
                    const input = document.getElementById(id);
                    const display = document.getElementById(`${id}-value`);
                    
                    input.value = input.defaultValue;
                    display.innerText = `${input.value}${['font-size', 'border-helper'].includes(id) ? 'px' : ''}`;
                });
        }
    });

    // Toggle text edit functionality
    document.getElementById('toggle-text-edit').addEventListener('click', () => {
        if (selectedElement) {
            const isEditable = selectedElement.getAttribute('contenteditable') === 'true';
            
            if (isEditable) {
                selectedElement.removeAttribute('contenteditable');
                selectedElement.style.outline = '2px solid red';
            } else {
                selectedElement.setAttribute('contenteditable', 'true');
                selectedElement.style.outline = '2px dashed blue';
            }
        }
    });

    // Monospace toggle
    document.getElementById('toggle-monospace').addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.fontFamily = 
                selectedElement.style.fontFamily === 'monospace' ? '' : 'monospace';
        }
    });

    // Gradient settings
    const gradientHelper = document.getElementById('gradient-helper');
    const gradientSettings = document.getElementById('gradient-settings');
    const gradientAngle = document.getElementById('gradient-angle');
    const gradientColor1 = document.getElementById('gradient-color1');
    const gradientColor2 = document.getElementById('gradient-color2');

    gradientHelper.addEventListener('click', () => {
        gradientSettings.style.display = gradientSettings.style.display === 'none' ? 'block' : 'none';
    });

    [gradientAngle, gradientColor1, gradientColor2].forEach(el => {
        el.addEventListener('input', () => {
            if (selectedElement) {
                const angle = gradientAngle.value;
                const color1 = gradientColor1.value;
                const color2 = gradientColor2.value;
                
                selectedElement.style.background = `linear-gradient(${angle}deg, ${color1}, ${color2})`;
                document.getElementById('gradient-angle-value').innerText = `${angle}°`;
            }
        });
    });

    // Box shadow settings
    const boxShadowHelper = document.getElementById('box-shadow-helper');
    const boxShadowSettings = document.getElementById('box-shadow-settings');
    const boxShadowInputs = [
        'shadow-x', 'shadow-y', 'shadow-blur', 
        'shadow-spread', 'shadow-color'
    ];

    boxShadowHelper.addEventListener('click', () => {
        boxShadowSettings.style.display = 
            boxShadowSettings.style.display === 'none' ? 'block' : 'none';
    });

    boxShadowInputs.forEach(inputId => {
        document.getElementById(inputId).addEventListener('input', () => {
            if (selectedElement) {
                const x = document.getElementById('shadow-x').value;
                const y = document.getElementById('shadow-y').value;
                const blur = document.getElementById('shadow-blur').value;
                const spread = document.getElementById('shadow-spread').value;
                const color = document.getElementById('shadow-color').value;

                selectedElement.style.boxShadow = 
                    `${x}px ${y}px ${blur}px ${spread}px ${color}`;
            }
        });
    });

    // Download page with current changes
    document.getElementById('download-changes').addEventListener('click', () => {
        // Remove the panel before downloading
        const tempPanel = document.getElementById('css-helper-panel');
        if (tempPanel) {
            tempPanel.remove();
        }

        // Remove any temporary selection outlines
        if (selectedElement) {
            selectedElement.style.outline = '';
        }

        // Create a downloadable HTML file with current page state
        const pageHTML = document.documentElement.outerHTML;
        const blob = new Blob([pageHTML], { type: 'text/html' });
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `styled_page_${new Date().toISOString().replace(/[:\.]/g, '_')}.html`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Reappend the panel
        document.body.appendChild(panel);
    });

    // Global keyboard shortcut to toggle panel visibility
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+D to toggle panel visibility
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            const panelContent = document.getElementById('panel-content');
            panelContent.style.display = 
                panelContent.style.display === 'none' ? 'block' : 'none';
        }
    });

    // Console log to confirm bookmarklet is loaded
    console.log('🎨 CSS Editor Bookmarklet Activated!');
})();
