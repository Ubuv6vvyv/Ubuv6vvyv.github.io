javascript:(function() {
    // Configuration object for the application
    const config = {
        originalBaseUrl: window.location.href.split('/blob/')[0],
        getOwnerAndRepo: () => {
            const pathParts = window.location.pathname.split('/');
            return {
                owner: pathParts[1],
                repo: pathParts[2],
                branch: window.location.pathname.split('/blob/')[1]?.split('/')[0] || 'main'
            };
        },
        apiUrl: 'https://api.github.com'
    };

    // Data structure to store all links
    const linkCollection = {
        original: new Set(),
        converted: new Map(),
        folders: new Set(),
        processedFolders: new Set()
    };

    // UI elements
    const ui = {
        createProgressOverlay: () => {
            const overlay = document.createElement('div');
            overlay.id = 'github-pages-converter-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: white;
                font-family: Arial, sans-serif;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: #24292e;
                padding: 2rem;
                border-radius: 8px;
                max-width: 90%;
                width: 500px;
                text-align: center;
            `;
            
            const title = document.createElement('h2');
            title.textContent = 'GitHub Pages Link Converter';
            title.style.marginTop = '0';
            
            const status = document.createElement('p');
            status.id = 'converter-status';
            status.textContent = 'Scanning repository...';
            
            const progress = document.createElement('div');
            progress.style.cssText = `
                width: 100%;
                background: #444;
                height: 10px;
                border-radius: 5px;
                margin: 1rem 0;
                overflow: hidden;
            `;
            
            const progressBar = document.createElement('div');
            progressBar.id = 'converter-progress';
            progressBar.style.cssText = `
                width: 0%;
                height: 100%;
                background: #0366d6;
                border-radius: 5px;
                transition: width 0.3s;
            `;
            
            const counter = document.createElement('p');
            counter.id = 'converter-counter';
            counter.textContent = 'Files found: 0';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                background: #6e7681;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                margin-top: 1rem;
                cursor: pointer;
            `;
            cancelBtn.onclick = () => {
                document.body.removeChild(overlay);
                window.crawlingCancelled = true;
            };
            
            progress.appendChild(progressBar);
            content.appendChild(title);
            content.appendChild(status);
            content.appendChild(progress);
            content.appendChild(counter);
            content.appendChild(cancelBtn);
            overlay.appendChild(content);
            
            document.body.appendChild(overlay);
            
            return {
                updateStatus: (text) => {
                    document.getElementById('converter-status').textContent = text;
                },
                updateProgress: (percent) => {
                    document.getElementById('converter-progress').style.width = `${percent}%`;
                },
                updateCounter: (count) => {
                    document.getElementById('converter-counter').textContent = `Files found: ${count}`;
                },
                close: () => {
                    document.body.removeChild(overlay);
                }
            };
        }
    };

    // Utility functions
    const utils = {
        isValidGitHubUrl: (url) => {
            return url.includes('github.com') && url.includes('/blob/');
        },

        isFolder: (url) => {
            return url.includes('github.com') && url.includes('/tree/');
        },

        getFolderPath: (folderUrl) => {
            const parts = folderUrl.split('/tree/');
            if (parts.length !== 2) return null;
            return parts[1];
        },

        convertToApiPath: (folderPath) => {
            const { owner, repo } = config.getOwnerAndRepo();
            const pathParts = folderPath.split('/');
            const branch = pathParts.shift();
            return `${config.apiUrl}/repos/${owner}/${repo}/contents/${pathParts.join('/')}?ref=${branch}`;
        },

        convertToGitHubPages: (originalUrl) => {
            try {
                const { owner } = config.getOwnerAndRepo();
                const urlParts = originalUrl.split('/blob/');
                if (urlParts.length !== 2) return null;

                const pathPart = urlParts[1].split('/');
                pathPart.shift(); // Remove branch name
                return `https://${owner}.github.io/${pathPart.join('/')}`;
            } catch (error) {
                console.error('Error converting URL:', error);
                return null;
            }
        },

        createHtmlOutput: (linkCollection) => {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>GitHub Pages Link Converter Results</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 2rem; }
                        .container { max-width: 1200px; margin: 0 auto; }
                        .section { margin-bottom: 2rem; }
                        h1, h2 { color: #24292e; }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 1rem;
                            table-layout: fixed;
                        }
                        th, td {
                            padding: 0.75rem;
                            border: 1px solid #e1e4e8;
                            text-align: left;
                            word-break: break-all;
                        }
                        th {
                            background: #f6f8fa;
                            font-weight: 600;
                        }
                        tr:nth-child(even) {
                            background-color: #f8f9fa;
                        }
                        a {
                            color: #0366d6;
                            text-decoration: none;
                        }
                        a:hover {
                            text-decoration: underline;
                        }
                        .copy-btn {
                            padding: 4px 8px;
                            background: #0366d6;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            margin-left: 8px;
                        }
                        .copy-btn:hover {
                            background: #0256b9;
                        }
                        .search-container {
                            margin-bottom: 1rem;
                        }
                        #filter-input {
                            padding: 8px;
                            width: 100%;
                            border: 1px solid #e1e4e8;
                            border-radius: 4px;
                            font-size: 14px;
                        }
                        .stats {
                            margin-top: 1rem;
                            padding: 1rem;
                            background: #f6f8fa;
                            border-radius: 4px;
                            border: 1px solid #e1e4e8;
                        }
                        @media (max-width: 768px) {
                            body { margin: 1rem; }
                            .copy-btn { padding: 3px 6px; font-size: 12px; }
                            th, td { padding: 0.5rem; font-size: 14px; }
                        }
                    </style>
                    <script>
                        function copyUrl(url) {
                            navigator.clipboard.writeText(url)
                                .then(() => {
                                    const btn = event.target;
                                    const originalText = btn.textContent;
                                    btn.textContent = 'Copied!';
                                    setTimeout(() => {
                                        btn.textContent = originalText;
                                    }, 2000);
                                })
                                .catch(err => console.error('Failed to copy:', err));
                        }
                        
                        function filterTable() {
                            const input = document.getElementById('filter-input');
                            const filter = input.value.toLowerCase();
                            const table = document.getElementById('links-table');
                            const rows = table.getElementsByTagName('tr');
                            let count = 0;
                            
                            for (let i = 1; i < rows.length; i++) {
                                const originalCell = rows[i].getElementsByTagName('td')[0];
                                const convertedCell = rows[i].getElementsByTagName('td')[1];
                                
                                if (originalCell && convertedCell) {
                                    const originalText = originalCell.textContent || originalCell.innerText;
                                    const convertedText = convertedCell.textContent || convertedCell.innerText;
                                    
                                    if (originalText.toLowerCase().indexOf(filter) > -1 || 
                                        convertedText.toLowerCase().indexOf(filter) > -1) {
                                        rows[i].style.display = '';
                                        count++;
                                    } else {
                                        rows[i].style.display = 'none';
                                    }
                                }
                            }
                            
                            document.getElementById('filtered-count').textContent = count;
                        }
                    </script>
                </head>
                <body>
                    <div class="container">
                        <h1>GitHub Pages Link Converter Results</h1>
                        <div class="stats">
                            <p><strong>Total files found:</strong> ${linkCollection.converted.size}</p>
                            <p><strong>Total folders scanned:</strong> ${linkCollection.processedFolders.size}</p>
                        </div>
                        <div class="section">
                            <h2>Converted Links</h2>
                            <div class="search-container">
                                <input type="text" id="filter-input" placeholder="Filter links..." onkeyup="filterTable()">
                                <p>Showing <span id="filtered-count">${linkCollection.converted.size}</span> of ${linkCollection.converted.size} links</p>
                            </div>
                            <table id="links-table">
                                <thead>
                                    <tr>
                                        <th width="50%">Original GitHub URL</th>
                                        <th width="50%">GitHub Pages URL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Array.from(linkCollection.converted.entries())
                                        .map(([original, converted]) => `
                                            <tr>
                                                <td>
                                                    <a href="${original}" target="_blank">${original}</a>
                                                    <button class="copy-btn" onclick="copyUrl('${original}')">Copy</button>
                                                </td>
                                                <td>
                                                    <a href="${converted}" target="_blank">${converted}</a>
                                                    <button class="copy-btn" onclick="copyUrl('${converted}')">Copy</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Create a download link for the HTML file
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
            element.setAttribute('download', 'github-pages-links.html');

            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }
    };

    // Collect folder links from the current page
    function collectFolderLinks() {
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            const href = link.href;
            if (utils.isFolder(href)) {
                const folderPath = utils.getFolderPath(href);
                if (folderPath) {
                    linkCollection.folders.add(href);
                }
            }
        });
    }

    // Collect file links from the current page
    function collectFileLinks() {
        const links = document.querySelectorAll('a[href]');
        let newLinks = 0;
        
        links.forEach(link => {
            const href = link.href;
            if (utils.isValidGitHubUrl(href) && !linkCollection.original.has(href)) {
                linkCollection.original.add(href);
                const convertedUrl = utils.convertToGitHubPages(href);
                if (convertedUrl) {
                    linkCollection.converted.set(href, convertedUrl);
                    newLinks++;
                }
            }
        });
        
        return newLinks;
    }

    // Process a folder using GitHub API
    async function processFolder(folderUrl) {
        if (window.crawlingCancelled) return 0;
        if (linkCollection.processedFolders.has(folderUrl)) return 0;
        
        linkCollection.processedFolders.add(folderUrl);
        
        try {
            const folderPath = utils.getFolderPath(folderUrl);
            if (!folderPath) return 0;
            
            const apiUrl = utils.convertToApiPath(folderPath);
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                console.error(`Error fetching folder contents: ${response.statusText}`);
                return 0;
            }
            
            const data = await response.json();
            let newLinks = 0;
            
            for (const item of data) {
                if (item.type === 'file') {
                    const originalUrl = item.html_url;
                    if (!linkCollection.original.has(originalUrl)) {
                        linkCollection.original.add(originalUrl);
                        const convertedUrl = utils.convertToGitHubPages(originalUrl);
                        if (convertedUrl) {
                            linkCollection.converted.set(originalUrl, convertedUrl);
                            newLinks++;
                        }
                    }
                } else if (item.type === 'dir') {
                    const { owner, repo, branch } = config.getOwnerAndRepo();
                    const folderUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${item.path}`;
                    if (!linkCollection.folders.has(folderUrl)) {
                        linkCollection.folders.add(folderUrl);
                    }
                }
            }
            
            return newLinks;
        } catch (error) {
            console.error('Error processing folder:', error);
            return 0;
        }
    }

    // Main crawler function
    async function crawlGitHubRepository() {
        try {
            window.crawlingCancelled = false;
            const progressUI = ui.createProgressOverlay();
            let filesFound = 0;
            
            // Collect initial links from current page
            collectFolderLinks();
            filesFound += collectFileLinks();
            progressUI.updateCounter(filesFound);
            
            // Process folders recursively
            const foldersToProcess = Array.from(linkCollection.folders);
            
            for (let i = 0; i < foldersToProcess.length; i++) {
                if (window.crawlingCancelled) break;
                
                const folder = foldersToProcess[i];
                progressUI.updateStatus(`Scanning folder ${i+1} of ${foldersToProcess.length}...`);
                progressUI.updateProgress(((i+1) / foldersToProcess.length) * 100);
                
                const newLinks = await processFolder(folder);
                filesFound += newLinks;
                progressUI.updateCounter(filesFound);
                
                // Check for new folders that were discovered during processing
                const newFolders = Array.from(linkCollection.folders).filter(f => !foldersToProcess.includes(f));
                foldersToProcess.push(...newFolders);
            }
            
            progressUI.updateStatus('Generating report...');
            progressUI.updateProgress(100);
            
            // Create HTML output
            utils.createHtmlOutput(linkCollection);
            
            progressUI.close();
            
        } catch (error) {
            console.error('Error crawling repository:', error);
            alert('An error occurred while processing the GitHub repository. Please check the console for details.');
        }
    }

    // Initialize the crawler
    crawlGitHubRepository();
})();
