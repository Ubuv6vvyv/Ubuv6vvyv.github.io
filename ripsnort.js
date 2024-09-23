(function() {
  const categories = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff'],
    videos: ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.flv', '.webm'],
    audios: ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
    documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv'],
    scripts: ['.js', '.ts', '.jsx', '.tsx'],
    styles: ['.css'],
    links: [],
    form_data: [],
    text_data: [],
    secrets: [],
    blob_urls: [],
    other_media: []
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
    media_urls: /\.(mp4|webm|ogg|mp3|wav|avi|mov|flv)(?:\?.*)?$/i,
    reddit_video: /https?:\/\/v\.redd\.it\/[a-zA-Z0-9]+\/.+/
  };

  function classifyResource(url) {
    if (!url) return 'other';

    const lowercaseUrl = url.toLowerCase();
    
    // Check for Reddit-style video URLs
    if (regexPatterns.reddit_video.test(url)) {
      return 'videos';
    }

    // Check for media URLs that don't necessarily end with the file extension
    if (regexPatterns.media_urls.test(lowercaseUrl)) {
      const extension = lowercaseUrl.match(regexPatterns.media_urls)[1];
      if (categories.videos.includes('.' + extension)) return 'videos';
      if (categories.audios.includes('.' + extension)) return 'audios';
      return 'other_media';
    }

    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.some(ext => lowercaseUrl.endsWith(ext) || lowercaseUrl.includes(ext + '?'))) {
        return category;
      }
    }
    
    return 'other';
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
      blob_urls: new Set(),
      other_media: new Set()
    };

    console.log("Scanning for images, videos, audios, scripts, and styles...");

    // Fetch resources from various tags
    document.querySelectorAll('img, video, audio, source, track, link[rel="stylesheet"], script').forEach(tag => {
      const src = tag.src || tag.href || tag.currentSrc || (tag.tagName === 'SOURCE' && tag.src);
      if (src) {
        const category = classifyResource(src);
        if (resources[category]) resources[category].add(src);
        if (src.startsWith('blob:')) {
          resources.blob_urls.add(src);
        }
      }
    });

    // Check for media elements without src attribute (might be using <source> tags)
    document.querySelectorAll('video, audio').forEach(mediaElement => {
      if (!mediaElement.src) {
        mediaElement.querySelectorAll('source').forEach(source => {
          const src = source.src;
          if (src) {
            const category = classifyResource(src);
            if (resources[category]) resources[category].add(src);
          }
        });
      }
    });

    // Additional check for background images and videos
    document.querySelectorAll('*').forEach(el => {
      const styles = window.getComputedStyle(el);
      const bgImage = styles.getPropertyValue('background-image');
      const bgVideo = styles.getPropertyValue('background-video');
      
      [bgImage, bgVideo].forEach(prop => {
        if (prop && prop !== 'none') {
          const matches = prop.match(/url\(['"]?(.*?)['"]?\)/);
          if (matches && matches[1]) {
            const src = matches[1];
            const category = classifyResource(src);
            if (resources[category]) resources[category].add(src);
          }
        }
      });
    });

    // Check for iframes that might contain videos
    document.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.src;
      if (src && (src.includes('youtube.com') || src.includes('vimeo.com') || src.includes('dailymotion.com') || src.includes('v.redd.it'))) {
        resources.videos.add(src);
      }
    });

    console.log("Scanning for links...");
    document.querySelectorAll('a').forEach(a => {
      if (a.href) {
        const category = classifyResource(a.href);
        if (resources[category]) {
          resources[category].add(a.href);
        } else {
          resources.links.add(a.href);
        }
      }
    });

    console.log("Scanning text content...");
    extractText(resources);
    
    console.log("Scanning for secrets and sensitive data...");
    extractSecrets(resources);

    console.log("Scanning for hidden forms...");
    extractHiddenForms(resources);

    console.log("Scanning network requests...");
    scanNetworkRequests(resources);

    console.log("Resource scan completed.");
    return resources;
  }

  function scanNetworkRequests(resources) {
    if (window.performance && window.performance.getEntriesByType) {
      const entries = window.performance.getEntriesByType("resource");
      entries.forEach(entry => {
        const url = entry.name;
        const category = classifyResource(url);
        if (resources[category]) {
          resources[category].add(url);
        }
      });
    }
  }

  function extractText(resources) {
    const bodyText = document.body.innerText.trim();
    if (bodyText) {
      resources.text_data.add(bodyText);
    }
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

  function generateHTML(resources) {
    const colors = {
      images: 'green', videos: 'blue', audios: 'purple', documents: 'orange', 
      scripts: 'brown', styles: 'red', links: 'teal', 
      form_data: 'gray', text_data: 'darkgrey', secrets: 'darkred', 
      hidden_forms: 'darkorange', blob_urls: 'darkviolet', other_media: 'magenta'
    };

    let html = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        h3 { cursor: pointer; }
        ul { list-style-type: none; padding-left: 10px; }
        li { margin: 5px 0; }
        .hidden { display: block; }
        .collapsible { font-weight: bold; color: black; }
        a { font-size: 10px; text-decoration: none; }
        img { max-width: 50px; max-height: 50px; }
        video, audio { max-width: 200px; }
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
                return `<li><img src="${item}" alt="img"><a href="${item}" target="_blank">[view]</a></li>`;
              } else if (category === 'videos' || category === 'audios' || category === 'other_media') {
                const tag = category === 'audios' ? 'audio' : 'video';
                return `<li><${tag} src="${item}" controls></${tag}><a href="${item}" target="_blank">[view]</a></li>`;
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
