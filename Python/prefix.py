import requests
from bs4 import BeautifulSoup
import string
import csv
import time
import random
import urllib3
import concurrent.futures

# 1. SETUP
# ---------------------------------------------------------
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
OUTPUT_FILE = "/storage/emulated/0/Download/Data/shipping_lines_resolved.csv"
MAX_WORKERS = 15 
# ---------------------------------------------------------

def get_headers():
    agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
    ]
    return {'User-Agent': random.choice(agents)}

def resolve_final_url(redirect_url):
    """
    Follows the redirect to find the final destination URL.
    Uses stream=True to avoid downloading the whole external website.
    """
    if not redirect_url or "http" not in redirect_url:
        return "N/A"
        
    try:
        # We set a short timeout (5s) because external sites might be dead
        with requests.get(redirect_url, headers=get_headers(), verify=False, timeout=8, stream=True) as resp:
            return resp.url # This gives the final resolved URL
    except Exception:
        # If it fails (timeout/dead link), return the original redirect so you have *something*
        return redirect_url

def fetch_safe(url):
    try:
        resp = requests.get(url, headers=get_headers(), timeout=15, verify=False)
        if resp.status_code == 200:
            return resp.text
    except:
        return None
    return None

def get_prefix_links():
    """Phase 1: Scan A-Z Index"""
    all_items = []
    print("🚀 PHASE 1: Scanning Index (A-Z)...")
    
    for char in string.ascii_lowercase:
        url = f"https://www.shippingline.org/container-numbers/{char}/"
        html = fetch_safe(url)
        
        if html:
            soup = BeautifulSoup(html, 'html.parser')
            links = soup.select("ul.lis li a")
            if not links: links = soup.select("#bodyinside ul li a")
            
            for link in links:
                prefix = link.get_text(strip=True)
                href = link.get('href')
                if prefix and href and "container-number" in href:
                    if not href.startswith("http"):
                        href = "https://www.shippingline.org" + href
                    all_items.append((prefix, href))
    return all_items

def process_page(data):
    """Phase 2: Extract details AND resolve the URL"""
    prefix, url = data
    company = "Unknown"
    final_website = "N/A"
    
    html = fetch_safe(url)
    if html:
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. Get Company Name
        h3s = soup.find_all('h3')
        for h3 in h3s:
            text = h3.get_text(strip=True)
            if "Shipping line" in text:
                company = text.replace("Shipping line", "").replace(":", "").strip()
                break

        # 2. Get Raw Website Link
        raw_link = None
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            if "Website" in p.get_text():
                link = p.find('a')
                if link:
                    # Check href first, as that contains the redirect logic
                    href = link.get('href')
                    if href:
                        if href.startswith("/"):
                            raw_link = "https://www.shippingline.org" + href
                        else:
                            raw_link = href
                    # Fallback to text if href is empty
                    elif link.get_text(strip=True).startswith("http"):
                        raw_link = link.get_text(strip=True)
                break
        
        # 3. RESOLVE THE URL (The New Step)
        if raw_link:
            if "shippingline.org/click/" in raw_link:
                # It's a redirect, let's resolve it!
                final_website = resolve_final_url(raw_link)
            else:
                # It's already a direct link
                final_website = raw_link

    print(f"  [{prefix}] {company} -> {final_website}")
    return [prefix, company, final_website, url]

def main():
    targets = get_prefix_links()
    total = len(targets)
    
    if total == 0:
        print("❌ No targets found.")
        return

    print(f"\n🚀 PHASE 2: Scraping & Resolving URLs for {total} items...")
    print("   (This step takes longer because we check external websites)")

    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Prefix", "Company Name", "Final Website", "Source URL"])
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_item = {executor.submit(process_page, item): item for item in targets}
            
            for future in concurrent.futures.as_completed(future_to_item):
                try:
                    row = future.result()
                    writer.writerow(row)
                    f.flush()
                except Exception as e:
                    print(f"Error: {e}")

    print(f"\n✅ SUCCESS! File saved: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
