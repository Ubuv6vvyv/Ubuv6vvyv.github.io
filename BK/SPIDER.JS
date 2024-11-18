javascript:(function() {
    // Configuration for Speed and Efficiency
    const CONFIG = {
        maxDepth: 5, // Recursion depth for domain crawling
        timeout: 8000, // Timeout duration for faster scanning
        concurrentScans: 10, // Number of concurrent scans
        sensitivityLevel: 'high',
        debugMode: true,
        excludeSecretsFromCrawl: true,
        excludedDomains: [
            'google.com', 'facebook.com', 'twitter.com', 
            'amazonaws.com', 'cloudfront.net', 'jsdelivr.net'
        ],
        excludedExtensions: [
            '.pdf', '.zip', '.exe', '.dll', '.bin', 
            '.jpg', '.png', '.gif', '.jpeg', '.svg', 
            '.woff', '.woff2', '.ttf', '.eot'
        ],
        detectionRules: {
            secrets: {
                patterns: [
                    /\b[A-Fa-f0-9]{32,64}\b/g, // Common hex/base64 secrets
                    /\b(?:sk_|pk_|oauth_)[A-Za-z0-9_\-./]+\b/gi, // API keys, tokens
                    /\b(?:secret|key|token|password)[\s:='"]+([A-Za-z0-9+/=]{20,})\b/gi, // Secrets with context
                    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
                    /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
                    /\b\d{13,16}\b/, // Credit card pattern
                    /\b\$[\d,]+(?:\.\d{2})?\b/ // Price detection
                ]
            },
            urls: {
                patterns: [
                    /https?:\/\/[^\s'"]+/gi,
                    /['"]([^'"]*\.(php|html?|asp[x]?|jsp|json|xml)[^'"]*)/gi,
                    /\/[\w\-\/]+\.[\w\-]+/g,
                    /data-[^\s]+=['"]([^'"]+)['"]/gi // Data attribute URLs
                ]
            }
        }
    };

    // Logger Class for Output and Downloading Logs
    class AdvancedLogger {
        constructor() {
            this.logContainer = this.createLogContainer();
            this.logs = {
                urls: [],
                secrets: [],
                externalDomains: [],
                errors: [],
                dynamicUrls: [],
                sitemaps: [],
                jsFiles: [],
                cssFiles: []
            };
        }

        createLogContainer() {
            // Create and style the log container
            const container = document.createElement('div');
            container.style.cssText = `
                position: fixed; 
                bottom: 0; 
                left: 0; 
                width: 100%; 
                max-height: 50%; 
                overflow: auto; 
                background: rgba(0,0,0,0.9); 
                color: #00ff00; 
                z-index: 10000; 
                padding: 10px; 
                font-family: monospace;
                font-size: 12px;
            `;
            document.body.appendChild(container);

            // Create a button to download logs
            const downloadButton = document.createElement('button');
            downloadButton.innerText = "Download Logs";
            downloadButton.style.cssText = `
                margin: 10px;
                padding: 5px 10px;
                font-size: 14px;
                cursor: pointer;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
            `;
            downloadButton.onclick = () => this.exportLogs();
            container.appendChild(downloadButton);

            return container;
        }

        log(message, type = 'info', context = '') {
            // Log messages and append them to the container
            const colorMap = {
                info: '#00ff00',
                secret: '#ff0000',
                external: '#ffff00',
                error: '#ff6600',
                dynamic: '#00ffff',
                sensitiveData: '#ff00ff',
                sitemap: '#ff99ff',
                js: '#66ff66',
                css: '#99ccff'
            };

            const logEntry = document.createElement('div');
            logEntry.style.color = colorMap[type] || '#ffffff';
            logEntry.innerHTML = `
                <span>[${type.toUpperCase()}]</span> 
                ${message} 
                ${context ? `<small style="color: #888;">${context}</small>` : ''}
            `;
            
            this.logContainer.appendChild(logEntry);
            this.logContainer.scrollTop = this.logContainer.scrollHeight;

            // Store log entries in arrays for downloading
            if (type === 'url' || type === 'dynamic') {
                this.logs.urls.push({ url: message, context });
            }
            if (this.logs[type + 's']) {
                this.logs[type + 's'].push({ message, context });
            }

            // Debug logging
            if (CONFIG.debugMode) {
                console.log(type, message, context);
            }
        }

        exportLogs() {
            // Export logs as a text file
            const exportData = {
                timestamp: new Date().toISOString(),
                url: location.href,
                logs: this.logs
            };

            // Convert to readable text format for download
            let logText = `Timestamp: ${exportData.timestamp}\nURL: ${exportData.url}\n\n`;

            // Adding URLs and resources
            logText += 'URLs Found:\n';
            exportData.logs.urls.forEach(entry => {
                logText += `${entry.url} ${entry.context ? `(${entry.context})` : ''}\n`;
            });

            // Adding other logs
            logText += '\nSecrets Found:\n';
            exportData.logs.secrets.forEach(entry => {
                logText += `${entry.message} ${entry.context ? `(${entry.context})` : ''}\n`;
            });

            logText += '\nErrors:\n';
            exportData.logs.errors.forEach(entry => {
                logText += `${entry.message} ${entry.context ? `(${entry.context})` : ''}\n`;
            });

            const blob = new Blob([logText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `web_spider_logs_${new Date().toISOString().replace(/:/g, '-')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // Optimized Web Crawler Class
    class WebSpider {
        constructor(logger) {
            this.logger = logger;
            this.scannedUrls = new Set();  // Track visited URLs
            this.queuedUrls = new Set();  // Queue URLs for scanning
        }

        // Check if URL is valid (not already visited and within domain)
        isValidUrl(url) {
            try {
                const parsedUrl = new URL(url);
                if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false;

                // Exclude known domains or irrelevant file extensions
                if (CONFIG.excludedDomains.some(domain => parsedUrl.hostname.includes(domain))) return false;
                if (CONFIG.excludedExtensions.some(ext => url.toLowerCase().endsWith(ext))) return false;

                return true;
            } catch {
                return false;
            }
        }

        // Extract URLs and resources from page content
        extractContentResources(document) {
            const resources = new Set();
            const selectors = [
                'a[href]', 'img[src]', 'script[src]', 
                'link[href]', 'iframe[src]', 'source[src]'
            ];

            // Extract href/src URLs from elements
            document.querySelectorAll(selectors.join(',')).forEach(el => {
                const href = el.getAttribute('href');
                const src = el.getAttribute('src');
                [href, src].forEach(url => {
                    if (url && this.isValidUrl(url)) {
                        resources.add(new URL(url, location.href).href);
                    }
                });
            });

            // Inline JS and CSS URL extraction
            document.querySelectorAll('script, style').forEach(el => {
                const content = el.textContent;
                const extractedUrls = this.extractUrlsFromText(content);
                extractedUrls.forEach(url => resources.add(url));
            });

            return resources;
        }

        // Extract URLs from text (for inline scripts/styles)
        extractUrlsFromText(text) {
            const urlSet = new Set();
            CONFIG.detectionRules.urls.patterns.forEach(pattern => {
                const matches = text.match(pattern) || [];
                matches.forEach(match => {
                    try {
                        const url = new URL(match, location.href).href;
                        if (this.isValidUrl(url)) {
                            urlSet.add(url);
                        }
                    } catch {}
                });
            });
            return [...urlSet];
        }

        // Detect secrets in content
        detectSecrets(content) {
            const detections = { secrets: [], sensitiveData: [] };

            CONFIG.detectionRules.secrets.patterns.forEach(pattern => {
                const matches = content.match(pattern) || [];
                matches.forEach(match => {
                    detections.secrets.push(match);
                });
            });

            return detections;
        }

        // Perform the web crawling task
        async crawl(url, depth = 0) {
            if (depth >= CONFIG.maxDepth || this.scannedUrls.has(url)) return;

            this.scannedUrls.add(url);
            this.queuedUrls.add(url);

            this.logger.log(`Scanning: ${url} | Depth: ${depth}`, 'info');

            try {
                const response = await fetch(url, { timeout: CONFIG.timeout });
                const text = await response.text();

                // Extract URLs and resources
                const resources = this.extractContentResources(new DOMParser().parseFromString(text, 'text/html'));
                resources.forEach(resource => this.logger.log(resource, 'url', url));

                // Check for secrets in the page content
                const secrets = this.detectSecrets(text);
                secrets.secrets.forEach(secret => {
                    this.logger.log(secret, 'secret', url);
                });

                // Add discovered resources to the queue for further scanning
                for (let resource of resources) {
                    if (!this.scannedUrls.has(resource)) {
                        await this.crawl(resource, depth + 1);
                    }
                }

            } catch (error) {
                this.logger.log(`Error fetching ${url}: ${error.message}`, 'error');
            }
        }

        // Scan multiple URLs in parallel
        async parallelScan(urls, depth) {
            const tasks = urls.slice(0, CONFIG.concurrentScans).map(url => this.crawl(url, depth));
            await Promise.all(tasks);
        }
    }

    // Initialize and start the crawling process
    const logger = new AdvancedLogger();
    const spider = new WebSpider(logger);
    spider.crawl(location.href);
})();
