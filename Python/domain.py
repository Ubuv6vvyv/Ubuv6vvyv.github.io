import requests
import json
import csv
import os
import re
import time
import sys
from datetime import datetime

# --- CONFIGURATION ---
CSV_FILE = "domain_tracker.csv"
CONFIG_FILE = "domain_config.json"
BUILDING_API_URL = "https://www.domain.com.au/building-profile/api/105-clarendon-street-southbank-vic-3006"

# Default headers
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.domain.com.au/building-profile/105-clarendon-street-southbank-vic-3006",
}

# --- CONFIG MANAGER ---

def load_headers():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            print("⚠️  Config file corrupted. Using defaults.")
    return DEFAULT_HEADERS

def save_headers(headers):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(headers, f, indent=4)
    print("✅ Session updated and saved to domain_config.json")

def parse_curl_to_headers(curl_text):
    headers = DEFAULT_HEADERS.copy()
    clean_curl = curl_text.replace('\\\n', ' ').replace('\\', '')
    pattern = r"(?:-H|--header)\s+['\"]([^:]+):\s+(.*?)['\"]"
    matches = re.findall(pattern, clean_curl, re.IGNORECASE)
    
    found_cookie = False
    for key, value in matches:
        headers[key.lower()] = value
        if key.lower() == 'cookie':
            found_cookie = True
            
    if not found_cookie:
        print("⚠️  Warning: No 'cookie' found in cURL.")
        
    return headers

def update_session_interactive():
    print("\n" + "="*60)
    print("🔐 UPDATE SESSION")
    print("Paste your full cURL command below. Type 'GO' on a new line to finish.")
    print("="*60)
    
    lines = []
    while True:
        try:
            line = input()
            if line.strip().upper() == 'GO':
                break
            lines.append(line)
        except EOFError:
            break
            
    full_text = " ".join(lines)
    if len(full_text) < 10:
        print("❌ Input too short.")
        return False
        
    new_headers = parse_curl_to_headers(full_text)
    save_headers(new_headers)
    return True

# --- DATA FUNCTIONS ---

def get_price_int(price_str):
    if not price_str: return 0
    clean = str(price_str).replace(',', '').replace('$', '')
    match = re.search(r'\d+', clean)
    return int(match.group()) if match else 0

def fetch_listings(filter_type, headers):
    # For 'rented', we fetch slightly more to get a history
    params = {"filtertype": filter_type, "pagesize": "50", "pageno": "1"}
    try:
        response = requests.get(BUILDING_API_URL, headers=headers, params=params, timeout=10)
        
        if response.status_code == 403:
            return "403"
        elif response.status_code != 200:
            print(f"  ❌ HTTP {response.status_code}")
            return None
            
        data = response.json()
        return data.get('properties', [])
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def load_csv_data():
    if not os.path.exists(CSV_FILE): return {}
    db = {}
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            db[row['id']] = row
    return db

def save_csv_data(database):
    fieldnames = ['id', 'unit', 'type', 'current_price_str', 'current_price_int', 
                  'last_price_int', 'status', 'first_seen', 'last_seen', 'price_change_date']
    with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for key in sorted(database):
            writer.writerow(database[key])

# --- MAIN LOOP ---

def run_scan():
    headers = load_headers()
    db = load_csv_data()
    
    print(f"\n--- 🕵️ Domain Tracker: {datetime.now().strftime('%H:%M')} ---")
    
    # 1. Fetch all data types
    categories = [("forRent", "Rent"), ("forSale", "Sale"), ("rented", "Rented")]
    all_fetched_items = []

    for filter_key, label in categories:
        print(f"☁️  Fetching {label}...")
        data = fetch_listings(filter_key, headers)
        
        if data in ["403", "TIMEOUT"]:
            print(f"⛔ BLOCK DETECTED during {label} fetch.")
            return False
        
        if data:
            for item in data:
                all_fetched_items.append((label, item))

    # 2. Process
    current_scan_ids = set()
    changes = []
    today = datetime.now().strftime('%Y-%m-%d')

    for m_type, item in all_fetched_items:
        pid = item.get('id')
        current_scan_ids.add(pid)
        unit = item.get('address', {}).get('flatNumber', 'N/A')
        
        # Handle price extraction based on item type
        price_disp = "Contact Agent"
        if m_type == "Rented":
            history = item.get('recentHistory', {}).get('rented', {})
            price_disp = history.get('displayPrice') or "Unknown"
        else:
            on_market = item.get('onMarket', [])
            if on_market:
                price_disp = on_market[0].get('displayPrice', 'Contact Agent')
        
        price_val = get_price_int(price_disp)
        
        if pid in db:
            rec = db[pid]
            old_val = int(rec.get('current_price_int', 0))
            # Only track price changes for active listings (Rent/Sale)
            if m_type != "Rented" and price_val > 0 and old_val > 0 and price_val != old_val:
                diff = price_val - old_val
                icon = "🔺" if diff > 0 else "🔻"
                changes.append(f"{icon} {m_type} Unit {unit}: {price_disp} ({icon} ${abs(diff)})")
                rec['last_price_int'] = old_val
                rec['price_change_date'] = today
            
            rec['current_price_int'] = price_val
            rec['current_price_str'] = price_disp
            rec['last_seen'] = today
            rec['status'] = 'Active' if m_type != "Rented" else "Rented"
        else:
            changes.append(f"🆕 New {m_type}: Unit {unit} - {price_disp}")
            db[pid] = {
                'id': pid, 'unit': unit, 'type': m_type,
                'current_price_str': price_disp, 'current_price_int': price_val,
                'last_price_int': 0, 'status': 'Active' if m_type != "Rented" else "Rented",
                'first_seen': today, 'last_seen': today, 'price_change_date': today
            }

    # Mark removed listings (only for Rent/Sale)
    for pid, rec in db.items():
        if pid not in current_scan_ids and rec['status'] == 'Active' and rec['type'] != 'Rented':
            rec['status'] = 'Removed'
            changes.append(f"❌ {rec['type']} Unit {rec['unit']} removed (was {rec['current_price_str']})")

    save_csv_data(db)

    # 3. Report
    if changes:
        print("\n📢  CHANGES:")
        for c in changes: print(c)
    else:
        print("\n✅ No changes.")

    print("\n" + "="*75)
    print(f"{'UNIT':<6} | {'TYPE':<7} | {'PRICE / LAST KNOWN':<40} | {'DATE':<12}")
    print("-" * 75)
    
    def unit_sort(item):
        try: return int(re.search(r'\d+', item['unit']).group())
        except: return 99999

    # Filter into groups for display
    active_items = [v for v in db.values()]
    rentals = sorted([x for x in active_items if x['type'] == 'Rent' and x['status'] == 'Active'], key=unit_sort)
    sales = sorted([x for x in active_items if x['type'] == 'Sale' and x['status'] == 'Active'], key=unit_sort)
    rented_history = sorted([x for x in active_items if x['type'] == 'Rented'], key=unit_sort)

    for group_name, group_data in [("FOR RENT", rentals), ("FOR SALE", sales), ("RECENTLY RENTED", rented_history)]:
        if group_data:
            print(f"{f'--- {group_name} ---':^75}")
            for r in group_data:
                p = r['current_price_str'][:37] + "..." if len(r['current_price_str']) > 40 else r['current_price_str']
                print(f"{r['unit']:<6} | {r['type']:<7} | {p:<40} | {r['price_change_date']:<12}")
            print("-" * 75)
            
    return True

def main():
    while True:
        success = run_scan()
        if not success:
            print("\n⚠️  SCAN FAILED. Your session cookies have likely expired.")
        
        print("\n[R]efresh Scan  |  [U]pdate Session (Paste cURL)  |  [E]xit")
        choice = input("Select Option: ").strip().upper()
        
        if choice == 'U':
            if update_session_interactive(): continue
        elif choice == 'R':
            continue
        elif choice == 'E':
            break

if __name__ == "__main__":
    main()
