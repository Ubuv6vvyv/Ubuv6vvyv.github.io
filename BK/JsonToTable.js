javascript:(function() {
    // Function to flatten nested objects
    function flattenObject(obj, parent = '', res = {}) {
        for (let key in obj) {
            const propName = parent ? `${parent}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                flattenObject(obj[key], propName, res);
            } else {
                res[propName] = obj[key];
            }
        }
        return res;
    }

    // Function to create toolbar
    function createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background-color: #f8f9fa;
            padding: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 1000;
        `;

        // Download HTML button
        const downloadHtmlBtn = document.createElement('button');
        downloadHtmlBtn.textContent = 'Download as HTML';
        downloadHtmlBtn.onclick = () => {
            const htmlContent = document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'page.html';
            a.click();
            URL.revokeObjectURL(url);
        };

        // Download CSV button
        const downloadCsvBtn = document.createElement('button');
        downloadCsvBtn.textContent = 'Download as CSV';
        downloadCsvBtn.onclick = () => {
            const table = document.querySelector('table');
            let csv = [];
            for (let i = 0; i < table.rows.length; i++) {
                let row = [], cols = table.rows[i].cells;
                for (let j = 0; j < cols.length; j++) {
                    row.push('"' + cols[j].textContent.replace(/"/g, '""') + '"');
                }
                csv.push(row.join(','));
            }
            const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data.csv';
            a.click();
            URL.revokeObjectURL(url);
        };

        // View Source button
        const viewSourceBtn = document.createElement('button');
        viewSourceBtn.textContent = 'View Source';
        viewSourceBtn.onclick = () => {
            const sourceWindow = window.open('', '_blank');
            sourceWindow.document.write('<html><body><pre>' + 
                document.documentElement.outerHTML
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;') + 
                '</pre></body></html>');
        };

        // Close toolbar button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close Toolbar';
        closeBtn.onclick = () => toolbar.remove();

        // Style buttons
        const buttons = [downloadHtmlBtn, downloadCsvBtn, viewSourceBtn, closeBtn];
        buttons.forEach(btn => {
            btn.style.cssText = `
                margin: 0 5px;
                padding: 5px 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background-color: white;
                cursor: pointer;
            `;
        });

        // Add buttons to toolbar
        buttons.forEach(btn => toolbar.appendChild(btn));
        return toolbar;
    }

    // Locate JSON on the page
    const jsonContent = document.body.innerText.trim();
    try {
        const jsonData = JSON.parse(jsonContent);

        // Ensure data is an array for uniform processing
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        const flattenedData = dataArray.map(item => flattenObject(item));

        // Create a table dynamically
        const table = document.createElement('table');
        table.border = "1";
        table.style.cssText = 'border-collapse: collapse; margin-top: 60px;'; // Add margin for toolbar

        // Add table header
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        const keys = Object.keys(flattenedData[0] || {});
        keys.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            th.style.padding = '8px';
            headerRow.appendChild(th);
        });

        // Add table rows
        const tbody = table.createTBody();
        flattenedData.forEach(item => {
            const row = tbody.insertRow();
            keys.forEach(key => {
                const cell = row.insertCell();
                cell.textContent = item[key] !== undefined ? item[key] : '';
                cell.style.padding = '8px';
            });
        });

        // Clear the current content and add toolbar and table
        document.body.innerHTML = '';
        document.body.appendChild(createToolbar());
        document.body.appendChild(table);
    } catch (e) {
        alert("Invalid JSON or JSON not found on the page.");
    }
})();
