import os, sys, csv, re, subprocess, pikepdf, shutil, hashlib, zlib, base64
from pikepdf import Pdf, Name, Array, Dictionary, Stream
from PIL import Image, ImageChops, ImageEnhance, ImageDraw, ImageFont
from glob import glob
from datetime import datetime
from collections import defaultdict, Counter

# === CONFIGURATION ===
Image.MAX_IMAGE_PIXELS = None
EXPANSION_MARGIN = 350  # Expand this many points in all directions
ELA_QUALITY = 95
ELA_SCALE = 20

def log(m): print(f"[>] {m}")

def check_dependencies():
    """Ensure external forensic tools are installed."""
    missing = []
    tools = {
        "pdfimages": "poppler-utils",
        "pdftotext": "poppler-utils",
        "pdftoppm": "poppler-utils",
        "qpdf": "qpdf",
        "exiftool": "libimage-exiftool-perl"
    }
    for tool, pkg in tools.items():
        if shutil.which(tool) is None:
            missing.append(f"{tool} ({pkg})")
    
    if missing:
        print("\n❌ CRITICAL: Missing external tools:")
        for m in missing: print(f"   - {m}")
        print("\nPlease install them (e.g., 'sudo apt install poppler-utils qpdf libimage-exiftool-perl')")
        return False
    return True

def cmd(c):
    try:
        return subprocess.check_output(c, shell=True, stderr=subprocess.STDOUT).decode('utf-8', 'ignore').strip()
    except:
        return "Error"

def clean_pdf_with_qpdf(input_file, output_dir):
    """Decrypt and repair PDF for processing using QPDF."""
    clean_path = os.path.join(output_dir, "qpdf_clean.pdf")
    log("Pre-processing with QPDF (Decrypt & Repair)...")
    try:
        subprocess.run(
            ["qpdf", "--decrypt", "--warning-exit-0", input_file, clean_path],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        return clean_path
    except subprocess.CalledProcessError:
        log("⚠️ QPDF repair failed (file might be locked/corrupt). Using original.")
        return input_file

# === VISUAL FORENSICS ===

def perform_ela(ip, od):
    """Error Level Analysis"""
    try:
        if not os.path.exists(ip): return "Missing"
        o = Image.open(ip).convert('RGB'); fn = os.path.basename(ip)
        tmp = os.path.join(od, f"tmp_{fn}.jpg"); o.save(tmp, 'JPEG', quality=ELA_QUALITY)
        r = Image.open(tmp); e = ImageChops.difference(o, r); ex = e.getextrema()
        
        # Handle tuple vs int extrema
        if isinstance(ex[0], tuple):
            md = max([x[1] for x in ex])
        else:
            md = max(ex)
        md = 1 if md == 0 else md
        
        e = ImageEnhance.Brightness(e).enhance((255.0 / md) * ELA_SCALE)
        sp = os.path.join(od, f"ELA_{fn}.png"); e.save(sp); os.remove(tmp)
        return f"ELA_{fn}.png"
    except Exception as e: return f"ELA Err:{e}"

def extract_images_smart(pdf_path, output_dir, rd):
    """
    Extracts images using Poppler and maps them to Page Numbers.
    """
    log("...Mapping image locations (pdfimages -list)...")
    
    # 1. Get Image List to map ID -> Page
    img_page_map = {}
    try:
        res = subprocess.run(["pdfimages", "-list", pdf_path], capture_output=True, text=True, errors='replace')
        img_counter = 0
        start_reading = False
        for line in res.stdout.splitlines():
            if "---" in line: start_reading = True; continue
            if not start_reading: continue
            parts = line.split()
            if len(parts) > 2:
                try:
                    img_page_map[img_counter] = int(parts[0])
                    img_counter += 1
                except: pass
    except: pass

    # 2. Extract
    log("...Extracting raw images (pdfimages -all)...")
    raw_prefix = os.path.join(output_dir, "raw")
    subprocess.run(["pdfimages", "-all", pdf_path, raw_prefix], stderr=subprocess.DEVNULL)

    # 3. Rename and Analyze
    extracted_files = glob(f"{raw_prefix}-*")
    total = 0
    img_metadata = []

    for f in extracted_files:
        try:
            # Parse seq id from filename "raw-001.jpg"
            base = os.path.basename(f)
            name_part, ext = os.path.splitext(base)
            seq_id = int(name_part.split('-')[-1])
            
            page = img_page_map.get(seq_id, 0)
            page_str = f"Page{page:02d}" if page > 0 else "UnknownPage"
            
            new_name = f"{page_str}_img{seq_id:03d}{ext}"
            new_path = os.path.join(output_dir, new_name)
            os.rename(f, new_path)
            
            # Analyze for report
            with Image.open(new_path) as im:
                w, h = im.size
                img_metadata.append({'file': new_name, 'size': f"{w}x{h}", 'format': im.format})
            total += 1
        except: pass

    if img_metadata:
        rd.append(["Image Stats", "Total Extracted", str(total)])
        # Stats on large images
        large_imgs = sum(1 for x in img_metadata if int(x['size'].split('x')[0]) > 2000)
        if large_imgs > 0:
            rd.append(["Image Analysis", "High Res Images", f"{large_imgs} > 2000px width"])

    return total

# === TEXT & CONTENT FORENSICS ===

def extract_full_text_poppler(pdf_path, output_dir, rd):
    """Extract text using Poppler (Layout Preserved)."""
    text_file = os.path.join(output_dir, "extracted_text.txt")
    cmd = ["pdftotext", "-layout", "-enc", "UTF-8", pdf_path, text_file]
    subprocess.run(cmd, stderr=subprocess.DEVNULL)
    
    content = ""
    if os.path.exists(text_file):
        with open(text_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    
    rd.append(["Text Extraction", "Method", "Poppler pdftotext (Layout Preserved)"])
    rd.append(["Text Extraction", "Output", "extracted_text.txt"])
    rd.append(["Text Stats", "Total Characters", str(len(content))])
    return content

def detect_patterns(extracted_text, rd):
    """Detect PII and regex patterns."""
    patterns = {
        'Email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'Phone': r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
        'IPv4': r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
        'URL': r'https?://[^\s<>"\)]+|www\.[^\s<>"\)]+',
        'Bitcoin': r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b',
    }
    
    total = 0
    for name, regex in patterns.items():
        matches = list(set(re.findall(regex, extracted_text))) # Dedup
        if matches:
            rd.append(["Pattern Detection", name, f"Found {len(matches)} unique"])
            total += len(matches)
            for m in matches[:3]: rd.append([name, "Sample", str(m)])
    return total

def detect_suspicious_keywords(extracted_text, rd):
    """Detect malware/phishing keywords."""
    keywords = {
        'Malware': ['javascript:', 'eval(', 'unescape(', 'base64', 'cmd.exe', 'powershell', '/bin/sh'],
        'Phishing': ['verify account', 'suspended', 'urgent action', 'confirm identity', 'reset password'],
        'Scam': ['wire transfer', 'western union', 'bitcoin wallet', 'lottery winner']
    }
    text_lower = extracted_text.lower()
    for cat, terms in keywords.items():
        found = [t for t in terms if t in text_lower]
        if found:
            rd.append(["Suspicious Keywords", cat, f"Matches: {', '.join(found[:5])}"])
            return len(found)
    return 0

# === STRUCTURE & METADATA FORENSICS (Pikepdf) ===

def analyze_security(pdf, original_path, rd):
    """Check encryption and permissions."""
    rd.append(["Security", "Encrypted", "Yes" if pdf.is_encrypted else "No"])
    try:
        perms = pdf.allow
        rd.append(["Permissions", "Modify", str(perms.modify)])
        rd.append(["Permissions", "Extract", str(perms.extract)])
    except: pass
    
    # Check for raw encrypt dictionary in original file
    with open(original_path, 'rb') as f:
        if b'/Encrypt' in f.read():
            rd.append(["Security", "Raw Analysis", "Encryption Dictionary Found"])

def analyze_page_sizes(pdf, rd):
    """Analyze page dimensions."""
    sizes = []
    for i, page in enumerate(pdf.pages, 1):
        try:
            box = page.MediaBox
            w, h = float(box[2]-box[0]), float(box[3]-box[1])
            sizes.append((w, h))
            if page.get('/Rotate', 0) != 0:
                rd.append(["Page Rotation", f"Page {i}", f"{page.get('/Rotate')}°"])
        except: pass
    
    if sizes:
        common = Counter(sizes).most_common(1)[0]
        rd.append(["Page Size", "Most Common", f"{common[0][0]:.0f}x{common[0][1]:.0f} pts"])
        if len(set(sizes)) > 1:
            rd.append(["Page Size", "Anomaly", "Mixed page sizes detected"])

def analyze_timestamps(pdf, rd):
    """Compare dates."""
    try:
        meta = pdf.docinfo
        c = str(meta.get('/CreationDate', ''))
        m = str(meta.get('/ModDate', ''))
        if c: rd.append(["Timestamps", "Created", c])
        if m: rd.append(["Timestamps", "Modified", m])
        if c and m and m < c:
            rd.append(["Timestamps", "⚠️ SUSPICIOUS", "Modified Date is BEFORE Creation Date"])
    except: pass

def extract_javascript(pdf, rd):
    """Deep JS scan."""
    js_count = 0
    # 1. Names Tree
    if '/Names' in pdf.Root and '/JavaScript' in pdf.Root.Names:
        rd.append(["JavaScript", "Location", "Names Tree (Document Level)"])
        js_count += 1
    # 2. Pages
    for i, pg in enumerate(pdf.pages):
        for key in ['/AA', '/A']: # Additional Actions / Actions
            if key in pg and '/JS' in pg[key]:
                rd.append(["JavaScript", f"Page {i+1}", f"Found in {key}"])
                js_count += 1
    # 3. Form Fields
    if '/AcroForm' in pdf.Root and '/Fields' in pdf.Root.AcroForm:
        try:
            for field in pdf.Root.AcroForm.Fields:
                if '/AA' in field:
                    rd.append(["JavaScript", "Form Field", "Action detected"])
                    js_count += 1
        except: pass
    return js_count

def parse_incremental_updates(fp, rd):
    """Check EOF markers."""
    with open(fp, 'rb') as f: raw = f.read()
    eof_count = len(re.findall(b'%%EOF', raw))
    if eof_count > 1:
        rd.append(["Incremental Updates", "Versions", str(eof_count)])
        rd.append(["Structure", "History", "File has been modified/saved multiple times"])
    return eof_count

def analyze_fonts(pdf, rd):
    """List fonts."""
    fonts = set()
    for pg in pdf.pages:
        if '/Resources' in pg and '/Font' in pg.Resources:
            for name, obj in pg.Resources.Font.items():
                fonts.add(str(obj.get('/BaseFont', 'Unknown')))
    rd.append(["Fonts", "Count", str(len(fonts))])
    if len(fonts) < 10:
        for f in list(fonts): rd.append(["Font", "Name", f])

def extract_embedded_files(pdf, od, rd):
    """Extract attachments."""
    cnt = 0
    if '/Names' in pdf.Root and '/EmbeddedFiles' in pdf.Root.Names:
        try:
            tree = pdf.Root.Names.EmbeddedFiles
            if '/Names' in tree:
                names = tree.Names
                for i in range(0, len(names), 2):
                    fname = str(names[i])
                    fspec = names[i+1]
                    if '/EF' in fspec and '/F' in fspec.EF:
                        data = fspec.EF.F.read_bytes()
                        path = os.path.join(od, f"embedded_{cnt}_{fname}")
                        with open(path, 'wb') as f: f.write(data)
                        rd.append(["Attachment", fname, f"{len(data)} bytes"])
                        cnt += 1
        except: pass
    return cnt

def analyze_text_layers(pdf, rd):
    """Check for invisible text."""
    suspicious = 0
    for i, pg in enumerate(pdf.pages):
        try:
            raw = pg.get_contents().read_bytes()
            if b'3 Tr' in raw: # Rendering mode 3 (Invisible)
                rd.append(["Hidden Text", f"Page {i+1}", "Render Mode 3 (Invisible)"])
                suspicious += 1
            if b'/OCGs' in raw: # Optional Content Groups
                rd.append(["Hidden Text", f"Page {i+1}", "Layers (OCGs) detected"])
        except: pass
    return suspicious

def extract_actions_links(pdf, rd):
    """Extract URI and Launch actions."""
    links = 0
    for i, pg in enumerate(pdf.pages):
        if '/Annots' in pg:
            for annot in pg.Annots:
                try:
                    if '/A' in annot:
                        act = annot.A
                        if '/URI' in act:
                            rd.append(["Link", f"Page {i+1}", str(act.URI)])
                            links += 1
                        if '/F' in act: # Remote file
                            rd.append(["External File", f"Page {i+1}", str(act.F)])
                            links += 1
                except: pass
    return links

def fingerprint_software(pdf, rd):
    """Scan streams for software signatures."""
    sigs = {b'Adobe': 'Adobe', b'Microsoft': 'Office', b'Ghostscript': 'Ghostscript', b'Skia': 'Google Docs/Chrome'}
    found = set()
    for obj in pdf.objects:
        if isinstance(obj, Stream):
            head = obj.read_bytes()[:100]
            for sig, name in sigs.items():
                if sig in head: found.add(name)
    for f in found: rd.append(["Software Fingerprint", "Detected", f])

def perform_geometry_expansion(pdf_file, output_dir, rd):
    """Expand PDF margins to reveal hidden content."""
    try:
        pdf = pikepdf.Pdf.open(pdf_file)
        for pg in pdf.pages:
            box = pg.MediaBox
            # Expand in all directions
            new_box = [
                float(box[0]) - EXPANSION_MARGIN,
                float(box[1]) - EXPANSION_MARGIN,
                float(box[2]) + EXPANSION_MARGIN,
                float(box[3]) + EXPANSION_MARGIN
            ]
            pg.MediaBox = Array(new_box)
            if '/CropBox' in pg: del pg['/CropBox']
            
        out_path = os.path.join(output_dir, "expanded_geometry.pdf")
        pdf.save(out_path)
        rd.append(["Geometry", "Status", "Expanded PDF created"])
        rd.append(["Geometry", "File", "expanded_geometry.pdf"])
        
        # Render the expanded PDF
        render_dir = os.path.join(output_dir, "..", "Renders_Expanded")
        os.makedirs(render_dir, exist_ok=True)
        subprocess.run(["pdftoppm", "-png", "-rx", "72", "-ry", "72", out_path, 
                       os.path.join(render_dir, "page")], stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        rd.append(["Geometry", "Error", str(e)])
        return False

# === MAIN CONTROL ===

def analyze_pdf(tf):
    if not check_dependencies(): return

    ts = datetime.now().strftime("%H%M%S")
    bd = f"Forensics_{os.path.basename(tf)}_{ts}"
    dirs = {
        "root": bd,
        "images": os.path.join(bd, "Images"),
        "renders": os.path.join(bd, "Renders_Original"),
        "ela": os.path.join(bd, "ELA"),
        "modified": os.path.join(bd, "Modified_PDFs"),
        "embedded": os.path.join(bd, "Embedded_Files"),
        "text": os.path.join(bd, "Text")
    }
    for d in dirs.values(): os.makedirs(d, exist_ok=True)
    
    rd = []
    log(f"Starting Analysis: {tf}")

    # 1. Clean/Repair PDF (The Working Copy)
    work_file = clean_pdf_with_qpdf(tf, dirs['root'])
    
    # 2. ExifTool (Metadata)
    log("Running ExifTool...")
    et = cmd(f'exiftool "{tf}"')
    for line in et.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            rd.append(["ExifTool", k.strip(), v.strip()])

    # 3. Pikepdf Analysis (Structure)
    # Use CLEAN file for deep structure access, but check ORIG for encrypt headers
    log("Analyzing Internal Structure...")
    try:
        pdf_clean = pikepdf.Pdf.open(work_file)
        
        analyze_security(pdf_clean, tf, rd)
        analyze_page_sizes(pdf_clean, rd)
        analyze_timestamps(pdf_clean, rd)
        extract_javascript(pdf_clean, rd)
        parse_incremental_updates(tf, rd) # Check original for EOFs
        analyze_fonts(pdf_clean, rd)
        extract_embedded_files(pdf_clean, dirs['embedded'], rd)
        analyze_text_layers(pdf_clean, rd)
        extract_actions_links(pdf_clean, rd)
        fingerprint_software(pdf_clean, rd)
        
        # Geometry Expansion
        log("Performing Geometry Expansion...")
        perform_geometry_expansion(work_file, dirs['modified'], rd)
        
    except Exception as e:
        log(f"Structure Error: {e}")
        rd.append(["Critical", "Structure Analysis", str(e)])

    # 4. Text Extraction (Poppler)
    log("Extracting Text...")
    txt = extract_full_text_poppler(work_file, dirs['text'], rd)
    detect_patterns(txt, rd)
    detect_suspicious_keywords(txt, rd)

    # 5. Image Extraction (Poppler)
    log("Extracting Images...")
    extract_images_smart(work_file, dirs['images'], rd)

    # 6. Rendering & ELA
    log("Rendering Pages & ELA...")
    subprocess.run(["pdftoppm", "-png", "-rx", "100", "-ry", "100", work_file, 
                   os.path.join(dirs['renders'], "page")], stderr=subprocess.DEVNULL)
    
    ela_c = 0
    # ELA on extracted images
    for img in glob(os.path.join(dirs['images'], "*")):
        if perform_ela(img, dirs['ela']): ela_c += 1
    # ELA on Page Renders
    for render in glob(os.path.join(dirs['renders'], "*.png")):
        perform_ela(render, dirs['ela'])
    rd.append(["ELA", "Total Processed", str(ela_c)])

    # Save Report
    csv_path = os.path.join(dirs['root'], "Final_Report.csv")
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(["Category", "Item", "Value"])
        w.writerows(rd)
    
    log(f"Done. Report: {csv_path}")

if __name__ == "__main__":
    os.system('clear' if os.name == 'posix' else 'cls')
    files = glob("*.pdf"); files.sort(key=os.path.getmtime, reverse=True)
    
    print("╔═══════════════════════════════════════════════════╗")
    print("║   PDF FORENSICS PRO v7.0 (ULTIMATE)              ║")
    print("║   Poppler + QPDF + Pikepdf + ELA + Structure     ║")
    print("╚═══════════════════════════════════════════════════╝")
    
    if not files: print("❌ No PDFs found."); sys.exit()
    
    for i, f in enumerate(files):
        print(f"  {i+1:2d}. {f}")
    
    try:
        sel = int(input("\n Select File: ")) - 1
        analyze_pdf(files[sel])
    except: pass
