import os
import re
import sys
from collections import defaultdict

# ================= CONFIGURATION =================
# 1. COMPLEX CATEGORIES (Split into subfolders)
# We only do this for Delivery Order now.
COMPLEX_CATEGORIES = ["Delivery Order"]

# 2. SIMPLE CATEGORIES (No subfolders - Flattened)
# These will just be "Booking Confirmation", "Outturn Report", etc.
SIMPLE_CATEGORIES = [
    "Booking Confirmation", 
    "Cartage Advice", 
    "Outturn Report", 
    "Arrival Notice",
    "Bill of Lading"  # Added B/L here to keep it simple
]

# 3. GROUPING RULES (Regex maps to Folder Names)
# Updated with patterns found in your file list (DO_DJ, CUS_DELIV, etc)
GROUPS = {
    "Dangerous Goods & Safety": r"Dangerous|MSDS|Safety Data|Multimodal|DGN|Battery|MO41",
    "Certificates & Compliance": r"Certificate|Inspection|Compliance|Analysis|Fumigation|Phytosanitary|Health|Veterinary|Declaration",
    "Invoices & Finance": r"Commercial Invoice|Tax Invoice|Freight Invoice|Debit Note|Credit Note|Proforma|Consular|Statement|INV[-_ ]",
    "Bills of Lading & Waybills": r"Bill of Lading|B\/L|HBL|MBL|Air Waybill|AWB|Sea Waybill|House Bill|Master Bill|Waybill",
    "Receipts & Gate Passes": r"Gate Pass|Dock Receipt|Warehouse Receipt|Interim Receipt|Equipment Interchange|FCR|Mate's Receipt|INTERIM",
    "Customs Docs": r"Customs|Export Declaration|Import Declaration|Clearance|Export License|Import License",
    "Packing & Cargo Lists": r"Packing List|Cargo Manifest|Container Load|Tally Sheet|Weight|PKL|Packing_List",
    "Instructions": r"Delivery Instruction|Shipping Instruction|Letter of Instruction|SLI",
    
    # NEW PATTERNS CAUGHT FROM YOUR LIST
    "Delivery Order": r"Delivery[-_ ]Order|DEL_ORDER|DO_DJ|\[EDO\]",
    "Delivery Docket": r"Delivery[-_ ]Docket|CUS_DELIV|CUS_LDELIV"
}
# =================================================

def analyze_files():
    print("🔍 Scanning directory...")
    
    try:
        all_files = [f.name for f in os.scandir('.') if f.is_file() and f.name.lower().endswith('.pdf')]
    except Exception as e:
        print(f"Error: {e}")
        return

    # Data Stores
    structure = defaultdict(lambda: defaultdict(int))
    unsorted_list = []

    # Compile Regex
    group_patterns = {name: re.compile(pattern, re.IGNORECASE) for name, pattern in GROUPS.items()}
    simple_cats_pattern = re.compile(r"(" + "|".join(map(re.escape, SIMPLE_CATEGORIES)) + ")", re.IGNORECASE)

    for filename in all_files:
        target_folder = "Unsorted"
        sub_folder = ""
        matched = False

        # 1. Check SIMPLE CATEGORIES (Flattened)
        match = simple_cats_pattern.search(filename)
        if match:
            target_folder = match.group(1).title() # e.g., "Booking Confirmation"
            structure[target_folder][""] += 1
            continue

        # 2. Check REGEX GROUPS (Includes Delivery Order & Docket)
        for group_name, pattern in group_patterns.items():
            if pattern.search(filename):
                target_folder = group_name
                
                # SPECIAL LOGIC: Delivery Order Sub-Splitting
                if target_folder == "Delivery Order":
                    # Remove the matched "Delivery Order" text to find the ID
                    clean_name = pattern.sub("", filename)
                    
                    # Find first alphanumeric sequence
                    id_match = re.search(r'[A-Za-z0-9]+', clean_name)
                    if id_match:
                        full_id = id_match.group(0).upper()
                        first_char = full_id[0]
                        
                        # IF ID starts with 'S' and has digits (e.g., S000...), split by S0, S1...
                        if first_char == 'S' and len(full_id) > 1 and full_id[1].isdigit():
                            sub_folder = full_id[:2] # "S0", "S1"
                        else:
                            # Otherwise just first char (A, B, C, 1, 2)
                            sub_folder = first_char
                    else:
                        sub_folder = "Misc"
                
                structure[target_folder][sub_folder] += 1
                matched = True
                break
        
        if not matched:
            structure["Unsorted"][""] += 1
            unsorted_list.append(filename)

    # ================= OUTPUT =================
    print(f"\n📂 PROPOSED STRUCTURE ({len(all_files)} files)")
    print("========================================")

    for folder in sorted(structure.keys()):
        total = sum(structure[folder].values())
        print(f"📁 {folder} ({total})")
        
        # Only show subfolders if they exist
        subfolders = sorted([k for k in structure[folder].keys() if k])
        if subfolders:
            for sub in subfolders:
                print(f"   ├── {sub:<4} ({structure[folder][sub]})")

    print("\n========================================")
    print("🕵️  TOP 20 UNSORTED FILES (Debug)")
    print("========================================")
    if not unsorted_list:
        print("Good news! 0 unsorted files.")
    else:
        for f in unsorted_list[:20]:
            print(f" - {f}")
            
if __name__ == "__main__":
    analyze_files()
