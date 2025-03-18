javascript:(function() {
    // Show feedback to user
    const notify = (function() {
        let container = null;
        
        return function(message, isError = false) {
            if (!container) {
                container = document.createElement('div');
                container.style = 'position:fixed;top:10px;right:10px;z-index:99999;font-family:sans-serif;max-width:300px;';
                document.body.appendChild(container);
                
                // Auto-remove after 5 seconds of inactivity
                let timeout;
                const resetTimeout = () => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        if (container && container.parentNode) {
                            container.parentNode.removeChild(container);
                            container = null;
                        }
                    }, 5000);
                };
                resetTimeout();
            }
            
            const notification = document.createElement('div');
            notification.style = `margin-bottom:5px;padding:10px;border-radius:4px;background:${isError ? '#f44336' : '#4CAF50'};color:white;box-shadow:0 2px 5px rgba(0,0,0,0.2);opacity:0;transition:opacity 0.3s;`;
            notification.textContent = message;
            container.appendChild(notification);
            
            // Animate in
            setTimeout(() => notification.style.opacity = '1', 10);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        };
    })();

    // --- Configuration Flags & Thresholds ---
    const CONFIG = {
        inlineMaxSizeCss: 100000,
        inlineMaxSizeJs: 300000,
        inlineMaxSizeImg: 1000000, // 1MB max for images
        inlineCss: true,
        inlineJs: true,
        inlineImages: false,
        inlineIframes: false,
        fixRelativeUrls: true,
        captureAssets: true,
        preserveScripts: true,
        removeTrackingScripts: false,
        removeComments: false,
        minifyCss: false,
        progressBar: true,
        timeout: 15000 // 15 seconds timeout for any fetch operation
    };

    // --- Helper Functions ---
    const Helpers = {
        // Convert a URL to an absolute URL
        toAbsoluteUrl: (url, base = document.baseURI) => {
            try {
                // Special case for data URLs or absolute URLs
                if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) {
                    return url;
                }
                return new URL(url, base).href;
            } catch (e) {
                console.warn(`Failed to convert URL: ${url}`, e);
                return url;
            }
        },
        
        // Simple CSS minification
        minifyCss: (css) => {
            if (!CONFIG.minifyCss) return css;
            return css
                .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                .replace(/\s+/g, ' ') // Compress whitespace
                .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around separators
                .replace(/;}/, '}') // Remove trailing semicolons
                .trim();
        },
        
        // Safe fetch with timeout and retries
        safeFetch: async (url, options = {}, retries = 2) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
            
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                    credentials: 'same-origin',
                    headers: {
                        ...options.headers
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                return response;
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Fetch timeout for: ${url}`);
                }
                
                if (retries > 0) {
                    return Helpers.safeFetch(url, options, retries - 1);
                }
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }
        },
        
        // Check if a string is a tracking script URL or has tracking content
        isTrackingScript: (url, content) => {
            const trackingPatterns = [
                /google-analytics\.com/i, /googletagmanager\.com/i, /gtm\.js/i, 
                /facebook\.net\/.*\/fbevents\.js/i, /connect\.facebook\.net/i,
                /doubleclick\.net/i, /hotjar\.com/i, /analytics/i, /tracking/i,
                /pixel/i, /fbq\(/i, /ga\(/i, /\_gaq/i, /urchin/i, /piwik/i
            ];
            
            if (url) {
                return trackingPatterns.some(pattern => pattern.test(url));
            }
            
            if (content) {
                return trackingPatterns.some(pattern => pattern.test(content));
            }
            
            return false;
        },
        
        // Fix CSS URLs to be absolute
        fixCssUrls: (cssText, baseUrl) => {
            return cssText.replace(/url\(['"]?([^'"\)]+)['"]?\)/g, (match, url) => {
                // Skip data URLs and absolute URLs
                if (url.startsWith('data:') || url.startsWith('http:') || url.startsWith('https:') || url.startsWith('//')) {
                    return match;
                }
                
                const absoluteUrl = Helpers.toAbsoluteUrl(url, baseUrl);
                return `url("${absoluteUrl}")`;
            });
        },
        
        // Create a progress bar
        createProgressBar: () => {
            if (!CONFIG.progressBar) return null;
            
            const progressContainer = document.createElement('div');
            const progressBar = document.createElement('div');
            const progressText = document.createElement('div');
            
            progressContainer.style = 'position:fixed;top:0;left:0;right:0;height:5px;background:#f1f1f1;z-index:99999;';
            progressBar.style = 'height:100%;width:0;background:#4CAF50;transition:width 0.3s;';
            progressText.style = 'position:absolute;top:10px;left:10px;font-family:sans-serif;font-size:12px;padding:5px 10px;background:rgba(0,0,0,0.7);color:white;border-radius:3px;';
            
            progressContainer.appendChild(progressBar);
            progressContainer.appendChild(progressText);
            document.body.appendChild(progressContainer);
            
            return {
                update: (percent, message) => {
                    progressBar.style.width = `${percent}%`;
                    progressText.textContent = message || `${Math.round(percent)}% complete`;
                },
                remove: () => {
                    progressContainer.style.opacity = '0';
                    setTimeout(() => {
                        if (progressContainer.parentNode) {
                            progressContainer.parentNode.removeChild(progressContainer);
                        }
                    }, 500);
                }
            };
        },
        
        // Quick check if in a cross-origin frame
        isCrossOriginFrame: () => {
            try {
                // If we can access this, we're in a same-origin frame
                window.parent.document;
                return false;
            } catch (e) {
                return true;
            }
        }
    };

    // --- Asset Processing Functions ---
    const AssetProcessor = {
        // Process CSS stylesheets
        inlineStylesheets: async (root, progress) => {
            const links = Array.from(root.querySelectorAll('link[rel="stylesheet"]'));
            const totalLinks = links.length;
            
            if (progress && totalLinks > 0) {
                progress.update(0, `Processing ${totalLinks} stylesheets...`);
            }
            
            const promises = links.map(async (link, index) => {
                if (!link.href) return;
                
                const absHref = Helpers.toAbsoluteUrl(link.href);
                
                if (!CONFIG.inlineCss) {
                    link.href = absHref;
                    return;
                }
                
                try {
                    const response = await Helpers.safeFetch(absHref);
                    const contentLength = response.headers.get('content-length');
                    
                    if (contentLength && parseInt(contentLength) > CONFIG.inlineMaxSizeCss) {
                        console.warn(`CSS too large (${contentLength} bytes): ${absHref}`);
                        link.href = absHref;
                        return;
                    }
                    
                    let cssText = await response.text();
                    
                    if (cssText.length > CONFIG.inlineMaxSizeCss) {
                        console.warn(`CSS too large (${cssText.length} chars): ${absHref}`);
                        link.href = absHref;
                        return;
                    }
                    
                    // Fix relative URLs in CSS
                    if (CONFIG.fixRelativeUrls) {
                        cssText = Helpers.fixCssUrls(cssText, absHref);
                    }
                    
                    // Minify CSS if configured
                    cssText = Helpers.minifyCss(cssText);
                    
                    const style = document.createElement('style');
                    style.textContent = cssText;
                    
                    // Copy over important attributes
                    if (link.id) style.id = link.id;
                    if (link.media) style.media = link.media;
                    
                    link.parentNode.replaceChild(style, link);
                    
                    if (progress) {
                        progress.update((index + 1) / totalLinks * 25, `Processed ${index + 1}/${totalLinks} stylesheets`);
                    }
                } catch (error) {
                    console.error(`Failed to inline CSS from ${absHref}:`, error);
                    notify(`Failed to process: ${absHref.split('/').pop()}`, true);
                    link.href = absHref;
                }
            });
            
            await Promise.allSettled(promises);
        },
        
        // Process <style> tags to fix relative URLs
        processStyleTags: (root) => {
            if (!CONFIG.fixRelativeUrls) return;
            
            const styles = Array.from(root.querySelectorAll('style'));
            styles.forEach(style => {
                if (style.textContent) {
                    style.textContent = Helpers.fixCssUrls(style.textContent, document.baseURI);
                }
            });
        },
        
        // Process scripts
        inlineScripts: async (root, progress) => {
            const scripts = Array.from(root.querySelectorAll('script'));
            const totalScripts = scripts.filter(script => script.src).length;
            let processedCount = 0;
            
            if (progress && totalScripts > 0) {
                progress.update(25, `Processing ${totalScripts} script files...`);
            }
            
            const promises = scripts.map(async (script) => {
                if (!script.src) return;
                
                const absSrc = Helpers.toAbsoluteUrl(script.src);
                
                // Skip if we should preserve external scripts or if it looks like a tracking script
                if (!CONFIG.inlineJs || 
                    (CONFIG.removeTrackingScripts && Helpers.isTrackingScript(absSrc))) {
                    
                    if (CONFIG.removeTrackingScripts && Helpers.isTrackingScript(absSrc)) {
                        // Remove tracking scripts entirely
                        script.parentNode.removeChild(script);
                    } else {
                        // Just update to absolute URL
                        script.src = absSrc;
                    }
                    return;
                }
                
                try {
                    const response = await Helpers.safeFetch(absSrc);
                    const contentLength = response.headers.get('content-length');
                    
                    if (contentLength && parseInt(contentLength) > CONFIG.inlineMaxSizeJs) {
                        console.warn(`JS too large (${contentLength} bytes): ${absSrc}`);
                        script.src = absSrc;
                        return;
                    }
                    
                    const jsText = await response.text();
                    
                    if (jsText.length > CONFIG.inlineMaxSizeJs) {
                        console.warn(`JS too large (${jsText.length} chars): ${absSrc}`);
                        script.src = absSrc;
                        return;
                    }
                    
                    // Skip tracking scripts if configured
                    if (CONFIG.removeTrackingScripts && Helpers.isTrackingScript(absSrc, jsText)) {
                        script.parentNode.removeChild(script);
                        return;
                    }
                    
                    const newScript = document.createElement('script');
                    
                    // Copy all attributes except 'src'
                    for (let i = 0; i < script.attributes.length; i++) {
                        const attr = script.attributes[i];
                        if (attr.name !== 'src') {
                            newScript.setAttribute(attr.name, attr.value);
                        }
                    }
                    
                    newScript.textContent = jsText;
                    script.parentNode.replaceChild(newScript, script);
                    
                    processedCount++;
                    if (progress) {
                        progress.update(25 + (processedCount / totalScripts * 25), 
                            `Processed ${processedCount}/${totalScripts} scripts`);
                    }
                } catch (error) {
                    console.error(`Failed to inline JS from ${absSrc}:`, error);
                    notify(`Failed to process: ${absSrc.split('/').pop()}`, true);
                    script.src = absSrc;
                }
            });
            
            await Promise.allSettled(promises);
        },
        
        // Process images
        processImages: async (root, progress) => {
            const images = Array.from(root.querySelectorAll('img'));
            const totalImages = images.length;
            let inlinedCount = 0;
            
            if (progress && totalImages > 0) {
                progress.update(50, `Processing ${totalImages} images...`);
            }
            
            const promises = images.map(async (img, index) => {
                if (!img.src || img.src.startsWith('data:') || img.src.startsWith('blob:')) return;
                
                const absSrc = Helpers.toAbsoluteUrl(img.src);
                
                if (!CONFIG.inlineImages) {
                    img.src = absSrc;
                    if (progress) {
                        progress.update(50 + (index / totalImages * 20), 
                            `Converting image URLs: ${index + 1}/${totalImages}`);
                    }
                    return;
                }
                
                try {
                    const response = await Helpers.safeFetch(absSrc);
                    const contentType = response.headers.get('content-type') || 'image/jpeg';
                    const contentLength = response.headers.get('content-length');
                    
                    if (contentLength && parseInt(contentLength) > CONFIG.inlineMaxSizeImg) {
                        console.warn(`Image too large (${contentLength} bytes): ${absSrc}`);
                        img.src = absSrc;
                        return;
                    }
                    
                    const blob = await response.blob();
                    
                    if (blob.size > CONFIG.inlineMaxSizeImg) {
                        console.warn(`Image too large (${blob.size} bytes): ${absSrc}`);
                        img.src = absSrc;
                        return;
                    }
                    
                    const reader = new FileReader();
                    await new Promise((resolve) => {
                        reader.onloadend = function() {
                            img.src = reader.result;
                            inlinedCount++;
                            resolve();
                        };
                        reader.readAsDataURL(blob);
                    });
                    
                    if (progress) {
                        progress.update(50 + (index / totalImages * 20), 
                            `Processed ${inlinedCount}/${totalImages} images`);
                    }
                } catch (error) {
                    console.error(`Failed to inline image from ${absSrc}:`, error);
                    img.src = absSrc;
                }
            });
            
            await Promise.allSettled(promises);
        },
        
        // Process iframes
        processIframes: async (root, progress) => {
            const iframes = Array.from(root.querySelectorAll('iframe'));
            const totalIframes = iframes.length;
            
            if (progress && totalIframes > 0) {
                progress.update(70, `Processing ${totalIframes} iframes...`);
            }
            
            const promises = iframes.map(async (iframe, index) => {
                if (!iframe.src || iframe.src.startsWith('data:') || iframe.src.startsWith('about:')) return;
                
                const absSrc = Helpers.toAbsoluteUrl(iframe.src);
                
                if (!CONFIG.inlineIframes) {
                    iframe.src = absSrc;
                    return;
                }
                
                try {
                    const response = await Helpers.safeFetch(absSrc);
                    const content = await response.text();
                    
                    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups');
                    iframe.srcdoc = content;
                    iframe.removeAttribute('src');
                    
                    if (progress) {
                        progress.update(70 + (index / totalIframes * 15), 
                            `Processed ${index + 1}/${totalIframes} iframes`);
                    }
                } catch (error) {
                    console.error(`Failed to inline iframe from ${absSrc}:`, error);
                    iframe.src = absSrc;
                }
            });
            
            await Promise.allSettled(promises);
        },
        
        // Process <link> elements with favicons and other resources
        processLinks: (root) => {
            const links = Array.from(root.querySelectorAll('link:not([rel="stylesheet"])'));
            
            links.forEach(link => {
                if (link.href) {
                    link.href = Helpers.toAbsoluteUrl(link.href);
                }
            });
        },
        
        // Process <a> elements to fix relative URLs
        processAnchors: (root) => {
            if (!CONFIG.fixRelativeUrls) return;
            
            const anchors = Array.from(root.querySelectorAll('a'));
            anchors.forEach(anchor => {
                if (anchor.href) {
                    anchor.href = Helpers.toAbsoluteUrl(anchor.href);
                }
            });
        },
        
        // Process <form> elements to fix relative URLs
        processForms: (root) => {
            if (!CONFIG.fixRelativeUrls) return;
            
            const forms = Array.from(root.querySelectorAll('form'));
            forms.forEach(form => {
                if (form.action) {
                    form.action = Helpers.toAbsoluteUrl(form.action);
                }
            });
        },
        
        // Remove comments if configured
        removeComments: (root) => {
            if (!CONFIG.removeComments) return;
            
            const iterator = document.createNodeIterator(
                root,
                NodeFilter.SHOW_COMMENT,
                { acceptNode: node => NodeFilter.FILTER_ACCEPT }
            );
            
            let node;
            while (node = iterator.nextNode()) {
                node.parentNode.removeChild(node);
            }
        }
    };

    // --- Main Function: Capture and Download the Page ---
    async function capturePage() {
        try {
            // Don't run in cross-origin iframes
            if (Helpers.isCrossOriginFrame()) {
                alert("Cannot capture page from inside a cross-origin iframe.");
                return;
            }
            
            notify("Starting page capture...");
            const progress = Helpers.createProgressBar();
            
            const doctype = '<!DOCTYPE html>';
            const title = document.title || 'captured_page_' + new Date().toISOString().slice(0, 10);
            
            // Clone the entire document
            const documentClone = document.cloneNode(true);
            const clone = documentClone.documentElement;
            
            if (progress) progress.update(5, "Preparing document clone...");
            
            // Apply all processing steps
            try {
                // Inline CSS
                await AssetProcessor.inlineStylesheets(clone, progress);
                
                // Process inline <style> tags
                AssetProcessor.processStyleTags(clone);
                
                // Inline JS
                await AssetProcessor.inlineScripts(clone, progress);
                
                // Process images
                await AssetProcessor.processImages(clone, progress);
                
                // Process iframes
                await AssetProcessor.processIframes(clone, progress);
                
                // Process links and anchors
                if (progress) progress.update(85, "Fixing relative URLs...");
                AssetProcessor.processLinks(clone);
                AssetProcessor.processAnchors(clone);
                AssetProcessor.processForms(clone);
                
                // Remove comments if configured
                if (CONFIG.removeComments) {
                    if (progress) progress.update(90, "Removing comments...");
                    AssetProcessor.removeComments(clone);
                }
                
                // Add metadata about the capture
                const meta = document.createElement('meta');
                meta.name = 'captured-from';
                meta.content = `${document.location.href} on ${new Date().toISOString()}`;
                clone.querySelector('head').appendChild(meta);
                
                if (progress) progress.update(95, "Generating final HTML...");
                
                // Create the final HTML string
                const finalHtml = doctype + clone.outerHTML;
                const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                
                // Create a temporary link and trigger the download
                const a = document.createElement('a');
                a.href = url;
                a.download = title.replace(/[/\\?%*:|"<>]/g, '_') + '.html';
                document.body.appendChild(a);
                
                if (progress) progress.update(100, "Downloading page...");
                
                // Small delay before clicking to ensure everything is ready
                setTimeout(() => {
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    if (progress) progress.remove();
                    notify("Page successfully captured!");
                }, 100);
            } catch (error) {
                console.error("Error during page processing:", error);
                notify("Error during capture: " + error.message, true);
                if (progress) progress.remove();
            }
        } catch (error) {
            console.error("Fatal error during page capture:", error);
            alert("Failed to capture page: " + error.message);
        }
    }

    // Start the capture process
    capturePage();
})();
