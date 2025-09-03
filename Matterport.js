// Paste this into the browser console on the 8prop.com page
(function() {
    // Function to decode Unicode escape sequences
    function decodeUnicodeEscapes(str) {
        return str.replace(/\\u[\dA-F]{4}/gi, match => 
            String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
        );
    }
    
    // Function to search within a document context
    function searchInDocument(doc, contextName) {
        let urls = [];
        
        try {
            // Check global variables
            const globals = ['__NUXT__', '__INITIAL_STATE__', '__DATA__', 'window.__APOLLO_STATE__'];
            globals.forEach(globalVar => {
                try {
                    const data = doc.defaultView ? doc.defaultView[globalVar.replace('window.', '')] : null;
                    if (data) {
                        console.log(`Found data in ${contextName}.${globalVar}`);
                        traverse(data);
                    }
                } catch (e) {}
            });
            
            // Search script tags
            const scripts = doc.querySelectorAll('script');
            scripts.forEach((script, index) => {
                if (script.textContent) {
                    // Look for file_s3_link patterns
                    const matches = script.textContent.match(/"file_s3_link":\s*"([^"]*?)"/g);
                    if (matches) {
                        console.log(`Found ${matches.length} URLs in ${contextName} script tag ${index}`);
                        matches.forEach(match => {
                            const url = match.match(/"file_s3_link":\s*"([^"]*?)"/)[1];
                            if (url) urls.push(decodeUnicodeEscapes(url));
                        });
                    }
                    
                    // Look for broader patterns that might contain the data
                    if (script.textContent.includes('panos') || script.textContent.includes('MATTERPORT')) {
                        console.log(`Found potential Matterport data in ${contextName} script ${index}`);
                        // Try to extract JSON-like structures
                        const jsonMatches = script.textContent.match(/\{[^{}]*"panos"[^{}]*\}/g);
                        if (jsonMatches) {
                            jsonMatches.forEach(jsonStr => {
                                try {
                                    const urlMatches = jsonStr.match(/"file_s3_link":\s*"([^"]*?)"/g);
                                    if (urlMatches) {
                                        urlMatches.forEach(match => {
                                            const url = match.match(/"file_s3_link":\s*"([^"]*?)"/)[1];
                                            if (url) urls.push(decodeUnicodeEscapes(url));
                                        });
                                    }
                                } catch (e) {}
                            });
                        }
                    }
                }
            });
            
        } catch (e) {
            console.error(`Error in ${contextName}:`, e);
        }
        
        return urls;
        
        function traverse(obj, path = '') {
            if (typeof obj !== 'object' || obj === null) return;
            
            for (let key in obj) {
                if (key === 'file_s3_link' && typeof obj[key] === 'string') {
                    urls.push(decodeUnicodeEscapes(obj[key]));
                } else if (key === 'pano' && obj[key] && obj[key].file_s3_link) {
                    urls.push(decodeUnicodeEscapes(obj[key].file_s3_link));
                } else if (key === 'panos' && Array.isArray(obj[key])) {
                    obj[key].forEach(pano => {
                        if (pano && pano.file_s3_link) {
                            urls.push(decodeUnicodeEscapes(pano.file_s3_link));
                        }
                    });
                } else if (typeof obj[key] === 'object') {
                    traverse(obj[key], path + '.' + key);
                }
            }
        }
    }
    
    // Function to extract and process URLs
    function extractPanoramaUrls() {
        let urls = [];
        
        console.log('Searching for Matterport panorama URLs...');
        
        // Search in main document
        console.log('1. Checking main page...');
        urls = urls.concat(searchInDocument(document, 'main page'));
        
        // Search in all iframes
        const iframes = document.querySelectorAll('iframe');
        console.log(`2. Found ${iframes.length} iframes to check...`);
        
        iframes.forEach((iframe, index) => {
            try {
                console.log(`Checking iframe ${index + 1}: ${iframe.src || 'no src'}`);
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc) {
                    urls = urls.concat(searchInDocument(iframeDoc, `iframe ${index + 1}`));
                } else {
                    console.log(`Cannot access iframe ${index + 1} - likely cross-origin`);
                }
            } catch (e) {
                console.log(`Cannot access iframe ${index + 1}:`, e.message);
            }
        });
        
        // Try to access iframe windows directly
        console.log('3. Trying direct iframe window access...');
        for (let i = 0; i < window.frames.length; i++) {
            try {
                const frameWindow = window.frames[i];
                const frameDoc = frameWindow.document;
                console.log(`Accessing frame window ${i}`);
                urls = urls.concat(searchInDocument(frameDoc, `frame window ${i}`));
            } catch (e) {
                console.log(`Cannot access frame window ${i}:`, e.message);
            }
        }
        
        // Alternative approach: Monitor network requests
        if (urls.length === 0) {
            console.log('4. No URLs found. Setting up network monitoring...');
            console.log('Open Network tab, filter by "s3" or "panorama", then reload the iframe');
            
            // Try to access the iframe's fetch/XHR
            iframes.forEach((iframe, index) => {
                try {
                    const iframeWindow = iframe.contentWindow;
                    if (iframeWindow) {
                        // Override fetch in iframe
                        const originalFetch = iframeWindow.fetch;
                        iframeWindow.fetch = function(...args) {
                            const url = args[0];
                            if (typeof url === 'string' && (url.includes('s3.amazonaws.com') || url.includes('file_s3_link'))) {
                                console.log('Intercepted fetch:', url);
                            }
                            return originalFetch.apply(this, args);
                        };
                    }
                } catch (e) {}
            });
        }
        
        // Remove duplicates
        urls = [...new Set(urls)];
        
        if (urls.length === 0) {
            console.log('%c⚠️ No panorama URLs found automatically.', 'color: orange; font-size: 14px;');
            console.log('');
            console.log('%cTry these manual steps:', 'color: #007acc; font-weight: bold;');
            console.log('1. Open Network tab in DevTools');
            console.log('2. Filter by "s3" or "amazonaws"');  
            console.log('3. Reload the page or navigate in the Matterport viewer');
            console.log('4. Look for PNG files with long URLs');
            console.log('');
            console.log('%cAlternatively, try this in the Matterport iframe directly:', 'color: #007acc; font-weight: bold;');
            console.log('Right-click the Matterport viewer → Inspect → Console → Paste the script');
            return;
        }
        
        console.log(`%c✅ Found ${urls.length} panorama URLs:`, 'color: green; font-size: 14px; font-weight: bold;');
        console.log('==========================================');
        
        urls.forEach((url, index) => {
            // Create clickable link in console
            console.log(`%c${index + 1}. Click to open:`, 'color: #007acc; font-weight: bold;');
            console.log(url);
            console.log(''); // Empty line for spacing
        });
        
        console.log('==========================================');
        console.log('%cCopy all URLs as array:', 'color: #007acc; font-weight: bold;');
        console.log(JSON.stringify(urls, null, 2));
        
        // Also return the array for programmatic use
        return urls;
    }
    
    return extractPanoramaUrls();
})();
