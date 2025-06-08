javascript:(function(){
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
        alert('Please allow pop-ups for this site to see the links.');
        return;
    }
    const lines = document.body.innerText.split('\n');
    const baseUrl = window.location.origin;
    let links = { allow: [], disallow: [], sitemap: [] };

    lines.forEach(line => {
        const parts = line.split(/:(.*)/s);
        const directive = parts[0] ? parts[0].trim().toLowerCase() : '';
        let path = parts[1] ? parts[1].trim() : '';
        
        if (!path || line.trim().startsWith('#')) return;

        if (links.hasOwnProperty(directive)) {
            let url = path;
            if (directive !== 'sitemap') {
                let linkPath = path.endsWith('*') ? path.slice(0, -1) : path;
                url = baseUrl + linkPath;
            }
            links[directive].push({ url: url, path: path });
        }
    });

    let html = `
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2em; background-color: #fdfdfd; }
            h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; color: #333; margin-bottom: 1.5em;}
            h2 {
                grid-column: 1 / -1; /* Make heading span all columns */
                color: #555;
                border-bottom: 1px solid #eee;
                padding-bottom: 8px;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
            }
            .allow-header { color: #28a745; }
            .disallow-header { color: #dc3545; }
            .sitemap-header { color: #17a2b8; }
            a { color: #007bff; text-decoration: none; word-break: break-all; }
            a:hover { text-decoration: underline; }
            .link-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 1em 1.5em;
            }
            .item {
                padding: 10px;
                background: #fff;
                border: 1px solid #eee;
                border-radius: 5px;
                line-height: 1.5;
            }
            .path { 
                font-family: monospace; 
                font-size: 0.85em;
                display: block;
                margin-top: 4px;
                text-transform: capitalize;
            }
            .path-allow { color: #28a745; }
            .path-disallow { color: #dc3545; }
            .path-sitemap { color: #17a2b8; }
        </style>
        <h1>Clickable Robots.txt Paths</h1>
        <div class="link-grid">`;

    if (links.allow.length > 0) {
        html += `<h2 class="allow-header">Allowed (${links.allow.length})</h2>`;
        links.allow.forEach(link => {
            html += `<div class="item">
                        <a href="${link.url}" target="_blank">${link.url}</a>
                        <span class="path path-allow">Allow: ${link.path}</span>
                    </div>`;
        });
    }

    if (links.disallow.length > 0) {
        html += `<h2 class="disallow-header">Disallowed (${links.disallow.length})</h2>`;
        links.disallow.forEach(link => {
            html += `<div class="item">
                        <a href="${link.url}" target="_blank">${link.url}</a>
                        <span class="path path-disallow">Disallow: ${link.path}</span>
                    </div>`;
        });
    }

    if (links.sitemap.length > 0) {
        html += `<h2 class="sitemap-header">Sitemaps (${links.sitemap.length})</h2>`;
        links.sitemap.forEach(link => {
            html += `<div class="item">
                        <a href="${link.url}" target="_blank">${link.url}</a>
                        <span class="path path-sitemap">Sitemap: ${link.path}</span>
                    </div>`;
        });
    }
    
    html += `</div>`;
    newWindow.document.write(html);
    newWindow.document.close();
})();
