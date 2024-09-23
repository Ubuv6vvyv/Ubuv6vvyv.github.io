(function () {
  const categories = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff'],
    videos: ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.flv', '.webm'],
    audios: ['.mp3', '.wav', '.ogg', '.m4a'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv'],
    scripts: ['.js', '.ts', '.jsx', '.tsx'],
    styles: ['.css'],
    media: [],
    form_data: [],
    text_data: [],
    secrets: []
  };

  const regexPatterns = {
    api_keys: /(?:api[_-]?key|access[_-]?token|client[_-]?id|client[_-]?secret|secret[_-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9-_]{20,})['"]?/gi,
    passwords: /\b(?:password|passwd|pwd|secret)\s*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi,
    tokens: /\b(?:Bearer|Token|JWT)\s*[:=]\s*['"]?([a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+)\b/g,
    secrets: /(?:secret|confidential|hidden|private)\s*[:=]\s*['"]?([a-zA-Z0-9-_]+)['"]?/gi,
    emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    ip_addresses: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    urls: /\bhttps?:\/\/[^\s]+\b/g,
    credit_cards: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone_numbers: /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    addresses: /\b\d{1,6}\s+[a-zA-Z0-9]+\s+(?:street|st|avenue|ave|road|rd|lane|ln|blvd|boulevard)\b/gi,
    media_urls: /https?:\/\/(?:[a-zA-Z0-9.-]+\/)*(?:img|document|asset|media|file|resource|video|audio|content)(?:\/[a-zA-Z0-9._%-]+)*(?:\.[a-zA-Z0-9]+)?(?:\?[a-zA-Z0-9._%-=&]+)?/g
  };

  function classifyResource(url) {
    if (!url) return 'other';

    const extension = url.split('.').pop().toLowerCase();
    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.some(ext => url.toLowerCase().endsWith(ext))) {
        return category;
      }
    }
    return 'media';
  }

  function fetchResources() {
    const resources = {
      images: new Set(),
      videos: new Set(),
      audios: new Set(),
      documents: new Set(),
      scripts: new Set(),
      styles: new Set(),
      links: new Set(),
      form_data: new Set(),
      text_data: new Set(),
      secrets: new Set(),
      hidden_forms: new Set(),
      media: new Set()
    };

    console.log("Scanning images, videos, audios, documents, scripts, styles...");
    document.querySelectorAll('img, video, audio, link[rel="stylesheet"], script').forEach(tag => {
      const url = tag.src || tag.href;
      const category = classifyResource(url);
      if (resources[category]) resources[category].add(url);
    });

    console.log("Scanning for links...");
    document.querySelectorAll('a').forEach(a => {
      if (a.href) resources.links.add(a.href);
    });

    console.log("Scanning text content...");
    extractTextBroadly(resources);

    console.log("Scanning for secrets and sensitive data...");
    extractSecrets(resources);

    console.log("Scanning for hidden forms...");
    extractHiddenForms(resources);

    console.log("Scanning for media URLs...");
    extractMediaURLs(resources);

    console.log("Resource scan completed.");
    return resources;
  }

  function extractTextBroadly(resources) {
    const bodyText = document.body.innerText;
    resources.text_data.add(bodyText);
  }

  function extractSecrets(resources) {
    const bodyText = document.body.innerText;

    Object.entries(regexPatterns).forEach(([key, pattern]) => {
      const matches = bodyText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          resources.secrets.add(`${key.toUpperCase()}: ${match}`);
        });
      }
    });
  }

  function extractHiddenForms(resources) {
    document.querySelectorAll('form[style*="display:none"], input[type="hidden"]').forEach(el => {
      const formContent = el.outerHTML.trim();
      if (formContent) {
        resources.hidden_forms.add(`HIDDEN FORM: ${formContent}`);
      }
    });
  }

  function extractMediaURLs(resources) {
    const bodyText = document.body.innerText;
    const mediaMatches = bodyText.match(regexPatterns.media_urls);
    if (mediaMatches) {
      mediaMatches.forEach(url => {
        resources.media.add(`MEDIA: ${url}`);
      });
    }
  }

  function generateHTML(resources) {
    const colors = {
      images: 'green', videos: 'blue', audios: 'purple', documents: 'orange',
      scripts: 'purple', styles: 'red', links: 'teal',
      form_data: 'brown', text_data: 'darkgrey', secrets: 'darkred', hidden_forms: 'darkorange', media: 'blueviolet'
    };

    let html = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        h3 { cursor: pointer; }
        ul { list-style-type: none; padding-left: 10px; }
        li { margin: 5px 0; }
        .hidden { display: none; }
        .collapsible { font-weight: bold; color: black; }
        a { font-size: 10px; text-decoration: none; }
      </style>
      <h1>Resource Scan Results</h1>
    `;

    Object.entries(resources).forEach(([category, items]) => {
      if (items.size > 0) {
        html += `
          <h3 class="collapsible" style="color: ${colors[category]}">${category.toUpperCase()} (${items.size})</h3>
          <ul class="hidden">
            ${Array.from(items).map(item => {
              if (category === 'images') {
                return `<li><img src="${item}" alt="img" width="50" height="50"><a href="${item}" target="_blank">[view]</a></li>`;
              } else if (category === 'text_data' || category === 'secrets' || category === 'hidden_forms') {
                return `<li>${item}</li>`;
              } else {
                return `<li><a href="${item}" target="_blank">${item}</a></li>`;
              }
            }).join('')}
          </ul>
        `;
      }
    });

    const resultWindow = window.open("", "_blank");
    resultWindow.document.write(html);
    resultWindow.document.write(`
      <script>
        document.querySelectorAll('.collapsible').forEach(el => {
          el.addEventListener('click', () => {
            const sibling = el.nextElementSibling;
            sibling.classList.toggle('hidden');
          });
        });
      </script>
    `);
    resultWindow.document.close();
  }

  try {
    console.log("Starting the resource scan...");
    const resources = fetchResources();
    generateHTML(resources);
    console.log("Resource scan completed. Results generated.");
  } catch (err) {
    console.error("Error scanning the page:", err);
  }
})();
