javascript:(function(){
  "use strict";
  let selectedElements = [], crawledData = [], isSelecting = false, isScrolling = false, isPaginating = false, currentPage = 1, maxPages = 5;

  const createUI = () => {
    const ui = document.createElement("div");
    ui.id = "crawler-ui";
    ui.style = "position:fixed;top:0;left:0;width:100%;background:#191970;color:#E6E6FA;padding:10px;font-family:'Courier New',monospace;font-size:12px;z-index:10000;border-bottom:2px solid #E6E6FA;";

    const log = document.createElement("div");
    log.id = "crawler-log";
    log.style = "position:fixed;bottom:10px;right:10px;width:250px;max-height:150px;overflow-y:auto;background:#191970;color:#E6E6FA;padding:10px;font-family:'Courier New',monospace;font-size:10px;z-index:10000;border:1px solid #E6E6FA;box-shadow:0 0 10px #E6E6FA;";

    document.body.appendChild(ui);
    document.body.appendChild(log);
    return { ui, log };
  };

  const { ui, log } = createUI();

  const addToLog = (message) => {
    const entry = document.createElement("div");
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  };

  const createButton = (text, onClick) => {
    const button = document.createElement("button");
    button.textContent = text;
    button.style = "background:#000080;color:#E6E6FA;border:1px solid #E6E6FA;padding:3px 6px;margin-right:3px;cursor:pointer;user-select:none;font-family:'Courier New',monospace;font-size:10px;transition:all 0.3s ease;";
    button.onmouseover = () => { button.style.background = "#E6E6FA"; button.style.color = "#000080"; };
    button.onmouseout = () => { button.style.background = "#000080"; button.style.color = "#E6E6FA"; };
    button.onclick = onClick;
    return button;
  };

  const toggleSelection = () => {
    isSelecting = !isSelecting;
    if (isSelecting) {
      document.body.style.cursor = "crosshair";
      document.body.addEventListener("click", selectElement);
      addToLog("Element selection enabled. Click on elements to select.");
    } else {
      document.body.style.cursor = "default";
      document.body.removeEventListener("click", selectElement);
      addToLog("Element selection disabled.");
    }
  };

  const selectElement = (event) => {
    if (event.target.id === "crawler-ui" || event.target.closest("#crawler-ui") || event.target.id === "crawler-log") return;
    event.preventDefault();
    event.stopPropagation();

    const element = event.target;
    const selector = getSelector(element);
    const xpath = getXPath(element);

    selectSimilarElements(element, selector, xpath);
  };

  const selectSimilarElements = (element, selector, xpath) => {
    getSimilarElements(element).forEach(el => {
      if (!selectedElements.some(item => item.element === el)) {
        selectedElements.push({ element: el, selector: getSelector(el), xpath: getXPath(el) });
        el.style.outline = "2px solid #E6E6FA";
      }
    });
    addToLog(`Selected ${getSimilarElements(element).length} elements similar to: ${selector}`);
  };

  const getSimilarElements = (element) => {
    const tagName = element.tagName;
    const className = element.className;
    const attributes = Array.from(element.attributes).map(attr => attr.name);
    return Array.from(document.querySelectorAll(tagName)).filter(el => 
      el.className === className && 
      attributes.every(attr => el.hasAttribute(attr)) && 
      el.textContent.trim().length > 0
    );
  };

  const getSelector = (element) => {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(" ").join(".")}`;
    let selector = element.tagName.toLowerCase();
    let parent = element.parentElement;
    while (parent) {
      const index = Array.from(parent.children).indexOf(element) + 1;
      selector = `${parent.tagName.toLowerCase()} > ${selector}:nth-child(${index})`;
      if (parent.id) return `#${parent.id} > ${selector}`;
      element = parent;
      parent = element.parentElement;
    }
    return selector;
  };

  const getXPath = (element) => {
    if (element.id !== '') return 'id("' + element.id + '")';
    if (element === document.body) return element.tagName;
    let ix = 0;
    const siblings = element.parentNode.childNodes;
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) return getXPath(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
    }
  };

  const crawlSelected = () => {
    crawledData = [];
    selectedElements.forEach(({ element, selector, xpath }) => {
      const data = {
        selector: selector,
        xpath: xpath,
        text: element.innerText.trim().replace(/\s+/g, " "),
        html: element.innerHTML.trim().replace(/\s+/g, " "),
        attributes: Object.fromEntries(Array.from(element.attributes).map(attr => [attr.name, attr.value]))
      };
      if (element.tagName === "IMG") {
        data.thumbnail = element.src;
      }
      const links = Array.from(element.querySelectorAll("a")).map(a => a.href);
      if (links.length > 0) {
        data.links = links;
      }
      crawledData.push(data);
    });
    addToLog(`Crawled ${crawledData.length} elements.`);
    showDataPreview();
  };

  const showDataPreview = () => {
    const existingPreview = document.getElementById("data-preview");
    if (existingPreview) existingPreview.remove();

    const preview = document.createElement("div");
    preview.id = "data-preview";
    preview.style = "position:fixed;top:40px;right:10px;width:250px;max-height:70%;overflow:auto;background:#191970;color:#E6E6FA;padding:10px;border:1px solid #E6E6FA;z-index:10001;font-family:'Courier New',monospace;font-size:10px;";

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style = "position:absolute;top:5px;right:5px;background:#000080;color:#E6E6FA;border:1px solid #E6E6FA;padding:2px 5px;cursor:pointer;font-family:'Courier New',monospace;font-size:10px;";
    closeButton.onclick = () => preview.remove();

    preview.innerHTML = `<h3>Data Preview (${crawledData.length} items)</h3><pre>${JSON.stringify(crawledData, null, 2)}</pre>`;
    preview.appendChild(closeButton);
    document.body.appendChild(preview);
  };

  const downloadData = () => {
    const dataStr = JSON.stringify(crawledData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crawled_data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const autoExtract = () => {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const images = document.querySelectorAll("img");
    const paragraphs = document.querySelectorAll("p");
    const lists = document.querySelectorAll("ul, ol");
    const tables = document.querySelectorAll("table");

    crawledData = [
      ...Array.from(headings).map(h => ({ type: "heading", text: h.innerText.trim(), level: h.tagName })),
      ...Array.from(images).filter(img => img.width > 100 && img.height > 100).map(img => ({ type: "image", src: img.src, alt: img.alt, width: img.width, height: img.height })),
      ...Array.from(paragraphs).filter(p => p.innerText.trim().length > 50).map(p => ({ type: "paragraph", text: p.innerText.trim().replace(/\s+/g, " ") })),
      ...Array.from(lists).map(list => ({ type: list.tagName.toLowerCase(), items: Array.from(list.querySelectorAll("li")).map(li => li.innerText.trim()) })),
      ...Array.from(tables).map(table => ({
        type: "table",
        headers: Array.from(table.querySelectorAll("th")).map(th => th.innerText.trim()),
        rows: Array.from(table.querySelectorAll("tr")).map(tr => Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim()))
      }))
    ];

    addToLog(`Auto-extracted ${crawledData.length} elements.`);
    showDataPreview();
  };

  const getAllUrls = () => {
    const urls = Array.from(document.querySelectorAll("a")).map(a => a.href);
    const uniqueUrls = [...new Set(urls)];
    crawledData = uniqueUrls.map(url => ({ type: "url", href: url }));
    addToLog(`Extracted ${uniqueUrls.length} unique URLs.`);
    showDataPreview();
  };

  const resetScript = () => {
    selectedElements.forEach(({ element }) => { element.style.outline = ""; });
    selectedElements = [];
    crawledData = [];
    isSelecting = false;
    isScrolling = false;
    isPaginating = false;
    currentPage = 1;
    document.body.style.cursor = "default";
    document.body.removeEventListener("click", selectElement);
    const dataPreview = document.getElementById("data-preview");
    if (dataPreview) dataPreview.remove();
    log.innerHTML = "";
    addToLog("Script reset. All windows closed and script reloaded.");
  };

  const extractAllImages = () => {
    const images = document.querySelectorAll("img");
    const imageGrid = document.createElement("div");
    imageGrid.style = "position:fixed;top:40px;left:10px;width:80%;height:80%;overflow:auto;background:#191970;padding:10px;border:1px solid #E6E6FA;z-index:10001;display:grid;grid-template-columns:repeat(auto-fill, minmax(100px, 1fr));gap:10px;";

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style = "position:fixed;top:45px;right:15px;background:#000080;color:#E6E6FA;border:1px solid #E6E6FA;padding:5px 10px;cursor:pointer;z-index:10002;font-family:'Courier New',monospace;font-size:10px;";
    closeButton.onclick = () => { imageGrid.remove(); closeButton.remove(); };

    images.forEach(img => {
      const imgContainer = document.createElement("div");
      const imgElement = document.createElement("img");
      imgElement.src = img.src;
      imgElement.style = "width: 100px; height: 100px; object-fit: cover;";
      const imgInfo = document.createElement("div");
      imgInfo.textContent = `Src: ${img.src.substring(0, 30)}...\nAlt: ${img.alt}\n${img.width}x${img.height}`;
      imgInfo.style = "font-size: 8px; word-wrap: break-word; color: #E6E6FA;";
      imgContainer.appendChild(imgElement);
      imgContainer.appendChild(imgInfo);
      imageGrid.appendChild(imgContainer);
    });

    document.body.appendChild(imageGrid);
    document.body.appendChild(closeButton);
    addToLog(`Extracted ${images.length} images.`);
  };

  const infiniteScroll = async () => {
    isScrolling = true;
    const getScrollHeight = () => document.documentElement.scrollHeight;
    const getClientHeight = () => document.documentElement.clientHeight;
    let lastScrollHeight = getScrollHeight();

    while (isScrolling) {
      window.scrollTo(0, getScrollHeight());
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (getScrollHeight() === lastScrollHeight) {
        isScrolling = false;
        addToLog("Reached end of infinite scroll.");
        break;
      }
      lastScrollHeight = getScrollHeight();
      addToLog(`Scrolled to ${lastScrollHeight}px`);
      crawlSelected();
    }
  };

  const paginateCrawl = async () => {
    isPaginating = true;
    while (isPaginating && currentPage <= maxPages) {
      addToLog(`Crawling page ${currentPage}`);
      crawlSelected();

      const nextButton = document.querySelector('a[rel="next"], a:contains("Next"), a:contains("»")');
      if (!nextButton) {
        isPaginating = false;
        addToLog("No more pages to crawl.");
        break;
      }
      nextButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      currentPage++;
    }
    addToLog("Pagination crawl complete.");
  };

  const recursiveScan = async (depth = 1, maxDepth = 3) => {
    if (depth > maxDepth) return;

    const currentUrl = window.location.href;
    const currentHostname = new URL(currentUrl).hostname;
    const crawledUrls = new Set();
    const linksQueue = [];
    const scannedData = {
      links: new Set(),
      images: new Set()
    };

    const scanPage = async (url) => {
      if (crawledUrls.has(url)) return;
      crawledUrls.add(url);

      try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract and log links
        const links = Array.from(doc.querySelectorAll('a')).map(a => a.href);
        links.forEach(link => {
          if (!scannedData.links.has(link)) {
            scannedData.links.add(link);
            addToLog(`Found link: ${link}`);
            if (new URL(link).hostname === currentHostname && !crawledUrls.has(link)) {
              linksQueue.push(link);
            }
          }
        });

        // Extract and log images
        const images = Array.from(doc.querySelectorAll('img'));
        images.forEach(img => {
          const imgData = {
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height
          };
          const imgKey = JSON.stringify(imgData);
          if (!scannedData.images.has(imgKey)) {
            scannedData.images.add(imgKey);
            addToLog(`Found image: ${img.src} (Alt: ${img.alt}, ${img.width}x${img.height})`);
          }
        });

        // Extract text content
        const textContent = doc.body.innerText.trim().replace(/\s+/g, ' ').slice(0, 200);
        addToLog(`Page content preview: ${textContent}...`);

      } catch (error) {
        addToLog(`Error scanning ${url}: ${error.message}`);
      }
    };

    addToLog(`Starting recursive scan at depth ${depth}`);
    await scanPage(currentUrl);

    const concurrentScans = 5; // Adjust this value to control scan speed vs. server load
    while (linksQueue.length > 0 && depth < maxDepth) {
      const batch = linksQueue.splice(0, concurrentScans);
      await Promise.all(batch.map(url => scanPage(url)));
      depth++;
    }

    crawledData = [
      ...Array.from(scannedData.links).map(link => ({ type: 'link', url: link })),
      ...Array.from(scannedData.images).map(imgJson => ({ type: 'image', ...JSON.parse(imgJson) }))
    ];

    addToLog(`Recursive scan complete. Scanned ${crawledUrls.size} pages, found ${scannedData.links.size} links and ${scannedData.images.size} images.`);
    showDataPreview();
  };

  // Create UI buttons
  ui.appendChild(createButton("Toggle Selection", toggleSelection));
  ui.appendChild(createButton("Crawl Selected", crawlSelected));
  ui.appendChild(createButton("Auto Extract", autoExtract));
  ui.appendChild(createButton("Get All URLs", getAllUrls));
  ui.appendChild(createButton("Extract All Images", extractAllImages));
  ui.appendChild(createButton("Infinite Scroll", infiniteScroll));
  ui.appendChild(createButton("Paginate Crawl", paginateCrawl));
  ui.appendChild(createButton("Recursive Scan", () => recursiveScan()));
  ui.appendChild(createButton("Reset Script", resetScript));
  ui.appendChild(createButton("Download Data", downloadData));

  // Mobile optimization
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    ui.style.fontSize = "14px";
    ui.style.padding = "15px";
    log.style.width = "80%";
    log.style.left = "10%";
    log.style.right = "10%";
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      toggleSelection();
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      crawlSelected();
    } else if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      downloadData();
    } else if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      resetScript();
    }
  });

  // Initialization
  addToLog("Advanced Web Scraper Bookmarklet loaded. Use the buttons or keyboard shortcuts to start scraping.");

})();
