import React, { useState } from 'react';
import { Clipboard, Table, FileSpreadsheet } from 'lucide-react';

const TableConverter = () => {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);

  const parseInput = () => {
    // Multiple parsing strategies
    const parseStrategies = [
      // CSV/TSV parsing
      () => {
        const lines = inputText.trim().split(/\n/);
        const potentialHeaders = lines[0].split(/\t|,/);
        const data = lines.slice(1).map(line => line.split(/\t|,/));
        return { headers: potentialHeaders, data };
      },
      // HTML Table parsing
      () => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = inputText;
        const table = tempDiv.querySelector('table');
        if (table) {
          const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
          const data = Array.from(table.querySelectorAll('tr'))
            .slice(1)
            .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent));
          return { headers, data };
        }
        return null;
      },
      // JSON parsing (array of objects)
      () => {
        try {
          const parsed = JSON.parse(inputText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const headers = Object.keys(parsed[0]);
            const data = parsed.map(obj => headers.map(header => obj[header]));
            return { headers, data };
          }
        } catch (e) {}
        return null;
      }
    ];

    for (const strategy of parseStrategies) {
      const result = strategy();
      if (result) {
        setHeaders(result.headers);
        setParsedData(result.data);
        return;
      }
    }

    alert('Could not parse the input. Please check your data format.');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50">
      <div className="flex items-center mb-4">
        <FileSpreadsheet className="mr-2 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">Universal Table Converter</h2>
      </div>
      
      <textarea 
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Paste CSV, HTML Table, JSON, or Excel-copied data here..."
        className="w-full h-40 p-2 border rounded-md mb-4 font-mono"
      />
      
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={parseInput}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
        >
          <Clipboard className="mr-2" /> Parse & Convert
        </button>
      </div>

      {parsedData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-200">
                {headers.map((header, idx) => (
                  <th 
                    key={idx} 
                    className="border px-3 py-2 text-left font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className="hover:bg-gray-100 border-b last:border-b-0"
                >
                  {row.map((cell, cellIdx) => (
                    <td 
                      key={cellIdx} 
                      className="border px-3 py-2"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TableConverter;
