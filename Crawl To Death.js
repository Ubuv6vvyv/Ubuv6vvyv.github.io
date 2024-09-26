    !function() {
    let e = {
        maxDepth: 3,
        maxConcurrentRequests: 5,
        rateLimitDelay: 100,
        imageExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
        mediaExtensions: [".mp4", ".webm", ".ogg", ".mp3", ".wav"],
        thumbnailSize: 50
    },
    t = {
        visited: new Set,
        htmlOutput: "",
        baseUrl: new URL(window.location.href),
        activeRequests: 0,
        isPaused: !1,
        totalLinks: 0,
        processedLinks: 0,
        filterKeyword: "",
        sitemap: {},
        uniqueLinks: new Set,
        uniqueImages: new Set,
        uniqueMedia: new Set
    };

    function i(e) {
        let t = document.getElementById("log");
        t && (t.innerHTML += e + "<br>", t.scrollTop = t.scrollHeight), console.log(e)
    }

    async function a(e, t = 1e4) {
        let a = new AbortController,
            n = setTimeout(() => a.abort(), t);
        try {
            let r = await fetch(e, {
                method: "GET",
                signal: a.signal
            });
            if (clearTimeout(n), !r.ok) throw Error(`HTTP error! Status: ${r.status}`);
            return await r.text()
        } catch (l) {
            return i(`Failed to fetch ${e}: ${l.message}`), null
        }
    }

    function n(e, t) {
        let a = new Set,
            n = new Set,
            r = new Set;
        e.querySelectorAll("a").forEach(e => {
            try {
                let n = new URL(e.href, t).href;
                a.add(n)
            } catch (r) {
                i(`Invalid URL: ${e.href}`)
            }
        });
        e.querySelectorAll("img").forEach(e => {
            try {
                let a = new URL(e.src, t).href;
                n.add(a)
            } catch (r) {
                i(`Invalid image URL: ${e.src}`)
            }
        });
        e.querySelectorAll("video, audio").forEach(e => {
            try {
                let a = new URL(e.src, t).href;
                r.add(a)
            } catch (n) {
                i(`Invalid media URL: ${e.src}`)
            }
        });
        return {
            links: Array.from(a),
            images: Array.from(n),
            media: Array.from(r)
        }
    }

    function r(e, t, i, a, n) {
        return `
            <h3><a href="${e}" target="_blank">${t}</a> - <small>${e}</small></h3>
            <table>
                <tr>
                    <th>Links (${i.length})</th>
                    <th>Images (${a.length}) <button onclick="downloadAllImages('${e}')">Download All Images</button></th>
                    <th>Media (${n.length})</th>
                </tr>
                <tr>
                    <td><ul>${i.map(e => `<li><a href="${e}" target="_blank">${e}</a></li>`).join("")}</ul></td>
                    <td><ul>${a.map(e => `<li><img src="${e}" class="thumbnail" alt="Thumbnail"><a href="${e}" target="_blank">${e}</a></li>`).join("")}</ul></td>
                    <td><ul>${n.map(e => `<li><div class="media-icon"></div><a href="${e}" target="_blank">${e}</a></li>`).join("")}</ul></td>
                </tr>
            </table>
        `
    }

    async function l(o, s = 0) {
        if (s > e.maxDepth || t.visited.has(o)) return;
        for (; t.isPaused;) await new Promise(e => setTimeout(e, 1e3));
        t.visited.add(o);
        i(`Crawling: ${o}`);
        let d;
        if (o === window.location.href) d = document;
        else {
            for (; t.activeRequests >= e.maxConcurrentRequests;) await new Promise(e => setTimeout(e, 100));
            t.activeRequests++;
            let c = await a(o);
            t.activeRequests--;
            if (!c) return;
            let u = new DOMParser;
            d = u.parseFromString(c, "text/html")
        }
        let h = d.title || "No Title",
            {
                links: p,
                images: g,
                media: m
            } = n(d, t.baseUrl);
        
        let uniquePageLinks = p.filter(link => !t.uniqueLinks.has(link));
        let uniquePageImages = g.filter(img => !t.uniqueImages.has(img));
        let uniquePageMedia = m.filter(media => !t.uniqueMedia.has(media));
        
        uniquePageLinks.forEach(link => t.uniqueLinks.add(link));
        uniquePageImages.forEach(img => t.uniqueImages.add(img));
        uniquePageMedia.forEach(media => t.uniqueMedia.add(media));

        if (t.filterKeyword && !h.toLowerCase().includes(t.filterKeyword.toLowerCase())) return;
        
        let f = r(o, h, uniquePageLinks, uniquePageImages, uniquePageMedia),
            w = document.getElementById("crawlResults");
        if (w) {
            w.innerHTML += f;
        }
        
        t.sitemap[o] = {
            links: uniquePageLinks,
            images: uniquePageImages,
            media: uniquePageMedia
        };
        
        t.processedLinks++;
        let progressPercentage = t.processedLinks / t.totalLinks * 100,
            progressBar = document.getElementById("progressBarFill");
        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
            progressBar.textContent = `${Math.round(progressPercentage)}%`;
        }
        
        for (let b of uniquePageLinks) {
            if (new URL(b).hostname === t.baseUrl.hostname) {
                t.totalLinks++;
                await new Promise(t => setTimeout(t, e.rateLimitDelay));
                await l(b, s + 1);
            }
        }
    }

    window.startCrawl = async function() {
        let e = document.getElementById("startUrl"),
            a = e ? e.value : t.baseUrl.href;
        i(`Starting crawl from ${a}`), t.baseUrl = new URL(a), t.totalLinks = 1, t.processedLinks = 0, t.visited.clear();
        let n = document.getElementById("crawlResults");
        n && (n.innerHTML = ""), await l(a), i("Crawling complete.")
    };
    
    window.scanCurrentPage = function() {
        i("Scanning current page...");
        let {
            links: e,
            images: t,
            media: a
        } = n(document, window.location.href), l = r(window.location.href, document.title, e, t, a), o = document.getElementById("crawlResults");
        o && (o.innerHTML = l), i("Current page scan complete.")
    };
    
    window.togglePause = function() {
        t.isPaused = !t.isPaused, i(t.isPaused ? "Crawl paused" : "Crawl resumed")
    };
    
    window.setFilter = function(e) {
        t.filterKeyword = e,
            function e() {
                let i = document.getElementById("crawlResults");
                if (!i) return;
                let a = i.getElementsByTagName("*");
                for (let n of a) n.textContent.toLowerCase().includes(t.filterKeyword.toLowerCase()) ? n.style.display = "" : n.style.display = "none"
            }()
    };
    
    window.updateConfig = function(t, a) {
        e[t] = parseInt(a, 10), i(`Updated ${t} to ${a}`)
    };
    
    window.exportData = function(e) {
        let i;
        "json" === e ? i = JSON.stringify(t.sitemap, null, 2) : "csv" === e && (i = "Source,Target,Type\n", Object.entries(t.sitemap).forEach(([e, t]) => {
            t.links.forEach(t => i += `${e},${t},link\n`), t.images.forEach(t => i += `${e},${t},image\n`), t.media.forEach(t => i += `${e},${t},media\n`)
        }));
        let a = new Blob([i], {
                type: "json" === e ? "application/json" : "text/csv"
            }),
            n = window.URL.createObjectURL(a),
            r = document.createElement("a");
        r.style.display = "none", r.href = n, r.download = `crawl-output.${e}`, document.body.appendChild(r), r.click(), window.URL.revokeObjectURL(n)
    };

    window.downloadAllImages = async function(pageUrl) {
        i(`Downloading images for ${pageUrl}`);
        let images = t.sitemap[pageUrl].images;
        if (images.length === 0) {
            i("No images found for this page.");
            return;
        }

        let zip = new JSZip();
        let folder = zip.folder("images");

        for (let imgUrl of images) {
            try {
                let response = await fetch(imgUrl);
                let blob = await response.blob();
                let filename = imgUrl.split('/').pop();
                folder.file(filename, blob);
            } catch (error) {
                i(`Failed to download ${imgUrl}: ${error.message}`);
            }
        }

        zip.generateAsync({type:"blob"}).then(function(content) {
            let zipUrl = URL.createObjectURL(content);
            let a = document.createElement("a");
            a.href = zipUrl;
            a.download = `images_${pageUrl.replace(/[^a-z0-9]/gi, '_')}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(zipUrl);
        });
    };

    (function createUI() {
        let r = document.createElement("div");
        r.innerHTML = `
            <html>
                <head>
                    <title>Enhanced Crawl and Scan Output</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h3 { margin-bottom: 0; }
                        ul { margin-top: 0; list-style-type: none; padding-left: 0; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        #progressBar { width: 100%; background: #f2f2f2; }
                        #progressBarFill { width: 0; height: 30px; background: #4caf50; text-align: center; color: white; }
                        .thumbnail { width: ${e.thumbnailSize}px; height: ${e.thumbnailSize}px; }
                        .media-icon { display: inline-block; width: ${e.thumbnailSize}px; height: ${e.thumbnailSize}px; background-color: #ddd; text-align: center; line-height: ${e.thumbnailSize}px; }
                    </style>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js"></script>
                </head>
                <body>
                    <div class="controls">
                        <h2>Crawler Controls</h2>
                        <label>Starting URL: <input type="text" id="startUrl" value="${t.baseUrl.href}" style="width: 100%;"></label><br>
                        <button id="startCrawlBtn">Start Crawl</button>
                        <button id="scanCurrentPageBtn">Scan Current Page</button>
                        <button id="togglePauseBtn">Pause/Resume</button>
                        <label>Filter Results: <input type="text" id="filterInput" placeholder="Filter by keyword"></label><br>
                        <label>Max Depth: <input type="number" id="maxDepth" value="${e.maxDepth}" style="width: 60px;"></label><br>
                        <label>Max Concurrent Requests: <input type="number" id="maxConcurrentRequests" value="${e.maxConcurrentRequests}" style="width: 60px;"></label><br>
                        <label>Rate Limit Delay (ms): <input type="number" id="rateLimitDelay" value="${e.rateLimitDelay}" style="width: 60px;"></label><br>
                        <button id="exportJsonBtn">Export JSON</button>
                        <button id="exportCsvBtn">Export CSV</button>
                    </div>
                    <div id="progressBar"><div id="progressBarFill">0%</div></div>
                    <div id="crawlResults"></div>
                    <div id="log"></div>
                </body>
            </html>`;
        document.body.appendChild(r);

        // Add event listeners
        document.getElementById("startCrawlBtn").addEventListener("click", startCrawl);
        document.getElementById("scanCurrentPageBtn").addEventListener("click", scanCurrentPage);
        document.getElementById("togglePauseBtn").addEventListener("click", togglePause);
        document.getElementById("filterInput").addEventListener("input", function() {
            setFilter(this.value);
        });
        document.getElementById("maxDepth").addEventListener("change", function() {
            updateConfig('maxDepth', this.value);
        });
        document.getElementById("maxConcurrentRequests").addEventListener("change", function() {
            updateConfig('maxConcurrentRequests', this.value);
        });
        document.getElementById("rateLimitDelay").addEventListener("change", function() {
            updateConfig('rateLimitDelay', this.value);
        });
        document.getElementById("exportJsonBtn").addEventListener("click", function() {
            exportData('json');
        });
        document.getElementById("exportCsvBtn").addEventListener("click", function() {
            exportData('csv');
        });
    })();
}();
