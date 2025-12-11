Workflow. Begin with this

(async () => {
  // --- CONFIGURATION ---
  const START_PAGE = 1;
  const END_PAGE = 5;         // Set how many pages you want to scrape
  const CATEGORY = '1073741843'; // Category ID (e.g. Rings)
  
  // Set to true if you ONLY want items that definitely have a certificate.
  // Set to false if you want ALL items (note: the PDF link will be generated for all, but might be dead if no cert exists).
  const REQUIRE_CERTIFICATE = true; 
  // ---------------------

  const baseUrl = 'https://www.cashconverters.com.au/c3api/search/results';
  let allProducts = [];

  // Helper to construct the PDF link based on the ID
  function getPdfUrl(productCode) {
    return `https://www.cashconverters.com.au/globalassets/valuationcertificates/Valuation-Certificate-${productCode}.pdf`;
  }

  // Helper to pause (politeness)
  const delay = ms => new Promise(res => setTimeout(res, ms));

  console.log(`\uD83D\uDE80 Starting scrape for pages ${START_PAGE} to ${END_PAGE}...`);
  if (REQUIRE_CERTIFICATE) console.log("--> Filter active: Only fetching items with valuation certificates.");

  for (let currentPage = START_PAGE; currentPage <= END_PAGE; currentPage++) {
    
    // Build URL params
    const params = new URLSearchParams({
      Sort: 'newest',
      page: currentPage,
      category: CATEGORY,
      // Only add the 'true' filter if configured
      Hasvaluationcertificate: REQUIRE_CERTIFICATE ? 'true' : '' 
    });

    const searchUrl = `${baseUrl}?${params.toString()}`;

    try {
      console.log(`Fetching page ${currentPage}...`);

      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error(`Error: HTTP ${response.status} on page ${currentPage}`);
        continue;
      }

      const data = await response.json();
      const items = data.Value?.ProductList?.ProductListItems || [];

      if (items.length === 0) {
        console.warn(`No products found on page ${currentPage}. Finishing early.`);
        break;
      }

      // Process and Merge Data
      const processedItems = items.map(item => {
        return {
          id: item.Code,
          title: item.Title,
          price: parseFloat(item.Sp), // Convert string price to number
          rrp: parseFloat(item.Rrp),
          location: item.StoreNameWithState,
          valuationUrl: getPdfUrl(item.Code), // <--- The merged PDF logic
          productUrl: `https://www.cashconverters.com.au${item.Url}`,
          imageUrl: item.AbsoluteImageUrl
        };
      });

      allProducts = allProducts.concat(processedItems);
      
      console.log(`--> Page ${currentPage}: Added ${processedItems.length} items.`);

      // Pause for 1 second to be polite
      await delay(1000);

    } catch (error) {
      console.error(`Critical error on page ${currentPage}:`, error);
    }
  }

  // --- FINAL OUTPUT ---
  console.log(`\n\u2705 Finished! Total items collected: ${allProducts.length}`);
  
  // 1. Preview in Console
  if (allProducts.length > 0) {
    console.table(allProducts.slice(0, 5).map(p => ({
      Title: p.title.substring(0, 20) + "...",
      Price: `$${p.price}`,
      PDF: "Link Generated"
    })));
  }

  // 2. Download JSON File
  const jsonString = JSON.stringify(allProducts, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = "valuations_and_products.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log("File 'valuations_and_products.json' downloaded.");

})();


