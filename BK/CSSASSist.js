javascript:(function () {
  const editorPanel = document.createElement("div");
  editorPanel.style.position = "fixed";
  editorPanel.style.top = "10px";
  editorPanel.style.right = "10px";
  editorPanel.style.width = "350px";
  editorPanel.style.padding = "10px";
  editorPanel.style.background = "rgba(0, 0, 0, 0.85)";
  editorPanel.style.color = "#fff";
  editorPanel.style.fontFamily = "Arial, sans-serif";
  editorPanel.style.fontSize = "12px";
  editorPanel.style.borderRadius = "8px";
  editorPanel.style.zIndex = "99999";
  editorPanel.style.overflowY = "auto";
  editorPanel.style.maxHeight = "90vh";
  editorPanel.setAttribute("id", "css-helper-panel");

  editorPanel.innerHTML = `
    <div>
      <h3>CSS & Layout Editor</h3>
      <p id="selected-element-name">No Element Selected</p>
      <button id="clear-selection">Clear All Selection</button>
      <button id="toggle-text-edit">Toggle Text Edit</button>
      <button id="download-changes">Download Page</button>
      <h4>Font Size: <span id="font-size-value">16px</span></h4>
      <input type="range" id="font-size" min="10" max="50" value="16">
      <h4>Margin: <span id="margin-value">0px</span></h4>
      <input type="range" id="margin-helper" min="0" max="50" value="0">
      <h4>Padding: <span id="padding-value">0px</span></h4>
      <input type="range" id="padding-helper" min="0" max="50" value="0">
      <h4>Border: <span id="border-value">0px</span></h4>
      <input type="range" id="border-helper" min="0" max="20" value="0">
      <h4>Opacity: <span id="opacity-value">1</span></h4>
      <input type="range" id="opacity-helper" min="0.1" max="1" step="0.1" value="1">
      <h4>Font Weight: <span id="font-weight-value">400</span></h4>
      <input type="range" id="font-weight" min="100" max="900" step="100" value="400">
      <h4>Monospace Font:</h4>
      <button id="toggle-monospace">Toggle Monospace</button>
      <h4>Text Alignment:</h4>
      <select id="text-alignment">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      <button id="gradient-helper">Gradient Helper</button>
      <div id="gradient-settings" style="display:none;">
        <h4>Gradient</h4>
        <label>Color 1: <input type="color" id="gradient-color1"></label>
        <label>Color 2: <input type="color" id="gradient-color2"></label>
        <h4>Angle: <span id="gradient-angle-value">45°</span></h4>
        <input type="range" id="gradient-angle" min="0" max="360" value="45">
      </div>
      <button id="box-shadow-helper">Box Shadow Helper</button>
      <div id="box-shadow-settings" style="display:none;">
        <h4>Box Shadow</h4>
        <label>Horizontal Offset: <input type="range" id="shadow-x" min="-50" max="50" value="0"></label>
        <label>Vertical Offset: <input type="range" id="shadow-y" min="-50" max="50" value="0"></label>
        <label>Blur Radius: <input type="range" id="shadow-blur" min="0" max="50" value="0"></label>
        <label>Spread Radius: <input type="range" id="shadow-spread" min="-50" max="50" value="0"></label>
        <label>Shadow Color: <input type="color" id="shadow-color" value="#000000"></label>
      </div>
    </div>
  `;
  document.body.appendChild(editorPanel);

  let selectedElement = null;
  const isEditorPanel = (el) => el === editorPanel || editorPanel.contains(el);

  const highlightElement = (el) => {
    if (selectedElement) {
      selectedElement.style.outline = "";
      if (selectedElement === el) {
        selectedElement = null;
        document.getElementById("selected-element-name").innerText = "No Element Selected";
        return;
      }
    }
    if (!isEditorPanel(el)) {
      selectedElement = el;
      selectedElement.style.outline = "2px solid red";
      document.getElementById("selected-element-name").innerText = `Selected: ${el.tagName}`;
    }
  };

  document.addEventListener("click", (e) => {
    if (isEditorPanel(e.target)) return;
    e.preventDefault();
    highlightElement(e.target);
  });

  document.getElementById("clear-selection").addEventListener("click", () => {
    if (selectedElement) selectedElement.style.outline = "";
    selectedElement = null;
    document.getElementById("selected-element-name").innerText = "No Element Selected";
  });

  const fontSizeInput = document.getElementById("font-size");
  fontSizeInput.addEventListener("input", () => {
    if (selectedElement) selectedElement.style.fontSize = `${fontSizeInput.value}px`;
    document.getElementById("font-size-value").innerText = `${fontSizeInput.value}px`;
  });

  const marginInput = document.getElementById("margin-helper");
  marginInput.addEventListener("input", () => {
    if (selectedElement) selectedElement.style.margin = `${marginInput.value}px`;
    document.getElementById("margin-value").innerText = `${marginInput.value}px`;
  });

  const paddingInput = document.getElementById("padding-helper");
  paddingInput.addEventListener("input", () => {
    if (selectedElement) selectedElement.style.padding = `${paddingInput.value}px`;
    document.getElementById("padding-value").innerText = `${paddingInput.value}px`;
  });

  const borderInput = document.getElementById("border-helper");
  borderInput.addEventListener("input", () => {
    if (selectedElement) selectedElement.style.borderWidth = `${borderInput.value}px`;
    document.getElementById("border-value").innerText = `${borderInput.value}px`;
  });

  const opacityInput = document.getElementById("opacity-helper");
  opacityInput.addEventListener("input", () => {
    if (selectedElement) selectedElement.style.opacity = opacityInput.value;
    document.getElementById("opacity-value").innerText = opacityInput.value;
  });

  const fontWeightInput = document.getElementById("font-weight");
  fontWeightInput.addEventListener("input", () => {
    if (selectedElement) selectedElement.style.fontWeight = fontWeightInput.value;
    document.getElementById("font-weight-value").innerText = fontWeightInput.value;
  });

  const toggleMonospaceButton = document.getElementById("toggle-monospace");
  toggleMonospaceButton.addEventListener("click", () => {
    if (selectedElement) {
      selectedElement.style.fontFamily =
        selectedElement.style.fontFamily === "monospace" ? "" : "monospace";
    }
  });

  const textAlignmentInput = document.getElementById("text-alignment");
  textAlignmentInput.addEventListener("change", () => {
    if (selectedElement) selectedElement.style.textAlign = textAlignmentInput.value;
  });

  const gradientButton = document.getElementById("gradient-helper");
  gradientButton.addEventListener("click", () => {
    const gradientSettings = document.getElementById("gradient-settings");
    gradientSettings.style.display =
      gradientSettings.style.display === "none" ? "block" : "none";
  });

  const gradientAngleInput = document.getElementById("gradient-angle");
  gradientAngleInput.addEventListener("input", () => {
    if (selectedElement) {
      const color1 = document.getElementById("gradient-color1").value;
      const color2 = document.getElementById("gradient-color2").value;
      selectedElement.style.background = `linear-gradient(${gradientAngleInput.value}deg, ${color1}, ${color2})`;
      document.getElementById("gradient-angle-value").innerText = `${gradientAngleInput.value}°`;
    }
  });

  const boxShadowButton = document.getElementById("box-shadow-helper");
  boxShadowButton.addEventListener("click", () => {
    const boxShadowSettings = document.getElementById("box-shadow-settings");
    boxShadowSettings.style.display =
      boxShadowSettings.style.display === "none" ? "block" : "none";
  });

  const shadowInputs = [
    "shadow-x",
    "shadow-y",
    "shadow-blur",
    "shadow-spread",
    "shadow-color",
  ];
  shadowInputs.forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      if (selectedElement) {
        const x = document.getElementById("shadow-x").value;
        const y = document.getElementById("shadow-y").value;
        const blur = document.getElementById("shadow-blur").value;
        const spread = document.getElementById("shadow-spread").value;
        const color = document.getElementById("shadow-color").value;
        selectedElement.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
      }
    });
  });

  const downloadChanges = document.getElementById("download-changes");
  downloadChanges.addEventListener("click", () => {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "updated_page.html";
    link.click();
  });
})();
