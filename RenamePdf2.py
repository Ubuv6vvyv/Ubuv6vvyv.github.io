import os
import re
import shutil
import subprocess
from concurrent.futures import ProcessPoolExecutor


# =============================================================================
# CLASS: PatternConfig
# Centralized configuration for easy modification without touching logic
# =============================================================================
class PatternConfig:
    # --- GLOBAL SETTINGS ---
    KEEP_ORIGINAL_SUFFIX = True  # Keep cleaned part of original filename?
    MAX_SUFFIX_LENGTH = 10  # Truncate suffix to this length
    PARALLEL_JOBS = 4  # Thread count (Keep lower on mobile/Termux)

    # --- 1. PRIORITY DOCUMENT PATTERNS (Script A Logic) ---
    PRIORITY_PATTERNS = [
    # DELIVERY & RELEASE - moved above Vanguard so they fire first
    ("Delivery Docket", r"(?i)Delivery\s*Docket|Cartage\s*Docket"),
    ("Delivery Order", r"(?i)Delivery\s*Order|^D[-_ ]?O\b|\[EDO\]|Release\s*Order|Sea\s*Freight\s*LCL\s*Delivery\s*Order"),
    ("Cartage Advice", r"(?i)Cartage\s*Advice|Transport\s*Advice"),
    ("Outturn Report", r"(?i)Outturn\s*Report|Container\s*Outturn|Damage\s*Report"),
    ("Cargo Availability Notice", r"(?i)Cargo\s*Availability(?:\s*Notice)?"),
    ("Arrival Notice", r"(?i)Arrival\s*Notice|Notification\s*of\s*Arrival"),
    ("Telex Release", r"(?i)Telex\s*Release"),
    ("Booking Confirmation", r"(?i)Booking\s*Confirm\w*|Booking\s*Ref"),
    ("Gate Pass", r"(?i)Gate\s*Pass|Wharf\s*Pass|Container\s*Slip"),
    ("Equipment Receipt", r"(?i)Equipment\s*Interchange|EIR\b|Equipment\s*Receipt"),
    
    # BILLS OF LADING
    ("House Air Waybill", r"(?i)House\s*Air\s*Waybill|^HAWB\b"),
    ("Master Air Waybill", r"(?i)Master\s*Air\s*Waybill|^MAWB\b"),
    ("Air Waybill", r"(?i)Air\s*Waybill|^AWB\b|Airway\s*bil"),
    ("Sea Waybill", r"(?i)Sea\s*Waybill|^SWB\b|Express\s*Release"),
    ("House Bill of Lading", r"(?i)House\s*Bill|HBL\b|H\.B\/L"),
    ("Master Bill of Lading", r"(?i)Master\s*Bill|MBL\b|M\.B\/L|Ocean\s*Bill"),
    ("Bill of Lading", r"(?i)Bill\s*of\s*Lading|B\/L\b"),
    ("Consignment Note", r"(?i)Consignment\s*Note|Connote"),
    
    # COMPLIANCE & SPECIAL
    ("Dangerous Goods Decl", r"(?i)Dangerous\s*Goods|DGD\b|Multimodal\s*Dangerous|Hazmat"),
    ("MSDS", r"(?i)MSDS|Safety\s*Data\s*Sheet"),
    ("Origin Certificate", r"(?i)Certificate\s*of\s*Origin|^COO\b"),
    ("VGM Declaration", r"(?i)VGM|Verified\s*Gross\s*Mass"),
    ("Packing List", r"(?i)Packing\s*List|^PKL\b|Pack\s*List|Packing\s*Slip"),
    
    # INSTRUCTIONS (High Priority)
    ("Shippers Letter", r"(?i)Shipper.?s\s*Letter|SLI\b|Forwarding\s*Instruction"),
    ("Transport Instruction", r"(?i)Transport\s*Instruction|Transport\s*Order"),
    
    # INVOICES (Lower priority to avoid grabbing everything)
    ("Tax Invoice", r"(?i)Tax\s*Invoice|GST\s*Invoice"),
    ("Commercial Invoice", r"(?i)Commercial\s*Invoice|Export\s*Invoice|^C[-_]?I\b"),
    ("Purchase Order", r"(?i)Purchase\s*Order|PO\s*No|Sales\s*Order"),
    ("Interim Receipt", r"(?i)Interim\s*Receipt"),
    # SPECIFIC VANGUARD MATCHERS 
    ("Vanguard Delivery Order", r"(?is)Vanguard.*?Delivery\s*Order"),
    ("Vanguard Arrival", r"(?is)Vanguard.*?Arrival\s*Notice"),
    ("Vanguard Booking Confirmation", r"(?is)Vanguard.*?Booking\s*Confirmation\W*[A-Z]{3}[A-Z0-9]{6,11}V"),
    ("Vanguard Booking", r"(?is)Vanguard.*?Booking\s*Confirmation\s*[-:]?\s*[A-Z]{3}[A-Z0-9]{6,11}V"),
    ("Vanguard Label", r"(?i)Ì[A-Z]{5,8}Ç.*Î|Vanguard\s*Logistics\s*Label"),
        
      #VANGUARD GENERIC (Safe catch-all fallback at the absolute bottom)
    ("Vanguard Generic", r"(?i)\bVanguard\b"),
    ]
    # --- 2. FALLBACK KEYWORDS (Script B Logic) ---
    FALLBACK_DOC_KEYWORDS = [
        "Invoice",
        "Credit Note",
        "Debit Note",
        "Interim Receipt",
        "Receipt Confirmation",
        "Proforma Invoice",
        "Freight Invoice",
        "Remittance Advice",
        "Arrival Notice",
        "Cargo Availability",
        "Biosecurity Direction",
        "Cleanliness Cert",
        "Treatment Cert",
        "Weight List",
        "Container List",
        "Manifest",
        "Customs Declaration",
        "Export Declaration",
        "Import Declaration",
        "Cargo Manifest",
        "Inspection Report",
        "Letter of Credit",
        "Insurance Certificate",
        "Dock Receipt",
        "Mate's Receipt",
        "Phytosanitary Certificate",
        "Health Certificate",
        "Tally Sheet",
        "Cargo Availability Notice",
        "Sea Freight LCL Delivery Order",
    ]

    # --- 2b. COMPANY ROUTING FALLBACKS (Catches forwarder entities if no doc type matches) ---
    COMPANY_PATTERNS = [
        ("Airwave Logistics", r"(?i)Airwave"),
        ("20Cube Logistics", r"(?i)20Cube"),
        ("a. hartrodt", r"(?i)hartrodt"),
        ("Macnels Evans", r"(?i)Macnels"),
        ("Willship International", r"(?i)Willship"),
        ("End to End Customs", r"(?i)End to End Customs"),
        ("Explorate", r"(?i)Explorate"),
        ("Qube Logistics", r"(?i)Qube\s*Logistics"),
        ("Portever Shipping", r"(?i)Portever"),
        ("Whale Logistics", r"(?i)Whale\s*Logistics"),
    ]

    # --- 3. ID EXTRACTION: CONTEXTUAL (Script A Logic) ---
    ID_PATTERNS_CONTEXTUAL = {
        "ENTRY": re.compile(
            r"(?i)(?:Entry|Direction)\s*(?:No|ID)?\s*[:\.]?\s*([A-Z]{3,4}[A-Z0-9]{6,9})\b"
        ),
        "REF": re.compile(
            r"(?i)(?:Job|File|Our|Shipper)\s*(?:Ref|No)\s*[:\.]?\s*([A-Z0-9\-\/]{5,20})\b"
        ),
        "BOOKING": re.compile(
            r"(?i)(?:Booking)\s*(?:Ref|No)\s*[:\.]?\s*([A-Z0-9\-\/]{6,20})\b"
        ),
        "PO": re.compile(
            r"(?i)(?:Order|PO)\s*(?:No|#)\s*[:\.]?\s*([A-Z0-9\-\/]{4,20})\b"
        ),
        "INV": re.compile(
            r"(?i)(?:Invoice)\s*(?:No|#)\s*[:\.]?\s*([A-Z0-9\-\/]{4,20})\b"
        ),
        "MBL_CTX": re.compile(
            r"(?i)(?:Master\s*Bill|M\.?B/?L|Ocean\s*Bill)(?:\s*of\s*Lading)?\s*(?:No\.?|Number)?\s*[:\-]?\s*([A-Z0-9]{6,20})\b"
        ),
        "HBL_CTX": re.compile(
            r"(?i)(?:House\s*Bill|H\.?B/?L)(?:\s*of\s*Lading)?\s*(?:No\.?|Number)?\s*[:\-]?\s*([A-Z0-9/-]{6,20})\b"
        ),
        "HAWB": re.compile(
            r"(?i)(?:HAWB|H\.?B\.?|House\s*Bill)\s*(?:No\.?|Number)?\s*[:\-]?\s*([A-Z0-9-]{4,15})\b"
        ),
    }

    # --- 4. ID EXTRACTION: FORMAT/SHAPE (Script B Logic) ---
    ID_PATTERNS_FORMAT = {
        "CONTAINER": re.compile(
            r"\b([A-Z]{4}\d{7})\b"
        ),  # Improved robust ISO pattern globally
        "SHIPMENT_ID": re.compile(r"\b(S\d{8,10}[A-Z]?)\b"),
        "CONSOL_ID": re.compile(r"\b(C\d{8,10})\b"),
        "AWB": re.compile(
            r"\b(\d{3}\s*[-]?\s*(?:[A-Z]{3}\s*)?(?:\d{4}\s*[-]?\s*\d{4}|\d{8}))\b"
        ), # Accounts for IATA codes and missing hyphens, captured cleanly
        "CARRIER_MBL": re.compile(
            r"\b(COSU\d{10}|MEDU[A-Z0-9]{7,9}|OOLU\d{10}|ONEY[A-Z0-9]{8,12})\b"
        ),
        # Added generic 11-digit catcher for your specific files
        "GENERIC_LONG_ID": re.compile(r"\b(10[34]\d{8})\b"),
    }

    # --- 5. CLEANING ---
    BAD_SUFFIX_WORDS = [
        "PAGE", "DATE", "TIME", "PRINTED", "VERSION", "COPY", "ORIGINAL", "TEL", "FAX",
        "EMAIL", "WEB", "PH", "MOBILE", "ABN", "ACN", "LTD", "PTY", "FROM", "TO", "ATTN",
        "SUBJECT", "RE", "REF", "NO", "NUMBER", "ID", "DESCRIPTION", "WEIGHT", "VOLUME",
        "KGS", "CBM", "PCS", "PACKAGES", "INSTRUCTION", "DOC", "DOCUMENT", "FILE", "SCANNED", "SCAN",
    ]


# =============================================================================
# CORE LOGIC
# =============================================================================

def extract_text_from_pdf(filepath):
    """Uses pdftotext (subprocess) to keep it lightweight for Termux."""
    try:
        # -f 1 -l 2: First 2 pages only
        result = subprocess.run(
            ["pdftotext", "-f", "1", "-l", "2", "-layout", filepath, "-"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.stdout
    except Exception:
        return ""


def sanitize_text(text):
    """CRITICAL: Removes slashes and illegal chars that break paths."""
    if not text:
        return ""
    text = text.replace("/", "-").replace("\\", "-")
    text = re.sub(r'[?:"<>|*]', "", text)
    return text.strip()


def identify_doc_type(text, filename):
    fname_clean = filename.replace("_", " ").replace("-", " ")

    # 1. PRIORITY PATTERNS (Filename)
    for doc_name, pattern in PatternConfig.PRIORITY_PATTERNS:
        if re.search(pattern, fname_clean):
            return doc_name

    # 2. PRIORITY PATTERNS (Content)
    for doc_name, pattern in PatternConfig.PRIORITY_PATTERNS:
        if re.search(pattern, text):
            return doc_name

    # 3. FALLBACK KEYWORDS (Check Filename first so valid tokens aren't missed)
    fallback_pattern = re.compile(
        r"(?i)(" + "|".join(map(re.escape, PatternConfig.FALLBACK_DOC_KEYWORDS)) + ")"
    )
    match_fname = fallback_pattern.search(fname_clean)
    if match_fname:
        return match_fname.group(0).title()

    # 4. FALLBACK KEYWORDS (Check Content second)
    match_text = fallback_pattern.search(text)
    if match_text:
        return match_text.group(0).title()

    # 5. LOGISTICS COMPANY ROUTING FALLBACK
    for comp_name, comp_pattern in PatternConfig.COMPANY_PATTERNS:
        if re.search(comp_pattern, fname_clean) or re.search(comp_pattern, text):
            return f"{comp_name} Document"

    # 6. EXPLICIT UNREADABLE / SCANNED MARKER
    if "[EMPTY OR SCANNED PDF]" in text or not text.strip():
        return "Scanned Document"

    return "Document"


def extract_identifiers(text):
    found_ids = set()

    # 1. Contextual Extraction
    for label, pattern in PatternConfig.ID_PATTERNS_CONTEXTUAL.items():
        matches = pattern.findall(text)
        for match in matches:
            clean = match.replace(" ", "").strip().upper()
            if len(clean) > 3:
                found_ids.add(sanitize_text(clean))

    # 2. Format Extraction
    containers = PatternConfig.ID_PATTERNS_FORMAT["CONTAINER"].findall(text)
    for c_tuple in containers:
        found_ids.add("".join(c_tuple))

    for key, pattern in PatternConfig.ID_PATTERNS_FORMAT.items():
        if key == "CONTAINER":
            continue
        matches = pattern.findall(text)
        for match in matches:
            val = match[0] if isinstance(match, tuple) else match
            val_clean = val.replace(" ", "").strip().upper()
            found_ids.add(sanitize_text(val_clean))

    return sorted(list(found_ids), key=len, reverse=True)[:2]


def clean_filename_part(text):
    if not text:
        return ""
    text = re.sub(r'[\\/*?:"<>|]', "", text)
    text = re.sub(r"[-_.,]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def generate_suffix(original_name, found_ids, doc_type):
    clean = os.path.splitext(original_name)[0]

    # Remove Doc Type words
    for word in doc_type.split():
        clean = re.sub(r"\b" + re.escape(word) + r"\b", "", clean, flags=re.IGNORECASE)

    # Remove found IDs (fuzzy match)
    for fid in found_ids:
        clean = clean.replace(fid, "")

    clean = clean_filename_part(clean)

    tokens = clean.split()
    filtered = []
    for t in tokens:
        if (
            t.upper() not in PatternConfig.BAD_SUFFIX_WORDS
            and not re.match(r"^\d+$", t)
            and len(t) > 1
        ):
            filtered.append(t)

    return " ".join(filtered)[: PatternConfig.MAX_SUFFIX_LENGTH].strip()


def get_unique_filename(directory, filename):
    if not os.path.exists(os.path.join(directory, filename)):
        return filename
    base, ext = os.path.splitext(filename)
    counter = 1
    while True:
        new_name = f"{base} ({counter}){ext}"
        if not os.path.exists(os.path.join(directory, new_name)):
            return new_name
        counter += 1


def process_file(filepath):
    abs_filepath = os.path.abspath(filepath)
    if not os.path.exists(abs_filepath):
        return None

    filename = os.path.basename(abs_filepath)
    directory = os.path.dirname(abs_filepath)
    _, ext = os.path.splitext(filename)

    if ext.lower() != ".pdf":
        return None

    text = extract_text_from_pdf(abs_filepath)

    doc_type = identify_doc_type(text, filename)
    doc_type = sanitize_text(doc_type)

    ids = extract_identifiers(text)

    suffix = ""
    if PatternConfig.KEEP_ORIGINAL_SUFFIX:
        suffix = generate_suffix(filename, ids, doc_type)

    parts = [doc_type]
    if ids:
        parts.append(" ".join(ids))
    if suffix:
        parts.append(suffix)

    final_name_base = " ".join(parts)
    final_name_base = re.sub(r"\s+", " ", final_name_base).strip()
    final_name = get_unique_filename(directory, final_name_base + ext)

    if final_name != filename:
        new_path = os.path.join(directory, final_name)
        try:
            shutil.move(abs_filepath, new_path)
            return f"✓ {filename[:20]}... -> {final_name}"
        except Exception as e:
            return f"✗ Error renaming {filename}: {e}"

    return None


def main():
    print("=" * 40)
    print("   ShippingRenamer (Optimized v7.0)   ")
    print("=" * 40)

    if not shutil.which("pdftotext"):
        print("✗ ERROR: 'pdftotext' not found.")
        print("  Please run: pkg install poppler")
        return

    files = [os.path.abspath(f) for f in os.listdir(".") if f.lower().endswith(".pdf")]
    print(f"Processing {len(files)} files with {PatternConfig.PARALLEL_JOBS} threads...\n")

    with ProcessPoolExecutor(max_workers=PatternConfig.PARALLEL_JOBS) as executor:
        results = executor.map(process_file, files)

    for res in results:
        if res:
            print(res)

    print("\nDone.")


if __name__ == "__main__":
    main()
