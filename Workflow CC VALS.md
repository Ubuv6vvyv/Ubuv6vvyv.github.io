// --- CONFIGURATION ---
const PAGES_TO_SCRAPE = 3; // How many pages do you want?
const CATEGORY_ID = "1073741826"; 

// Helper function to pause execution (prevents overwhelming the server)
const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchAndDownload() {
  let allItems = []; // This will hold the combined data
  
  console.log(`Starting scrape of ${PAGES_TO_SCRAPE} pages...`);

  // 1. Loop through the pages
  for (let page = 1; page <= PAGES_TO_SCRAPE; page++) {
    const url = `https://www.cashconverters.com.au/c3api/search/results?Sort=newest&page=${page}&Hasvaluationcertificate=&category=${CATEGORY_ID}`;
    
    try {
      console.log(`Fetching page ${page}...`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Extract items
      const items = data.Value?.ProductList?.ProductListItems || [];
      
      if (items.length === 0) {
        console.warn(`Page ${page} was empty. Stopping early.`);
        break;
      }
      
      // Add to our master list
      allItems = allItems.concat(items);
      
      console.log(`--> Page ${page}: Found ${items.length} items.`);
      
      // Wait 1 second before next fetch to be polite
      await delay(1000); 
      
    } catch (err) {
      console.error(`Error on page ${page}:`, err);
    }
  }

  // 2. Output to Console
  console.log("---------------- DONE ----------------");
  console.log(`Total collected: ${allItems.length} items.`);
  
  // Show a preview of the data in a table
  const preview = allItems.map(item => ({
    ID: item.Code,
    Price: item.Sp,
    Title: item.Title
  }));
  console.table(preview);
  
  // 3. Create the JSON file download
  const jsonString = JSON.stringify(allItems, null, 2); // formatting with 2 spaces
  const blob = new Blob([jsonString], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  
  // Create a temporary link element and click it
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "products.json"; // Name of the file to save
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  console.log("File 'products.json' has been downloaded.");
}

// Run it!
fetchAndDownload();





import os
import json
import re

# --- CONFIGURATION ---
JSON_FILENAME = "data.json"  # Ensure matches your file
DRY_RUN = True               # True = Test, False = Real Rename
MAX_TITLE_LENGTH = 50        # Keep titles concise

def format_price(price_str):
    """
    Converts '1714.00' to '1714'.
    Handles errors if price is 'N/A' or empty.
    """
    if not price_str:
        return "0"
    try:
        # Convert to float first to handle .00, then int to remove it
        return str(int(float(price_str)))
    except ValueError:
        # If price is text (like "Contact Store"), just clean it
        return clean_text(price_str)

def clean_text(text):
    """
    Removes illegal chars and brackets so we don't get double brackets [[ ]].
    """
    if not text: return ""
    
    # Remove $ explicitly
    text = text.replace('$', '')
    
    # Remove characters we don't want inside the filename title
    # Including [ and ] so we ensure our script adds the only set
    text = re.sub(r'[<>:"/\\|?*\[\]]', '', text)
    
    # Collapse spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    print(f"--- BRACKET FORMAT RENAME (DRY RUN: {DRY_RUN}) ---")

    # 1. Load JSON
    try:
        with open(JSON_FILENAME, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"[CRITICAL] JSON Error: {e}")
        return

    # Build DB
    lookup_db = {}
    if isinstance(data, list):
        for item in data:
            if "Code" in item:
                lookup_db[str(item["Code"])] = item

    print(f"Loaded {len(lookup_db)} items.")
    print("-" * 50)

    # 2. Process Files
    files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    
    for filename in files:
        # SEARCH FOR CODE:
        # Look for any sequence of 10-13 digits in the filename
        # This allows us to find the code even if the filename is messy
        potential_codes = re.findall(r'\d{10,13}', filename)
        
        found_code = None
        for code in potential_codes:
            if code in lookup_db:
                found_code = code
                break
        
        if not found_code:
            # Skip file if we can't identify it in JSON
            continue

        # 3. Prepare Data
        item_data = lookup_db[found_code]
        
        raw_title = item_data.get("Title", "No Title")
        raw_price = str(item_data.get("Rrp", "0.00"))
        
        # Format: Remove decimals, clean text
        clean_p = format_price(raw_price)
        clean_t = clean_text(raw_title)

        if len(clean_t) > MAX_TITLE_LENGTH:
            clean_t = clean_t[:MAX_TITLE_LENGTH].strip()

        # --- NEW FORMAT: [Price] - [Code] - [Title].pdf ---
        new_name = f"[{clean_p}] - [{found_code}] - [{clean_t}].pdf"

        # 4. Rename Logic
        if filename == new_name:
            continue

        if os.path.exists(new_name):
            print(f"[SKIP] Exists: {new_name}")
            continue

        print(f"Match: {found_code}")
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
