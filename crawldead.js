(async function() {
    console.clear();
    console.log("%cURL Crawler & Discoverer Tool", "font-size: 20px; font-weight: bold; color: #4CAF50;");
    console.log("-------------------------------------");
    console.log("Starting URL discovery and crawling...");
    console.log("Note: Browser CORS policy limits access to cross-origin resources.");
    console.log("-------------------------------------");

    // --- Configuration ---
    const MAX_CRAWL_DEPTH = 5; // How many levels deep to crawl within the same domain
    const MAX_CONCURRENT_FETCHES = 5; // Limit parallel requests
    const REPORT_WINDOW_WIDTH = 900; // Slightly wider for more space
    const REPORT_WINDOW_HEIGHT = 700; // Slightly taller
    const REPORT_UPDATE_INTERVAL_MS = 1000; // Interval for refreshing report window (in ms)
    const SITEMAP_LOCATIONS = ['/sitemap.xml', '/sitemap_index.xml']; // Common sitemap paths
    const ROBOTS_TXT_PATH = '/robots.txt'; // Standard robots.txt path
    const SKIPPABLE_EXTENSIONS = { // Extensions that will be logged but not crawled, categorized
        image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
        media: ['.mp4', '.webm', '.ogg', '.mp3', '.wav'],
        document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
        font: ['.ttf', '.woff', '.woff2', '.eot'],
        archive: ['.zip', '.rar', '.tar', '.gz'],
        data: ['.json', '.xml'] // For Lottie files, etc.
    };

    // Flatten skippable extensions for quick lookup
    const ALL_SKIPPABLE_EXTENSIONS_FLAT = new Set();
    Object.values(SKIPPABLE_EXTENSIONS).forEach(arr => arr.forEach(ext => ALL_SKIPPABLE_EXTENSIONS_FLAT.add(ext)));

    // Define categories for displaying in the main list
    const ALL_SAME_ORIGIN_LIST_CATEGORIES = [
        'html', 'css', 'js',
        'image', 'media', 'document', 'font', 'archive', 'data', 'other'
    ];

    // --- Global State ---
    const currentOrigin = window.location.origin;
    const uniqueDiscoveredUrls = {
        sameOrigin: {
            // URLs that have been successfully crawled and parsed by type
            html: new Set(),
            css: new Set(),
            js: new Set(),
            // URLs that were identified as non-crawlable by extension and skipped
            skipped: {
                image: new Set(),
                media: new Set(),
                document: new Set(),
                font: new Set(),
                archive: new Set(),
                data: new Set(),
                other: new Set() // For any other non-crawlable type not explicitly categorized
            },
            toCrawl: new Set(),    // URLs waiting to be fetched
            pending: new Set()     // URLs currently being fetched
        },
        crossOrigin: new Set() // URLs from other domains (logged only)
    };
    const crawlQueue = []; // URLs waiting to be crawled { url: string, depth: number }
    let fetchesInFlight = 0;
    let reportWindow = null;
    let updateIntervalId = null;
    const robotsTxtDisallowRules = []; // Store disallow rules from robots.txt (for logging/info, not blocking)

    // --- DOM Element Maps for Efficient Updates ---
    // These maps store references to <li> elements, allowing for O(1) lookups and removal
    const DOM_ELEMENT_MAPS = {
        sameOriginAllList: new Map(), // Stores { url: liElement } for crawled and skipped
        sameOriginToCrawlPendingList: new Map(), // Stores { url: liElement } for toCrawl and pending
        crossOriginList: new Map(), // Stores { url: liElement } for cross-origin
    };

    // --- Helper Functions ---

    /**
     * Normalizes a URL, resolves relative paths, removes hash, and ensures consistent trailing slashes.
     * @param {string} urlString - The URL string to normalize.
     * @param {string} baseUrl - The base URL to resolve relative paths against.
     * @returns {string|null} - Normalized URL or null if invalid.
     */
    function normalizeUrl(urlString, baseUrl = window.location.href) {
        if (!urlString || typeof urlString !== 'string') return null;
        try {
            const url = new URL(urlString, baseUrl);
            url.hash = ''; // Remove hash fragments

            // Standardize trailing slashes: remove for files, keep for directories or root
            const path = url.pathname;
            const hasExtension = path.includes('.') && path.lastIndexOf('.') > path.lastIndexOf('/');

            if (path.endsWith('/') && path.length > 1 && !hasExtension) {
                url.pathname = path.slice(0, -1);
            }
            // For root path, ensure it's just origin or origin/
            if (url.pathname === '') {
                url.pathname = '/';
            }

            return url.href;
        } catch (e) {
            // console.warn("Invalid URL encountered:", urlString, e);
            return null;
        }
    }

    /**
     * Checks if a URL is on the same origin as the current page.
     * @param {string} urlString - The URL to check.
     * @returns {boolean}
     */
    function isSameOrigin(urlString) {
        try {
            const url = new URL(urlString);
            return url.origin === currentOrigin;
        } catch (e) {
            return false;
        }
    }

    /**
     * Checks if a URL is disallowed by robots.txt rules.
     * This function is now used for logging/information, not for blocking crawls.
     * @param {string} url - The URL to check.
     * @returns {boolean} - True if disallowed, false otherwise.
     */
    function isDisallowedByRobots(url) {
        try {
            const urlPath = new URL(url).pathname;
            for (const rule of robotsTxtDisallowRules) {
                // Simple string includes check. For full compliance, this would need
                // to be a more sophisticated glob matching algorithm.
                if (urlPath.startsWith(rule)) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error(`Error checking robots.txt for ${url}: ${e.message}`);
            return false;
        }
    }

    /**
     * Checks if a URL has a skippable file extension and categorizes it.
     * @param {string} urlString - The URL to check.
     * @returns {string|null} - The category ('image', 'media', 'document', 'font', 'archive', 'data', 'other') or null if not skippable.
     */
    function getSkippableCategory(urlString) {
        try {
            const url = new URL(urlString);
            const path = url.pathname;
            const lastDotIndex = path.lastIndexOf('.');
            if (lastDotIndex > -1) {
                const extension = path.substring(lastDotIndex).toLowerCase();
                for (const category in SKIPPABLE_EXTENSIONS) {
                    if (SKIPPABLE_EXTENSIONS[category].includes(extension)) {
                        return category;
                    }
                }
                // If it has an extension but isn't in a specific category, and is in our flat list
                if (ALL_SKIPPABLE_EXTENSIONS_FLAT.has(extension)) {
                     return 'other';
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Checks if a URL has already been fully processed (crawled/parsed or explicitly skipped).
     * This is the crucial check to prevent redundant work.
     * @param {string} normalizedUrl - The normalized URL to check.
     * @returns {boolean} - True if already processed, false otherwise.
     */
    function isProcessed(normalizedUrl) {
        // Check if it's already in a 'crawled' category (HTML, CSS, JS)
        if (uniqueDiscoveredUrls.sameOrigin.html.has(normalizedUrl) ||
            uniqueDiscoveredUrls.sameOrigin.css.has(normalizedUrl) ||
            uniqueDiscoveredUrls.sameOrigin.js.has(normalizedUrl)) {
            return true;
        }

        // Check if it's in a 'skipped' category
        if (Object.values(uniqueDiscoveredUrls.sameOrigin.skipped).some(set => set.has(normalizedUrl))) {
            return true;
        }
        return false;
    }

    /**
     * Adds a URL to the appropriate tracking sets and crawl queue if new and within depth,
     * and not an obviously un-crawlable file type.
     * @param {string} url - The URL to add.
     * @param {number} depth - Current crawl depth from the initial URL.
     * @returns {boolean} - True if it's a newly added URL for processing, false otherwise.
     */
    function addUrlToTracking(url, depth) {
        const normalizedUrl = normalizeUrl(url);
        if (!normalizedUrl) return false;

        // If the URL has already been processed (crawled or skipped), don't re-add
        if (isProcessed(normalizedUrl)) {
            return false;
        }

        if (isSameOrigin(normalizedUrl)) {
            const skippableCategory = getSkippableCategory(normalizedUrl);
            if (skippableCategory) {
                // Add to skipped list and do not crawl
                uniqueDiscoveredUrls.sameOrigin.skipped[skippableCategory].add(normalizedUrl);
                // console.log(`[${depth}] ⏭️ Skipping crawl of ${normalizedUrl} - Categorized as ${skippableCategory}.`);
                return true;
            } else {
                // If it's not already in toCrawl or pending, add it
                if (!uniqueDiscoveredUrls.sameOrigin.toCrawl.has(normalizedUrl) &&
                    !uniqueDiscoveredUrls.sameOrigin.pending.has(normalizedUrl)) {
                    uniqueDiscoveredUrls.sameOrigin.toCrawl.add(normalizedUrl);
                    // Only add to crawl queue if within MAX_CRAWL_DEPTH
                    if (depth < MAX_CRAWL_DEPTH) {
                        crawlQueue.push({ url: normalizedUrl, depth: depth + 1 });
                        // console.log(`[${depth}] ➕ Added to queue: ${normalizedUrl}`);
                    } else {
                        // console.log(`[${depth}] ⏭️ Max depth reached, not queueing: ${normalizedUrl}`);
                    }
                    return true;
                }
                return false; // It was already pending or in the queue
            }
        } else {
            // Only add cross-origin if not already logged
            if (!uniqueDiscoveredUrls.crossOrigin.has(normalizedUrl)) {
                uniqueDiscoveredUrls.crossOrigin.add(normalizedUrl);
                // console.log(`[${depth}] ➡️ Cross-Origin logged: ${normalizedUrl}`);
                return true;
            }
            return false;
        }
    }

    /**
     * Extracts URLs from HTML content, including various attributes and inline styles.
     * @param {string} htmlString - The HTML content.
     * @param {string} baseUrl - The base URL for resolving relative paths.
     * @returns {Array<string>} - Array of found URLs.
     */
    function extractUrlsFromHtml(htmlString, baseUrl) {
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        const urls = new Set(); // Use a Set to avoid duplicates during extraction

        // Common attributes: href, src, action, data, poster (for video)
        const selectors = [
            'a[href]', 'img[src]', 'script[src]', 'link[href]', 'iframe[src]',
            'form[action]', 'source[src]', 'video[src]', 'audio[src]',
            'object[data]', 'embed[src]', 'video[poster]'
        ];

        doc.querySelectorAll(selectors.join(', ')).forEach(element => {
            let urlAttr = '';
            if (element.hasAttribute('href')) urlAttr = element.getAttribute('href');
            else if (element.hasAttribute('src')) urlAttr = element.getAttribute('src');
            else if (element.hasAttribute('action')) urlAttr = element.getAttribute('action');
            else if (element.hasAttribute('data')) urlAttr = element.getAttribute('data');
            else if (element.hasAttribute('poster')) urlAttr = element.getAttribute('poster');

            const normalized = normalizeUrl(urlAttr, baseUrl);
            if (normalized) urls.add(normalized);

            // Handle srcset for responsive images (comma-separated URLs)
            if (element.hasAttribute('srcset')) {
                element.getAttribute('srcset').split(',').forEach(set => {
                    const parts = set.trim().split(/\s+/);
                    if (parts.length > 0) {
                        const srcsetNormalized = normalizeUrl(parts[0], baseUrl);
                        if (srcsetNormalized) urls.add(srcsetNormalized);
                    }
                });
            }
        });

        // Styles and background-images within style attributes
        doc.querySelectorAll('[style]').forEach(element => {
            const style = element.getAttribute('style');
            // Regex to find url() within style attributes
            const matches = style.match(/url\(['"]?([^)'"]+)['"]?\)/g);
            if (matches) {
                matches.forEach(match => {
                    const urlMatch = match.match(/url\(['"]?([^)'"]+)['"]?\)/);
                    if (urlMatch && urlMatch[1]) {
                        const normalized = normalizeUrl(urlMatch[1], baseUrl);
                        if (normalized) urls.add(normalized);
                    }
                });
            }
        });

        // <meta> tags for refresh or canonical links
        doc.querySelectorAll('meta[http-equiv="refresh"], meta[rel="canonical"], link[rel="canonical"]').forEach(element => {
            if (element.hasAttribute('content')) {
                const content = element.getAttribute('content');
                const match = content.match(/url=(.*)/i);
                if (match && match[1]) {
                    const normalized = normalizeUrl(match[1], baseUrl);
                    if (normalized) urls.add(normalized);
                }
            } else if (element.hasAttribute('href')) {
                const normalized = normalizeUrl(element.getAttribute('href'), baseUrl);
                if (normalized) urls.add(normalized);
            }
        });

        return Array.from(urls);
    }

    /**
     * Extracts URLs from CSS content, including @import and url().
     * @param {string} cssString - The CSS content.
     * @param {string} baseUrl - The base URL for resolving relative paths.
     * @returns {Array<string>} - Array of found URLs.
     */
    function extractUrlsFromCss(cssString, baseUrl) {
        const urls = new Set();
        // Match url() and @import "..." / @import '...' / @import url(...)
        const regex = /(?:url\(['"]?([^)'"]+)['"]?\)|@import\s+['"]([^'"]+)['"]|@import\s+url\(['"]?([^)'"]+)['"]?\))/g;
        let match;
        while ((match = regex.exec(cssString)) !== null) {
            const foundUrl = match[1] || match[2] || match[3]; // Prioritize non-empty match group
            const normalized = normalizeUrl(foundUrl, baseUrl);
            if (normalized) urls.add(normalized);
        }
        return Array.from(urls);
    }

    /**
     * Extracts URLs from JavaScript content using basic regex for string literals.
     * This is inherently limited and will miss dynamically constructed URLs.
     * @param {string} jsString - The JavaScript content.
     * @param {string} baseUrl - The base URL for resolving relative paths.
     * @returns {Array<string>} - Array of found URLs.
     */
    function extractUrlsFromJs(jsString, baseUrl) {
        const urls = new Set();
        // Regex for URLs in single quotes, double quotes, and backticks.
        // Tries to capture common URL patterns: http(s)://..., //..., /...
        const regex = /(?:['"`])((?:https?:\/\/|\/\/|\/)[^\s"'`]+)(?:['"`])/g;
        let match;
        while ((match = regex.exec(jsString)) !== null) {
            const foundUrl = match[1];
            const normalized = normalizeUrl(foundUrl, baseUrl);
            if (normalized) urls.add(normalized);
        }
        return Array.from(urls);
    }

    /**
     * Fetches a URL and processes its content.
     * @param {object} urlObj - Object containing url and depth.
     * @param {string} urlObj.url - The URL to fetch.
     * @param {number} urlObj.depth - Current crawl depth.
     */
    async function crawlUrl(urlObj) {
        const { url, depth } = urlObj;

        // Re-check if URL is already processed (crawled or skipped)
        if (isProcessed(url)) {
            // Remove from pending/toCrawl if it somehow got re-queued or was processed by another branch
            uniqueDiscoveredUrls.sameOrigin.toCrawl.delete(url);
            uniqueDiscoveredUrls.sameOrigin.pending.delete(url);
            // console.log(`[${depth}] ⏩ Already processed (skipping fetch): ${url}`);
            return;
        }

        // It's genuinely being fetched, move from toCrawl to pending
        uniqueDiscoveredUrls.sameOrigin.toCrawl.delete(url);
        uniqueDiscoveredUrls.sameOrigin.pending.add(url);

        // Log if disallowed by robots.txt, but do not prevent crawling.
        if (isDisallowedByRobots(url)) {
            console.log(`[${depth}] ℹ️ Note: ${url} is disallowed by robots.txt, but still crawling as requested.`);
        }

        fetchesInFlight++;
        updateReportWindow(); // Update status immediately after starting a fetch

        try {
            console.log(`[${depth}] ⏳ Starting fetch for: ${url}`);
            const response = await fetch(url, { method: 'GET', redirect: 'follow' });
            fetchesInFlight--;

            uniqueDiscoveredUrls.sameOrigin.pending.delete(url); // Remove from pending

            if (!response.ok) {
                console.warn(`[${depth}] ⚠️ Failed to fetch ${url} (Status: ${response.status} ${response.statusText})`);
                // Consider adding to a 'failed' set if helpful for debugging
                return;
            }

            const contentType = response.headers.get('Content-Type');
            let content = '';
            let extracted = [];

            if (contentType && contentType.includes('text/html')) {
                content = await response.text();
                extracted = extractUrlsFromHtml(content, url);
                uniqueDiscoveredUrls.sameOrigin.html.add(url);
                console.log(`[${depth}] ✅ Crawled HTML: ${url} - Found ${extracted.length} URLs`);
            } else if (contentType && contentType.includes('text/css')) {
                content = await response.text();
                extracted = extractUrlsFromCss(content, url);
                uniqueDiscoveredUrls.sameOrigin.css.add(url);
                console.log(`[${depth}] ✅ Crawled CSS: ${url} - Found ${extracted.length} URLs`);
            } else if (contentType && (contentType.includes('application/javascript') || contentType.includes('text/javascript'))) {
                content = await response.text();
                extracted = extractUrlsFromJs(content, url);
                uniqueDiscoveredUrls.sameOrigin.js.add(url);
                console.log(`[${depth}] ✅ Crawled JS: ${url} - Found ${extracted.length} URLs (via regex, may be inaccurate)`);
            } else {
                // This case should primarily be for unskippable, non-parseable types like plain text files.
                // Skippable extensions are handled in addUrlToTracking now.
                console.log(`[${depth}] ℹ️ Fetched non-parseable content type for ${url}: ${contentType || 'unknown'}. Not extracting further links.`);
            }

            extracted.forEach(foundUrl => addUrlToTracking(foundUrl, depth));

        } catch (error) {
            fetchesInFlight--;
            uniqueDiscoveredUrls.sameOrigin.pending.delete(url); // Ensure it's removed from pending on error
            console.error(`[${depth}] ❌ Error fetching ${url}: ${error.message} (CORS or Network issue likely)`);
        } finally {
            updateReportWindow(); // Update status after every fetch completes
            processCrawlQueue(); // Continue processing after current fetch completes
        }
    }

    /**
     * Fetches and parses a sitemap.xml file.
     * @param {string} sitemapUrl - The URL of the sitemap.xml file.
     */
    async function fetchSitemap(sitemapUrl) {
        console.log(`🔎 Attempting to fetch sitemap: ${sitemapUrl}`);
        try {
            const response = await fetch(sitemapUrl);
            if (!response.ok) {
                console.warn(`⚠️ Failed to fetch sitemap ${sitemapUrl}: ${response.status} ${response.statusText}`);
                return;
            }
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            // Check for sitemap index (sitemap of sitemaps)
            const sitemapTags = xmlDoc.querySelectorAll('sitemap loc');
            if (sitemapTags.length > 0) {
                console.log(`🔗 Discovered sitemap index at ${sitemapUrl}. Fetching child sitemaps...`);
                for (const loc of sitemapTags) { // Use for...of for async inside loop
                    const childSitemapUrl = normalizeUrl(loc.textContent, sitemapUrl);
                    if (childSitemapUrl) {
                        await fetchSitemap(childSitemapUrl); // Await recursive call
                    }
                }
            }

            // Extract URLs from <loc> tags
            const urlTags = xmlDoc.querySelectorAll('url loc');
            if (urlTags.length > 0) {
                console.log(`📝 Adding ${urlTags.length} URLs from sitemap ${sitemapUrl} to queue.`);
                urlTags.forEach(loc => {
                    const foundUrl = normalizeUrl(loc.textContent);
                    if (foundUrl) {
                        addUrlToTracking(foundUrl, 1); // Treat sitemap URLs as depth 1
                    }
                });
            } else if (sitemapTags.length === 0) {
                console.log(`ℹ️ No URLs found in sitemap: ${sitemapUrl}`);
            }

        } catch (error) {
            console.error(`❌ Error parsing sitemap ${sitemapUrl}: ${error.message}`);
        }
    }

    /**
     * Fetches and parses a robots.txt file.
     * @param {string} robotsTxtUrl - The URL of the robots.txt file.
     */
    async function fetchRobotsTxt(robotsTxtUrl) {
        console.log(`🔎 Attempting to fetch robots.txt: ${robotsTxtUrl}`);
        try {
            const response = await fetch(robotsTxtUrl);
            if (!response.ok) {
                console.warn(`⚠️ Failed to fetch robots.txt ${robotsTxtUrl}: ${response.status} ${response.statusText}`);
                return;
            }
            const text = await response.text();
            const lines = text.split('\n');
            let userAgentMatch = false;

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) return; // Skip empty lines and comments

                const [key, value] = trimmedLine.split(':', 2).map(s => s.trim());

                if (key.toLowerCase() === 'user-agent') {
                    if (value === '*' || value.toLowerCase() === 'your-crawler-name') { // You can define your user-agent
                        userAgentMatch = true;
                    } else {
                        userAgentMatch = false; // Reset if this user-agent doesn't match
                    }
                } else if (userAgentMatch && key.toLowerCase() === 'disallow') {
                    if (value && value !== '/') { // Don't disallow root, but capture specific paths
                        robotsTxtDisallowRules.push(value);
                        console.log(`🚫 Robots.txt Disallow rule logged: ${value}`);
                    }
                } else if (key.toLowerCase() === 'sitemap') {
                    const sitemapUrl = normalizeUrl(value);
                    if (sitemapUrl) {
                        console.log(`🔗 Discovered sitemap from robots.txt: ${sitemapUrl}`);
                        fetchSitemap(sitemapUrl); // Immediately fetch discovered sitemaps
                    }
                }
            });
            console.log(`✅ Finished processing robots.txt. Disallow rules stored for info: ${robotsTxtDisallowRules.length}`);

        } catch (error) {
            console.error(`❌ Error fetching or parsing robots.txt ${robotsTxtUrl}: ${error.message}`);
        }
    }

    /**
     * Processes the crawl queue, respecting concurrency limits.
     */
    async function processCrawlQueue() {
        updateReportWindow(); // Update status frequently

        while (crawlQueue.length > 0 && fetchesInFlight < MAX_CONCURRENT_FETCHES) {
            const nextUrl = crawlQueue.shift();
            // Check 'isProcessed' BEFORE starting a fetch for an item from queue
            // This prevents fetching a URL that might have been processed by another concurrent
            // crawl in the brief moment between it being added to the queue and its turn coming up.
            if (!isProcessed(nextUrl.url)) {
                 crawlUrl(nextUrl); // Don't await here, allow concurrent execution
            } else {
                 // console.log(`[${nextUrl.depth}] ⏩ Already processed (skipping queue item): ${nextUrl.url}`);
                 updateReportWindow(); // Still update to reflect queue reduction
            }
        }

        // If queue is empty and no fetches are in flight, we're done
        if (crawlQueue.length === 0 && fetchesInFlight === 0 && uniqueDiscoveredUrls.sameOrigin.pending.size === 0) {
            clearInterval(updateIntervalId);
            console.log("\n%c-------------------------------------", "color: #4CAF50;");
            console.log("%c🎉 Crawling Complete!", "font-size: 18px; font-weight: bold; color: #4CAF50;");
            updateReportWindow(true); // Final update
        }
    }

    // --- Report Window Management ---

    function openReportWindow() {
        reportWindow = window.open('', '_blank', `width=${REPORT_WINDOW_WIDTH},height=${REPORT_WINDOW_HEIGHT},scrollbars=yes,resizable=yes`);
        if (!reportWindow) {
            console.error("Pop-up window blocked! Please allow pop-ups for this site to see the report in a new window.");
            return;
        }

        reportWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>URL Discovery Report - ${currentOrigin}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f4f7f6; color: #333; }
                    h1 { color: #2C3E50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; margin-bottom: 20px; }
                    h2 { color: #34495E; margin-top: 30px; border-bottom: 1px dashed #CCC; padding-bottom: 5px; }
                    .status-box { background-color: #e0e0e0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 1.1em; display: flex; flex-wrap: wrap; justify-content: space-around; }
                    .status-item { flex: 1 1 200px; text-align: center; margin: 5px; padding: 10px; background-color: #fff; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .status-label { font-size: 0.9em; color: #555; }
                    .status-value { font-size: 1.5em; font-weight: bold; color: #4CAF50; }
                    #progress-bar-container { width: 100%; background-color: #ddd; border-radius: 5px; height: 25px; margin-top: 15px; overflow: hidden; }
                    #progress-bar { height: 100%; width: 0%; background-color: #4CAF50; text-align: center; line-height: 25px; color: white; border-radius: 5px; transition: width 0.3s ease-in-out; }
                    ul { list-style-type: none; padding: 0; }
                    li { margin-bottom: 5px; padding: 8px; background-color: #fff; border-left: 5px solid; border-color: #e0e0e0; word-wrap: break-word; }
                    li a { text-decoration: none; color: #333; display: block; }
                    li a:hover { color: #007bff; }

                    /* Color coding for list items based on type */
                    li.type-html { border-color: #28a745; } /* Green */
                    li.type-css { border-color: #17a2b8; } /* Cyan */
                    li.type-js { border-color: #ffc107; } /* Yellow */
                    li.type-image { border-color: #6f42c1; } /* Purple */
                    li.type-media { border-color: #fd7e14; } /* Orange */
                    li.type-document { border-color: #20c997; } /* Teal */
                    li.type-font { border-color: #6c757d; } /* Grey */
                    li.type-archive { border-color: #343a40; } /* Dark Grey */
                    li.type-data { border-color: #e83e8c; } /* Pink */
                    li.type-other { border-color: #dc3545; } /* Red */
                    li.type-cross-origin { border-color: #007bff; } /* Blue */
                    li.type-pending { border-color: #6c757d; } /* Grey for pending/to crawl */

                    .url-list-container { max-height: 600px; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 5px; background-color: #fafafa; margin-bottom: 20px;}
                    .category-heading { font-weight: bold; margin-top: 15px; margin-bottom: 5px; color: #555; border-bottom: 1px dotted #ccc; padding-bottom: 2px;}
                    footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #CCC; color: #777; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <h1>URL Discovery Report for <br/> <small>${currentOrigin}</small></h1>
                <div class="status-box">
                    <div class="status-item"><div class="status-value" id="totalDiscovered">0</div><div class="status-label">Total Unique Discovered</div></div>
                    <div class="status-item"><div class="status-value" id="sameOriginCrawled">0</div><div class="status-label">Same-Origin Crawled (HTML/CSS/JS)</div></div>
                    <div class="status-item"><div class="status-value" id="sameOriginSkipped">0</div><div class="status-label">Same-Origin Skipped (Non-crawlable)</div></div>
                    <div class="status-item"><div class="status-value" id="crossOriginCount">0</div><div class="status-label">Cross-Origin (Logged)</div></div>
                    <div class="status-item"><div class="status-value" id="sameOriginToCrawlPending">0</div><div class="status-label">Same-Origin Queued / In-Flight</div></div>
                </div>
                <div id="progress-bar-container"><div id="progress-bar">0%</div></div>

                <h2>Same-Origin URLs (Crawled & Skipped)</h2>
                <div class="url-list-container"><ul id="sameOriginAllList"></ul></div>

                <h2>Same-Origin URLs (Currently Queued / In-Flight)</h2>
                <div class="url-list-container"><ul id="sameOriginToCrawlPendingList"></ul></div>

                <h2>Cross-Origin URLs (Logged Only)</h2>
                <div class="url-list-container"><ul id="crossOriginList"></ul></div>

                <footer>Generated by Browser URL Crawler Tool - ${new Date().toLocaleString()}</footer>
            </body>
            </html>
        `);
        reportWindow.document.close(); // Close the document to ensure content is rendered

        // Initialize all text content in the new window
        reportWindow.document.getElementById('totalDiscovered').textContent = '0';
        reportWindow.document.getElementById('sameOriginCrawled').textContent = '0';
        reportWindow.document.getElementById('sameOriginSkipped').textContent = '0';
        reportWindow.document.getElementById('crossOriginCount').textContent = '0';
        reportWindow.document.getElementById('sameOriginToCrawlPending').textContent = '0';
        reportWindow.document.getElementById('progress-bar').style.width = '0%';
        reportWindow.document.getElementById('progress-bar').textContent = '0%';

        // Initialize _prevCount properties for performance optimization (differential update)
        reportWindow.document.getElementById('sameOriginCrawled')._prevCount = -1;
        reportWindow.document.getElementById('sameOriginSkipped')._prevCount = -1;
        reportWindow.document.getElementById('sameOriginToCrawlPending')._prevCount = -1;
        reportWindow.document.getElementById('crossOriginCount')._prevCount = -1;
    }

    /**
     * Creates a new list item (li) element for a URL.
     * @param {string} url - The URL string.
     * @param {string} className - The CSS class for the list item.
     * @returns {HTMLLIElement} The created list item element.
     */
    function createUrlListItem(url, className) {
        const li = reportWindow.document.createElement('li');
        li.classList.add(className);
        const a = reportWindow.document.createElement('a');
        a.href = url;
        a.target = '_blank'; // Open in new tab
        a.rel = 'noopener noreferrer'; // Security best practice
        a.textContent = url;
        li.appendChild(a);
        return li;
    }

    /**
     * Formats a category name for display.
     * @param {string} category - The raw category name.
     * @returns {string} The formatted category name.
     */
    const formatCategoryName = (category) => {
        const nameMap = {
            html: 'HTML Pages',
            css: 'CSS Files',
            js: 'JavaScript Files',
            image: 'Images',
            media: 'Media Files',
            document: 'Document Files',
            font: 'Font Files',
            archive: 'Archive Files',
            data: 'Data Files (e.g., JSON)',
            other: 'Other Skipped Files',
        };
        return nameMap[category] || category.charAt(0).toUpperCase() + category.slice(1) + ' Files';
    };

    /**
     * Updates a list element with URLs from a Set, using differential updates.
     * @param {string} ulId - The ID of the <ul> element.
     * @param {Set<string>} currentSet - The current set of URLs.
     * @param {string} className - The base CSS class for list items.
     * @param {Map<string, HTMLLIElement>} domMap - The map storing URL-to-LI element references.
     * @param {Function} [getCategoryFunc] - Optional function to get category for categorized list.
     */
    function updateListEfficiently(ulId, currentSet, className, domMap, getCategoryFunc = null) {
        const ul = reportWindow.document.getElementById(ulId);
        if (!ul) {
            console.error(`List element with ID '${ulId}' not found.`);
            return;
        }

        const newUrls = new Set();
        const urlsToRemove = new Set(domMap.keys()); // Assume all current are to be removed, then unmark

        // Process currentSet: add new, unmark existing
        Array.from(currentSet).sort().forEach(url => {
            if (!domMap.has(url)) {
                newUrls.add(url);
            }
            urlsToRemove.delete(url); // This URL is still present
        });

        // Remove old elements from DOM and map
        urlsToRemove.forEach(url => {
            const li = domMap.get(url);
            if (li) {
                li.remove();
                domMap.delete(url);
            }
        });

        // Add new elements to DOM and map
        if (getCategoryFunc) { // For categorized lists (e.g., Same-Origin Crawled & Skipped)
            const categoryHeadings = new Map(); // Store references to category heading LIs

            // Build or update category headings
            for (const category of ALL_SAME_ORIGIN_LIST_CATEGORIES) {
                const headingText = formatCategoryName(category);
                let headingLi = Array.from(ul.children).find(child => child.classList.contains('category-heading') && child.textContent === headingText);

                if (!headingLi) {
                    headingLi = reportWindow.document.createElement('li');
                    headingLi.className = 'category-heading';
                    headingLi.textContent = headingText;
                    ul.appendChild(headingLi); // Add it, then sort will place it correctly later
                }
                categoryHeadings.set(category, headingLi);
            }

            Array.from(newUrls).sort().forEach(url => {
                const category = getCategoryFunc(url);
                if (category) {
                    const li = createUrlListItem(url, `type-${category}`);
                    domMap.set(url, li);

                    // Find the correct insertion point to maintain sorted order within category
                    const categoryHeading = categoryHeadings.get(category);
                    if (categoryHeading) {
                        let inserted = false;
                        let nextSibling = categoryHeading.nextElementSibling;
                        while (nextSibling && !nextSibling.classList.contains('category-heading')) {
                            if (nextSibling.textContent > url) {
                                categoryHeading.parentNode.insertBefore(li, nextSibling);
                                inserted = true;
                                break;
                            }
                            nextSibling = nextSibling.nextElementSibling;
                        }
                        if (!inserted) {
                            // If no smaller URL found or no more elements in category, append
                            if (nextSibling) {
                                categoryHeading.parentNode.insertBefore(li, nextSibling);
                            } else {
                                categoryHeading.parentNode.appendChild(li);
                            }
                        }
                    } else {
                        ul.appendChild(li); // Fallback if heading not found
                    }
                }
            });
            // Re-sort all list items to ensure categories are in order
            // This is a more heavy DOM operation but necessary for categorized lists
            // only if categories or their contents change order significantly.
            // For now, we rely on inserting into correct position.
            // A full re-sort of `ul.children` can be done if visual order breaks:
            // const sortedChildren = Array.from(ul.children).sort((a, b) => {
            //     if (a.classList.contains('category-heading') && !b.classList.contains('category-heading')) return -1;
            //     if (!a.classList.contains('category-heading') && b.classList.contains('category-heading')) return 1;
            //     return a.textContent.localeCompare(b.textContent);
            // });
            // sortedChildren.forEach(child => ul.appendChild(child));

        } else { // For simple lists (e.g., Queued/In-Flight, Cross-Origin)
            Array.from(newUrls).sort().forEach(url => {
                const li = createUrlListItem(url, className);
                domMap.set(url, li);

                // Find insertion point to maintain sorted order
                let inserted = false;
                let currentChild = ul.firstChild;
                while (currentChild) {
                    if (currentChild.textContent > url) {
                        ul.insertBefore(li, currentChild);
                        inserted = true;
                        break;
                    }
                    currentChild = currentChild.nextSibling;
                }
                if (!inserted) {
                    ul.appendChild(li); // Append if it's the largest or list is empty
                }
            });
        }
    }


    function updateReportWindow(final = false) {
        if (!reportWindow || reportWindow.closed) {
            return;
        }

        const totalCrawledAndParseable = uniqueDiscoveredUrls.sameOrigin.html.size + uniqueDiscoveredUrls.sameOrigin.css.size + uniqueDiscoveredUrls.sameOrigin.js.size;
        const totalSkipped = Object.values(uniqueDiscoveredUrls.sameOrigin.skipped).reduce((sum, set) => sum + set.size, 0);
        const totalSameOriginToCrawlPending = uniqueDiscoveredUrls.sameOrigin.toCrawl.size + uniqueDiscoveredUrls.sameOrigin.pending.size;

        const totalSameOriginPotential = totalCrawledAndParseable + totalSkipped + totalSameOriginToCrawlPending;
        const percentage = totalSameOriginPotential > 0 ? (((totalCrawledAndParseable + totalSkipped) / totalSameOriginPotential) * 100).toFixed(1) : 0;

        const totalUniqueDiscovered = totalSameOriginPotential + uniqueDiscoveredUrls.crossOrigin.size;

        // Update top-level counters
        reportWindow.document.getElementById('totalDiscovered').textContent = totalUniqueDiscovered;
        reportWindow.document.getElementById('sameOriginCrawled').textContent = totalCrawledAndParseable;
        reportWindow.document.getElementById('sameOriginSkipped').textContent = totalSkipped;
        reportWindow.document.getElementById('crossOriginCount').textContent = uniqueDiscoveredUrls.crossOrigin.size;
        reportWindow.document.getElementById('sameOriginToCrawlPending').textContent = totalSameOriginToCrawlPending;

        // Update progress bar
        const progressBar = reportWindow.document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
        }

        // Differential update for lists
        // Same-Origin Crawled & Skipped List
        const allSameOriginProcessed = new Set();
        uniqueDiscoveredUrls.sameOrigin.html.forEach(url => allSameOriginProcessed.add(url));
        uniqueDiscoveredUrls.sameOrigin.css.forEach(url => allSameOriginProcessed.add(url));
        uniqueDiscoveredUrls.sameOrigin.js.forEach(url => allSameOriginProcessed.add(url));
        for (const category in uniqueDiscoveredUrls.sameOrigin.skipped) {
            uniqueDiscoveredUrls.sameOrigin.skipped[category].forEach(url => allSameOriginProcessed.add(url));
        }

        const getProcessedUrlCategory = (url) => {
            if (uniqueDiscoveredUrls.sameOrigin.html.has(url)) return 'html';
            if (uniqueDiscoveredUrls.sameOrigin.css.has(url)) return 'css';
            if (uniqueDiscoveredUrls.sameOrigin.js.has(url)) return 'js';
            for (const category in uniqueDiscoveredUrls.sameOrigin.skipped) {
                if (uniqueDiscoveredUrls.sameOrigin.skipped[category].has(url)) return category;
            }
            return 'other'; // Should not happen if logic is correct
        };
        updateListEfficiently('sameOriginAllList', allSameOriginProcessed, '', DOM_ELEMENT_MAPS.sameOriginAllList, getProcessedUrlCategory);


        // Same-Origin Queued / In-Flight List
        const combinedToCrawlPending = new Set([...Array.from(uniqueDiscoveredUrls.sameOrigin.toCrawl), ...Array.from(uniqueDiscoveredUrls.sameOrigin.pending)]);
        updateListEfficiently('sameOriginToCrawlPendingList', combinedToCrawlPending, 'type-pending', DOM_ELEMENT_MAPS.sameOriginToCrawlPendingList);

        // Cross-Origin List
        updateListEfficiently('crossOriginList', uniqueDiscoveredUrls.crossOrigin, 'type-cross-origin', DOM_ELEMENT_MAPS.crossOriginList);
    }

    // --- Initial Discovery and Start ---

    // Open the report window
    openReportWindow();
    updateIntervalId = setInterval(() => updateReportWindow(), REPORT_UPDATE_INTERVAL_MS); // Update every 1 second for live feel

    // Start with the current page's URL
    addUrlToTracking(window.location.href, 0);

    // Initial scan of the current document's HTML
    const initialUrls = extractUrlsFromHtml(document.documentElement.outerHTML, window.location.href);
    initialUrls.forEach(url => addUrlToTracking(url, 0));

    // Discover robots.txt and sitemaps from common locations
    // Await these to ensure sitemap/robots.txt URLs are in the queue before main crawling starts
    await fetchRobotsTxt(normalizeUrl(ROBOTS_TXT_PATH, currentOrigin));
    for (const path of SITEMAP_LOCATIONS) {
        await fetchSitemap(normalizeUrl(path, currentOrigin));
    }


    // Start processing the queue after initial discovery
    processCrawlQueue();

    // --- Public API for Console Access ---
    // You can access these in the console after running the script
    window.urlCrawlerResults = {
        uniqueDiscoveredUrls,
        crawlQueue,
        robotsTxtDisallowRules,
        getStats: () => {
            const totalCrawledAndParseable = uniqueDiscoveredUrls.sameOrigin.html.size + uniqueDiscoveredUrls.sameOrigin.css.size + uniqueDiscoveredUrls.sameOrigin.js.size;
            const totalSkipped = Object.values(uniqueDiscoveredUrls.sameOrigin.skipped).reduce((sum, set) => sum + set.size, 0);
            const totalSameOriginToCrawlPending = uniqueDiscoveredUrls.sameOrigin.toCrawl.size + uniqueDiscoveredUrls.sameOrigin.pending.size;
            const totalSameOriginPotential = totalCrawledAndParseable + totalSkipped + totalSameOriginToCrawlPending;
            const totalUniqueDiscovered = totalSameOriginPotential + uniqueDiscoveredUrls.crossOrigin.size;
            const percentage = totalSameOriginPotential > 0 ? (((totalCrawledAndParseable + totalSkipped) / totalSameOriginPotential) * 100).toFixed(1) : 0;

            return {
                totalUniqueDiscovered: totalUniqueDiscovered,
                sameOriginCrawledHtml: uniqueDiscoveredUrls.sameOrigin.html.size,
                sameOriginCrawledCss: uniqueDiscoveredUrls.sameOrigin.css.size,
                sameOriginCrawledJs: uniqueDiscoveredUrls.sameOrigin.js.size,
                sameOriginToCrawl: uniqueDiscoveredUrls.sameOrigin.toCrawl.size,
                sameOriginPending: uniqueDiscoveredUrls.sameOrigin.pending.size,
                sameOriginSkipped: totalSkipped,
                sameOriginSkippedBreakdown: {
                    images: uniqueDiscoveredUrls.sameOrigin.skipped.image.size,
                    media: uniqueDiscoveredUrls.sameOrigin.skipped.media.size,
                    documents: uniqueDiscoveredUrls.sameOrigin.skipped.document.size,
                    fonts: uniqueDiscoveredUrls.sameOrigin.skipped.font.size,
                    archives: uniqueDiscoveredUrls.sameOrigin.skipped.archive.size,
                    data: uniqueDiscoveredUrls.sameOrigin.skipped.data.size,
                    other: uniqueDiscoveredUrls.sameOrigin.skipped.other.size,
                },
                crossOriginOnlyLogged: uniqueDiscoveredUrls.crossOrigin.size,
                crawlQueueSize: crawlQueue.length,
                fetchesInFlight: fetchesInFlight,
                completionPercentage: `${percentage}%`,
                robotsTxtDisallowRulesCount: robotsTxtDisallowRules.length
            };
        },
        // Function to explicitly add a URL to the crawl queue from console
        addUrl: (url) => {
            console.log(`Manually adding URL: ${url}`);
            addUrlToTracking(url, 1); // Add with depth 1
            processCrawlQueue();
        }
    };
    console.log("\n%cTool loaded. Use 'window.urlCrawlerResults' in console for detailed data.", "color: #1a73e8;");
    console.log("You can also view the live report in the new pop-up window (if not blocked).");

})();
