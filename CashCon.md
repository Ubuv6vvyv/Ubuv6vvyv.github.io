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


import os
import json
import re
import sys

# --- CONFIGURATION ---
JSON_FILENAME = "data.json"
# Default to TEST MODE. Use "python smart_rename.py --commit" to apply changes.
DRY_RUN = "--commit" not in sys.argv
MAX_TITLE_LENGTH = 80

def clean_filename_text(text):
    """
    Standard sanitization: removes illegal chars ($ included) and extra spaces.
    """
    if not text: return ""
    # Remove characters that break file systems OR cause variable issues ($)
    text = re.sub(r'[<>:"/\\|?*$]', '', text)
    # Remove newlines and tabs
    text = text.replace('\n', ' ').replace('\r', '')
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def optimize_title(title):
    """
    Finds the 'highest' carat value (e.g. 18ct > 0.50ct) 
    and moves it to the start of the title.
    """
    if not title: return "No Title"
    
    # regex to find patterns like "9ct", "18ct", "0.24ct", "1.06ct"
    # Case insensitive
    matches = list(re.finditer(r'\b(\d+(?:\.\d+)?)\s*ct\b', title, re.IGNORECASE))
    
    if not matches:
        return title

    # Find the match with the highest numerical value
    # 18ct (gold) is higher than 1.05ct (diamond), so gold usually wins priority
    best_match = max(matches, key=lambda m: float(m.group(1)))
    
    best_text = best_match.group(0) # e.g. "18ct"
    
    # Remove the best match from its original position to avoid duplication
    # We strip extra spaces left behind
    temp_title = title[:best_match.start()] + title[best_match.end():]
    temp_title = re.sub(r'\s+', ' ', temp_title).strip()
    
    # Construct new title: "18ct " + "Rest of title"
    new_title = f"{best_text} {temp_title}"
    
    return new_title

def main():
    mode = "TEST MODE (No changes)" if DRY_RUN else "REAL MODE (Renaming)"
    print(f"--- STARTING SMART RENAME | {mode} ---")

    # 1. Load the New JSON Format
    try:
        with open(JSON_FILENAME, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"[CRITICAL] Could not load {JSON_FILENAME}: {e}")
        return

    # Build Lookup Dictionary using "id" (new format)
    lookup_db = {}
    count = 0
    if isinstance(data, list):
        for item in data:
            if "id" in item:
                lookup_db[str(item["id"])] = item
                count += 1
    
    print(f"Loaded {count} items from JSON.")
    print("-" * 50)

    # 2. Scan Files
    files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    
    for filename in files:
        # Search for the 10-13 digit ID in the filename
        # This works for "Valuation-Certificate-0031..." or existing renamed files
        found_ids = re.findall(r'\d{10,13}', filename)
        
        found_id = None
        for fid in found_ids:
            if fid in lookup_db:
                found_id = fid
                break
        
        if not found_id:
            continue

        # 3. Process Data
        item_data = lookup_db[found_id]
        
        raw_title = item_data.get("title", "No Title")
        raw_price = item_data.get("price", 0) # integer in new json
        
        # A. Clean and Reorder Title
        cleaned_title = clean_filename_text(raw_title)
        optimized_title = optimize_title(cleaned_title)
        
        # Truncate if too long
        if len(optimized_title) > MAX_TITLE_LENGTH:
            optimized_title = optimized_title[:MAX_TITLE_LENGTH].strip()

        # B. Format Price (No decimals, No $)
        try:
            price_str = str(int(float(raw_price)))
        except:
            price_str = "0"

        # 4. Construct New Filename
        # Format: Code - OptimizedTitle - [SellValue Price].pdf
        # Example: 003100301214 - 18ct Gold Ring - [SellValue 2799].pdf
        new_name = f"{found_id} - {optimized_title} - [SellValue {price_str}].pdf"
        
        # 5. Rename Logic
        if filename == new_name:
            continue

        if os.path.exists(new_name):
            print(f"[SKIP] Target exists: {new_name}")
            continue

        print(f"Match: {found_id}")
        print(f"  Old: {filename}")
        print(f"  New: {new_name}")

        if not DRY_RUN:
            try:
                os.rename(filename, new_name)
                print("  -> SUCCESS")
            except Exception as e:
                print(f"  -> ERROR: {e}")
        else:
            print("  -> (No change made)")
        
        print("-" * 30)

if __name__ == "__main__":
    main()
