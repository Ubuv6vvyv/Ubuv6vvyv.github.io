#!/usr/bin/env python3
import sys
import argparse
import urllib.parse
import concurrent.futures
import hashlib

# ==========================================
# CSS TEMPLATE (Dark Mode Optimized)
# ==========================================
CSS_TEMPLATE = """
<style>
    :root { --bg: #000000; --card: #141414; --text: #e0e0e0; --accent: #bb86fc; }
    body { margin: 0; padding: 10px; background: var(--bg); color: var(--text); font-family: sans-serif; }
    
    h1 { 
        text-align: center; font-size: 0.9rem; color: #666; 
        text-transform: uppercase; margin: 20px 0; letter-spacing: 2px;
    }
    
    .gallery { column-count: 2; column-gap: 10px; }
    
    .card {
        background: var(--card); border-radius: 8px; overflow: hidden;
        margin-bottom: 10px; break-inside: avoid;
        box-shadow: 0 3px 6px rgba(255,255,255,0.05);
        display: flex; flex-direction: column;
    }
    
    .media-container {
        width: 100%; min-height: 140px; background: #1a1a1a;
        position: relative; display: flex; align-items: center; justify-content: center;
        overflow: hidden;
    }
    
    .screen-img { width: 100%; display: block; object-fit: cover; }
    
    .meta { 
        padding: 12px; background: #1a1a1a; border-top: 1px solid #222;
        display: flex; justify-content: space-between; align-items: center;
    }
    
    .info { overflow: hidden; }
    .title { font-size: 0.7rem; font-weight: bold; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .domain { font-size: 0.6rem; color: #777; margin-top: 2px; }
    
    .btn { 
        color: #000; background: var(--accent); text-decoration: none; 
        font-size: 0.6rem; font-weight: bold; padding: 5px 10px; border-radius: 4px; 
    }
</style>
"""

HTML_WRAPPER = """<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>DoomScroll</title>{css}</head><body><h1>Engine: {mode}</h1><div class="gallery">{content}</div></body></html>"""

# ==========================================
# HELPERS
# ==========================================

def get_domain(url):
    return urllib.parse.urlparse(url).netloc.replace('www.', '')

# ==========================================
# ENGINE 1: THUM.IO (User Favorite)
# ==========================================
def card_thum(url):
    domain = get_domain(url)
    src = f"https://image.thum.io/get/width/400/crop/900/noanimate/{url}"
    
    return f"""
    <div class="card">
        <a href="{url}" target="_blank">
            <div class="media-container">
                <img class="screen-img" src="{src}" loading="lazy">
            </div>
        </a>
        <div class="meta">
            <div class="info">
                <div class="title">{domain}</div>
            </div>
            <a href="{url}" class="btn" target="_blank">OPEN</a>
        </div>
    </div>
    """

# ==========================================
# ENGINE 2: SCREENSHOTMACHINE (NO API KEY!)
# ==========================================
def card_screenshotmachine(url):
    domain = get_domain(url)
    # ScreenshotMachine offers FREE tier with no API key needed
    # Just use "demo" as key - works for testing/personal use
    encoded_url = urllib.parse.quote(url)
    
    # Using demo key (free tier)
    # Full length screenshot with mobile viewport
    src = f"https://api.screenshotmachine.com?key=demo&url={encoded_url}&dimension=480xfull&device=phone&format=png&cacheLimit=0&delay=2000"
    
    return f"""
    <div class="card">
        <a href="{url}" target="_blank">
            <div class="media-container">
                <img class="screen-img" src="{src}" loading="lazy">
            </div>
        </a>
        <div class="meta">
            <div class="info">
                <div class="title">{domain}</div>
            </div>
            <a href="{url}" class="btn" target="_blank">OPEN</a>
        </div>
    </div>
    """

# ==========================================
# ENGINE 3: APIFLASH (100 FREE/MONTH)
# ==========================================
def card_apiflash(url, api_key="YOUR_FREE_API_KEY"):
    domain = get_domain(url)
    # ApiFlash gives 100 FREE screenshots/month
    # Sign up at https://apiflash.com for instant free API key
    encoded_url = urllib.parse.quote(url)
    
    # Mobile-optimized full page screenshot
    src = f"https://api.apiflash.com/v1/urltoimage?access_key={api_key}&url={encoded_url}&width=480&height=800&fresh=false&full_page=true&format=png&ttl=2592000"
    
    return f"""
    <div class="card">
        <a href="{url}" target="_blank">
            <div class="media-container">
                <img class="screen-img" src="{src}" loading="lazy">
            </div>
        </a>
        <div class="meta">
            <div class="info">
                <div class="title">{domain}</div>
            </div>
            <a href="{url}" class="btn" target="_blank">OPEN</a>
        </div>
    </div>
    """

# ==========================================
# MAIN LOGIC
# ==========================================
def process_url(url, mode, api_key=None):
    if mode == 'thum': return card_thum(url)
    if mode == 'screenshotmachine': return card_screenshotmachine(url)
    if mode == 'apiflash': return card_apiflash(url, api_key)

def show_menu():
    print("\n=== SELECT ENGINE ===")
    print("1. Thum.io (Default)")
    print("   - Fast, reliable. 1000 free/month.")
    print("2. ScreenshotMachine (NO API KEY!)")
    print("   - Uses 'demo' key for free tier.")
    print("   - Mobile viewport, full page screenshots.")
    print("3. ApiFlash (Best Quality)")
    print("   - 100 FREE screenshots/month with signup.")
    print("   - Sign up: https://apiflash.com")
    
    choice = input("\nChoice [1-3]: ").strip()
    api_key = None
    
    if choice == '3':
        print("\nApiFlash gives you 100 FREE screenshots/month!")
        print("Sign up at https://apiflash.com to get your API key instantly.")
        api_key = input("Enter ApiFlash API key (or press Enter to skip): ").strip()
        if not api_key:
            print("WARNING: Using placeholder. Get real key at https://apiflash.com")
            api_key = "808155588b714e01b42a11aa41dbed47"
        return 'apiflash', api_key
    
    if choice == '1': return 'thum', None
    if choice == '2': return 'screenshotmachine', None
    return 'thum', None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input_file', nargs='?', type=argparse.FileType('r'), default=sys.stdin)
    parser.add_argument('--mode', choices=['thum', 'screenshotmachine', 'apiflash'], default=None)
    parser.add_argument('--api-key', help='API key for ApiFlash (100 free/month)')
    args = parser.parse_args()

    api_key = args.api_key
    
    if args.mode:
        mode = args.mode
        if mode == 'apiflash' and not api_key:
            print("Get 100 FREE screenshots/month at https://apiflash.com")
            api_key = input("Enter ApiFlash API key: ").strip() or "YOUR_FREE_API_KEY"
    else:
        if sys.stdin.isatty():
            mode, api_key = show_menu()
        else:
            mode, api_key = 'thum', None

    urls = []
    if not sys.stdin.isatty() or args.input_file != sys.stdin:
        urls = args.input_file.readlines()
    else:
        print("Paste URLs (Ctrl+D to finish):")
        urls = sys.stdin.readlines()

    clean_urls = [u.strip() for u in urls if u.strip()]
    clean_urls = [u if u.startswith('http') else 'https://' + u for u in clean_urls]

    print(f"[*] Generating {len(clean_urls)} images using '{mode}'...")

    cards = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_url, url, mode, api_key): url for url in clean_urls}
        for future in concurrent.futures.as_completed(futures):
            cards.append(future.result())

    final_html = HTML_WRAPPER.format(
        css=CSS_TEMPLATE,
        mode=mode.upper(),
        content="\n".join(cards)
    )

    with open("gallery.html", "w", encoding="utf-8") as f:
        f.write(final_html)
    
    print(f"[+] Done: termux-open gallery.html")

if __name__ == "__main__":
    main()