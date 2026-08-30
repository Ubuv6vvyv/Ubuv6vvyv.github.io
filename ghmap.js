(function() {
    const p = window.location.pathname.split('/');
    if (p.length < 3) return alert('Not a valid GitHub repository page.');
    
    const o = p[1], r = p[2];
    const b = (p[3] === 'blob' || p[3] === 'tree') ? p[4] : 'main';
    const base = `https://github.com/${o}/${r}`;
    const api = `https://api.github.com/repos/${o}/${r}/contents`;
    
    const links = new Map(), folders = new Set(), processed = new Set();
    window.__gpcCancel = false;

    const ui = document.createElement('div');
    ui.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font:14px Arial;text-align:left"><div style="background:#1a1a1a;padding:20px;border-radius:8px;width:90%;max-width:400px;text-align:center;border:1px solid #333;box-shadow:0 4px 15px rgba(0,0,0,0.5)"><h3 style="margin:0 0 15px;color:#fff">GitHub Pages Crawler</h3><p id="gpc-status" style="color:#ccc">Initializing...</p><div style="background:#333;height:6px;border-radius:3px;margin:15px 0;overflow:hidden"><div id="gpc-bar" style="width:0%;height:100%;background:#0366d6;transition:width .3s"></div></div><p id="gpc-count" style="color:#ccc">Files: 0</p><button onclick="window.__gpcCancel=true;this.closest('div[style*=\\'position:fixed\\']').remove()" style="background:#666;color:#fff;border:0;padding:8px 16px;border-radius:4px;cursor:pointer;margin-top:10px">Cancel</button></div></div>`;
    document.body.appendChild(ui);

    const status = document.getElementById('gpc-status'), bar = document.getElementById('gpc-bar'), count = document.getElementById('gpc-count');
    const update = (s, pct, c) => {
        if(!window.__gpcCancel) {
            status.textContent = s; bar.style.width = pct + '%'; count.textContent = `Files: ${c}`;
        }
    };

    const isFile = u => u.includes('/blob/');
    const isFolder = u => u.includes('/tree/');
    
    // Dynamically handle User Sites vs Project Sites
    const isUserSite = r.toLowerCase() === `${o.toLowerCase()}.github.io`;
    const pagesBase = isUserSite ? `https://${o}.github.io` : `https://${o}.github.io/${r}`;

    const toPages = u => {
        const m = u.match(/\/blob\/[^\/]+\/(.+)/);
        return m ? `${pagesBase}/${m[1]}` : null;
    };
    
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function scan(url, depth = 0) {
        if(window.__gpcCancel || processed.has(url) || depth > 10) return 0;
        processed.add(url);
        
        const parts = url.split('/tree/');
        if(parts.length !== 2) return 0;
        
        const folderPath = parts[1].split('/');
        const branch = folderPath.shift();
        const remainingPath = folderPath.join('/');
        const apiUrl = remainingPath ? `${api}/${remainingPath}?ref=${branch}` : api + `?ref=${branch}`;

        try {
            await delay(100);
            const res = await fetch(apiUrl);
            
            if(res.status === 403) {
                status.textContent = "API Rate Limit Hit (60 req/hr)!";
                bar.style.background = "#d73a49"; 
                window.__gpcCancel = true;
                return 0;
            }
            if(!res.ok) return 0;
            
            const data = await res.json();
            let found = 0;
            for(const item of data) {
                if(item.type === 'file') {
                    const orig = item.html_url, pages = toPages(orig);
                    if(pages && !links.has(orig)) { links.set(orig, pages); found++; }
                } else if(item.type === 'dir') {
                    folders.add(`${base}/tree/${branch}/${item.path}`);
                }
            }
            return found;
        } catch(e) { return 0; }
    }

    function collect() {
        document.querySelectorAll('a[href]').forEach(a => {
            const h = a.href;
            if(isFile(h)) {
                const pages = toPages(h);
                if(pages && !links.has(h)) links.set(h, pages);
            } else if(isFolder(h)) {
                folders.add(h);
            }
        });
    }

    async function crawl() {
        collect();
        update('Scanning...', 0, links.size);
        const folderList = [...folders];
        
        for(let i = 0; i < folderList.length; i++) {
            if(window.__gpcCancel) break;
            const folder = folderList[i];
            update(`Folder ${i+1}/${folderList.length}`, (i / folderList.length) * 100, links.size);
            await scan(folder, 0);
            
            for(const f of folders) {
                if(!folderList.includes(f)) folderList.push(f);
            }
        }
        
        if(window.__gpcCancel) return;
        
        update('Generating report...', 100, links.size);
        
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>GitHub Pages Links</title><style>*{box-sizing:border-box}body{font:14px Arial;margin:0;padding:10px;background:#f8f9fa}h1{color:#24292e;margin:0 0 20px;font-size:18px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)}th,td{padding:8px;text-align:left;border-bottom:1px solid #e1e4e8;word-break:break-all}th{background:#f6f8fa;font-weight:600;font-size:12px}tr:nth-child(even){background:#f8f9fa}a{color:#0366d6;text-decoration:none}a:hover{text-decoration:underline}.btn{background:#0366d6;color:#fff;border:0;padding:4px 8px;border-radius:3px;cursor:pointer;margin-left:8px;font-size:11px}.btn:hover{background:#0256b9}.btn:active{transform:scale(.95)}.stats{background:#fff;padding:15px;border-radius:6px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.1)}.search{margin-bottom:15px}.search input{width:100%;padding:8px;border:1px solid #e1e4e8;border-radius:4px;font-size:14px}@media (max-width:768px){body{padding:5px}th,td{padding:6px;font-size:12px}.btn{padding:3px 6px;font-size:10px}}</style></head><body><h1>GitHub Pages Links (${links.size} files)</h1><div class="stats">Repository: <strong>${o}/${r}</strong><br>Branch: <strong>${b}</strong><br>Folders scanned: <strong>${processed.size}</strong></div><div class="search"><input type="text" placeholder="Filter links..." onkeyup="filter(this.value)"></div><table id="table"><thead><tr><th>GitHub URL</th><th>Pages URL</th></tr></thead><tbody>${[...links].map(([orig,pages])=>`<tr><td><a href="${orig}" target="_blank">${orig}</a><button class="btn" onclick="copy('${orig}')">Copy</button></td><td><a href="${pages}" target="_blank">${pages}</a><button class="btn" onclick="copy('${pages}')">Copy</button></td></tr>`).join('')}</tbody></table><script>function copy(url){navigator.clipboard.writeText(url).then(()=>{event.target.textContent='✓';setTimeout(()=>event.target.textContent='Copy',1000)}).catch(console.error)}function filter(val){const rows=document.querySelectorAll('#table tbody tr');rows.forEach(row=>{const text=row.textContent.toLowerCase();row.style.display=text.includes(val.toLowerCase())?'':'none'})}</script></body></html>`;
        
        const a = document.createElement('a');
        a.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        a.download = `${r}-pages-links.html`;
        a.click();
        
        try { ui.remove(); } catch(e) {}
    }
    
    crawl();
})();
      
