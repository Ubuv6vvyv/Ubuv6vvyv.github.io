(async () => {
  // --- Configuration ---
  const START_PAGE = 1;
  const END_PAGE = 5; // Set how many pages you want
  const CATEGORY = '1073741843';
  const SORT = 'newest';
  // --- End Configuration ---

  const allPdfUrls = [];
  const baseUrl = 'https://www.cashconverters.com.au/c3api/search/results';
  
  // Headers (fewer are needed when running in the browser)
  const headers = {
    "accept": "application/json, text/plain, */*",
    "cache-control": "no-cache",
    "pragma": "no-cache",
  };

  function getPdfUrl(productCode) {
    return `https://www.cashconverters.com.au/globalassets/valuationcertificates/Valuation-Certificate-${productCode}.pdf`;
  }

  console.log(`Starting scraper for pages ${START_PAGE} to ${END_PAGE}...`);

  // Loop from START_PAGE to END_PAGE
  for (let currentPage = START_PAGE; currentPage <= END_PAGE; currentPage++) {
    
    // Build the URL for the current page
    const params = new URLSearchParams({
      Sort: SORT,
      page: currentPage,
      Hasvaluationcertificate: 'true', // The important filter
      category: CATEGORY
    });
    
    const searchUrl = `${baseUrl}?${params.toString()}`;

    console.log(`Fetching page ${currentPage}...`);

    try {
      const response = await fetch(searchUrl, {
        method: "GET",
        headers: headers
      });

      if (!response.ok) {
        console.error(`Error: Received status ${response.status}`);
        break; // Stop if one page fails
      }

      const data = await response.json();

      if (!data.WasSuccessful || !data.Value || !data.Value.ProductList) {
        console.error("API Error: Response format is wrong.");
        break;
      }

      const products = data.Value.ProductList.ProductListItems;

      if (products.length === 0) {
        console.log(`No products found on page ${currentPage}. Finishing early.`);
        break; // Exit the loop
      }

      // Add the new links to our main array
      for (const product of products) {
        const productCode = product.Code;
        const pdfUrl = getPdfUrl(productCode);
        allPdfUrls.push(pdfUrl);
      }
      
      // (Optional) Delay to be polite to their server
      // await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error("A critical error occurred:", error);
      break;
    }
  }

  // --- All Done ---
  console.log(`\n--- Finished Scraping ---`);
  console.log(`Found ${allPdfUrls.length} PDF URLs.`);
  console.log("Copy the block below (links only):");

  // This will print a clean, newline-separated block
  // that you can easily copy and paste into a .txt file.
  console.log(allPdfUrls.join('\n'));

})();
