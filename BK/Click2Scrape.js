(function() {
    let selectedElements = [];
    let isScrapingActive = false;
    let scrapedData = [];

    function createUI() {
        const container = document.createElement('div');
        container.id = 'scraper-ui-container';
        container.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: #333;
            color: white;
            border: 1px solid #444;
            padding: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            border-radius: 5px;
            max-width: 90vw;
            max-height: 50vh;
            overflow-y: auto;
        `;

        const toggleButton = createButton('Start Selection');
        const startCrawlButton = createButton('Start Crawl');
        const cancelButton = createButton('Cancel');
        const downloadJSONButton = createButton('Download JSON');
        const downloadHTMLButton = createButton('Download HTML');
        const output = createOutput();

        container.append(toggleButton, startCrawlButton, cancelButton, downloadJSONButton, downloadHTMLButton, output);
        document.body.appendChild(container);

        return { toggleButton, startCrawlButton, cancelButton, downloadJSONButton, downloadHTMLButton, output };
    }

    function createButton(text) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 5px 8px;
            margin: 5px 0;
            width: 100%;
            background-color: #555;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        `;
        return button;
    }

    function createOutput() {
        const output = document.createElement('div');
        output.style.cssText = `
            width: 100%;
            height: 100px;
            overflow-y: auto;
            background-color: #222;
            color: #ddd;
            border: 1px solid #444;
            padding: 5px;
            margin-top: 10px;
            font-size: 12px;
            border-radius: 3px;
        `;
        return output;
    }

    function getSelector(element) {
        if (element.id) return '#' + element.id;
        if (element.className) {
            const classes = Array.from(element.classList).map(c => '.' + c).join('');
            if (classes) return element.tagName.toLowerCase() + classes;
        }
        return element.tagName.toLowerCase();
    }

    function findSimilarElements(element) {
        const selector = getSelector(element);
        let elements = Array.from(document.querySelectorAll(selector));
        if (elements.length === 1) {
            elements = Array.from(element.parentElement.children).filter(el => el.tagName === element.tagName);
        }
        return elements;
    }

    function extractData(element) {
        const data = {
            text: element.innerText.trim(),
            href: element.href || element.querySelector('a')?.href || '',
            src: element.src || element.querySelector('img')?.src || ''
        };

        const attributes = {};
        for (let attr of element.attributes) {
            attributes[attr.name] = attr.value;
        }
        data.attributes = attributes;

        return data;
    }

    function handleClick(event, output) {
        if (!isScrapingActive) return;

        if (event.target.closest('#scraper-ui-container')) return; // Ignore clicks on the UI elements

        event.preventDefault();
        event.stopPropagation();

        const clickedElement = event.target;

        if (!selectedElements.includes(clickedElement)) {
            selectedElements.push(clickedElement);
            clickedElement.style.outline = '2px solid red';
        } else {
            selectedElements = selectedElements.filter(el => el !== clickedElement);
            clickedElement.style.outline = '';
        }

        output.innerHTML = `<strong>Selected elements:</strong> ${selectedElements.length}<br>` +
                           selectedElements.map(el => getSelector(el)).join('<br>');
    }

    function toggleScraping(toggleButton, output) {
        isScrapingActive = !isScrapingActive;
        document.body.style.cursor = isScrapingActive ? 'crosshair' : 'default';
        toggleButton.textContent = isScrapingActive ? 'Finish Selection' : 'Start Selection';
        output.textContent = isScrapingActive ? 'Select elements to scrape.' : 'Selection finished. Ready to crawl.';
    }

    function startCrawl(output) {
        if (selectedElements.length === 0) {
            output.textContent = 'Please select at least one element first.';
            return;
        }

        const elementGroups = selectedElements.map(findSimilarElements);
        const minLength = Math.min(...elementGroups.map(group => group.length));

        scrapedData = [];
        for (let i = 0; i < minLength; i++) {
            const rowData = {};
            elementGroups.forEach((group, index) => {
                const data = extractData(group[i]);
                if (!scrapedData.some(d => JSON.stringify(d) === JSON.stringify(data))) { // Duplicate handling
                    rowData[`element${index + 1}`] = data;
                }
            });
            if (Object.keys(rowData).length) {
                scrapedData.push(rowData);
            }
        }

        output.innerHTML = `<strong>Elements scraped: ${scrapedData.length}</strong><br>`;
        output.innerHTML += `<pre>${JSON.stringify(scrapedData.slice(0, 3), null, 2)}...</pre>`;
    }

    function cancelOperation(toggleButton, output) {
        isScrapingActive = false;
        selectedElements.forEach(el => el.style.outline = '');
        selectedElements = [];
        scrapedData = [];
        document.body.style.cursor = 'default';
        toggleButton.textContent = 'Start Selection';
        output.textContent = 'Operation cancelled. Start again.';
    }

    function downloadJSON() {
        if (scrapedData.length === 0) {
            alert('No data to download. Perform a crawl first.');
            return;
        }
        const dataStr = JSON.stringify(scrapedData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileName = 'scraped_data.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
    }

    function downloadHTML() {
        if (scrapedData.length === 0) {
            alert('No data to download. Perform a crawl first.');
            return;
        }

        const headers = Object.keys(scrapedData[0]);

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scraped Data</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background-color: #f0f0f0; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background-color: #555; color: white; }
            </style>
        </head>
        <body>
            <h1>Scraped Data</h1>
            <table>
                <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
                ${scrapedData.map(item => `
                    <tr>${headers.map(header => `
                        <td>
                            <strong>Text:</strong> ${item[header].text || ''}<br>
                            <strong>Href:</strong> ${item[header].href || ''}<br>
                            <strong>Src:</strong> ${item[header].src || ''}<br>
                            <strong>Attributes:</strong> <pre>${JSON.stringify(item[header].attributes, null, 2)}</pre>
                        </td>`).join('')}
                    </tr>`).join('')}
            </table>
        </body>
        </html>`;

        const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
        const exportFileName = 'scraped_data.html';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
    }

    const { toggleButton, startCrawlButton, cancelButton, downloadJSONButton, downloadHTMLButton, output } = createUI();

    toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleScraping(toggleButton, output);
    });
    startCrawlButton.addEventListener('click', (e) => {
        e.stopPropagation();
        startCrawl(output);
    });
    cancelButton.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelOperation(toggleButton, output);
    });
        downloadJSONButton.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadJSON();
    });
    downloadHTMLButton.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadHTML();
    });

    // Error handling
    window.addEventListener('error', (event) => {
        output.textContent = `Error: ${event.message}`;
        console.error('Error occurred:', event.message);
    });

    // Duplicate handling
    document.addEventListener('click', (event) => handleClick(event, output));

})();
