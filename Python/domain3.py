import requests
import json
import csv
import os
import re
import time
import shutil
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from collections import defaultdict

# --- CONFIGURATION ---
CSV_FILE = "domain_tracker.csv"
CSV_BACKUP = "domain_tracker.backup.csv"
TRENDS_FILE = "domain_trends.csv"
CONFIG_FILE = "domain_config.json"
SUBURBS_FILE = "suburbs.json"

# --- ANSI COLORS FOR TERMUX ---
class C:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

# --- NETWORK SESSION WITH RETRY ---
def get_session():
    session = requests.Session()
    retry = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

def clean_url_string(dirty_string):
    """Extracts a valid URL from a string containing noise like '* ' or '$'"""
    if not dirty_string: return ""
    # Regex to find http/https url inside a messy string
    match = re.search(r'(https?://[\w\-\./]+)', str(dirty_string))
    if match:
        return match.group(1)
    return ""

def load_suburbs():
    data = []
    if os.path.exists(SUBURBS_FILE):
        try:
            with open(SUBURBS_FILE, 'r') as f:
                data = json.load(f)
        except:
            pass
    
    # --- AUTO-REPAIR DIRTY JSON ---
    # This block fixes the "* https://..." entries automatically
    cleaned = False
    valid_data = []
    
    if not data:
        # Default starter if file is empty
        valid_data = [{
            "name": "Southbank - 105 Clarendon St",
            "url": "https://www.domain.com.au/building-profile/api/105-clarendon-street-southbank-vic-3006",
            "referer": "https://www.domain.com.au/building-profile/105-clarendon-street-southbank-vic-3006"
        }]
    else:
        for item in data:
            raw_url = item.get('url', '')
            raw_ref = item.get('referer', '')
            
            clean_u = clean_url_string(raw_url)
            clean_r = clean_url_string(raw_ref)
            
            # If the URL was dirty, mark as cleaned
            if raw_url != clean_u or raw_ref != clean_r:
                item['url'] = clean_u
                item['referer'] = clean_r
                cleaned = True
            
            if item['url']: # Only keep if we have a valid URL
                valid_data.append(item)

    if cleaned:
        print(f"{C.YELLOW}⚠️  Repaired corrupt URLs in suburbs.json{C.END}")
        save_suburbs(valid_data)
        return valid_data

    return valid_data

def save_suburbs(suburbs):
    with open(SUBURBS_FILE, 'w') as f:
        json.dump(suburbs, f, indent=2)

def add_suburb_interactive():
    print(f"\n{C.HEADER}{'='*40}\n🏘️  ADD NEW SUBURB\n{'='*40}{C.END}")
    print("Paste the building profile URL (Bullet points/Messy text OK):")
    
    raw_input = input().strip()
    
    # 1. Clean the input immediately using Regex
    url = clean_url_string(raw_input)
    
    if not url or 'building-profile' not in url:
        print(f"{C.RED}❌ Invalid URL found in input{C.END}")
        return False
    
    # 2. Construct API URL
    base_url = url.split('?')[0] # Remove query params
    if '/api/' not in base_url:
        api_url = base_url.replace('/building-profile/', '/building-profile/api/')
    else:
        api_url = base_url
        base_url = api_url.replace('/api/', '/')

    # 3. Generate Name
    parts = base_url.split('/')[-1].split('-')
    name_guess = ' '.join(parts[:3]).title() if len(parts) > 2 else base_url.split('/')[-1]
    
    print(f"\nSuburb name (default: {name_guess}):")
    custom_name = input().strip()
    if custom_name:
        final_name = custom_name
    else:
        final_name = name_guess
    
    suburbs = load_suburbs()
    suburbs.append({"name": final_name, "url": api_url, "referer": base_url})
    save_suburbs(suburbs)
    print(f"{C.GREEN}✅ Added: {final_name}{C.END}")
    return True

def manage_suburbs_menu():
    suburbs = load_suburbs()
    while True:
        print(f"\n{C.HEADER}{'='*40}\n🏘️  MANAGE SUBURBS\n{'='*40}{C.END}")
        for i, s in enumerate(suburbs, 1):
            print(f"{C.CYAN}{i:2d}.{C.END} {s['name']}")
        print(f"\n{C.CYAN}[A]dd  |  [D]elete  |  [B]ack{C.END}")
        
        choice = input("Select: ").strip().upper()
        if choice == 'A': 
            add_suburb_interactive()
            suburbs = load_suburbs() # Reload after add
        elif choice == 'D':
            try:
                num = int(input("Delete #: "))
                if 1 <= num <= len(suburbs):
                    removed = suburbs.pop(num-1)
                    save_suburbs(suburbs)
                    print(f"{C.RED}🗑️  Removed: {removed['name']}{C.END}")
            except: pass
        elif choice == 'B': break

def save_trend_snapshot(db, suburbs):
    today = datetime.now().strftime('%Y-%m-%d')
    stats = []
    
    for suburb in suburbs:
        suburb_name = suburb['name']
        active = [v for v in db.values() if v['status'] == 'Active' and v.get('suburb') == suburb_name]
        
        rentals = [x for x in active if x['type'] == 'Rent']
        sales = [x for x in active if x['type'] == 'Sale']
        
        rent_prices = [int(x['current_price_int']) for x in rentals if int(x['current_price_int']) > 0]
        sale_prices = [int(x['current_price_int']) for x in sales if int(x['current_price_int']) > 0]
        
        stats.append({
            'date': today, 'suburb': suburb_name,
            'total_rentals': len(rentals),
            'avg_rent': int(sum(rent_prices) / len(rent_prices)) if rent_prices else 0,
            'min_rent': min(rent_prices) if rent_prices else 0,
            'max_rent': max(rent_prices) if rent_prices else 0,
            'total_sales': len(sales),
            'avg_sale': int(sum(sale_prices) / len(sale_prices)) if sale_prices else 0,
            'min_sale': min(sale_prices) if sale_prices else 0,
            'max_sale': max(sale_prices) if sale_prices else 0,
        })
    
    file_exists = os.path.exists(TRENDS_FILE)
    with open(TRENDS_FILE, 'a', newline='', encoding='utf-8') as f:
        fieldnames = ['date', 'suburb', 'total_rentals', 'avg_rent', 'min_rent', 'max_rent', 
                      'total_sales', 'avg_sale', 'min_sale', 'max_sale']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists: writer.writeheader()
        for stat in stats: writer.writerow(stat)

def show_trends():
    if not os.path.exists(TRENDS_FILE):
        print(f"{C.YELLOW}No history yet.{C.END}")
        return
    
    trends = []
    with open(TRENDS_FILE, 'r') as f:
        trends = list(csv.DictReader(f))
    
    by_suburb = defaultdict(list)
    for row in trends:
        by_suburb[row['suburb']].append(row)
    
    print(f"\n{C.HEADER}{'='*40}\n📊 TRENDS (30 Days)\n{'='*40}{C.END}")
    
    for suburb, data in by_suburb.items():
        print(f"\n{C.BOLD}{suburb}{C.END}")
        recent = data[-30:] if len(data) > 30 else data
        if not recent: continue
        
        r_list = [int(x['avg_rent']) for x in recent if int(x['avg_rent']) > 0]
        if r_list:
            chg = r_list[-1] - r_list[0]
            icon = "🔺" if chg > 0 else "🔻" if chg < 0 else "➡️"
            pct = f"({(chg/r_list[0]*100):+.1f}%)" if r_list[0] > 0 else ""
            print(f"  {C.CYAN}Rent:{C.END} ${r_list[-1]:>5} {icon} ${chg:+5d} {pct}")

        s_list = [int(x['avg_sale']) for x in recent if int(x['avg_sale']) > 0]
        if s_list:
            chg = s_list[-1] - s_list[0]
            icon = "🔺" if chg > 0 else "🔻" if chg < 0 else "➡️"
            pct = f"({(chg/s_list[0]*100):+.1f}%)" if s_list[0] > 0 else ""
            print(f"  {C.YELLOW}Sale:{C.END} ${s_list[-1]:>7,} {icon} ${chg:+7,} {pct}")

def load_headers():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f: return json.load(f)
        except: pass
    return DEFAULT_HEADERS

def save_headers(headers):
    with open(CONFIG_FILE, 'w') as f: json.dump(headers, f, indent=4)
    print(f"{C.GREEN}✅ Session updated{C.END}")

def parse_curl_to_headers(curl_text):
    headers = DEFAULT_HEADERS.copy()
    clean_curl = curl_text.replace('\\\n', ' ').replace('\\', '')
    pattern = r"(?:-H|--header)\s+['\"]([^:]+):\s+(.*?)['\"]"
    matches = re.findall(pattern, clean_curl, re.IGNORECASE)
    for key, value in matches: headers[key.lower()] = value
    return headers

def update_session_interactive():
    print(f"\n{C.YELLOW}{'='*40}\n🔐 PASTE CURL (Type 'GO' on new line)\n{'='*40}{C.END}")
    lines = []
    while True:
        try:
            line = input()
            if line.strip().upper() == 'GO': break
            lines.append(line)
        except EOFError: break
    full_text = " ".join(lines)
    if len(full_text) < 10: return False
    save_headers(parse_curl_to_headers(full_text))
    return True

def get_price_int(price_str):
    if not price_str: return 0
    raw = str(price_str).upper().strip()
    is_pcm = 'PCM' in raw
    
    matches = re.findall(r'(?:\$|^)\s?([\d,]+(?:\.\d+)?)\s?([KkMm]?)', raw)
    
    if not matches:
        matches = re.findall(r'\b([\d,]+(?:\.\d+)?)\s?([KkMm])\b', raw)

    values = []
    for num_str, suffix in matches:
        try:
            clean_num = float(num_str.replace(',', ''))
            if suffix == 'K': clean_num *= 1000
            elif suffix == 'M': clean_num *= 1_000_000
            
            if clean_num > 0:
                values.append(int(clean_num))
        except: continue

    if not values and '$' in raw:
        simple = re.findall(r'\$\s?([\d,]+)', raw)
        for n in simple:
            try: values.append(int(n.replace(',', '')))
            except: pass

    if not values: return 0
    
    final_val = int(sum(values) / len(values))
    if is_pcm: final_val = int(final_val * 12 / 52)
    return final_val

def fetch_listings(url, referer, filter_type, headers):
    """IMPROVED: Returns tuple (data, error_msg)"""
    params = {"filtertype": filter_type, "pagesize": "50", "pageno": "1"}
    req_headers = headers.copy()
    req_headers['Referer'] = referer
    
    session = get_session()
    try:
        response = session.get(url, headers=req_headers, params=params, timeout=15)
        
        if response.status_code == 403:
            return None, "403_AUTH"
        elif response.status_code != 200:
            return None, f"HTTP_{response.status_code}"
        
        data = response.json()
        
        # Validate response structure
        if isinstance(data, list):
            if len(data) == 0:
                return [], None  # Empty is valid
            return data, None
        elif isinstance(data, dict):
            props = data.get('properties', [])
            return props, None
        else:
            return None, "INVALID_STRUCTURE"
            
    except requests.exceptions.Timeout:
        return None, "TIMEOUT"
    except requests.exceptions.ConnectionError:
        return None, "CONNECTION_ERROR"
    except json.JSONDecodeError:
        return None, "JSON_ERROR"
    except Exception as e:
        return None, f"ERROR_{str(e)[:20]}"

def load_csv_data():
    """IMPROVED: Returns (db, success_flag)"""
    if not os.path.exists(CSV_FILE):
        return {}, True
    
    try:
        db = {}
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Validate required fields
                if 'id' in row and row['id']:
                    db[row['id']] = row
        
        # Check if we got reasonable data
        if len(db) == 0 and os.path.getsize(CSV_FILE) > 100:
            print(f"{C.RED}⚠️  CSV appears corrupted, attempting backup restore{C.END}")
            return load_backup_csv()
        
        return db, True
    except Exception as e:
        print(f"{C.RED}⚠️  Error loading CSV: {e}{C.END}")
        return load_backup_csv()

def load_backup_csv():
    """Load from backup if main CSV fails"""
    if os.path.exists(CSV_BACKUP):
        try:
            db = {}
            with open(CSV_BACKUP, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if 'id' in row and row['id']:
                        db[row['id']] = row
            print(f"{C.GREEN}✅ Restored from backup ({len(db)} records){C.END}")
            return db, True
        except:
            pass
    return {}, False

def unit_sort_key(unit_str):
    try: return int(re.search(r'\d+', str(unit_str)).group())
    except: return 99999

def save_csv_data(database):
    """IMPROVED: Atomic save with backup"""
    fieldnames = ['suburb', 'unit', 'type', 'status', 'current_price_str', 'current_price_int', 
                  'last_price_int', 'first_seen', 'last_seen', 'price_change_date', 'id']
    
    # Validate we have data to save
    if len(database) == 0:
        print(f"{C.RED}⚠️  Refusing to save empty database{C.END}")
        return False
    
    # Create backup of current file
    if os.path.exists(CSV_FILE):
        try:
            shutil.copy2(CSV_FILE, CSV_BACKUP)
        except:
            pass
    
    # Write to temporary file first
    temp_file = f"{CSV_FILE}.tmp"
    try:
        with open(temp_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            
            sorted_items = sorted(database.values(), 
                                key=lambda x: (x.get('suburb', ''), 
                                             x.get('type', ''), 
                                             unit_sort_key(x.get('unit', ''))))
            
            for item in sorted_items:
                writer.writerow(item)
        
        # Verify temp file
        temp_size = os.path.getsize(temp_file)
        if temp_size < 100:
            print(f"{C.RED}⚠️  Generated file too small, aborting save{C.END}")
            os.remove(temp_file)
            return False
        
        # Atomic replace
        shutil.move(temp_file, CSV_FILE)
        return True
        
    except Exception as e:
        print(f"{C.RED}⚠️  Save failed: {e}{C.END}")
        if os.path.exists(temp_file):
            os.remove(temp_file)
        return False

def run_scan():
    headers = load_headers()
    suburbs = load_suburbs() # Auto-repairs occur here
    db, db_ok = load_csv_data()
    
    if not db_ok:
        print(f"{C.RED}⚠️  Database load failed, aborting scan{C.END}")
        return False
    
    print(f"\n{C.HEADER}{'='*40}\n🕵️  Domain Tracker: {datetime.now().strftime('%H:%M:%S')}\n{'='*40}{C.END}")
    
    current_scan_ids = set()
    changes = []
    fetch_errors = []
    
    for suburb in suburbs:
        print(f"\n{C.BLUE}🏘️  {suburb['name']}...{C.END}")
        
        rent_data, rent_err = fetch_listings(suburb['url'], suburb['referer'], "forRent", headers)
        if rent_err:
            fetch_errors.append(f"Rent fetch error: {rent_err}")
            if rent_err == "403_AUTH":
                print(f"{C.RED}⚠️  Authentication expired{C.END}")
                return False
            print(f"{C.YELLOW}⚠️  Rent fetch failed: {rent_err}{C.END}")
        
        sale_data, sale_err = fetch_listings(suburb['url'], suburb['referer'], "forSale", headers)
        if sale_err:
            fetch_errors.append(f"Sale fetch error: {sale_err}")
            if sale_err == "403_AUTH":
                print(f"{C.RED}⚠️  Authentication expired{C.END}")
                return False
            print(f"{C.YELLOW}⚠️  Sale fetch failed: {sale_err}{C.END}")

        # If both fetches failed, abort scan
        if rent_data is None and sale_data is None:
            print(f"{C.RED}⚠️  Complete fetch failure, aborting scan{C.END}")
            return False

        r_list = rent_data if isinstance(rent_data, list) else []
        s_list = sale_data if isinstance(sale_data, list) else []
        
        print(f"{C.DIM}   Found: {len(r_list)} rentals, {len(s_list)} sales{C.END}")
        
        for m_type, item in [('Rent', x) for x in r_list] + [('Sale', x) for x in s_list]:
            pid = f"{suburb['name']}_{item.get('id')}"
            current_scan_ids.add(pid)
            unit = item.get('address', {}).get('flatNumber', 'N/A')
            on_market = item.get('onMarket', [])
            price_disp = on_market[0].get('displayPrice', 'Contact') if on_market else "Contact"
            price_val = get_price_int(price_disp)
            today = datetime.now().strftime('%Y-%m-%d')
            
            if pid in db:
                rec = db[pid]
                old_val = int(rec.get('current_price_int', 0))
                if price_val > 0 and old_val > 0 and abs(price_val - old_val) > 10:
                    diff = price_val - old_val
                    icon = "🔺" if diff > 0 else "🔻"
                    pct = f"({(diff/old_val*100):+.1f}%)" if old_val > 0 else ""
                    changes.append(f"{icon} {m_type:4s} {unit:5s}: ${old_val:>6,} → ${price_val:>6,} {pct}")
                    rec['last_price_int'] = old_val
                    rec['price_change_date'] = today
                rec['current_price_int'] = price_val
                rec['current_price_str'] = price_disp
                rec['last_seen'] = today
                rec['status'] = 'Active'
            else:
                changes.append(f"{C.GREEN}🆕 {m_type:4s} {unit:5s}: {price_disp}{C.END}")
                db[pid] = {
                    'id': pid, 'suburb': suburb['name'], 'unit': unit, 'type': m_type,
                    'current_price_str': price_disp, 'current_price_int': price_val,
                    'last_price_int': 0, 'status': 'Active',
                    'first_seen': today, 'last_seen': today, 'price_change_date': today
                }

    for pid, rec in db.items():
        if pid not in current_scan_ids and rec['status'] == 'Active':
            rec['status'] = 'Removed'
            changes.append(f"{C.RED}❌ {rec['type']:4s} {rec['unit']:5s} removed{C.END}")

    # Only save if we got meaningful data
    if len(current_scan_ids) == 0:
        print(f"{C.RED}⚠️  No listings found, database not updated{C.END}")
        return False

    save_ok = save_csv_data(db)
    if not save_ok:
        print(f"{C.RED}⚠️  Database save failed{C.END}")
        return False
    
    save_trend_snapshot(db, suburbs)

    if changes:
        print(f"\n{C.YELLOW}{'='*40}\n📢 CHANGES\n{'='*40}{C.END}")
        for c in changes: print(f"  {c}")
    else:
        print(f"\n{C.GREEN}✅ No changes detected{C.END}")

    # --- IMPROVED MOBILE OUTPUT ---
    active_items = [v for k, v in db.items() if v['status'] == 'Active']
    by_suburb = defaultdict(list)
    for item in active_items: by_suburb[item['suburb']].append(item)
    
    for suburb, items in by_suburb.items():
        print(f"\n{C.HEADER}{'='*40}\n{suburb}\n{'='*40}{C.END}")
        
        rentals = sorted([x for x in items if x['type'] == 'Rent'], 
                        key=lambda x: unit_sort_key(x['unit']))
        sales = sorted([x for x in items if x['type'] == 'Sale'], 
                      key=lambda x: unit_sort_key(x['unit']))
        
        if rentals:
            print(f"\n{C.CYAN}┌─ RENTALS ({len(rentals)}) {'─'*27}┐{C.END}")
            for r in rentals:
                price_int = int(r.get('current_price_int', 0))
                price_fmt = f"${price_int:>5}" if price_int > 0 else r['current_price_str']
                print(f"{C.CYAN}│{C.END} {r['unit']:5s} │ {price_fmt:>15} {C.CYAN}│{C.END}")
            print(f"{C.CYAN}└{'─'*39}┘{C.END}")
        
        if sales:
            print(f"\n{C.YELLOW}┌─ SALES ({len(sales)}) {'─'*29}┐{C.END}")
            for s in sales:
                price_int = int(s.get('current_price_int', 0))
                price_fmt = f"${price_int:>7,}" if price_int > 0 else s['current_price_str']
                print(f"{C.YELLOW}│{C.END} {s['unit']:5s} │ {price_fmt:>15} {C.YELLOW}│{C.END}")
            print(f"{C.YELLOW}└{'─'*39}┘{C.END}")
            
    return True

def main():
    while True:
        success = run_scan()
        print(f"\n{C.CYAN}{'='*40}\n[R]efresh | [T]rends | [S]uburbs | [U]pdate | [E]xit\n{'='*40}{C.END}")
        if not success: print(f"{C.RED}⚠️  SCAN FAILED - Check connection/session{C.END}")
        
        choice = input("Select: ").strip().upper()
        
        if choice == 'U': 
            if update_session_interactive(): print(f"{C.GREEN}Retrying...{C.END}")
        elif choice == 'R': continue
        elif choice == 'T': show_trends()
        elif choice == 'S': manage_suburbs_menu()
        elif choice == 'E': break

if __name__ == "__main__":
    main()
