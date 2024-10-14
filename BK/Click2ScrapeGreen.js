(function() {
    let selectedElements = [], isSelecting = false, isPaused = false, scrapedData = null, controlPanel, currentPage = 1, maxPages = 1, nextPageSelector = "", useInnerHTML = true;

    function createButton(text) {
        let button = document.createElement("button");
        button.textContent = text;
        button.style.cssText = "padding:5px 10px;margin-right:5px;margin-bottom:5px;cursor:pointer;background-color:#444;color:#ddd;border:1px solid #555;font-family:'Arial',sans-serif;font-size:12px;";
        return button;
    }

    function getElementSelector(element) {
        if (element.id) return "#" + element.id;
        if (element.className) return "." + Array.from(element.classList).join(".");
        return element.tagName.toLowerCase();
    }

    function getSimilarElements(element) {
        let selector = getElementSelector(element);
        let elements = Array.from(document.querySelectorAll(selector));
        if (elements.length === 1) {
            elements = Array.from(element.parentElement.children).filter(el => el.tagName === element.tagName);
        }
        return elements;
    }

    function cleanAttributeValue(value) {
        if (typeof value !== 'string') return '';
        return value.replace(/\\\"/g, '"').replace(/\\'/g, "'").trim();
    }

    function extractElementInfo(element) {
        if (!element) return null;
        const isSVG = element instanceof SVGElement;
        let attributes = {};
        try {
            attributes = Object.fromEntries(
                Array.from(element.attributes || [])
                    .map(attr => [attr.name, cleanAttributeValue(attr.value)])
                    .filter(([name]) => !isSVG || !['d', 'transform', 'cx', 'cy', 'r', 'width', 'height', 'viewBox'].includes(name))
            );
        } catch (error) {
            console.error('Error processing attributes:', error);
        }

        return {
            text: isSVG ? '' : (element.innerText || '').trim(),
            href: element.href || element.getAttribute('href') || element.querySelector('a')?.href || '',
            src: getElementSrc(element),
            outerHTML: element.outerHTML || '',
            attributes: attributes,
            tagName: element.tagName.toLowerCase()
        };
    }

    function getElementSrc(element) {
        if (!element) return '';
        if (element instanceof SVGElement) {
            return element.getAttribute('href') || '';
        }
        let src = element.src || element.getAttribute('src') || element.querySelector('img')?.src || element.querySelector('img')?.getAttribute('src');
        if (src) return src;
        let bgImage = window.getComputedStyle(element).backgroundImage;
        return bgImage && bgImage !== 'none' ? bgImage.slice(4, -1).replace(/["']/g, '') : element.getAttribute('data-src') || '';
    }

    async function startScraping(output) {
        if (selectedElements.length === 0) {
            return void logOutput(output, "Please select at least one element first.");
        }
        maxPages = parseInt(document.getElementById("maxPages").value) || 1;
        nextPageSelector = document.getElementById("nextPageSelector").value.trim();
        scrapedData = [];
        currentPage = 1;

        while (currentPage <= maxPages) {
            logOutput(output, `Scraping page ${currentPage}...`);
            try {
                let pageData = selectedElements.map(element => {
                    let similarElements = getSimilarElements(element);
                    return similarElements.map(el => {
                        try {
                            return extractElementInfo(el);
                        } catch (error) {
                            console.error('Error processing element:', el, error);
                            return null;
                        }
                    }).filter(Boolean);
                });

                let combinedData = pageData[0].map((_, index) => {
                    let item = {};
                    pageData.forEach((selection, selIndex) => {
                        item[`selection${selIndex + 1}`] = selection[index] || null;
                    });
                    return item;
                });

                scrapedData = scrapedData.concat(combinedData);

                if (currentPage < maxPages && nextPageSelector) {
                    let nextButton = document.querySelector(nextPageSelector);
                    if (!nextButton) {
                        logOutput(output, "Next page button not found. Stopping pagination.");
                        break;
                    }
                    nextButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                logOutput(output, `An error occurred during scraping: ${error.message}`);
                console.error('Scraping error:', error);
                break;
            }
            currentPage++;
        }

        logOutput(output, `Scraped ${scrapedData.length} total items across ${currentPage - 1} pages`);
        logOutput(output, JSON.stringify(scrapedData.slice(0, 3), null, 2) + "...");
    }

    function collectPageLinks() {
        let links = Array.from(document.getElementsByTagName("a")).map(a => a.href);
        return [...new Set(links)];
    }

    function createControlPanel() {
        let panel = document.createElement("div");
        panel.style.cssText = "position:fixed;top:20px;right:20px;background-color:#333;border:1px solid #555;padding:10px;z-index:10000;font-family:'Arial',sans-serif;box-shadow:0 0 10px rgba(0,0,0,0.5);color:#ddd;max-width:400px;width:100%;opacity:0.95;";
        
        let toggleButton = createButton("Start Selection");
        let pauseResumeButton = createButton("Pause Selection");
        let startCrawlButton = createButton("Start Crawl");
        let cancelButton = createButton("Cancel");
        let clearSelectionsButton = createButton("Clear Selections");
        let downloadJSONButton = createButton("Download JSON");
        let downloadCSVButton = createButton("Download CSV");
        let downloadHTMLButton = createButton("Download HTML");
        let collectLinksButton = createButton("Collect Page Links");

        let controls = document.createElement("div");
        controls.style.marginTop = "10px";
        controls.innerHTML = `
            <label for="maxPages">Max Pages:</label>
            <input type="number" id="maxPages" value="1" min="1" style="width: 50px; margin-right: 10px;">
            <label for="nextPageSelector">Next Page Selector:</label>
            <input type="text" id="nextPageSelector" placeholder="e.g., .next-button" style="width: 150px;">
        `;

        let output = document.createElement("div");
        output.style.cssText = "width:100%;height:200px;overflow-y:auto;border:1px solid #555;padding:5px;margin-top:10px;font-size:12px;background-color:#222;";

        panel.append(toggleButton, pauseResumeButton, startCrawlButton, cancelButton, clearSelectionsButton, downloadJSONButton, downloadCSVButton, downloadHTMLButton, collectLinksButton, controls, output);
        document.body.appendChild(panel);

        return {panel, toggleButton, pauseResumeButton, startCrawlButton, cancelButton, clearSelectionsButton, downloadJSONButton, downloadCSVButton, downloadHTMLButton, collectLinksButton, output};
    }

    function logOutput(element, message) {
        if (useInnerHTML) {
            try {
                element.innerHTML += "<p>" + message + "</p>";
            } catch (error) {
                console.log("CSP detected, falling back to DOM methods");
                useInnerHTML = false;
                let p = document.createElement("p");
                p.textContent = message;
                element.appendChild(p);
            }
        } else {
            let p = document.createElement("p");
            p.textContent = message;
            element.appendChild(p);
        }
    }

    function handleClick(event) {
        if (!controlPanel.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    let {panel, toggleButton, pauseResumeButton, startCrawlButton, cancelButton, clearSelectionsButton, downloadJSONButton, downloadCSVButton, downloadHTMLButton, collectLinksButton, output} = createControlPanel();

    controlPanel = panel;

    toggleButton.addEventListener("click", () => {
        isSelecting = !isSelecting;
        isPaused = false;
        document.body.style.cursor = isSelecting ? "crosshair" : "default";
        toggleButton.textContent = isSelecting ? "Stop Selection" : "Start Selection";
        pauseResumeButton.textContent = "Pause Selection";
        logOutput(output, isSelecting ? "Selection started. Click on elements to select them for scraping." : "Selection stopped.");
        if (isSelecting) {
            document.body.addEventListener("click", handleClick, true);
        } else {
            document.body.removeEventListener("click", handleClick, true);
        }
    });

    pauseResumeButton.addEventListener("click", () => {
        if (isSelecting) {
            isPaused = !isPaused;
            document.body.style.cursor = isPaused ? "default" : "crosshair";
            pauseResumeButton.textContent = isPaused ? "Resume Selection" : "Pause Selection";
            logOutput(output, isPaused ? "Selection paused. You can interact with the page normally." : "Selection resumed. Click on elements to select them for scraping.");
            if (isPaused) {
                document.body.removeEventListener("click", handleClick, true);
            } else {
                document.body.addEventListener("click", handleClick, true);
            }
        } else {
            logOutput(output, "Please start selection first.");
        }
    });

    startCrawlButton.addEventListener("click", () => startScraping(output));

    cancelButton.addEventListener("click", () => {
        isSelecting = false;
        isPaused = false;
        selectedElements = [];
        scrapedData = null;
        document.body.style.cursor = "default";
        toggleButton.textContent = "Start Selection";
        pauseResumeButton.textContent = "Pause Selection";
        logOutput(output, "Operation cancelled. Start over by clicking 'Start Selection'.");
        document.body.removeEventListener("click", handleClick, true);
    });

    clearSelectionsButton.addEventListener("click", () => {
        selectedElements = [];
        logOutput(output, "All selections cleared. You can start selecting new elements.");
    });

    downloadJSONButton.addEventListener("click", function() {
        if (!scrapedData || scrapedData.length === 0) return void alert("No data to download. Please perform a crawl first.");
        let jsonString = JSON.stringify(scrapedData, null, 2);
        let dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(jsonString);
        let link = document.createElement("a");
        link.setAttribute("href", dataUri);
        link.setAttribute("download", "scraped_data.json");
        link.click();
    });

    downloadCSVButton.addEventListener("click", function() {
        if (!scrapedData || scrapedData.length === 0) return void alert("No data to download. Please perform a crawl first.");
        let headers = Object.keys(scrapedData[0]).flatMap(key => [`${key} Text`, `${key} Href`, `${key} Src`]);
        let csv = headers.join(",") + "\n";
        scrapedData.forEach(item => {
            let row = Object.values(item).flatMap(value => [
                `"${(value?.text || '').replace(/"/g, '""')}"`,
                `"${value?.href || ''}"`,
                `"${value?.src || ''}"`
            ]);
            csv += row.join(",") + "\n";
        });
        let dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
        let link = document.createElement("a");
        link.setAttribute("href", dataUri);
        link.setAttribute("download", "scraped_data.csv");
        link.click();
    });

    downloadHTMLButton.addEventListener("click", function() {
        if (!scrapedData || scrapedData.length === 0) return void alert("No data to download. Please perform a crawl first.");
        let headers = Object.keys(scrapedData[0]).flatMap(key => [`${key} Text`, `${key} Href`, `${key} Src`]);
        let tableHtml = `
            <table>
                <tr>${headers.map(header => `<th>${header}</th>`).join("")}</tr>
                ${scrapedData.map(item => `
                    <tr>${Object.values(item).flatMap(value => [
                        `<td>${value?.text || ''}</td>`,
                        `<td>${value?.href ? `<a href="${value.href}" target="_blank">${value.href}</a>` : ""}</td>`,
                        `<td>${value?.src ? `<a href="${value.src}" target="_blank"><img src="${value.src}" alt="Thumbnail"></a>` : ""}</td>`
                    ]).join("")}</tr>
                `).join("")}
            </table>
        `;
        let htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Scraped Data</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        line-height: 1.6;
                        padding: 20px;
                        background-color: #1a1a1a;
                        color: #00ff00;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        background-color: #222;
                        box-shadow: 0 0 20px rgba(0, 255, 0, 0.1);
                    }
                    th, td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #00ff00;
                        font-size: 12px;
                    }
                    th {
                        background-color: #333;
                        color: #00ff00;
                        font-weight: bold;
                    }
                    tr:hover {
                        background-color: #2a2a2a;
                    }
                    img {
                        max-width: 50px;
                        max-height: 50px;
                        object-fit: cover;
                    }
                    a {
                        color: #00ccff;
                        text-decoration: none;
                        word-break: break-all;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    @media (max-width: 600px) {
                        table {
                            font
                            
                            
                            }
                        th, td {
                            padding: 8px;
                        }
                    }
                </style>
            </head>
            <body>
                ${tableHtml}
            </body>
            </html>
        `;
        let blob = new Blob([htmlContent], {type: "text/html"});
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.href = url;
        link.download = "scraped_data.html";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    collectLinksButton.addEventListener("click", function() {
        let links = collectPageLinks();
        logOutput(output, `Collected ${links.length} unique links:`);
        links.forEach(link => logOutput(output, link));
        scrapedData = links.map(link => ({link}));
    });

    document.addEventListener("click", event => {
        if (isSelecting && !isPaused && !controlPanel.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            let selector = getElementSelector(event.target);
            if (selectedElements.some(el => getElementSelector(el) === selector)) {
                logOutput(output, "Element already selected: " + selector);
            } else {
                selectedElements.push(event.target);
                logOutput(output, "Element selected: " + selector);
            }
        }
    }, true);

    console.log("Improved Multi-Select Scraper UI with selection control, CSP fallback, pagination support, and link collection added. Use the buttons to control the scraping process.");
})();-
