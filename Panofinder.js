javascript:(function() {
    console.log("krpano Panorama Downloader Bookmarklet (with Download Links) started...");

    async function main() {
        let xmlUrl;
        let krpanoInstance = null;
        let outputWindow = null;

        try {
            // Start of XML URL Detection (condensed)
            const potentialKrpanoElements = [
                document.getElementById('krpanoObject'),
                document.getElementById('krpanoSWFObject'),
                document.querySelector('[id^="krpanoSWFObject_"]'),
                document.querySelector('.krpanoClass')
            ];
            for (const el of potentialKrpanoElements) {
                if (el && typeof el.get === 'function') {
                    krpanoInstance = el;
                    xmlUrl = krpanoInstance.get('xml.url');
                    if (xmlUrl) { console.log("Found krpano XML URL via instance.get('xml.url'):", xmlUrl); break; }
                }
            }
            if (!xmlUrl && typeof embedpano === 'function') {
                if (typeof embedpano.krpano_init_config === 'object' && embedpano.krpano_init_config !== null && embedpano.krpano_init_config.xml) {
                    xmlUrl = embedpano.krpano_init_config.xml; console.log("Found krpano XML URL via embedpano.krpano_init_config:", xmlUrl);
                } else if (typeof window.krpano_embed_config === 'object' && window.krpano_embed_config !== null && window.krpano_embed_config.xml) {
                    xmlUrl = window.krpano_embed_config.xml; console.log("Found krpano XML URL via window.krpano_embed_config:", xmlUrl);
                }
            }
            if (!xmlUrl) {
                for (const key in window) {
                    if (window.hasOwnProperty(key) && window[key] && typeof window[key] === 'object' && window[key] !== null) {
                        const potentialConfig = window[key];
                        if (potentialConfig.xml && typeof potentialConfig.swf === 'string' && (potentialConfig.swf.includes('krpano.swf') || potentialConfig.swf.includes('krpano.js'))) {
                             xmlUrl = potentialConfig.xml; console.log(`Found potential XML URL in window['${key}'].xml:`, xmlUrl); break;
                        }
                        if (typeof potentialConfig.xml === 'string' && potentialConfig.xml.includes('mobile_embed_iframe')) {
                            xmlUrl = potentialConfig.xml; console.log(`Found XML URL with 'mobile_embed_iframe' in window['${key}'].xml:`, xmlUrl); break;
                        }
                    }
                }
            }
            if (!xmlUrl) {
                const scripts = Array.from(document.getElementsByTagName('script'));
                for (const script of scripts) {
                    if (script.textContent.includes('embedpano(') || script.textContent.includes('krpano')) {
                        const match = script.textContent.match(/xml\s*[:=]\s*["']([^"']+\.xml[^"']*)["']/i);
                        if (match && match[1]) { xmlUrl = match[1]; console.log("Found krpano XML URL via script tag parsing:", xmlUrl); break; }
                    }
                }
            }
            if (!xmlUrl) {
                xmlUrl = prompt("Could not automatically find krpano XML URL. Please enter it (e.g., from Network tab in DevTools, should end in .xml):");
                if (!xmlUrl || !xmlUrl.trim()) { alert("No XML URL provided. Exiting."); return; }
            }
            if (xmlUrl && !xmlUrl.startsWith('http') && !xmlUrl.startsWith('//')) {
                xmlUrl = new URL(xmlUrl, document.location.href).href;
            }
            console.log("Using XML URL:", xmlUrl);
            // End of XML URL Detection

            const response = await fetch(xmlUrl);
            if (!response.ok) { alert(`Failed to fetch XML: ${response.status} ${response.statusText} from ${xmlUrl}`); return; }
            const xmlString = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "text/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                console.error("Error parsing XML:", xmlDoc.getElementsByTagName("parsererror")[0].innerText);
                alert("Failed to parse XML. Check console for details."); return;
            }

            const imageElement = xmlDoc.querySelector('image[type="cube"][multires="true"]');
            if (!imageElement) { alert("Could not find multi-resolution cube image data in XML."); return; }

            const globalTileSizeAttr = imageElement.getAttribute('tilesize');
            if (!globalTileSizeAttr) { alert("Could not determine global tilesize from XML's <image> tag."); return; }

            const levels = Array.from(imageElement.getElementsByTagName('level'));
            if (levels.length === 0) { alert("No resolution levels found in XML."); return; }

            let bestLevelElement = null; let maxTiledWidth = 0;
            levels.forEach((level) => {
                const tiledWidthAttr = level.getAttribute('tiledimagewidth');
                if(tiledWidthAttr){
                    const tiledWidth = parseInt(tiledWidthAttr, 10);
                    if (tiledWidth > maxTiledWidth) { maxTiledWidth = tiledWidth; bestLevelElement = level; }
                }
            });

            if (!bestLevelElement) { alert("Could not determine the best resolution level."); return; }
            
            const actualTileSizeForLevel = parseInt(bestLevelElement.getAttribute('tilesize') || globalTileSizeAttr, 10);
            console.log(`Highest resolution level found: ${maxTiledWidth}px face width. Using tilesize: ${actualTileSizeForLevel}px for this level.`);
            const numTilesPerSide = Math.ceil(maxTiledWidth / actualTileSizeForLevel);
            console.log(`Calculated tiles per face side: ${numTilesPerSide}x${numTilesPerSide}`);

            // Prepare HTML output
            let htmlOutput = `<html><head><title>krpano Tile Download Links</title><style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                pre { background-color: #f0f0f0; padding: 15px; border-radius: 5px; white-space: pre-wrap; word-break: break-all; }
                .tile-links div { margin-bottom: 10px; }
                .tile-links a { margin-right: 5px; display: inline-block; padding: 2px 5px; text-decoration: none; border: 1px solid #ccc; border-radius: 3px; background-color: #f9f9f9;}
                .tile-links a:hover { background-color: #e0e0e0; border-color: #aaa;}
                h2, h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                .info-block { background-color: #eef; padding: 10px; border-radius: 5px; margin-bottom:20px;}
            </style></head><body>`;

            htmlOutput += `<h1>krpano Panorama Tile Downloader</h1>`;
            htmlOutput += `<div class="info-block"><strong>XML Source:</strong> ${xmlUrl}<br>`;
            htmlOutput += `<strong>Highest Resolution Face Width:</strong> ${maxTiledWidth}px<br>`;
            htmlOutput += `<strong>Tilesize for this level:</strong> ${actualTileSizeForLevel}px<br>`;
            htmlOutput += `<strong>Tiles per face side:</strong> ${numTilesPerSide} (Total ${numTilesPerSide*numTilesPerSide} tiles per face)</div>`;
            
            htmlOutput += `<h2>Instructions:</h2>`;
            htmlOutput += `<ol>
                <li>Click the links below for each tile to download. Your browser might ask for confirmation if you click many links quickly, or it might queue them.</li>
                <li>Alternatively, you can right-click and "Save Link As...", or use a browser download manager extension to download all links from this page.</li>
                <li>The suggested filename (e.g., <code>front_1_1.jpg</code>) will be used if your browser supports the 'download' attribute.</li>
                <li>If you encounter 403 Forbidden errors for some links, the server is restricting access to those specific tiles.</li>
                <li>After downloading the tiles for a face, use the provided ImageMagick (or similar software) commands to stitch them together.</li>
            </ol>`;
            htmlOutput += `<hr>`;
            htmlOutput += `<h2>Tile Download Links & Stitching Commands</h2>`;

            const faces = ['left', 'right', 'up', 'down', 'front', 'back'];

            for (const face of faces) {
                htmlOutput += `<h3>Face: ${face.toUpperCase()}</h3>`;
                const faceElement = bestLevelElement.querySelector(face);
                if (!faceElement) {
                    htmlOutput += `<p><em>Error: Could not find &lt;${face}&gt; element in the highest resolution &lt;level&gt;.</em></p>`;
                    continue;
                }
                let urlTemplate = faceElement.getAttribute('url');
                if (!urlTemplate) {
                    htmlOutput += `<p><em>Error: URL attribute missing for &lt;${face}&gt; element.</em></p>`;
                    continue;
                }
                if (!urlTemplate.startsWith('http') && !urlTemplate.startsWith('//')) {
                    const xmlBaseUrl = new URL(xmlUrl.substring(0, xmlUrl.lastIndexOf('/') + 1));
                    urlTemplate = new URL(urlTemplate, xmlBaseUrl).href;
                }
                
                htmlOutput += `<div class="tile-links">`;
                const montageFileNames = [];
                for (let r = 1; r <= numTilesPerSide; r++) {
                    htmlOutput += `<div>Row ${r}: `;
                    for (let c = 1; c <= numTilesPerSide; c++) {
                        const tileUrl = urlTemplate.replace('%r', r).replace('%c', c);
                        const suggestedFilename = `${face}_${r}_${c}.jpg`;
                        montageFileNames.push(suggestedFilename);
                        htmlOutput += `<a href="${tileUrl}" download="${suggestedFilename}">${suggestedFilename}</a> `;
                    }
                    htmlOutput += `</div>`;
                }
                htmlOutput += `</div>`;
                htmlOutput += `<pre># Suggested ImageMagick command for ${face.toUpperCase()}:\n`;
                htmlOutput += `# montage ${montageFileNames.join(' ')} -tile ${numTilesPerSide}x${numTilesPerSide} -geometry +0+0 ${face}_stitched.jpg</pre><hr>`;
            }

            htmlOutput += `</body></html>`;

            outputWindow = window.open('', '_blank');
            if (outputWindow) {
                outputWindow.document.open();
                outputWindow.document.write(htmlOutput);
                outputWindow.document.close();
                alert("Download links page has been generated in a new tab!");
            } else {
                alert("Pop-up blocked! Could not open new tab. Outputting to console (HTML content).");
                console.log("--- HTML Output for Tile Download Links ---");
                console.log(htmlOutput); // This will be messy in console but better than nothing
            }

        } catch (error) {
            console.error("Error in krpano downloader bookmarklet:", error);
            alert("An error occurred: " + error.message + "\nCheck console for details.");
            if(outputWindow && !outputWindow.closed) { // If window is open but error occurred after
                try {
                    const errorP = outputWindow.document.createElement('p');
                    errorP.style.color = 'red'; errorP.style.fontWeight = 'bold';
                    errorP.textContent = "SCRIPT ERROR: " + error.message;
                    outputWindow.document.body.appendChild(errorP);
                } catch (e) { /* ignore if body not available */ }
            }
        }
    }

    main().catch(err => {
        console.error("Unhandled error in main execution:", err);
        alert("A critical unhandled error occurred in the bookmarklet: " + err.message);
    });

})();
