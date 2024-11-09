javascript:(function() {
    // CSS for the control panel and gallery
    const css = `
        .url-tools-panel {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #fff;
            border: 1px solid #ccc;
            padding: 10px;
            z-index: 999999;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .url-tools-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            padding: 10px;
            background: #f5f5f5;
            margin-bottom: 20px;
        }
        .url-tools-gallery img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
        }
    `;

    // Add CSS to page
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Create control panel
    const panel = document.createElement('div');
    panel.className = 'url-tools-panel';
    panel.innerHTML = `
        <button onclick="window.urlTools.makeLinks()">Convert URLs to Links</button>
        <button onclick="window.urlTools.makeImages()">Show Images</button>
        <button onclick="window.urlTools.makeGallery()">Create Gallery</button>
    `;
    document.body.appendChild(panel);

    // URL patterns
    const urlPatterns = [
        // Basic URL pattern
        /https?:\/\/[^\s<>"']+/g,
        
        // URLs with query parameters
        /https?:\/\/[^\s<>"']+\?[^\s<>"']+/g,
        
        // URLs with fragments
        /https?:\/\/[^\s<>"']+#[^\s<>"']+/g,
        
        // Image URLs with dimensions and parameters
        /https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<>"']+)?/gi,
        
        // CDN URLs with various parameters
        /https?:\/\/[^\s<>"']+\/cdn\/[^\s<>"']+/g
    ];

    // Image URL patterns
    const imagePatterns = [
        /\.(jpg|jpeg|png|gif|webp)(\?[^"\s<>]+)?/i,
        /\/cdn\/shop\/files\/[^"\s<>]+/i,
        /\.(jpg|jpeg|png|gif|webp).*?(?:width|height)=[^"\s<>]+/i
    ];

    // Helper function to extract unique URLs from text
    function extractUrls(text) {
        const urls = new Set();
        urlPatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(url => urls.add(url));
        });
        return Array.from(urls);
    }

    // Helper function to check if URL is an image
    function isImageUrl(url) {
        return imagePatterns.some(pattern => pattern.test(url));
    }

    // Clean URL function
    function cleanUrl(url) {
        // Remove any trailing commas, periods, or other punctuation
        return url.replace(/[,.\s]+$/, '');
    }

    // Extract largest image URL from responsive image URL set
    function getLargestImageUrl(url) {
        const widthMatches = url.match(/width=(\d+)/g);
        if (widthMatches && widthMatches.length > 0) {
            const widths = widthMatches.map(w => parseInt(w.replace('width=', '')));
            const maxWidth = Math.max(...widths);
            const baseUrl = url.split('?')[0];
            return `${baseUrl}?width=${maxWidth}`;
        }
        return url;
    }

    window.urlTools = {
        // Convert text URLs to clickable links
        makeLinks: function() {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const nodesToReplace = [];
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (node.parentElement && !['SCRIPT', 'STYLE', 'A'].includes(node.parentElement.tagName)) {
                    const urls = extractUrls(node.textContent);
                    if (urls.length > 0) {
                        nodesToReplace.push({node, urls});
                    }
                }
            }

            nodesToReplace.forEach(({node, urls}) => {
                let html = node.textContent;
                urls.forEach(url => {
                    const cleanedUrl = cleanUrl(url);
                    html = html.replace(
                        url,
                        `<a href="${cleanedUrl}" target="_blank">${cleanedUrl}</a>`
                    );
                });
                const span = document.createElement('span');
                span.innerHTML = html;
                node.parentNode.replaceChild(span, node);
            });
        },

        // Convert image URLs to actual images
        makeImages: function() {
            const links = document.getElementsByTagName('a');
            Array.from(links).forEach(link => {
                const url = link.href;
                if (isImageUrl(url)) {
                    const img = document.createElement('img');
                    img.src = getLargestImageUrl(url);
                    img.style.maxWidth = '200px';
                    link.parentNode.insertBefore(img, link.nextSibling);
                }
            });
        },

        // Create image gallery at top of page
        makeGallery: function() {
            const gallery = document.createElement('div');
            gallery.className = 'url-tools-gallery';
            
            const links = document.getElementsByTagName('a');
            const imageUrls = new Set();
            
            Array.from(links).forEach(link => {
                const url = link.href;
                if (isImageUrl(url)) {
                    imageUrls.add(getLargestImageUrl(url));
                }
            });

            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                const wrapper = document.createElement('a');
                wrapper.href = url;
                wrapper.target = '_blank';
                wrapper.appendChild(img);
                gallery.appendChild(wrapper);
            });

            if (imageUrls.size > 0) {
                document.body.insertBefore(gallery, document.body.firstChild);
            }
        }
    };
})();
