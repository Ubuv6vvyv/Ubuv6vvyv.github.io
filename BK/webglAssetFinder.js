javascript:(function(){
  // Create results container
  const resultsDiv = document.createElement('div');
  resultsDiv.id = 'webgl-detector-results';
  resultsDiv.style.cssText = 'position:fixed;top:0;right:0;width:80%;max-width:350px;height:100%;background:rgba(0,0,0,0.85);color:#fff;z-index:999999;overflow-y:auto;padding:10px;font-family:monospace;font-size:12px;box-shadow:-2px 0 5px rgba(0,0,0,0.5);transform:translateX(100%);transition:transform 0.3s ease;';
  
  // Add toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '◀ Pano Detector';
  toggleBtn.style.cssText = 'position:fixed;top:10px;right:0;z-index:1000000;background:#444;color:#fff;border:none;padding:8px 15px;border-radius:4px 0 0 4px;cursor:pointer;font-family:sans-serif;box-shadow:-2px 2px 5px rgba(0,0,0,0.3);';
  
  let isOpen = false;
  toggleBtn.onclick = function() {
    isOpen = !isOpen;
    resultsDiv.style.transform = isOpen ? 'translateX(0)' : 'translateX(100%)';
    toggleBtn.textContent = isOpen ? '▶ Pano Detector' : '◀ Pano Detector';
  };
  
  document.body.appendChild(resultsDiv);
  document.body.appendChild(toggleBtn);
  
  // Initialize results
  let results = {
    webgl: [],
    canvas: [],
    threejs: [],
    krpano: [],
    assets: new Set(),
    tilePatterns: new Set(),
    configFiles: new Set(),
    xmlContent: []
  };
  
  // Helper function to add a result entry
  function addResult(type, element, details = {}) {
    const entry = {
      element: element,
      tagName: element.tagName,
      id: element.id || 'no-id',
      class: element.className || 'no-class',
      details: details
    };
    
    results[type].push(entry);
    
    // Extract URLs from attributes and add to assets
    ['src', 'data-src', 'href', 'data'].forEach(attr => {
      if (element.getAttribute(attr)) {
        const url = element.getAttribute(attr);
        results.assets.add(url);
        
        // Check if this is likely a config file
        if (url.endsWith('.xml') || url.endsWith('.json') || 
            url.includes('krpano') || url.includes('pano') || 
            url.includes('config') || url.includes('settings')) {
          results.configFiles.add(url);
          
          // Try to fetch the config file content if same origin
          try {
            if (isSameOrigin(url)) {
              fetchConfigFile(url);
            }
          } catch(e) {
            console.log("Error fetching config:", e);
          }
        }
      }
    });
    
    // Also check style background image
    const style = window.getComputedStyle(element);
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      const url = bgImage.slice(4, -1).replace(/['"]/g, '');
      results.assets.add(url);
    }
    
    return entry;
  }
  
  // Helper function to check if URL is same origin
  function isSameOrigin(url) {
    if (url.startsWith('http') || url.startsWith('//')) {
      try {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.origin === window.location.origin;
      } catch(e) {
        return false;
      }
    }
    return true; // Relative URL
  }
  
  // Function to fetch and analyze a config file
  function fetchConfigFile(url) {
    fetch(url)
      .then(response => response.text())
      .then(content => {
        // Store XML content
        results.xmlContent.push({
          url: url,
          content: content.substring(0, 5000) // Store first 5000 chars to avoid huge outputs
        });
        
        // Look for tile patterns in XML/JSON
        const tilePatterns = findTilePatterns(content);
        tilePatterns.forEach(pattern => results.tilePatterns.add(pattern));
        
        // Extract image URLs from the config
        const imageUrls = extractImageUrls(content);
        imageUrls.forEach(imgUrl => {
          // Convert relative URLs to absolute
          try {
            const absoluteUrl = new URL(imgUrl, url).href;
            results.assets.add(absoluteUrl);
          } catch(e) {
            results.assets.add(imgUrl);
          }
        });
        
        // Update display after fetching
        displayResults();
      })
      .catch(error => console.log("Error fetching config:", error));
  }
  
  // Function to find tile patterns in config content
  function findTilePatterns(content) {
    const patterns = new Set();
    
    // Look for common tile pattern formats in krpano
    const regexPatterns = [
      /url="([^"]*%[vh]\/[^"]*)"/, // krpano cube face pattern
      /url="([^"]*\{[xyz]\}[^"]*)"/, // krpano cube variables
      /url="([^"]*%[0-9]*[^"]*)"/, // krpano variable
      /url="([^"]*\.[^"]*\/[^"]*%[^"]*)"/, // Common variable in path
      /"tiledImageUrl"[^"]*"([^"]*)"/, // Tiled image URL
      /"tiles"[^"]*"([^"]*)"/, // Tiles path
      /"baseindex"[^"]*"([^"]*)"/ // Base index for tiles
    ];
    
    regexPatterns.forEach(regex => {
      const matches = content.match(new RegExp(regex, 'g'));
      if (matches) {
        matches.forEach(match => {
          const patternMatch = match.match(regex);
          if (patternMatch && patternMatch[1]) {
            patterns.add(patternMatch[1]);
          }
        });
      }
    });
    
    // If we have a multires tile pattern
    if (content.includes('multires') || content.includes('tiledimage')) {
      const multiresMatch = content.match(/<multires[^>]*>/);
      if (multiresMatch) {
        patterns.add(multiresMatch[0]);
      }
      
      const tiledMatch = content.match(/<tiledimage[^>]*>/);
      if (tiledMatch) {
        patterns.add(tiledMatch[0]);
      }
    }
    
    return patterns;
  }
  
  // Function to extract image URLs from config
  function extractImageUrls(content) {
    const urls = new Set();
    
    // Extract standard image references
    const imageRegexes = [
      /url="([^"]*\.(?:jpg|jpeg|png|gif|webp))"/gi,
      /src="([^"]*\.(?:jpg|jpeg|png|gif|webp))"/gi,
      /"preview"\s*:\s*"([^"]*)"/gi,
      /<cube[^>]*url="([^"]*)"/gi,
      /<sphere[^>]*url="([^"]*)"/gi,
      /<image[^>]*url="([^"]*)"/gi,
      /<level[^>]*url="([^"]*)"/gi,
      /"tileUrl"\s*:\s*"([^"]*)"/gi
    ];
    
    imageRegexes.forEach(regex => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) urls.add(match[1]);
      }
    });
    
    return urls;
  }
  
  // Enhanced network request analysis
  function analyzeNetworkRequests() {
    if (!window.performance || !window.performance.getEntries) return;
    
    const entries = window.performance.getEntries();
    const imageEntries = entries.filter(entry => {
      const url = entry.name;
      return url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) || 
             url.includes('tile') || url.includes('pano') || 
             url.includes('panorama') || url.includes('face');
    });
    
    // Group by URL patterns to detect tile patterns
    const urlPatterns = {};
    imageEntries.forEach(entry => {
      const url = entry.name;
      
      // Add to assets
      results.assets.add(url);
      
      // Try to identify tile patterns
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        
        // Remove the specific tile numbers to get the pattern
        const patternPath = path.replace(/\/[0-9]+\/[0-9]+\//g, '/{level}/{x}/');
        const patternPath2 = path.replace(/[0-9]+_[0-9]+/g, '{level}_{x}');
        
        if (patternPath !== path) {
          if (!urlPatterns[patternPath]) urlPatterns[patternPath] = 0;
          urlPatterns[patternPath]++;
        }
        
        if (patternPath2 !== path) {
          if (!urlPatterns[patternPath2]) urlPatterns[patternPath2] = 0;
          urlPatterns[patternPath2]++;
        }
      } catch(e) {
        // Invalid URL
      }
    });
    
    // Add patterns that appear multiple times (likely tile patterns)
    Object.entries(urlPatterns).forEach(([pattern, count]) => {
      if (count > 2) {
        results.tilePatterns.add(`${pattern} (${count} tiles)`);
      }
    });
  }
  
  // Detect WebGL contexts
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(canvas => {
    addResult('canvas', canvas);
    
    // Try to detect if this canvas uses WebGL
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const details = {
          contextType: 'webgl',
          renderer: gl.getParameter(gl.RENDERER),
          vendor: gl.getParameter(gl.VENDOR),
          version: gl.getParameter(gl.VERSION),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        };
        addResult('webgl', canvas, details);
      }
      
      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        const details = {
          contextType: 'webgl2',
          renderer: gl2.getParameter(gl2.RENDERER),
          vendor: gl2.getParameter(gl2.VENDOR),
          version: gl2.getParameter(gl2.VERSION),
          shadingLanguageVersion: gl2.getParameter(gl2.SHADING_LANGUAGE_VERSION)
        };
        addResult('webgl', canvas, details);
      }
    } catch (e) {
      // Canvas might not support WebGL or already have a context
    }
  });
  
  // Detect Three.js
  if (window.THREE) {
    addResult('threejs', document.body, {
      version: window.THREE.REVISION || 'unknown'
    });
  }
  
  // Look for scene renderers in the DOM
  document.querySelectorAll('div, iframe').forEach(element => {
    // Check for krpano
    if (element.id && (
        element.id.includes('pano') || 
        element.id.includes('krpano') || 
        element.id.includes('panorama'))) {
      addResult('krpano', element);
    }
    
    if (element.className && (
        element.className.includes('pano') || 
        element.className.includes('krpano') || 
        element.className.includes('panorama'))) {
      addResult('krpano', element);
    }
    
    // Check for embedded krpano viewer
    if (element.tagName === 'IFRAME') {
      try {
        const src = element.getAttribute('src');
        if (src && (src.includes('pano') || src.includes('krpano') || src.includes('vtour'))) {
          addResult('krpano', element, {
            src: src
          });
        }
      } catch (e) {
        // Cross-origin iframe
      }
    }
  });
  
  // Specific search for krpano objects
  if (window.krpano || document.querySelector('object[classid*="krpano"]')) {
    const krpanoObjects = document.querySelectorAll('object');
    krpanoObjects.forEach(obj => {
      addResult('krpano', obj, {
        classid: obj.getAttribute('classid'),
        data: obj.getAttribute('data')
      });
      
      // Extract parameters
      const params = obj.querySelectorAll('param');
      params.forEach(param => {
        const name = param.getAttribute('name');
        const value = param.getAttribute('value');
        if (name && value) {
          if (value.endsWith('.xml') || value.endsWith('.swf')) {
            results.assets.add(value);
            
            // Try to fetch XML config
            if (value.endsWith('.xml') && isSameOrigin(value)) {
              fetchConfigFile(value);
            }
          }
        }
      });
    });
  }
  
  // Improved krpano script detection
  document.querySelectorAll('script').forEach(script => {
    const src = script.getAttribute('src');
    if (src && (src.includes('krpano') || src.includes('pano'))) {
      addResult('krpano', script, { src: src });
      results.assets.add(src);
    }
    
    // Check inline scripts
    const content = script.textContent;
    if (content && (content.includes('embedpano') || content.includes('krpano') || content.includes('createPanoViewer'))) {
      addResult('krpano', script, { type: 'inline' });
      
      // Try to extract configuration
      try {
        const matches = content.match(/embedpano\s*\(\s*({[^;]+})/);
        if (matches && matches[1]) {
          // Try to clean up the JS object to make it valid JSON
          let config = matches[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
          
          // Handle trailing commas
          config = config.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
          
          try {
            const parsedConfig = JSON.parse(config);
            // Add the embedpano config as a result
            results.krpano.push({
              tagName: 'EMBEDPANO',
              id: 'embedpano-config',
              class: 'embedpano-config',
              details: parsedConfig
            });
            
            // Extract xml file
            if (parsedConfig.xml) {
              results.configFiles.add(parsedConfig.xml);
              if (isSameOrigin(parsedConfig.xml)) {
                fetchConfigFile(parsedConfig.xml);
              }
            }
            
            // Extract other assets
            Object.keys(parsedConfig).forEach(key => {
              if (typeof parsedConfig[key] === 'string') {
                const value = parsedConfig[key];
                if (value.endsWith('.xml') || value.endsWith('.swf') || value.endsWith('.js') ||
                    value.endsWith('.jpg') || value.endsWith('.png')) {
                  results.assets.add(value);
                }
              }
            });
          } catch (e) {
            // JSON parsing failed, try to extract the config file URL directly
            const xmlMatch = config.match(/"xml"\s*:\s*"([^"]*)"/);
            if (xmlMatch && xmlMatch[1]) {
              results.configFiles.add(xmlMatch[1]);
              if (isSameOrigin(xmlMatch[1])) {
                fetchConfigFile(xmlMatch[1]);
              }
            }
          }
        }
      } catch (e) {
        // Regex or parsing error
      }
    }
  });
  
  // Look for krpano variable in window
  if (window.krpano) {
    // Try to access krpano API
    try {
      if (typeof window.krpano.get === 'function') {
        // Attempt to get config info
        try {
          const xmlpath = window.krpano.get('xml.url');
          if (xmlpath) {
            results.configFiles.add(xmlpath);
            if (isSameOrigin(xmlpath)) {
              fetchConfigFile(xmlpath);
            }
          }
        } catch(e) {}
        
        // Try to get current image info
        try {
          const currentImage = window.krpano.get('image.url');
          if (currentImage) {
            results.assets.add(currentImage);
          }
        } catch(e) {}
      }
    } catch(e) {
      // Failed to access krpano API
    }
  }
  
  // Check for panorama resources in the network
  analyzeNetworkRequests();
  
  // Display results
  function displayResults() {
    let html = '<h2 style="margin:0;padding:10px 0;border-bottom:1px solid #444;">WebGL & Panorama Detector</h2>';
    
    // WebGL Elements
    html += `<h3 style="margin:10px 0;">WebGL Elements (${results.webgl.length})</h3>`;
    results.webgl.forEach((item, index) => {
      html += `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px dotted #333;">
        <strong>#${index+1}:</strong> ${item.tagName} 
        <span style="color:#aaa;">(id: ${item.id}, class: ${item.class})</span>
        <div style="margin-top:4px;color:#0f0;">
          Renderer: ${item.details.renderer || 'unknown'}<br>
          Version: ${item.details.version || 'unknown'}
        </div>
      </div>`;
    });
    
    // Three.js
    html += `<h3 style="margin:10px 0;">Three.js (${results.threejs.length})</h3>`;
    if (results.threejs.length) {
      results.threejs.forEach((item, index) => {
        html += `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px dotted #333;">
          <strong>Version:</strong> ${item.details.version}
        </div>`;
      });
    } else {
      html += '<div style="color:#888;">No Three.js detected</div>';
    }
    
    // krpano Elements
    html += `<h3 style="margin:10px 0;">krpano Elements (${results.krpano.length})</h3>`;
    results.krpano.forEach((item, index) => {
      html += `<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px dotted #333;">
        <strong>#${index+1}:</strong> ${item.tagName} 
        <span style="color:#aaa;">(id: ${item.id}, class: ${item.class})</span>`;
      
      if (item.details.src) {
        html += `<div style="margin-top:4px;color:#0f0;">Source: ${item.details.src}</div>`;
      }
      
      // Show embedpano config details
      if (item.tagName === 'EMBEDPANO') {
        html += `<div style="margin-top:4px;color:#0f0;font-size:10px;">
          ${Object.entries(item.details).map(([key, value]) => 
            `<div>${key}: ${JSON.stringify(value)}</div>`
          ).join('')}
        </div>`;
      }
      
      html += '</div>';
    });
    
    // Configuration Files
    html += `<h3 style="margin:10px 0;">Configuration Files (${results.configFiles.size})</h3>`;
    if (results.configFiles.size) {
      html += '<div style="max-height:150px;overflow-y:auto;background:#111;padding:5px;border-radius:3px;">';
      results.configFiles.forEach(url => {
        html += `<div style="word-break:break-all;margin-bottom:5px;font-size:11px;">
          <a href="${url}" target="_blank" style="color:#3498db;">${url}</a>
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div style="color:#888;">No configuration files detected</div>';
    }
    
    // Tile Patterns
    html += `<h3 style="margin:10px 0;">Detected Tile Patterns (${results.tilePatterns.size})</h3>`;
    if (results.tilePatterns.size) {
      html += '<div style="max-height:150px;overflow-y:auto;background:#111;padding:5px;border-radius:3px;">';
      results.tilePatterns.forEach(pattern => {
        html += `<div style="word-break:break-all;margin-bottom:5px;font-size:11px;color:#e67e22;">
          ${pattern}
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div style="color:#888;">No tile patterns detected</div>';
    }
    
    // XML Content Previews
    html += `<h3 style="margin:10px 0;">Config Content Previews (${results.xmlContent.length})</h3>`;
    if (results.xmlContent.length) {
      results.xmlContent.forEach((item, index) => {
        html += `<div style="margin-bottom:10px;">
          <div style="color:#3498db;margin-bottom:3px;font-size:11px;word-break:break-all;">
            <strong>File:</strong> ${item.url}
          </div>
          <div style="max-height:100px;overflow-y:auto;background:#111;padding:5px;border-radius:3px;font-size:10px;white-space:pre-wrap;word-break:break-all;">
            ${item.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
        </div>`;
      });
    } else {
      html += '<div style="color:#888;">No config content available</div>';
    }
    
    // Asset URLs
    html += `<h3 style="margin:10px 0;">Detected Asset URLs (${results.assets.size})</h3>`;
    if (results.assets.size) {
      html += '<div style="max-height:150px;overflow-y:auto;background:#111;padding:5px;border-radius:3px;">';
      results.assets.forEach(url => {
        // Check if it's an image
        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
        
        html += `<div style="word-break:break-all;margin-bottom:5px;font-size:11px;">
          <a href="${url}" target="_blank" style="color:${isImage ? '#e74c3c' : '#3498db'};">${url}</a>
          ${isImage ? ' 🖼️' : ''}
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<div style="color:#888;">No assets detected</div>';
    }
    
    // Add export button
    html += `<div style="margin-top:15px;">
      <button id="export-results" style="background:#2ecc71;color:#fff;border:none;padding:8px 15px;border-radius:3px;cursor:pointer;width:100%;">Export Results (JSON)</button>
    </div>`;
    
    resultsDiv.innerHTML = html;
    
    // Add export functionality
    document.getElementById('export-results').addEventListener('click', function() {
      const exportObj = {
        webgl: results.webgl.map(item => ({
          tagName: item.tagName,
          id: item.id,
          class: item.class,
          details: item.details
        })),
        threejs: results.threejs.map(item => ({
          details: item.details
        })),
        krpano: results.krpano.map(item => ({
          tagName: item.tagName,
          id: item.id,
          class: item.class,
          details: item.details
        })),
        configFiles: Array.from(results.configFiles),
        tilePatterns: Array.from(results.tilePatterns),
        xmlContent: results.xmlContent,
        assets: Array.from(results.assets)
      };
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "panorama-detector-results.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  }
  
  displayResults();
  toggleBtn.click(); // Open panel by default
})();
