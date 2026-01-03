import pandas as pd
import os
import subprocess
import sys

# --- CONFIGURATION ---
CSV_FILE = "carriers.csv"

# --- COLORS ---
class C:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    FAIL = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# --- THE MASTER DATABASE ---
MASTER_DATA = [
    # --- MAJOR CARRIERS (Direct Tracking) ---
    {"Company": "Maersk", "Prefixes": "MAEU,MSKU,MRKU,SEJU,MOLU", "URL": "https://www.maersk.com/tracking/{ID}", "Type": "Carrier"},
    {"Company": "MSC", "Prefixes": "MSCU,MEDU", "URL": "https://www.msc.com/en/track-a-shipment?search={ID}", "Type": "Carrier"},
    {"Company": "CMA CGM Group", "Prefixes": "CMDU,CMAU,ANNU,AHG,APLU", "URL": "https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference={ID}", "Type": "Carrier"},
    {"Company": "COSCO", "Prefixes": "COSU,CSLU,CBHU", "URL": "https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number={ID}", "Type": "Carrier"},
    {"Company": "Hapag-Lloyd", "Prefixes": "HLCU,UASU", "URL": "https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container={ID}", "Type": "Carrier"},
    {"Company": "Evergreen", "Prefixes": "EGLV,EISU,EGHU,EMCU", "URL": "https://www.shipmentlink.com/servlet/TDB1_CargoTracking.do?containerNo={ID}", "Type": "Carrier"},
    {"Company": "ONE", "Prefixes": "ONEY,NYKU,KKLU", "URL": "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?ctnr_no={ID}", "Type": "Carrier"},
    {"Company": "Yang Ming", "Prefixes": "YMLU,TGBU,YM", "URL": "https://www.yangming.com/en/esolution/cargo_tracking?service={ID}", "Type": "Carrier"},
    {"Company": "HMM", "Prefixes": "HDMU", "URL": "https://www.hmm21.com/cms/company/engn/index.jsp?type=track&number={ID}", "Type": "Carrier"},
    {"Company": "Wan Hai", "Prefixes": "WHLU,WANU", "URL": "https://www.wanhai.com/views/cargo/CargoTracking.xhtml?file_num={ID}", "Type": "Carrier"},
    {"Company": "ZIM", "Prefixes": "ZIMU", "URL": "https://www.zim.com/tools/track-a-shipment?consignmentid={ID}", "Type": "Carrier"},
    {"Company": "PIL", "Prefixes": "PCIU,PILU", "URL": "https://www.pilship.com/en-sg/our-services/track-and-trace", "Type": "Carrier"},
    
    # --- REGIONAL CARRIERS ---
    {"Company": "KMTC", "Prefixes": "KMTU,KMTC", "URL": "https://www.kmtc.co.kr/shipping/cargoTracking", "Type": "Carrier"},
    {"Company": "SITC", "Prefixes": "SITU,SITC", "URL": "http://www.sitc.com/", "Type": "Carrier"},
    {"Company": "TS Lines", "Prefixes": "TSTU,TSLU", "URL": "https://www.tslines.com/en/tracking", "Type": "Carrier"},
    
    # --- LEASING COMPANIES (Unit Inquiry Pages) ---
    {"Company": "Triton International", "Prefixes": "TCLU,TRHU,TRLU,CLHU,FSCU", "URL": "https://tools.tritoncontainer.com/tritoncontainer/unitStatus/list", "Type": "Leasing"},
    {"Company": "Textainer", "Prefixes": "TEXU,TGHU,TEMU", "URL": "https://www.textainer.com/", "Type": "Leasing"},
    {"Company": "Seaco", "Prefixes": "GESU,SEGU,SCZU", "URL": "https://www.seacoglobal.com/container-inquiry/", "Type": "Leasing"},
    {"Company": "Florens", "Prefixes": "FCIU,FSCU", "URL": "https://www.florens.com/", "Type": "Leasing"},
    {"Company": "CAI International", "Prefixes": "CAIU,CAXU", "URL": "https://www.capps.com/unitinquiry", "Type": "Leasing"},
    {"Company": "Beacon Intermodal", "Prefixes": "BMOU", "URL": "https://www.beaconintermodal.com/", "Type": "Leasing"},
    {"Company": "Blue Sky Intermodal", "Prefixes": "BSKU", "URL": "https://www.blueskyintermodal.com/", "Type": "Leasing"},
    {"Company": "Touax", "Prefixes": "TUAU", "URL": "https://www.touax-container.com/", "Type": "Leasing"}
]

def initialize_database():
    """Generates the carriers.csv file."""
    # Only print if file doesn't exist to keep UI clean on startup
    if not os.path.exists(CSV_FILE):
        print(f"{C.CYAN}[INFO]{C.END} Updating Master Database...")
    
    rows = []
    for entry in MASTER_DATA:
        prefixes = entry["Prefixes"].split(",")
        for prefix in prefixes:
            rows.append({
                "Code": prefix.strip(),
                "Company": entry["Company"],
                "URL_Pattern": entry["URL"],
                "Type": entry.get("Type", "Carrier")
            })
    df = pd.DataFrame(rows)
    df.to_csv(CSV_FILE, index=False)

def open_in_browser(url):
    try:
        subprocess.run(["termux-open-url", url], check=True)
        print(f"{C.CYAN}[INFO]{C.END} Opening browser...")
    except:
        # Fallback for desktop testing
        try:
            if sys.platform == 'darwin': subprocess.run(['open', url])
            elif sys.platform == 'linux': subprocess.run(['xdg-open', url])
        except:
            print(f"{C.FAIL}[ERROR]{C.END} Could not auto-open.")

def list_platforms():
    """Lists all supported Carrier platforms."""
    print(f"\n{C.HEADER}--- SUPPORTED CARRIERS ---{C.END}")
    carriers = [entry for entry in MASTER_DATA if entry.get("Type") == "Carrier"]
    carriers.sort(key=lambda x: x["Company"])
    
    for c in carriers:
        print(f"  {C.CYAN}{c['Company']}{C.END}")
    print(f"\n{C.GREEN}Total Carriers: {len(carriers)}{C.END}")
    print("-" * 30)

def list_leasing_companies():
    """Lists all supported Leasing companies."""
    print(f"\n{C.HEADER}--- LEASING COMPANIES ---{C.END}")
    leasing = [entry for entry in MASTER_DATA if entry.get("Type") == "Leasing"]
    leasing.sort(key=lambda x: x["Company"])
    
    for l in leasing:
        print(f"  {C.YELLOW}{l['Company']}{C.END}")
    print(f"\n{C.GREEN}Total Leasing Companies: {len(leasing)}{C.END}")
    print("-" * 30)

def find_container(container_id):
    container_id = container_id.upper().strip().replace(" ", "")
    prefix = container_id[:4]
    
    # 1. DATABASE LOOKUP
    try:
        df = pd.read_csv(CSV_FILE)
    except FileNotFoundError:
        initialize_database()
        df = pd.read_csv(CSV_FILE)

    match = df[df['Code'] == prefix]
    
    # Defaults
    pier2pier_url = f"https://www.pier2pier.com/links/tracking2.php?Type=CONT&ID={container_id}"
    primary_url = ""
    company_name = "Unknown"
    company_type = "Unknown"

    if match.empty:
        print(f"{C.FAIL}[UNKNOWN]{C.END} Prefix '{prefix}' not found in database.")
    else:
        company_name = match.iloc[0]['Company']
        url_pattern = match.iloc[0]['URL_Pattern']
        company_type = match.iloc[0]['Type']
        
        print(f"{C.GREEN}✓{C.END} Identified: {C.BOLD}{company_name}{C.END} ({prefix})")
        print(f"  Type: {company_type}")

        # LOGIC FOR LEASING VS CARRIER
        if company_type == "Leasing":
            print(f"\n{C.YELLOW}[NOTE]{C.END} This is a Leasing Company container.")
            print("  It is likely rented to a shipping line.")
            print("  We cannot track its location directly, but you can check the owner's specs.")
            
            if "{ID}" in url_pattern:
                primary_url = url_pattern.replace("{ID}", container_id)
            else:
                primary_url = url_pattern
                
            print(f"  Owner Info: {primary_url}")
            
        elif company_type == "Carrier":
            if "{ID}" in str(url_pattern):
                primary_url = url_pattern.replace("{ID}", container_id)
                print(f"  {C.CYAN}[LINK]{C.END} Direct Link Generated")
            else:
                primary_url = url_pattern
                print(f"  {C.CYAN}[LINK]{C.END} Landing Page Found")

    # 2. PRESENT OPTIONS
    print("-" * 40)
    
    # Menu Options
    if primary_url:
        print(f"[1] Open {company_name} Site")
        print(f"[2] Open Pier2Pier (Fallback)")
    else:
        print(f"[1] Open Pier2Pier (Fallback)")
    
    print("-" * 40)

    # 3. INTERACTIVE PROMPT
    if primary_url:
        choice = input("Select [1/2] or [Enter] for new search: ").strip()
        if choice == '1':
            open_in_browser(primary_url)
        elif choice == '2':
            open_in_browser(pier2pier_url)
        # Empty input loops back to main menu
    else:
        choice = input("Select [1] or [Enter] for new search: ").strip()
        if choice == '1':
            open_in_browser(pier2pier_url)

# --- MAIN ---
if __name__ == "__main__":
    # Force update to apply new data
    initialize_database()
    print(f"\n{C.BOLD}--- CONTAINER TRACKER PROFESSIONAL ---{C.END}")
    
    while True:
        try:
            user_input = input(f"\n{C.BOLD}Container Number (or 'list', 'lease', 'q') >{C.END} ")
            cmd = user_input.lower().strip()
            
            if cmd == 'q': 
                break
            if cmd == "": 
                continue
            
            if cmd == 'list':
                list_platforms()
            elif cmd == 'lease':
                list_leasing_companies()
            else:
                find_container(user_input)
                
        except KeyboardInterrupt:
            print("\nExiting...")
            break
