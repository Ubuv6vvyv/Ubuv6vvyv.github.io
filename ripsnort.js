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
  media_urls: /https?:\/\/(?:[a-zA-Z0-9.-]+\/)*(?:img|document|asset|media|file|resource|video|audio|content|upload|download)(?:\/[a-zA-Z0-9._%-]+)*(?:\.[a-zA-Z0-9]+)?(?:\?[a-zA-Z0-9._%-=&]+)?/g,
  image_urls: /https?:\/\/[^\s'"]+\.(?:jpg|jpeg|png|gif|bmp|svg|webp)/gi,
  video_urls: /https?:\/\/[^\s'"]+\.(?:mp4|webm|ogg|mov|avi)/gi,
  audio_urls: /https?:\/\/[^\s'"]+\.(?:mp3|wav|ogg|m4a)/gi,
  base64: /data:(?:[a-zA-Z]+\/[a-zA-Z]+)?;base64,([A-Za-z0-9+/=]+)/g,
  hex_colors: /#(?:[0-9a-fA-F]{3}){1,2}\b/g,
  css_classes: /\.[a-zA-Z-_]+/g,
  html_ids: /#[a-zA-Z-_]+/g,
  version_numbers: /\b\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9]+)?\b/g
};

const categories = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff'],
  videos: ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.flv', '.webm'],
  audios: ['.mp3', '.wav', '.ogg', '.m4a'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.csv'],
  scripts: ['.js', '.ts', '.jsx', '.tsx'],
  styles: ['.css', '.scss', '.less'],
  fonts: ['.woff', '.woff2', '.eot', '.ttf', '.otf'],
  data: ['.json', '.xml'],
  media: [],
  form_data: [],
  text_data: [],
  secrets: []
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

function safelyAddToSet(set, item) {
  if (item && typeof item === 'string' && item.trim() !== '') {
    set.add(item.trim());
  }
}

function fetchResources() {
  const resources = {
    images: new Set(),
    videos: new Set(),
    audios: new Set(),
    documents: new Set(),
    scripts: new Set(),
    styles: new Set(),
    fonts: new Set(),
    data: new Set(),
    links: new Set(),
    form_data: new Set(),
    text_data: new Set(),
    secrets: new Set(),
    hidden_forms: new Set(),
    media: new Set(),
    metadata: {},
    comments: new Set(),
    iframes: new Set(),
    websockets: new Set(),
    performance: {},
    accessibility: {},
    seo: {},
    third_party: new Set(),
    errors: [],
    cookies: {},
    localStorage: {},
    sessionStorage: {},
    pageStructure: {},
    responsiveness: {},
    colors: {}
  };

  try {
    console.log("Scanning assets...");
    scanAssets(resources);

    console.log("Scanning for links...");
    scanLinks(resources);

    console.log("Scanning text content...");
    extractTextBroadly(resources);

    console.log("Scanning for secrets and sensitive data...");
    extractSecrets(resources);

    console.log("Scanning for hidden forms...");
    extractHiddenForms(resources);

    console.log("Scanning for media URLs...");
    extractMediaURLs(resources);

    console.log("Extracting metadata...");
    extractMetadata(resources);

    console.log("Extracting comments...");
    extractComments(resources);

    console.log("Extracting iframes...");
    extractIframes(resources);

    console.log("Analyzing performance...");
    analyzePerformance(resources);

    console.log("Checking accessibility...");
    checkAccessibility(resources);

    console.log("Analyzing SEO...");
    analyzeSEO(resources);

    console.log("Detecting third-party resources...");
    detectThirdPartyResources(resources);

    console.log("Extracting cookies...");
    extractCookies(resources);

    console.log("Extracting local and session storage...");
    extractStorage(resources);

    console.log("Detecting WebSocket connections...");
    detectWebSockets(resources);

    console.log("Analyzing page structure...");
    analyzePageStructure(resources);

    console.log("Analyzing responsiveness...");
    analyzeResponsiveness(resources);

    console.log("Analyzing fonts...");
    analyzeFonts(resources);

    console.log("Analyzing colors...");
    analyzeColors(resources);

    console.log("Resource scan completed.");
  } catch (err) {
    console.error("Error during resource scan:", err);
    resources.errors.push(err.toString());
  }

  return resources;
}

function scanAssets(resources) {
  document.querySelectorAll('img, video, audio, link[rel="stylesheet"], script, source').forEach(tag => {
    const url = tag.src || tag.href;
    const category = classifyResource(url);
    if (resources[category]) safelyAddToSet(resources[category], url);
  });
}

function scanLinks(resources) {
  document.querySelectorAll('a').forEach(a => {
    if (a.href) safelyAddToSet(resources.links, a.href);
  });
}

function extractTextBroadly(resources) {
  const mainContent = document.querySelector('main') || document.querySelector('article');
  if (mainContent) {
    safelyAddToSet(resources.text_data, 'MAIN_CONTENT: ' + mainContent.innerText);
  }

  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    safelyAddToSet(resources.text_data, `HEADING (${heading.tagName}): ${heading.innerText}`);
  });

  document.querySelectorAll('p').forEach(p => {
    safelyAddToSet(resources.text_data, 'PARAGRAPH: ' + p.innerText);
  });

  document.querySelectorAll('li').forEach(li => {
    safelyAddToSet(resources.text_data, 'LIST_ITEM: ' + li.innerText);
  });

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    safelyAddToSet(resources.text_data, 'META_DESCRIPTION: ' + metaDescription.getAttribute('content'));
  }
}

function extractSecrets(resources) {
  const bodyText = document.body.innerText;
  Object.entries(regexPatterns).forEach(([key, pattern]) => {
    const matches = bodyText.match(pattern);
    if (matches) {
      matches.forEach(match => {
        safelyAddToSet(resources.secrets, `${key.toUpperCase()}: ${match}`);
      });
    }
  });
}

function extractHiddenForms(resources) {
  document.querySelectorAll('form[style*="display:none"], input[type="hidden"]').forEach(el => {
    const formContent = el.outerHTML.trim();
    if (formContent) {
      safelyAddToSet(resources.hidden_forms, `HIDDEN FORM: ${formContent}`);
    }
  });
}

function extractMediaURLs(resources) {
  const bodyText = document.body.innerHTML; // Using innerHTML to catch URLs in attributes
  
  Object.entries(regexPatterns).forEach(([key, pattern]) => {
    if (key.endsWith('_urls')) {
      const matches = bodyText.match(pattern);
      if (matches) {
        matches.forEach(url => {
          if (key === 'image_urls') safelyAddToSet(resources.images, url);
          else if (key === 'video_urls') safelyAddToSet(resources.videos, url);
          else if (key === 'audio_urls') safelyAddToSet(resources.audios, url);
          else safelyAddToSet(resources.media, `${key.toUpperCase()}: ${url}`);
        });
      }
    }
  });
}

function extractMetadata(resources) {
  document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
    resources.metadata[meta.getAttribute('property')] = meta.getAttribute('content');
  });

  document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
    resources.metadata[meta.getAttribute('name')] = meta.getAttribute('content');
  });

  document.querySelectorAll('script[type="application/ld+json"]').forEach((script, index) => {
    try {
      resources.metadata[`structured_data_${index}`] = JSON.parse(script.textContent);
    } catch (e) {
      console.error('Error parsing structured data:', e);
    }
  });
}

function extractComments(resources) {
  const commentNodes = document.evaluate(
    '//comment()',
    document,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  for (let i = 0; i < commentNodes.snapshotLength; i++) {
    safelyAddToSet(resources.comments, commentNodes.snapshotItem(i).textContent);
  }
}

function extractIframes(resources) {
  document.querySelectorAll('iframe').forEach(iframe => {
    safelyAddToSet(resources.iframes, iframe.src);
  });
}

function analyzePerformance(resources) {
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    resources.performance = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
      firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
    };
  }
}

function checkAccessibility(resources) {
  resources.accessibility = {
    imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
    linksWithoutText: document.querySelectorAll('a:not([href]), a[href="#"], a[href=""]').length,
    formInputsWithoutLabels: document.querySelectorAll('input:not([id])').length,
    headingsHierarchy: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.tagName).join(',')
  };
}

function analyzeSEO(resources) {
  resources.seo = {
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content,
    h1Count: document.querySelectorAll('h1').length,
    canonicalLink: document.querySelector('link[rel="canonical"]')?.href,
    robotsMeta: document.querySelector('meta[name="robots"]')?.content
  };
}

function detectThirdPartyResources(resources) {
  const currentDomain = window.location.hostname;
  document.querySelectorAll('script, link, img, iframe').forEach(el => {
    const src = el.src || el.href;
    if (src && !src.includes(currentDomain)) {
      safelyAddToSet(resources.third_party, src);
    }
  });
}

function extractCookies(resources) {
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.split('=').map(c => c.trim());
    resources.cookies[name] = value;
  });
}

function extractStorage(resources) {
  resources.localStorage = { ...localStorage };
  resources.sessionStorage = { ...sessionStorage };
}

function detectWebSockets(resources) {
  if (window.WebSocket) {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      safelyAddToSet(resources.websockets, url);
      return new originalWebSocket(url, protocols);
    };
  }
}

function analyzePageStructure(resources) {
  resources.pageStructure = {
    doctype: document.doctype ? document.doctype.name : 'No DOCTYPE declared',
    htmlLang: document.documentElement.lang,
    headTags: Array.from(document.head.children).map(el => el.tagName),
    bodyClasses: document.body.className,
    mainContentTag: document.querySelector('main') ? 'main' : (document.querySelector('article') ? 'article' : 'No main content wrapper found'),
    footerPresent: !!document.querySelector('footer'),
    navigationPresent: !!document.querySelector('nav'),
    divCount: document.querySelectorAll('div').length,
    nestedDivDepth: getMaxNestedDepth('div'),
  };
}

function getMaxNestedDepth(tagName) {
  let maxDepth = 0;
  const elements = document.getElementsByTagName(tagName);

  for (let el of elements) {
    let depth = 0;
    let parent = el.parentElement;
    while (parent) {
      if (parent.tagName.toLowerCase() === tagName) {
        depth++;
      }
      parent = parent.parentElement;
    }
    maxDepth = Math.max(maxDepth, depth);
  }

  return maxDepth;
}

function analyzeResponsiveness(resources) {
  resources.responsiveness = {
    viewportMeta: document.querySelector('meta[name="viewport"]')?.content,
    mediaQueries: getMediaQueries(),
    flexboxUsage: document.querySelectorAll('*').length - document.querySelectorAll('*:not([style*="display: flex"], [style*="display:flex"])').length,
    gridUsage: document.querySelectorAll('*').length - document.querySelectorAll('*:not([style*="display: grid"], [style*="display:grid"])').length,
  };
}

function getMediaQueries() {
  const mediaQueries = new Set();
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSMediaRule) {
          mediaQueries.add(rule.conditionText);
        }
      }
    } catch (e) {
      console.warn('Cannot access stylesheet rules', e);
    }
  }
  return Array.from(mediaQueries);
}

function analyzeFonts(resources) {
  resources.fonts = {
    declared: [],
    used: new Set()
  };

  // Get declared fonts
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSFontFaceRule) {
          resources.fonts.declared.push(rule.style.getPropertyValue('font-family').replace(/['"]/g, ''));
        }
      }
    } catch (e) {
      console.warn('Cannot access stylesheet rules', e);
    }
  }

  // Get used fonts
  document.querySelectorAll('*').forEach(el => {
    const fontFamily = window.getComputedStyle(el).getPropertyValue('font-family');
    fontFamily.split(',').forEach(font => {
      resources.fonts.used.add(font.trim().replace(/['"]/g, ''));
    });
  });

  resources.fonts.used = Array.from(resources.fonts.used);
}

function analyzeColors(resources) {
  resources.colors = {
    background: new Set(),
    text: new Set()
  };

  document.querySelectorAll('*').forEach(el => {
    const style = window.getComputedStyle(el);
    resources.colors.background.add(style.getPropertyValue('background-color'));
    resources.colors.text.add(style.getPropertyValue('color'));
  });

  resources.colors.background = Array.from(resources.colors.background);
  resources.colors.text = Array.from(resources.colors.text);
}

function generateHTML(resources) {
  const colors = {
    images: 'green', videos: 'blue', audios: 'purple', documents: 'orange',
    scripts: 'purple', styles: 'red', links: 'teal', fonts: 'pink',
    data: 'brown', form_data: 'brown', text_data: 'darkgrey', 
    secrets: 'darkred', hidden_forms: 'darkorange', media: 'blueviolet',
    comments: 'grey', iframes: 'coral', websockets: 'darkgreen',
    third_party: 'indianred'
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
      pre { white-space: pre-wrap; word-wrap: break-word; }
      .media-preview { max-width: 100px; max-height: 100px; margin-right: 10px; }
    </style>
    <h1>Resource Scan Results</h1>
  `;

  Object.entries(resources).forEach(([category, items]) => {
    if (items && (items.size > 0 || Object.keys(items).length > 0)) {
      html += `
        <h3 class="collapsible" style="color: ${colors[category] || 'black'}">${category.toUpperCase()} (${items.size || Object.keys(items).length})</h3>
        <div class="content hidden">
      `;

      if (items instanceof Set) {
        html += `<ul>
          ${Array.from(items).map(item => `<li>${formatItem(category, item)}</li>`).join('')}
        </ul>`;
      } else if (typeof items === 'object') {
        html += `<pre>${JSON.stringify(items, null, 2)}</pre>`;
      }

      html += `</div>`;
    }
  });

  html += `
    <script>
      document.querySelectorAll('.collapsible').forEach(el => {
        el.addEventListener('click', () => {
          el.classList.toggle('active');
          const content = el.nextElementSibling;
          content.style.display = content.style.display === 'block' ? 'none' : 'block';
        });
      });

      function playMedia(url) {
        const player = document.createElement(url.includes('video') ? 'video' : 'audio');
        player.src = url;
        player.controls = true;
        player.style.maxWidth = '100%';
        document.body.appendChild(player);
      }
    </script>
  `;

  const resultWindow = window.open("", "_blank");
  resultWindow.document.write(html);
  resultWindow.document.close();
}

function formatItem(category, item) {
  switch (category) {
    case 'images':
      return `<img src="${item}" alt="img" class="media-preview"><a href="${item}" target="_blank">[view]</a>`;
    case 'videos':
      return `<video src="${item}" class="media-preview"></video><a href="${item}" target="_blank">[view]</a>`;
    case 'audios':
      return `<audio src="${item}" class="media-preview"></audio><a href="${item}" target="_blank">[view]</a>`;
    case 'documents':
    case 'scripts':
    case 'styles':
    case 'fonts':
    case 'data':
      return `<a href="${item}" target="_blank">${item}</a>`;
    case 'text_data':
    case 'secrets':
    case 'hidden_forms':
      return `<pre>${item}</pre>`;
    default:
      return item;
  }
}

// Main execution
(function () {
  try {
    console.log("Starting the resource scan...");
    const resources = fetchResources();
    generateHTML(resources);
    console.log("Resource scan completed. Results generated.");
  } catch (err) {
    console.error("Error scanning the page:", err);
  }
})();
    
