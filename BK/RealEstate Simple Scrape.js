(async function() {
  const listings = [];
  let isRunning = true;
  const xhrData = new Set(); // Store XHR responses

  // Setup XHR interceptor
  const originalXHR = window.XMLHttpRequest;
  function setupXHRInterceptor() {
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;

      xhr.open = function() {
        xhr.addEventListener('load', function() {
          try {
            const response = JSON.parse(xhr.responseText);
            xhrData.add(response);
          } catch (e) {
            // Not JSON data, ignore
          }
        });
        originalOpen.apply(xhr, arguments);
      };

      xhr.send = function() {
        originalSend.apply(xhr, arguments);
      };

      return xhr;
    };
  }

  // Setup control panel
  function createControlPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: white;
      padding: 10px;
      border: 1px solid #ccc;
      z-index: 10000;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    `;

    const stopButton = document.createElement('button');
    stopButton.textContent = 'Stop Scraping';
    stopButton.onclick = () => { isRunning = false; };
    
    const status = document.createElement('div');
    status.id = 'scraper-status';
    
    panel.appendChild(stopButton);
    panel.appendChild(status);
    document.body.appendChild(panel);
    
    return { status };
  }

  // Enhanced auto-scroll with progress tracking
  async function autoScroll() {
    let lastHeight = document.body.scrollHeight;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts && isRunning) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        attempts++;
      } else {
        attempts = 0;
        lastHeight = newHeight;
      }
    }
  }

  // Enhanced image extraction
  function extractImages(li) {
    const images = new Set();
    
    // Direct image elements
    const imgElements = li.querySelectorAll('img');
    imgElements.forEach(img => {
      // Check all possible image attributes
      ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-lazy-load'].forEach(attr => {
        const value = img.getAttribute(attr);
        if (value && !value.includes('placeholder')) {
          images.add(value);
        }
      });
    });

    // Background images
    const elementsWithBg = li.querySelectorAll('[style*="background"]');
    elementsWithBg.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const url = bgImage.replace(/^url\(['"](.+)['"]\)$/, '$1');
        if (!url.includes('placeholder')) {
          images.add(url);
        }
      }
    });

    // Look for image URLs in data attributes
    const allElements = li.querySelectorAll('*');
    allElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && 
            (attr.value.match(/\.(jpg|jpeg|png|gif|webp)/i) || 
             attr.value.includes('images'))) {
          images.add(attr.value);
        }
      });
    });

    return Array.from(images);
  }

  // Setup control panel and XHR interceptor
  setupXHRInterceptor();
  const { status } = createControlPanel();

  // Main scraping loop
  try {
    let pageCount = 0;
    
    while (isRunning) {
      pageCount++;
      status.textContent = `Scanning page ${pageCount}...`;
      
      await autoScroll();

      const listItems = document.querySelectorAll("#argonaut-wrapper > div.results-page > div.layout.layout--no-mobile-gutters.results-page__content > div > div.divided-content > div.tiered-results-container > ul > li");
      
      // Process listings
      listItems.forEach(li => {
        const listingData = {};

        // Basic data extraction
        const titleLink = li.querySelector("div > article > div.residential-card__content-wrapper > div > div:nth-child(1) > div:nth-child(2) > h2 > a");
        listingData.title = titleLink ? titleLink.textContent.trim() : "Title not found";
        listingData.url = titleLink ? titleLink.href : "URL not found";

        const priceElement = li.querySelector(".property-price");
        listingData.price = priceElement ? priceElement.textContent.trim() : "Price not found";

        // Enhanced image extraction
        listingData.photos = extractImages(li);

        listings.push(listingData);
      });

      // Check XHR data for additional information
      xhrData.forEach(data => {
        // Add logic here to process any useful XHR data
        // This will depend on the specific API responses of the site
      });

      const nextButton = document.querySelector('a[rel="next"]');
      if (!nextButton) break;
      
      nextButton.click();
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    // Generate output
    const outputHTML = `
      <html>
      <head>
        <title>Extracted Listings (${listings.length} items)</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 14px; max-width: 1200px; margin: 0 auto; padding: 20px; }
          .listing { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .listing img { width: 150px; height: 100px; object-fit: cover; margin: 5px; border-radius: 3px; }
          .listing-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
          .listing-price { color: #2ecc71; font-size: 18px; margin-bottom: 10px; }
          .listing-photos { display: flex; flex-wrap: wrap; gap: 10px; }
          .stats { margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="stats">
          <h1>Extracted Listings</h1>
          <p>Total listings: ${listings.length}</p>
          <p>Total images: ${listings.reduce((sum, l) => sum + l.photos.length, 0)}</p>
        </div>
        ${listings.map(listing => `
          <div class="listing">
            <div class="listing-title"><a href="${listing.url}" target="_blank">${listing.title}</a></div>
            <div class="listing-price">${listing.price}</div>
            <div class="listing-photos">
              ${listing.photos.map(photo => `
                <a href="${photo}" target="_blank"><img src="${photo}" alt="Listing photo" onerror="this.style.display='none'"></a>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </body>
      </html>
    `;

    const newWindow = window.open();
    newWindow.document.open();
    newWindow.document.write(outputHTML);
    newWindow.document.close();

  } catch (error) {
    console.error('Scraping error:', error);
    status.textContent = `Error: ${error.message}`;
  }
})();
