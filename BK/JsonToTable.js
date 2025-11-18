javascript:(function() {
    // Store for all our separate tables
    const tables = {};
    
    // Helper to get unique ID
    const generateId = () => Math.random().toString(36).substr(2, 9);

    // 1. The Relational Extractor
    function processItem(item, tableName, parentId = null) {
        if (!tables[tableName]) tables[tableName] = [];
        
        const row = {};
        // Create Primary Key and Foreign Key
        const currentId = generateId();
        row['_id'] = currentId;
        if (parentId) row['_link'] = parentId;

        // We separate "Data" from "Nested Lists"
        const arraysToProcess = {};

        function flatten(obj, prefix = '') {
            for (let key in obj) {
                if (!obj.hasOwnProperty(key)) continue;
                const val = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (Array.isArray(val)) {
                    // It's a list! Save it to process as a child table later
                    // We use the key name as the new table name (e.g., "legs")
                    arraysToProcess[newKey] = val;
                } else if (typeof val === 'object' && val !== null) {
                    // It's a single object (e.g., address), flatten it into this row
                    flatten(val, newKey);
                } else {
                    // It's a value, add to row
                    row[newKey] = val;
                }
            }
        }

        flatten(item);
        tables[tableName].push(row);

        // Now recurse for the arrays we found
        for (let arrayKey in arraysToProcess) {
            // Create a unique table name based on the path (e.g., "legs_openingTimes")
            // to avoid collisions if multiple things have "openingTimes"
            const childTableName = tableName === 'main' ? arrayKey : `${tableName}_${arrayKey.split('.').pop()}`;
            
            arraysToProcess[arrayKey].forEach(childItem => {
                if (typeof childItem === 'object' && childItem !== null) {
                    processItem(childItem, childTableName, currentId);
                } else {
                    // Handle arrays of primitives (e.g., ["tag1", "tag2"])
                    if (!tables[childTableName]) tables[childTableName] = [];
                    tables[childTableName].push({ 
                        '_link': currentId, 
                        'value': childItem 
                    });
                }
            });
        }
    }

    // 2. UI Creator (Tabs/Multiple Tables)
    function createUI() {
        // CSS
        const style = document.createElement('style');
        style.textContent = `
            .j2t-container { font-family: sans-serif; padding: 20px; background: #f4f4f4; min-height: 100vh; }
            .j2t-header { position: fixed; top: 0; left: 0; width: 100%; background: #333; color: white; padding: 10px; z-index: 1000; display: flex; gap: 10px; align-items: center; }
            .j2t-scroll { margin-top: 60px; }
            .j2t-table-wrapper { background: white; margin-bottom: 30px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border-radius: 5px; }
            .j2t-table-title { font-size: 1.2em; font-weight: bold; color: #2c3e50; margin-bottom: 10px; text-transform: capitalize; border-bottom: 2px solid #eee; padding-bottom: 5px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #eee; padding: 8px; text-align: left; border: 1px solid #ddd; position: sticky; top: 0; }
            td { padding: 6px; border: 1px solid #ddd; vertical-align: top; white-space: pre-wrap; }
            .btn { padding: 5px 10px; background: #fff; color: #333; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; border: 1px solid #ccc; }
            .btn:hover { background: #e0e0e0; }
            .key-col { background: #fcf8e3; font-family: monospace; color: #8a6d3b; }
        `;
        document.head.appendChild(style);

        const container = document.createElement('div');
        container.className = 'j2t-container';

        const header = document.createElement('div');
        header.className = 'j2t-header';
        header.innerHTML = '<strong>Relational JSON Viewer</strong>';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn';
        closeBtn.textContent = 'Close / Reload';
        closeBtn.onclick = () => window.location.reload();
        header.appendChild(closeBtn);
        container.appendChild(header);

        const scrollArea = document.createElement('div');
        scrollArea.className = 'j2t-scroll';
        container.appendChild(scrollArea);

        // Render Tables
        Object.keys(tables).forEach(name => {
            const wrapper = document.createElement('div');
            wrapper.className = 'j2t-table-wrapper';
            
            // Header with CSV download for THIS specific table
            const title = document.createElement('div');
            title.className = 'j2t-table-title';
            title.innerHTML = `<span>Table: ${name} <small>(${tables[name].length} rows)</small></span>`;
            
            const dlBtn = document.createElement('button');
            dlBtn.className = 'btn';
            dlBtn.textContent = 'Download CSV';
            dlBtn.onclick = () => downloadCSV(name, tables[name]);
            title.appendChild(dlBtn);
            
            wrapper.appendChild(title);

            const tableEl = document.createElement('table');
            const rows = tables[name];
            
            // Get all unique keys
            const allKeys = new Set();
            // Force ID and Link to be first
            if (rows[0]['_id']) allKeys.add('_id');
            if (rows[0]['_link']) allKeys.add('_link');
            rows.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
            const keys = Array.from(allKeys);

            // Table Head
            const thead = tableEl.createTHead();
            const tr = thead.insertRow();
            keys.forEach(k => {
                const th = document.createElement('th');
                th.textContent = k;
                tr.appendChild(th);
            });

            // Table Body
            const tbody = tableEl.createTBody();
            // Limit preview to 100 rows to prevent crashing on massive datasets
            const previewRows = rows.slice(0, 100); 
            previewRows.forEach(row => {
                const tr = tbody.insertRow();
                keys.forEach(k => {
                    const td = tr.insertCell();
                    if (k === '_id' || k === '_link') td.className = 'key-col';
                    td.textContent = row[k] !== undefined ? row[k] : '';
                });
            });
            
            if (rows.length > 100) {
                const tr = tbody.insertRow();
                const td = tr.insertCell();
                td.colSpan = keys.length;
                td.style.textAlign = 'center';
                td.style.fontStyle = 'italic';
                td.textContent = `... ${rows.length - 100} more rows hidden (Download CSV to view all) ...`;
            }

            wrapper.appendChild(tableEl);
            scrollArea.appendChild(wrapper);
        });

        document.body.innerHTML = '';
        document.body.appendChild(container);
    }

    function downloadCSV(filename, data) {
        if (!data || !data.length) return;
        const allKeys = new Set();
        data.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
        const keys = Array.from(allKeys);

        let csv = keys.map(k => `"${k}"`).join(',') + '\n';
        data.forEach(row => {
            csv += keys.map(k => {
                let val = row[k] === undefined ? '' : String(row[k]);
                return `"${val.replace(/"/g, '""')}"`;
            }).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
    }

    // 3. Main Logic
    try {
        const jsonContent = document.body.innerText.trim();
        const jsonData = JSON.parse(jsonContent);
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

        dataArray.forEach(item => processItem(item, 'main'));
        createUI();

    } catch (e) {
        console.error(e);
        alert("Invalid JSON. Please view a raw JSON page.");
    }
})();
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
