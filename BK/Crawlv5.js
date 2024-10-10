
            (function() {
    "use strict";

    const version = "1.4.0";
    const emojis = {
        enjoy: ":)",
        happy: ":D",
        notHappy: "Error",
        what: "Huh",
        yesss: "🙂",
        ehmm: "😒",
    };

    let isCrawling = false,
        allLinks = new Set(),
        workerLinks = [],
        checkedLinks = new Set(),
        allImages = new Set(),
        errors = [],
        sources = [],
        allText = [],
        crawlSpeed = 1000;

    // Link Detection Patterns
    const urlPatterns = {
        relative: /^(?!http|\/\/|tel:|mailto:|javascript:|#)(.+)/i,
        anchor: /^#.+/i,
        tel: /^tel:.+/i,
        ftp: /^ftp:\/\/.+/i,
        sftp: /^sftp:\/\/.+/i,
        javascript: /^javascript:.+/i,
        http: /^https?:\/\/.+/i
    };

    // Core functionalities
    const gatherAllLinks = (doc) => {
        const links = new Set();
        const baseUrl = doc.baseURI || window.location.origin;
        const resolveUrl = (url) => {
            try {
                return new URL(url, baseUrl).href;
            } catch (e) {
                return null;
            }
        };
        const processElements = (selector, attributeName) => {
            doc.querySelectorAll(selector).forEach(element => {
                const url = element.getAttribute(attributeName);
                if (url) {
                    if (urlPatterns.relative.test(url)) {
                        const resolvedUrl = resolveUrl(url);
                        if (resolvedUrl) links.add(resolvedUrl);
                    } else if (urlPatterns.http.test(url) || 
                               urlPatterns.ftp.test(url) || 
                               urlPatterns.sftp.test(url)) {
                        links.add(url);
                    }
                }
            });
        };

        processElements('a', 'href');
        processElements('script', 'src');
        processElements('link[rel="stylesheet"]', 'href');
        processElements('img', 'src');
        processElements('iframe', 'src');

        doc.querySelectorAll('script:not([src])').forEach(script => {
            const content = script.textContent;
            const urlMatches = content.match(/(?:href|location|url)\s*=\s*['"]([^'"]+)['"]/g);
            if (urlMatches) {
                urlMatches.forEach(match => {
                    const url = match.match(/['"]([^'"]+)['"]/)[1];
                    const resolvedUrl = resolveUrl(url);
                    if (resolvedUrl) links.add(resolvedUrl);
                });
            }
        });
        return Array.from(links);
    };

    const gatherImages = (doc) => {
        const images = new Set();
        const baseUrl = doc.baseURI || window.location.origin;
        doc.querySelectorAll('img').forEach(img => {
            if (img.src) images.add(img.src);
            if (img.dataset.src) images.add(img.dataset.src); // Lazy loaded images
        });

        doc.querySelectorAll('*').forEach(element => {
            const style = window.getComputedStyle(element);
            const backgroundImage = style.backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
                const url = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (url) images.add(new URL(url[1], baseUrl).href);
            }
        });
        return Array.from(images);
    };

    const extractText = (doc) => {
        const texts = [];
        doc.body.querySelectorAll('*:not(script):not(style)').forEach(el => {
            if (el.textContent.trim()) {
                texts.push({ type: el.tagName.toLowerCase(), content: el.textContent.trim() });
            }
        });
        return texts;
    };

    const startCrawling = () => {
        if (isCrawling) {
            logOutput(emojis.ehmm + " Already crawling!", true);
            return;
        }
        isCrawling = true;
        logOutput(emojis.happy + " Starting crawl...");
        allLinks = new Set(gatherAllLinks(document));
        workerLinks = Array.from(allLinks);
        logOutput("Found " + allLinks.size + " links on this page.");
        processLinks();
    };

    const stopCrawling = () => {
        isCrawling = false;
        updateStatus("Crawling stopped");
        logOutput(emojis.ehmm + " Crawl stopped.");
    };

    const processLinks = async () => {
        if (!isCrawling || workerLinks.length === 0) {
            updateStatus("Crawling complete");
            logOutput(emojis.yesss + " Crawling complete!");
            return;
        }

        const link = workerLinks.shift();
        if (!link || checkedLinks.has(link)) {
            setTimeout(processLinks, crawlSpeed);
            return;
        }

        try {
            updateStatus(`Crawling: ${link}`);
            const response = await fetch(link);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                const text = await response.text();
                const doc = new DOMParser().parseFromString(text, 'text/html');

                const newLinks = gatherAllLinks(doc);
                const newImages = gatherImages(doc);
                const newText = extractText(doc);

                newLinks.forEach(url => {
                    if (!checkedLinks.has(url)) {
                        allLinks.add(url);
                        workerLinks.push(url);
                    }
                });

                newImages.forEach(img => allImages.add(img));
                allText.push(...newText);

                logOutput(`Processed: ${link}`, false, 'link');
                checkedLinks.add(link);
            }
        } catch (error) {
            errors.push({ url: link, error: error.message });
            logOutput(`${emojis.notHappy} Error processing ${link}: ${error.message}`, true);
        }

        setTimeout(processLinks, crawlSpeed);
    };

    const crawlCurrentLinks = () => {
        const links = gatherAllLinks(document);
        logOutput(`Found ${links.length} links on current page:`);
        links.forEach(link => logOutput(link, false, 'link'));
    };

    const crawlCurrentImages = () => {
        const images = gatherImages(document);
        logOutput(`Found ${images.length} images on current page:`);
        images.forEach(img => logOutput(img, false, 'image'));
    };

    const crawlCurrentText = () => {
        const texts = extractText(document);
        logOutput(`Found ${texts.length} text blocks on current page:`);
        texts.forEach(({ type, content }) => {
            logOutput(`[${type}] ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
        });
    };

    // Sitemap Handling
    const fetchSitemap = async () => {
        try {
            updateStatus("Fetching sitemap...");
            const domain = window.location.origin;
            const sitemapUrls = [
                `${domain}/sitemap.xml`,
                `${domain}/sitemap_index.xml`,
                `${domain}/sitemap-index.xml`,
                `${domain}/wp-sitemap.xml`
            ];

            for (const url of sitemapUrls) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const text = await response.text();
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(text, "text/xml");

                        const locations = [
                            ...xmlDoc.querySelectorAll('loc'),
                            ...xmlDoc.querySelectorAll('sitemap loc')
                        ];

                        if (locations.length > 0) {
                            locations.forEach(loc => {
                                const url = loc.textContent.trim();
                                allLinks.add(url);
                                workerLinks.push(url);
                                logOutput(`Found in sitemap: ${url}`, false, 'link');
                            });
                            updateStatus(`Added ${locations.length} URLs from sitemap`);
                            return;
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching ${url}:`, e);
                }
            }
            throw new Error("No valid sitemap found");
        } catch (error) {
            updateStatus("Sitemap fetch failed", true);
            logOutput(`${emojis.notHappy} ${error.message}`, true);
        }
    };

    const exportData = () => {
        const structuredData = {
            metadata: {
                version,
                timestamp: new Date().toISOString(),
                domain: window.location.hostname,
                crawlStats: {
                    totalLinks: allLinks.size,
                    checkedLinks: checkedLinks.size,
                    totalImages: allImages.size,
                    errors: errors.length
                }
            },
            sitemap: {
                links: Array.from(allLinks).map(link => ({
                    url: link,
                    visited: checkedLinks.has(link)
                })),
                images: Array.from(allImages).map(image => ({
                    src: image
                })),
                text: allText,
                errors: errors
            }
        };

        const blob = new Blob([JSON.stringify(structuredData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = url;
        downloadAnchor.download = "crawl_data.json";
        downloadAnchor.click();
        URL.revokeObjectURL(url);
    };

    const clearLog = () => {
        clearOutput();
        allLinks.clear();
        checkedLinks.clear();
        allImages.clear();
        workerLinks = [];
        errors = [];
        allText = [];
    };

    const clearOutput = () => {
        const outputContainer = document.getElementById('crawler-output');
        if (outputContainer) {
            outputContainer.innerHTML = '';
        }
    };

    const logOutput = (message, isError = false, type = 'log') => {
        const outputContainer = document.getElementById('crawler-output');
        if (outputContainer) {
            const messageEl = document.createElement('div');
            messageEl.textContent = message;
            messageEl.classList.add(type === 'log' ? 'log-entry' : type === 'link' ? 'log-link' : 'log-image');
            if (isError) messageEl.classList.add('error');
            outputContainer.appendChild(messageEl);
        }
    };

    const updateStatus = (message, isError = false) => {
        const statusContainer = document.getElementById('crawler-status');
        if (statusContainer) {
            statusContainer.textContent = message;
            if (isError) statusContainer.classList.add('error');
            else statusContainer.classList.remove('error');
        }
    };

    const initUI = () => {
        if (document.getElementById('crawler-ui')) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'crawler-ui';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            font-size: 12px;
            z-index: 999999;
            padding: 10px;
        `;

        const statusContainer = document.createElement('div');
        statusContainer.id = 'crawler-status';
        container.appendChild(statusContainer);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginBottom = '10px';

        const createButton = (text, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.onclick = onClick;
            button.style.cssText = `
                padding: 5px 10px;
                background: #444;
                color: #fff;
                border: none;
                cursor: pointer;
            `;
            return button;
        };

        buttonContainer.appendChild(createButton('Crawl Website', startCrawling));
        buttonContainer.appendChild(createButton('Stop', stopCrawling));
        buttonContainer.appendChild(createButton('Clear Log', clearLog));
        buttonContainer.appendChild(createButton('Export JSON', exportData));
        buttonContainer.appendChild(createButton('Links on this page', crawlCurrentLinks));
        buttonContainer.appendChild(createButton('Images on this page', crawlCurrentImages));
        buttonContainer.appendChild(createButton('Text on this page', crawlCurrentText));
        buttonContainer.appendChild(createButton('Fetch Sitemap', fetchSitemap));

        container.appendChild(buttonContainer);

        const outputContainer = document.createElement('div');
        outputContainer.id = 'crawler-output';
        outputContainer.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            background: #111;
            padding: 10px;
            font-family: monospace;
        `;
        container.appendChild(outputContainer);

        document.body.appendChild(container);
    };

    // Initialize
    initUI();

})();
