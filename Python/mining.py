import os
import shutil
import subprocess
import re
import uuid
import hashlib
import csv
import sys
import math
import json
import shlex
import gc
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager
from collections import defaultdict

# Check for pypdf (Critical for Vector Merge & Link Extraction)
try:
    from pypdf import PdfReader, PdfWriter, PageObject, Transformation
    from pypdf.generic import RectangleObject
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

# Check for tqdm (Progress bars)
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False

# --- CONFIGURATION ---
WORKING_DIR = os.getcwd()  # FIXED: Use explicit current directory
OUTPUT_DIR = os.path.join(WORKING_DIR, "Master_Output_v13")
IMAGES_DIR = os.path.join(OUTPUT_DIR, "1_extracted_images")
DATA_DIR = os.path.join(OUTPUT_DIR, "2_data_mining")
MERGE_DIR = os.path.join(OUTPUT_DIR, "3_merged_pdfs")
UTILS_DIR = os.path.join(OUTPUT_DIR, "4_batch_utils")
THUMBS_DIR = os.path.join(OUTPUT_DIR, "temp_thumbs")
LOG_FILE = os.path.join(OUTPUT_DIR, "master.log")
CHECKPOINT_FILE = os.path.join(OUTPUT_DIR, ".checkpoint")
CACHE_FILE = os.path.join(OUTPUT_DIR, ".pdf_cache.json")

# Regex Definitions (PRE-COMPILED)
REGEX_EMAIL = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
REGEX_PHONE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}")
REGEX_URL_TEXT = re.compile(r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+")
REGEX_COORDS = re.compile(r"[-+]?\d{1,3}\.\d+[°]?\s*[NS]?,?\s*[-+]?\d{1,3}\.\d+[°]?\s*[EW]?")
REGEX_ZIP = re.compile(r"\b\d{5}(?:-\d{4})?\b")
REGEX_ADDRESS = re.compile(r"\d+\s+[\w\s]{3,50}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)\.?", re.IGNORECASE)
REGEX_DATE = re.compile(r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b")
REGEX_CURRENCY = re.compile(r"[$€£¥]\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY)")

BATCH_SIZE = 50
CSV_BUFFER_SIZE = 100
MAX_WORKERS = 2  # FIXED: Reduced for mobile/low-memory systems
MONTAGE_MAX_BATCH = 100  # FIXED: Limit montage batch size
MONTAGE_MEMORY_LIMIT = "256MB"  # FIXED: Hard memory limit
MONTAGE_MAP_LIMIT = "512MB"
SEEN_HASHES = set()
PDF_CACHE = {}
# ---------------------

# Logging
def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}\n"
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except:
        pass
    if level == "ERROR":
        print(f"   ! {msg}")

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

# FIXED: Added timeout parameter and better error handling
def run_command(cmd, max_length=100000, timeout=60):
    try:
        if isinstance(cmd, str):
            if len(cmd) > max_length:
                log(f"Command too long ({len(cmd)} chars), skipping", "WARN")
                return False
            subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, 
                         stderr=subprocess.DEVNULL, timeout=timeout)
        else:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, 
                         stderr=subprocess.DEVNULL, timeout=timeout)
        return True
    except subprocess.TimeoutExpired:
        log(f"Command timeout after {timeout}s", "ERROR")
        return False
    except Exception as e:
        log(f"Command failed: {e}", "ERROR")
        return False

# FIXED: Memory cleanup function
def cleanup_memory():
    """Force garbage collection"""
    gc.collect()

# PDF Cache System - Avoid re-scanning file tree
def load_pdf_cache():
    global PDF_CACHE
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r") as f:
                PDF_CACHE = json.load(f)
                log(f"Loaded cache with {len(PDF_CACHE)} entries")
    except:
        PDF_CACHE = {}

def save_pdf_cache():
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(PDF_CACHE, f)
    except:
        pass

def get_all_pdfs_cached():
    """Returns cached PDF list if recent, otherwise rescans"""
    load_pdf_cache()
    
    cache_time = PDF_CACHE.get("timestamp", 0)
    current_time = datetime.now().timestamp()
    
    # Cache valid for 5 minutes
    if current_time - cache_time < 300 and "pdfs" in PDF_CACHE:
        log("Using cached PDF list")
        return PDF_CACHE["pdfs"]
    
    # Rescan
    pdfs = sorted(list(get_all_pdfs_generator()))
    PDF_CACHE["pdfs"] = pdfs
    PDF_CACHE["timestamp"] = current_time
    save_pdf_cache()
    return pdfs

# FIXED: Use absolute paths and proper output directory exclusion
def get_all_pdfs_generator():
    """Generator that yields PDFs as discovered"""
    log(f"Scanning for PDFs in '{os.path.abspath(WORKING_DIR)}'...")
    output_abs = os.path.abspath(OUTPUT_DIR)
    try:
        for root, dirs, files in os.walk(WORKING_DIR):
            # FIXED: Properly exclude output directory
            if output_abs in os.path.abspath(root):
                continue
            for f in files:
                if f.lower().endswith(".pdf"):
                    yield os.path.abspath(os.path.join(root, f))
    except Exception as e:
        log(f"Error scanning directories: {e}", "ERROR")

def get_all_pdfs():
    """Legacy function"""
    return get_all_pdfs_cached()

# Checkpoint system
def save_checkpoint(module, data):
    try:
        checkpoints = {}
        if os.path.exists(CHECKPOINT_FILE):
            with open(CHECKPOINT_FILE, "r") as f:
                checkpoints = json.load(f)
        checkpoints[module] = data
        with open(CHECKPOINT_FILE, "w") as f:
            json.dump(checkpoints, f)
    except Exception as e:
        log(f"Checkpoint save failed: {e}", "WARN")

def load_checkpoint(module):
    try:
        if os.path.exists(CHECKPOINT_FILE):
            with open(CHECKPOINT_FILE, "r") as f:
                checkpoints = json.load(f)
                return checkpoints.get(module)
    except:
        pass
    return None

def clear_checkpoint(module):
    try:
        if os.path.exists(CHECKPOINT_FILE):
            with open(CHECKPOINT_FILE, "r") as f:
                checkpoints = json.load(f)
            if module in checkpoints:
                del checkpoints[module]
            with open(CHECKPOINT_FILE, "w") as f:
                json.dump(checkpoints, f)
    except:
        pass

# Adaptive hash calculation
def file_hash(filepath):
    try:
        file_size = os.path.getsize(filepath)
        chunk_size = min(65536, max(8192, file_size // 10)) if file_size > 0 else 65536
        
        hasher = hashlib.md5()
        with open(filepath, 'rb') as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        log(f"Hash failed for {filepath}: {e}", "ERROR")
        return None

def hash_file_worker(filepath):
    return (filepath, file_hash(filepath))

# Quick hash for duplicate detection (first 8KB + last 8KB)
def quick_hash(filepath):
    """Fast hash using file header + footer"""
    try:
        size = os.path.getsize(filepath)
        hasher = hashlib.md5()
        
        with open(filepath, 'rb') as f:
            # Hash first 8KB
            hasher.update(f.read(8192))
            
            # Hash last 8KB if file is large enough
            if size > 16384:
                f.seek(-8192, 2)
                hasher.update(f.read(8192))
        
        return hasher.hexdigest()
    except:
        return None

# Smart format detection
def is_jpeg(filepath):
    """Check if file is JPEG via magic bytes"""
    try:
        with open(filepath, 'rb') as f:
            return f.read(3) == b'\xff\xd8\xff'
    except:
        return False

# Single-pass deduplication
def sanitize_and_dedupe():
    print("   [~] Cleaning and Deduplicating Images...")
    log("Starting image deduplication")
    
    try:
        entries = list(os.scandir(IMAGES_DIR))
    except FileNotFoundError:
        return
    
    to_convert = []
    to_check = []
    
    for entry in entries:
        if not entry.is_file():
            continue
        
        try:
            if entry.name.endswith(('.ppm', '.pbm')):
                to_convert.append(entry.path)
            elif os.path.getsize(entry.path) < 5 * 1024:
                os.remove(entry.path)
            elif is_jpeg(entry.path):
                to_check.append(entry.path)
            else:
                to_convert.append(entry.path)
        except Exception as e:
            log(f"Error checking {entry.name}: {e}", "ERROR")
    
    # Batch convert
    if to_convert:
        print(f"   Converting {len(to_convert)} files to JPG...")
        for f in to_convert:
            run_command(f'mogrify -format jpg "{f}"')
            if os.path.exists(f) and not f.endswith('.jpg'):
                try:
                    os.remove(f)
                except:
                    pass
    
    # Refresh JPG list
    try:
        jpg_files = [os.path.join(IMAGES_DIR, f) for f in os.listdir(IMAGES_DIR) 
                     if f.lower().endswith('.jpg')]
    except:
        return
    
    # Parallel hash deduplication
    print(f"   Deduplicating {len(jpg_files)} images...")
    removed = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_file = {executor.submit(hash_file_worker, f): f for f in jpg_files}
        
        iterator = as_completed(future_to_file)
        if TQDM_AVAILABLE:
            iterator = tqdm(iterator, total=len(jpg_files), desc="   Hashing")
        
        for future in iterator:
            filepath, h = future.result()
            if h:
                if h in SEEN_HASHES:
                    try:
                        os.remove(filepath)
                        removed += 1
                    except:
                        pass
                else:
                    SEEN_HASHES.add(h)
    
    log(f"Deduplication complete: {removed} duplicates removed")
    cleanup_memory()  # FIXED: Clean up after operation

# =========================================
# MODULE 1: IMAGE EXTRACTION
# =========================================
def module_image_extractor():
    print("\n--- MODULE 1: IMAGE EXTRACTION ---")
    log("Starting image extraction module")
    
    if os.path.exists(IMAGES_DIR):
        shutil.rmtree(IMAGES_DIR)
    os.makedirs(IMAGES_DIR)
    
    # Size filtering
    print("   Filter by file size?")
    print("   1. Default (>5KB)")
    print("   2. Custom range")
    print("   3. Extract ALL sizes")
    choice = input("   Select: ").strip()
    
    min_size = 5 * 1024
    if choice == '2':
        try:
            min_kb = int(input("   Min size (KB): "))
            min_size = min_kb * 1024
        except:
            print("   Using default (5KB)")
    elif choice == '3':
        min_size = 0
    
    pdfs = get_all_pdfs()
    total = len(pdfs)
    print(f"   Found {total} PDFs. Extracting...")
    log(f"Processing {total} PDFs")
    
    checkpoint = load_checkpoint("image_extraction")
    start_idx = 0
    if checkpoint:
        start_idx = checkpoint.get("last_index", 0)
        if start_idx > 0:
            print(f"   Resuming from PDF #{start_idx + 1}")
    
    iterator = range(start_idx, total, BATCH_SIZE)
    if TQDM_AVAILABLE:
        iterator = tqdm(iterator, desc="   Extracting", initial=start_idx, total=total)
    
    for i in iterator:
        batch = pdfs[i:i+BATCH_SIZE]
        for pdf in batch:
            try:
                name = os.path.basename(pdf).replace('.pdf', '')
                uid = str(uuid.uuid4())[:6]
                run_command(f'pdfimages -j "{pdf}" "{IMAGES_DIR}/{name}_{uid}"')
            except Exception as e:
                log(f"Extraction failed for {pdf}: {e}", "ERROR")
        
        save_checkpoint("image_extraction", {"last_index": i + BATCH_SIZE})
    
    sanitize_and_dedupe()
    clear_checkpoint("image_extraction")
    
    # Basic image stats
    try:
        jpg_count = len([f for f in os.listdir(IMAGES_DIR) if f.endswith('.jpg')])
        total_size = sum(os.path.getsize(os.path.join(IMAGES_DIR, f)) 
                        for f in os.listdir(IMAGES_DIR) if f.endswith('.jpg'))
        print(f"   Extracted {jpg_count} unique images ({total_size / 1024 / 1024:.2f} MB)")
    except:
        pass
    
    print(f"   Done! Images in {IMAGES_DIR}")
    log("Image extraction complete")

# Batch convert images
def batch_image_convert():
    print("\n   Convert all images to:")
    print("   1. Grayscale (60% smaller)")
    print("   2. WebP (Modern format)")
    print("   3. PNG (Lossless)")
    print("   4. Apply watermark")
    print("   5. Auto-enhance (contrast/gamma)")
    
    choice = input("   Select: ").strip()
    
    try:
        images = [os.path.join(IMAGES_DIR, f) for f in os.listdir(IMAGES_DIR) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    except:
        print("   No images found!")
        return
    
    if not images:
        print("   No images to process!")
        return
    
    print(f"   Processing {len(images)} images...")
    
    if choice == '1':
        for img in images:
            run_command(f'mogrify -colorspace Gray "{img}"')
        print("   Converted to grayscale!")
        
    elif choice == '2':
        for img in images:
            run_command(f'mogrify -format webp -quality 85 "{img}"')
        print("   Converted to WebP!")
        
    elif choice == '3':
        for img in images:
            run_command(f'mogrify -format png "{img}"')
        print("   Converted to PNG!")
        
    elif choice == '4':
        text = input("   Watermark text: ").strip() or "CONFIDENTIAL"
        for img in images:
            run_command(f'mogrify -pointsize 40 -fill "rgba(255,255,255,0.5)" -gravity southeast -annotate +10+10 "{text}" "{img}"')
        print("   Watermark applied!")
        
    elif choice == '5':
        for img in images:
            run_command(f'mogrify -auto-level -auto-gamma -enhance "{img}"')
        print("   Images enhanced!")

# =========================================
# MODULE 2: VECTOR MERGE
# =========================================
def get_pdf_info_cached(pdf_path):
    """Get PDF info with basic caching"""
    try:
        mtime = os.path.getmtime(pdf_path)
        cache_key = f"{pdf_path}:{mtime}"
        
        if cache_key in PDF_CACHE:
            return PDF_CACHE[cache_key]
        
        out = subprocess.check_output(f'pdfinfo "{pdf_path}"', shell=True, timeout=5).decode(errors='ignore')
        info = {}
        for line in out.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                info[k.strip()] = v.strip()
        
        PDF_CACHE[cache_key] = info
        return info
    except:
        return {}

def get_pdf_aspect_ratio(pdf_path):
    info = get_pdf_info_cached(pdf_path)
    try:
        page_size = info.get("Page size", "")
        if "x" in page_size:
            dims = page_size.split("x")
            w = float(dims[0].strip().split(" ")[0])
            h = float(dims[1].strip().split(" ")[0])
            if h == 0:
                return 0.0
            return w / h
    except:
        pass
    return 0.0

@contextmanager
def pdf_reader_ctx(pdf_path):
    reader = None
    try:
        reader = PdfReader(pdf_path)
        yield reader
    finally:
        if reader:
            del reader

def create_vector_nup(file_list, output_path, cols=2, rows=1, landscape=False):
    if not PYPDF_AVAILABLE:
        print("   ! Error: 'pypdf' not installed.")
        log("pypdf not available for merge", "ERROR")
        return
    
    writer = PdfWriter()
    PAGE_W, PAGE_H = (842, 595) if landscape else (595, 842)
    
    cell_w = PAGE_W / cols
    cell_h = PAGE_H / rows
    items_per_page = cols * rows
    total_files = len(file_list)
    
    print(f"   Vector merging {total_files} files into {cols}x{rows} grid...")
    log(f"Vector merge: {total_files} files, {cols}x{rows}")
    
    iterator = range(0, total_files, items_per_page)
    if TQDM_AVAILABLE:
        iterator = tqdm(iterator, desc="   Merging")
    
    for i in iterator:
        batch = file_list[i:i + items_per_page]
        output_page = PageObject.create_blank_page(width=PAGE_W, height=PAGE_H)
        
        for idx, pdf_path in enumerate(batch):
            try:
                with pdf_reader_ctx(pdf_path) as reader:
                    if len(reader.pages) == 0:
                        continue
                    src_page = reader.pages[0]
                    
                    c = idx % cols
                    r = idx // cols
                    grid_y = (rows - 1) - r
                    x_base = c * cell_w
                    y_base = grid_y * cell_h
                    
                    src_w = float(src_page.cropbox.width)
                    src_h = float(src_page.cropbox.height)
                    rotation = src_page.get('/Rotate', 0)
                    if rotation in [90, 270]:
                        src_w, src_h = src_h, src_w
                    
                    scale = min((cell_w * 0.95) / src_w, (cell_h * 0.95) / src_h)
                    
                    final_w = src_w * scale
                    final_h = src_h * scale
                    tx = x_base + ((cell_w - final_w) / 2) - (float(src_page.cropbox.left) * scale)
                    ty = y_base + ((cell_h - final_h) / 2) - (float(src_page.cropbox.bottom) * scale)
                    
                    src_page.add_transformation(Transformation().scale(scale).translate(tx, ty))
                    output_page.merge_page(src_page)
            except Exception as e:
                log(f"Page merge failed: {e}", "ERROR")
        
        writer.add_page(output_page)
    
    try:
        with open(output_path, "wb") as f:
            writer.write(f)
        print(f"   Success: {output_path}")
        log(f"Merge complete: {output_path}")
    except Exception as e:
        print(f"   ! Error saving merged file: {e}")
        log(f"Merge save failed: {e}", "ERROR")

def streaming_merge(file_list, output_path, chunk_size=10):
    print(f"   Streaming merge: {len(file_list)} files in chunks of {chunk_size}...")
    temp_files = []
    
    for i in range(0, len(file_list), chunk_size):
        chunk = file_list[i:i+chunk_size]
        temp_out = f"{MERGE_DIR}/temp_chunk_{i//chunk_size}.pdf"
        
        cmd = f'gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dNumRenderingThreads=2 -dBufferSpace=50000000 -sOutputFile="{temp_out}" '
        cmd += " ".join([f'"{p}"' for p in chunk])
        
        if run_command(cmd):
            temp_files.append(temp_out)
    
    if temp_files:
        cmd = f'gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dNumRenderingThreads=2 -sOutputFile="{output_path}" '
        cmd += " ".join([f'"{p}"' for p in temp_files])
        run_command(cmd)
        
        for tf in temp_files:
            try:
                os.remove(tf)
            except:
                pass
    
    log(f"Streaming merge complete: {output_path}")

def module_merge_menu():
    print("\n--- MODULE 2: PDF MERGING (Vector) ---")
    log("Starting merge module")
    
    if not os.path.exists(MERGE_DIR):
        os.makedirs(MERGE_DIR)
    pdfs = get_all_pdfs()
    
    print("   1. Standard Merge")
    print("   2. Streaming Merge (Low RAM)")
    print("   3. Aspect Ratio Sort")
    print("   4. 2-Up (Side-by-Side Landscape)")
    print("   5. 2x2 Grid")
    print("   6. Custom NxM Grid")
    print("   7. Reverse Order Merge")
    print("   8. Split into N parts")
    
    c = input("   Select: ").strip()
    
    try:
        if c == '1':
            out = f"{MERGE_DIR}/MERGED_FULL.pdf"
            cmd = f"gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dNumRenderingThreads=2 -sOutputFile=\"{out}\" " + " ".join([f'"{p}"' for p in pdfs])
            run_command(cmd, timeout=300)
            
        elif c == '2':
            streaming_merge(pdfs, f"{MERGE_DIR}/MERGED_STREAMING.pdf")
            
        elif c == '3':
            print("   Analyzing aspect ratios...")
            scored = [(get_pdf_aspect_ratio(p), p) for p in pdfs]
            scored.sort(key=lambda x: x[0])
            sorted_pdfs = [x[1] for x in scored]
            out = f"{MERGE_DIR}/MERGED_ASPECT.pdf"
            cmd = f"gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dNumRenderingThreads=2 -sOutputFile=\"{out}\" " + " ".join([f'"{p}"' for p in sorted_pdfs])
            run_command(cmd, timeout=300)
            
        elif c == '4':
            create_vector_nup(pdfs, f"{MERGE_DIR}/VECTOR_2UP_LANDSCAPE.pdf", cols=2, rows=1, landscape=True)
        elif c == '5':
            create_vector_nup(pdfs, f"{MERGE_DIR}/VECTOR_2x2.pdf", cols=2, rows=2, landscape=False)
        elif c == '6':
            cols = int(input("   Columns: "))
            rows = int(input("   Rows: "))
            land = input("   Landscape? (y/n): ").lower() == 'y'
            create_vector_nup(pdfs, f"{MERGE_DIR}/VECTOR_{cols}x{rows}.pdf", cols=cols, rows=rows, landscape=land)
        elif c == '7':
            out = f"{MERGE_DIR}/MERGED_REVERSE.pdf"
            cmd = f"gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dNumRenderingThreads=2 -sOutputFile=\"{out}\" " + " ".join([f'"{p}"' for p in reversed(pdfs)])
            run_command(cmd, timeout=300)
        elif c == '8':
            parts = int(input("   Split into how many parts? "))
            chunk = math.ceil(len(pdfs) / parts)
            for i in range(parts):
                batch = pdfs[i*chunk:(i+1)*chunk]
                out = f"{MERGE_DIR}/MERGED_PART_{i+1:02d}.pdf"
                cmd = f"gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dNumRenderingThreads=2 -sOutputFile=\"{out}\" " + " ".join([f'"{p}"' for p in batch])
                run_command(cmd, timeout=300)
                print(f"   Created part {i+1}/{parts}")
    except Exception as e:
        print(f"   ! Merge Error: {e}")
        log(f"Merge error: {e}", "ERROR")

# =========================================
# MODULE 3: DATA MINING
# =========================================
def extract_deep_links(pdf_path):
    links = set()
    try:
        with pdf_reader_ctx(pdf_path) as reader:
            for page in reader.pages:
                if "/Annots" in page:
                    for annot in page["/Annots"]:
                        obj = annot.get_object()
                        if "/A" in obj and "/URI" in obj["/A"]:
                            links.add(obj["/A"]["/URI"])
    except Exception as e:
        log(f"Link extraction failed for {pdf_path}: {e}", "ERROR")
    return list(links)

class BufferedCSVWriter:
    def __init__(self, filepath, headers):
        self.filepath = filepath
        self.headers = headers
        self.buffer = []
        self.file = open(filepath, "w", encoding='utf-8', newline='')
        self.writer = csv.writer(self.file)
        self.writer.writerow(headers)
    
    def writerow(self, row):
        self.buffer.append(row)
        if len(self.buffer) >= CSV_BUFFER_SIZE:
            self.flush()
    
    def flush(self):
        if self.buffer:
            self.writer.writerows(self.buffer)
            self.buffer = []
            self.file.flush()
    
    def close(self):
        self.flush()
        self.file.close()

def module_data_mining():
    print("\n--- MODULE 3: DATA MINING (Optimized) ---")
    log("Starting data mining module")
    
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    print("   Select extraction scope:")
    print("   1. [ALL]     Everything")
    print("   2. [EMAIL]   Emails Only")
    print("   3. [PHONE]   Phones Only")
    print("   4. [URLS]    Links Only")
    print("   5. [META]    Metadata Only")
    print("   6. [TEXT]    Full Text Dump")
    print("   7. [GEO]     Geographic Data")
    print("   8. [FINANCIAL] Dates & Currency")
    
    choice = input("   Select: ").strip()
    
    do_email = choice in ['1', '2']
    do_phone = choice in ['1', '3']
    do_links = choice in ['1', '4']
    do_meta  = choice in ['1', '5']
    do_text  = choice in ['1', '6']
    do_geo   = choice in ['1', '7']
    do_financial = choice in ['1', '8']
    
    pdfs = get_all_pdfs()
    xmp_dir = os.path.join(DATA_DIR, "raw_xmp")
    if do_meta and not os.path.exists(xmp_dir):
        os.makedirs(xmp_dir)
    
    GLOBAL_SEEN = defaultdict(set)
    handles = {}
    
    if do_text:
        handles['txt'] = open(f"{DATA_DIR}/ALL_TEXT.txt", "w", encoding='utf-8')
    
    if do_links:
        handles['links'] = BufferedCSVWriter(f"{DATA_DIR}/links_master.csv", ["Type", "Data", "SourceFile"])
    
    if do_meta:
        handles['meta'] = BufferedCSVWriter(f"{DATA_DIR}/metadata_summary.csv", ["File", "Title", "Author", "Created", "Pages", "Size_MB", "Has_XMP"])
    
    if do_email:
        handles['email'] = BufferedCSVWriter(f"{DATA_DIR}/extracted_emails.csv", ["Email_Address", "SourceFile"])
    
    if do_phone:
        handles['phone'] = BufferedCSVWriter(f"{DATA_DIR}/extracted_phones.csv", ["Phone_Number", "SourceFile"])
    
    if do_geo:
        handles['coords'] = BufferedCSVWriter(f"{DATA_DIR}/extracted_coordinates.csv", ["Coordinates", "SourceFile"])
        handles['zips'] = BufferedCSVWriter(f"{DATA_DIR}/extracted_zipcodes.csv", ["ZipCode", "SourceFile"])
        handles['addresses'] = BufferedCSVWriter(f"{DATA_DIR}/extracted_addresses.csv", ["Address", "SourceFile"])
    
    if do_financial:
        handles['dates'] = BufferedCSVWriter(f"{DATA_DIR}/extracted_dates.csv", ["Date", "SourceFile"])
        handles['currency'] = BufferedCSVWriter(f"{DATA_DIR}/extracted_currency.csv", ["Amount", "SourceFile"])
    
    print(f"   Mining {len(pdfs)} files (Streaming Mode)...")
    log(f"Data mining: {len(pdfs)} files")
    
    checkpoint = load_checkpoint("data_mining")
    start_idx = 0
    if checkpoint:
        start_idx = checkpoint.get("last_index", 0)
        GLOBAL_SEEN = defaultdict(set, checkpoint.get("seen_data", {}))
        if start_idx > 0:
            print(f"   Resuming from PDF #{start_idx + 1}")
    
    iterator = enumerate(pdfs[start_idx:], start=start_idx)
    if TQDM_AVAILABLE:
        iterator = tqdm(iterator, desc="   Mining", initial=start_idx, total=len(pdfs))
    
    for i, pdf in iterator:
        fname = os.path.basename(pdf)
        
        if i % 50 == 0:
            for k, v in handles.items():
                if k == 'txt':
                    v.flush()
                else:
                    v.flush()
            
            save_checkpoint("data_mining", {
                "last_index": i,
                "seen_data": dict(GLOBAL_SEEN)
            })
        
        # Text Streaming
        if do_email or do_phone or do_links or do_text or do_geo or do_financial:
            try:
                cmd = f'pdftotext -layout "{pdf}" -'
                process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, 
                                          stderr=subprocess.DEVNULL, text=True, errors='replace')
                
                if do_text:
                    handles['txt'].write(f"--- {fname} ---\n")
                
                for line in process.stdout:
                    if do_text:
                        handles['txt'].write(line)
                    
                    if do_email:
                        for match in REGEX_EMAIL.findall(line):
                            if match not in GLOBAL_SEEN['emails']:
                                handles['email'].writerow([match, fname])
                                GLOBAL_SEEN['emails'].add(match)
                    
                    if do_phone:
                        for match in REGEX_PHONE.findall(line):
                            if isinstance(match, tuple):
                                match = "".join(match)
                            clean = match.strip()
                            if len(clean) > 6 and clean not in GLOBAL_SEEN['phones']:
                                handles['phone'].writerow([clean, fname])
                                GLOBAL_SEEN['phones'].add(clean)
                    
                    if do_links:
                        for match in REGEX_URL_TEXT.findall(line):
                            if match not in GLOBAL_SEEN['links']:
                                handles['links'].writerow(["Text_Link", match, fname])
                                GLOBAL_SEEN['links'].add(match)
                    
                    if do_geo:
                        for match in REGEX_COORDS.findall(line):
                            if match not in GLOBAL_SEEN['coords']:
                                handles['coords'].writerow([match, fname])
                                GLOBAL_SEEN['coords'].add(match)
                        
                        for match in REGEX_ZIP.findall(line):
                            if match not in GLOBAL_SEEN['zips']:
                                handles['zips'].writerow([match, fname])
                                GLOBAL_SEEN['zips'].add(match)
                        
                        for match in REGEX_ADDRESS.findall(line):
                            if match not in GLOBAL_SEEN['addresses']:
                                handles['addresses'].writerow([match, fname])
                                GLOBAL_SEEN['addresses'].add(match)
                    
                    if do_financial:
                        for match in REGEX_DATE.findall(line):
                            if match not in GLOBAL_SEEN['dates']:
                                handles['dates'].writerow([match, fname])
                                GLOBAL_SEEN['dates'].add(match)
                        
                        for match in REGEX_CURRENCY.findall(line):
                            if match not in GLOBAL_SEEN['currency']:
                                handles['currency'].writerow([match, fname])
                                GLOBAL_SEEN['currency'].add(match)
                
                if do_text:
                    handles['txt'].write("\n\n")
                    
            except Exception as e:
                log(f"Text extraction failed for {pdf}: {e}", "ERROR")
        
        if do_links and PYPDF_AVAILABLE:
            embedded = extract_deep_links(pdf)
            for link in embedded:
                if link not in GLOBAL_SEEN['links']:
                    handles['links'].writerow(["Embedded_Action", link, fname])
                    GLOBAL_SEEN['links'].add(link)
        
        if do_meta:
            try:
                info = get_pdf_info_cached(pdf)
                
                title = info.get("Title", "")
                author = info.get("Author", "")
                created = info.get("CreationDate", "")
                pages = info.get("Pages", "0")
                
                size_mb = os.path.getsize(pdf) / 1024 / 1024
                
                has_xmp = "No"
                try:
                    xmp_data = subprocess.check_output(f'pdfinfo -meta "{pdf}"', shell=True, timeout=5).decode('utf-8', errors='ignore')
                    if len(xmp_data) > 100:
                        has_xmp = "Yes"
                        with open(os.path.join(xmp_dir, f"{fname}.xml"), "w", encoding="utf-8") as xf:
                            xf.write(xmp_data)
                except:
                    pass
                
                handles['meta'].writerow([fname, title, author, created, pages, f"{size_mb:.2f}", has_xmp])
            except Exception as e:
                log(f"Metadata extraction failed for {pdf}: {e}", "ERROR")
    
    for k, v in handles.items():
        if k == 'txt':
            v.close()
        else:
            v.close()
    
    clear_checkpoint("data_mining")
    cleanup_memory()  # FIXED: Clean up after operation
    print(f"   Done. Data saved to {DATA_DIR}")
    log("Data mining complete")

# =========================================
# MODULE 4: VISUAL INDEX
# =========================================
def module_visual_index():
    print("\n--- MODULE 4: VISUAL INDEX ---")
    log("Starting visual index module")
    
    if os.path.exists(THUMBS_DIR):
        shutil.rmtree(THUMBS_DIR)
    os.makedirs(THUMBS_DIR)
    pdfs = get_all_pdfs()
    
    print("   Generating thumbnails...")
    
    iterator = enumerate(pdfs)
    if TQDM_AVAILABLE:
        iterator = tqdm(iterator, desc="   Thumbnails", total=len(pdfs))
    
    for i, pdf in iterator:
        try:
            run_command(f'pdftoppm -jpeg -f 1 -l 1 -scale-to 200 "{pdf}" "{THUMBS_DIR}/thumb_{i:04d}"', timeout=30)
        except Exception as e:
            log(f"Thumbnail failed for {pdf}: {e}", "ERROR")
    
    thumbs = sorted([os.path.join(THUMBS_DIR, f) for f in os.listdir(THUMBS_DIR) if f.endswith('.jpg')])
    if not thumbs:
        return
    
    total_thumbs = len(thumbs)
    
    cols = 10
    rows = 10
    items_per_page = cols * rows
    
    if total_thumbs < 25:
        cols = 5
        rows = 5
        items_per_page = 25
    elif total_thumbs < 50:
        cols = 7
        rows = 7
        items_per_page = 49
    
    total_pages = math.ceil(total_thumbs / items_per_page)
    
    print(f"   Stitching {total_thumbs} thumbnails into {total_pages} pages ({cols}x{rows} grid)...")
    log(f"Creating {total_pages} index pages with {cols}x{rows} grid")
    
    for page_num in range(total_pages):
        start_idx = page_num * items_per_page
        end_idx = min(start_idx + items_per_page, total_thumbs)
        batch = thumbs[start_idx:end_idx]
        
        out = os.path.join(OUTPUT_DIR, f"INDEX_{page_num + 1:03d}.jpg")
        list_file = os.path.join(THUMBS_DIR, f"list_{page_num}.txt")
        
        with open(list_file, "w") as f:
            for t in batch:
                f.write(t+"\n")
        
        run_command(f'montage @{list_file} -tile {cols}x{rows} -geometry 200x200+2+2 -frame 1 -limit memory {MONTAGE_MEMORY_LIMIT} -limit map {MONTAGE_MAP_LIMIT} "{out}"', timeout=180)
        
        print(f"   Created page {page_num + 1}/{total_pages}")
    
    shutil.rmtree(THUMBS_DIR)
    cleanup_memory()  # FIXED: Clean up after operation
    print(f"   Complete! Generated {total_pages} index pages.")
    log("Visual index complete")

# =========================================
# MODULE 5: BATCH UTILITIES
# =========================================
def module_utils_menu():
    print("\n--- MODULE 5: BATCH UTILITIES ---")
    log("Starting batch utilities")
    
    if not os.path.exists(UTILS_DIR):
        os.makedirs(UTILS_DIR)
    pdfs = get_all_pdfs()
    
    print("   1. Burst/Split Pages")
    print("   2. Rotate Pages")
    print("   3. Repair Corrupt PDFs")
    print("   4. Compress PDFs")
    print("   5. Remove Blank Pages")
    print("   6. PDF to Images")
    print("   7. Extract Page Range")
    print("   8. Get PDF Statistics")
    
    c = input("   Select: ").strip()
    
    if c == '1':
        print("   Burst options:")
        print("   1. All pages")
        print("   2. Specific range")
        range_choice = input("   Select: ").strip()
        
        start_page = 1
        end_page = 9999
        
        if range_choice == '2':
            try:
                start_page = int(input("   Start page: "))
                end_page = int(input("   End page: "))
            except:
                print("   Invalid range, using all pages")
        
        print("   Bursting files...")
        for pdf in pdfs:
            folder = os.path.join(UTILS_DIR, os.path.basename(pdf) + "_pages")
            if not os.path.exists(folder):
                os.makedirs(folder)
            try:
                base = os.path.join(folder, "page_%03d.pdf")
                cmd = f'gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dFirstPage={start_page} -dLastPage={end_page} -sOutputFile="{base}" "{pdf}"'
                run_command(cmd, timeout=300)
            except Exception as e:
                log(f"Burst failed for {pdf}: {e}", "ERROR")
    
    elif c == '2':
        print("   Select rotation:")
        print("   1. 90° Clockwise")
        print("   2. 180°")
        print("   3. 270° Clockwise")
        rot_choice = input("   Select: ").strip()
        
        angles = {'1': 90, '2': 180, '3': 270}
        angle = angles.get(rot_choice, 90)
        
        print(f"   Rotating {angle}°...")
        if PYPDF_AVAILABLE:
            for pdf in pdfs:
                try:
                    with pdf_reader_ctx(pdf) as reader:
                        writer = PdfWriter()
                        for page in reader.pages:
                            page.rotate(angle)
                            writer.add_page(page)
                        out = os.path.join(UTILS_DIR, f"ROTATED_{angle}_" + os.path.basename(pdf))
                        with open(out, "wb") as f:
                            writer.write(f)
                except Exception as e:
                    log(f"Rotation failed for {pdf}: {e}", "ERROR")
        else:
            print("   ! Error: pypdf required.")
    
    elif c == '3':
        print("   Repairing files...")
        for pdf in pdfs:
            out = os.path.join(UTILS_DIR, "REPAIRED_" + os.path.basename(pdf))
            cmd = f'gs -o "{out}" -sDEVICE=pdfwrite -dPDFSETTINGS=/prepress "{pdf}"'
            run_command(cmd, timeout=300)
    
    elif c == '4':
        print("   Select compression profile:")
        print("   1. Screen (72dpi) - Smallest")
        print("   2. Ebook (150dpi) - Balanced")
        print("   3. Print (300dpi) - High Quality")
        print("   4. Prepress (300dpi) - Archive")
        prof_choice = input("   Select: ").strip()
        
        profiles = {'1': '/screen', '2': '/ebook', '3': '/printer', '4': '/prepress'}
        profile = profiles.get(prof_choice, '/ebook')
        
        print(f"   Compressing with {profile} profile...")
        for pdf in pdfs:
            out = os.path.join(UTILS_DIR, "COMPRESSED_" + os.path.basename(pdf))
            cmd = f'gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS={profile} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="{out}" "{pdf}"'
            run_command(cmd, timeout=300)
    
    elif c == '5':
        print("   Removing blank pages...")
        if not PYPDF_AVAILABLE:
            print("   ! Error: pypdf required.")
            return
        
        for pdf in pdfs:
            try:
                with pdf_reader_ctx(pdf) as reader:
                    writer = PdfWriter()
                    removed = 0
                    
                    for page_num, page in enumerate(reader.pages):
                        text = page.extract_text().strip()
                        
                        if len(text) > 50:
                            writer.add_page(page)
                        else:
                            removed += 1
                    
                    if removed > 0:
                        out = os.path.join(UTILS_DIR, "NOBLANKS_" + os.path.basename(pdf))
                        with open(out, "wb") as f:
                            writer.write(f)
                        print(f"   {os.path.basename(pdf)}: Removed {removed} blank pages")
                    else:
                        print(f"   {os.path.basename(pdf)}: No blank pages found")
            except Exception as e:
                log(f"Blank page removal failed for {pdf}: {e}", "ERROR")
    
    elif c == '6':
        print("   PDF to Images Converter")
        print("   Select format:")
        print("   1. JPG (Compressed)")
        print("   2. PNG (Lossless)")
        print("   3. TIFF (High Quality)")
        fmt_choice = input("   Select: ").strip()
        
        formats = {'1': 'jpeg', '2': 'png', '3': 'tiff'}
        fmt = formats.get(fmt_choice, 'jpeg')
        
        print("   Select resolution:")
        print("   1. 150 DPI (Screen)")
        print("   2. 300 DPI (Print)")
        print("   3. 600 DPI (Archive)")
        dpi_choice = input("   Select: ").strip()
        
        dpis = {'1': '150', '2': '300', '3': '600'}
        dpi = dpis.get(dpi_choice, '300')
        
        print(f"   Converting to {fmt.upper()} at {dpi} DPI...")
        
        for pdf in pdfs:
            try:
                name = os.path.basename(pdf).replace('.pdf', '')
                folder = os.path.join(UTILS_DIR, f"{name}_images")
                if not os.path.exists(folder):
                    os.makedirs(folder)
                
                output_base = os.path.join(folder, f"{name}_page")
                cmd = f'pdftoppm -{fmt} -r {dpi} "{pdf}" "{output_base}"'
                run_command(cmd, timeout=300)
                print(f"   {name}: Complete")
            except Exception as e:
                log(f"PDF to image failed for {pdf}: {e}", "ERROR")
    
    elif c == '7':
        try:
            start = int(input("   Start page: "))
            end = int(input("   End page: "))
            
            print(f"   Extracting pages {start}-{end}...")
            for pdf in pdfs:
                name = os.path.basename(pdf)
                out = os.path.join(UTILS_DIR, f"PAGES_{start}-{end}_{name}")
                cmd = f'gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -dFirstPage={start} -dLastPage={end} -sOutputFile="{out}" "{pdf}"'
                run_command(cmd, timeout=300)
        except:
            print("   Invalid input!")
    
    elif c == '8':
        print("\n   PDF STATISTICS\n   " + "="*40)
        total_size = 0
        total_pages = 0
        
        for pdf in pdfs:
            try:
                info = get_pdf_info_cached(pdf)
                pages = int(info.get("Pages", "0"))
                size = os.path.getsize(pdf)
                total_pages += pages
                total_size += size
            except:
                pass
        
        print(f"   Total PDFs: {len(pdfs)}")
        print(f"   Total Pages: {total_pages}")
        print(f"   Total Size: {total_size / 1024 / 1024:.2f} MB")
        print(f"   Avg Pages/PDF: {total_pages / len(pdfs) if pdfs else 0:.1f}")
        print(f"   Avg Size/PDF: {total_size / len(pdfs) / 1024 / 1024 if pdfs else 0:.2f} MB")
    
    log("Batch utilities complete")

# =========================================
# MODULE 6: IMAGE TOOLKIT (Standalone)
# =========================================
def get_all_images_generator(target_dir=None):
    """Generator that yields image files"""
    search_dir = target_dir or WORKING_DIR
    log(f"Scanning for images in '{os.path.abspath(search_dir)}'...")
    
    img_exts = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp')
    output_abs = os.path.abspath(OUTPUT_DIR)
    
    try:
        for root, dirs, files in os.walk(search_dir):
            if output_abs in os.path.abspath(root):
                continue
            for f in files:
                if f.lower().endswith(img_exts):
                    yield os.path.abspath(os.path.join(root, f))
    except Exception as e:
        log(f"Error scanning for images: {e}", "ERROR")

def get_all_images(target_dir=None):
    """Returns sorted list of images"""
    return sorted(list(get_all_images_generator(target_dir)))

# FIXED: Improved EXIF extraction with proper path escaping
def extract_exif_data(image_path):
    """Extract EXIF data using exiftool"""
    try:
        result = subprocess.check_output(
            ['exiftool', '-j', image_path],
            timeout=5,
            stderr=subprocess.PIPE
        ).decode('utf-8', errors='ignore')
        
        data = json.loads(result)
        if data and len(data) > 0:
            return data[0]
    except subprocess.CalledProcessError as e:
        log(f"exiftool error for {image_path}: {e.stderr.decode()}", "ERROR")
    except Exception as e:
        log(f"EXIF extraction failed for {image_path}: {e}", "ERROR")
    return {}

# FIXED: Complete rewrite of batch EXIF extraction
def batch_exif_extract(images):
    """Extract EXIF from multiple images efficiently"""
    if not images:
        return []
    
    print(f"   Extracting EXIF from {len(images)} images...")
    
    # Create temp file list for batch processing
    list_file = os.path.join(OUTPUT_DIR, "temp_img_list.txt")
    
    # FIXED: Properly escape paths for exiftool
    with open(list_file, "w", encoding="utf-8") as f:
        for img in images:
            # Quote paths with spaces
            if ' ' in img or '"' in img or "'" in img:
                # Escape quotes and wrap in quotes
                escaped = img.replace('"', '\\"')
                f.write(f'"{escaped}"\n')
            else:
                f.write(f'{img}\n')
    
    try:
        # FIXED: Use list form instead of shell command
        result = subprocess.check_output(
            ['exiftool', '-j', '-@', list_file],
            timeout=len(images) * 2,
            stderr=subprocess.PIPE
        ).decode('utf-8', errors='ignore')
        
        os.remove(list_file)
        
        return json.loads(result)
    except subprocess.CalledProcessError as e:
        log(f"Batch EXIF extraction failed: {e.stderr.decode()}", "ERROR")
        try:
            os.remove(list_file)
        except:
            pass
    except Exception as e:
        log(f"Batch EXIF extraction failed: {e}", "ERROR")
        try:
            os.remove(list_file)
        except:
            pass
    return []

# FIXED: New function to prepare images for montage
def prepare_images_for_montage(images, target_dir):
    """Resize images to uniform size before montage"""
    print("   Preparing images for montage...")
    prepared = []
    
    prep_dir = os.path.join(target_dir, "montage_prep")
    os.makedirs(prep_dir, exist_ok=True)
    
    iterator = images
    if TQDM_AVAILABLE:
        iterator = tqdm(images, desc="   Resizing")
    
    for img in iterator:
        try:
            basename = os.path.basename(img)
            out_path = os.path.join(prep_dir, basename)
            
            # FIXED: Resize to 150x150, maintaining aspect ratio, add border
            cmd = (f'convert "{img}" '
                   f'-resize 150x150 '
                   f'-background white '
                   f'-gravity center '
                   f'-extent 150x150 '
                   f'"{out_path}"')
            
            if run_command(cmd, timeout=10):
                prepared.append(out_path)
        except Exception as e:
            log(f"Image prep failed for {img}: {e}", "ERROR")
    
    return prepared

# FIXED: Memory-safe montage creation
def process_montage_batch(images, batch_id, cols, rows, output_dir):
    """Process single batch with memory limits"""
    items_per_page = cols * rows
    total_pages = math.ceil(len(images) / items_per_page)
    
    for page_num in range(total_pages):
        start_idx = page_num * items_per_page
        end_idx = min(start_idx + items_per_page, len(images))
        batch = images[start_idx:end_idx]
        
        out = os.path.join(output_dir, f"MONTAGE_B{batch_id:02d}_P{page_num + 1:03d}.jpg")
        list_file = os.path.join(output_dir, f"temp_list_b{batch_id}_p{page_num}.txt")
        
        # FIXED: Properly escape paths
        with open(list_file, "w", encoding="utf-8") as f:
            for img in batch:
                if ' ' in img:
                    f.write(f'"{img}"\n')
                else:
                    f.write(f'{img}\n')
        
        # FIXED: Add memory limits and reduce quality
        cmd = (f'montage @"{list_file}" '
               f'-tile {cols}x{rows} '
               f'-geometry 150x150+2+2 '
               f'-quality 85 '
               f'-frame 1 '
               f'-limit memory {MONTAGE_MEMORY_LIMIT} '
               f'-limit map {MONTAGE_MAP_LIMIT} '
               f'-limit thread 2 '
               f'"{out}"')
        
        if not run_command(cmd, timeout=180):
            log(f"Montage failed for batch {batch_id} page {page_num}", "ERROR")
        
        # Clean up immediately
        try:
            os.remove(list_file)
        except:
            pass
        
        # Force garbage collection between pages
        gc.collect()
        
        print(f"   Created batch {batch_id} page {page_num + 1}/{total_pages}")

# FIXED: Safe montage with batch processing
def create_montage_safe(images, output_dir, cols=10, rows=10):
    """Create montages with memory protection"""
    
    # FIXED: Limit batch size for large datasets
    if len(images) > MONTAGE_MAX_BATCH:
        print(f"   ! WARNING: {len(images)} images detected")
        print(f"   Splitting into batches of {MONTAGE_MAX_BATCH}")
        
        for batch_num in range(0, len(images), MONTAGE_MAX_BATCH):
            batch = images[batch_num:batch_num + MONTAGE_MAX_BATCH]
            print(f"\n   Processing batch {batch_num//MONTAGE_MAX_BATCH + 1}/{math.ceil(len(images)/MONTAGE_MAX_BATCH)}...")
            process_montage_batch(batch, batch_num // MONTAGE_MAX_BATCH, cols, rows, output_dir)
            cleanup_memory()
    else:
        process_montage_batch(images, 0, cols, rows, output_dir)

def module_image_toolkit():
    print("\n--- MODULE 6: IMAGE TOOLKIT ---")
    log("Starting image toolkit")
    
    print("   Select image source:")
    print("   1. Current directory (recursive)")
    print("   2. Extracted images folder")
    print("   3. Custom path")
    
    source_choice = input("   Select: ").strip()
    
    target_dir = None
    if source_choice == '2':
        if not os.path.exists(IMAGES_DIR):
            print("   ! No extracted images found. Run Module 1 first.")
            return
        target_dir = IMAGES_DIR
    elif source_choice == '3':
        target_dir = input("   Enter path: ").strip()
        if not os.path.exists(target_dir):
            print("   ! Path does not exist.")
            return
    
    images = get_all_images(target_dir)
    
    if not images:
        print("   ! No images found.")
        return
    
    print(f"   Found {len(images)} images.")
    print("\n   Select operation:")
    print("   1. Create Montage")
    print("   2. Extract EXIF to CSV")
    print("   3. Rename by EXIF Date")
    print("   4. Rename by EXIF Camera Model")
    print("   5. Rename Sequential")
    print("   6. View EXIF Summary")
    print("   7. Strip All EXIF")
    print("   8. Find Duplicate Images")
    
    choice = input("   Select: ").strip()
    
    if choice == '1':
        # FIXED: Create montage with memory protection
        print("   Creating image montage...")
        
        total_imgs = len(images)
        cols = 10
        rows = 10
        
        if total_imgs < 25:
            cols = 5
            rows = 5
        elif total_imgs < 50:
            cols = 7
            rows = 7
        
        # FIXED: Prepare images first
        prepared_images = prepare_images_for_montage(images, OUTPUT_DIR)
        
        if not prepared_images:
            print("   ! Failed to prepare images.")
            return
        
        # FIXED: Use memory-safe montage creation
        create_montage_safe(prepared_images, OUTPUT_DIR, cols=cols, rows=rows)
        
        # Clean up prepared images
        prep_dir = os.path.join(OUTPUT_DIR, "montage_prep")
        if os.path.exists(prep_dir):
            shutil.rmtree(prep_dir)
        
        print(f"\n   Complete! Montages saved to {OUTPUT_DIR}")
        cleanup_memory()
    
    elif choice == '2':
        # Extract EXIF to CSV
        exif_data = batch_exif_extract(images)
        
        if not exif_data:
            print("   ! No EXIF data extracted.")
            return
        
        csv_path = os.path.join(OUTPUT_DIR, "image_exif_data.csv")
        
        # Collect all unique keys
        all_keys = set()
        for item in exif_data:
            all_keys.update(item.keys())
        
        common_keys = ['FileName', 'FileSize', 'ImageWidth', 'ImageHeight', 
                      'Make', 'Model', 'DateTimeOriginal', 'CreateDate',
                      'ISO', 'FNumber', 'ExposureTime', 'FocalLength',
                      'GPSLatitude', 'GPSLongitude']
        
        # Use common keys first, then others
        sorted_keys = [k for k in common_keys if k in all_keys]
        sorted_keys += sorted([k for k in all_keys if k not in common_keys])
        
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=sorted_keys, extrasaction='ignore')
            writer.writeheader()
            
            for item in exif_data:
                writer.writerow(item)
        
        print(f"   EXIF data saved to: {csv_path}")
        log(f"EXIF data extracted for {len(exif_data)} images")
    
    elif choice == '3':
        # Rename by EXIF date
        print("   Extracting EXIF dates...")
        exif_data = batch_exif_extract(images)
        
        if not exif_data:
            print("   ! No EXIF data extracted.")
            return
        
        renamed = 0
        skipped = 0
        
        for item in exif_data:
            src_path = item.get('SourceFile', '')
            if not src_path or not os.path.exists(src_path):
                continue
            
            # Try multiple date fields
            date_str = (item.get('DateTimeOriginal') or 
                       item.get('CreateDate') or 
                       item.get('ModifyDate') or 
                       item.get('FileModifyDate'))
            
            if not date_str:
                skipped += 1
                continue
            
            try:
                # Parse date (format: 2024:12:09 14:30:45)
                date_str = date_str.replace(':', '-', 2).replace(' ', '_').replace(':', '-')
                
                # Get file extension
                ext = os.path.splitext(src_path)[1]
                
                # Create new name
                new_name = f"IMG_{date_str}{ext}"
                new_path = os.path.join(os.path.dirname(src_path), new_name)
                
                # Handle duplicates
                counter = 1
                while os.path.exists(new_path):
                    new_name = f"IMG_{date_str}_{counter:02d}{ext}"
                    new_path = os.path.join(os.path.dirname(src_path), new_name)
                    counter += 1
                
                os.rename(src_path, new_path)
                renamed += 1
                
            except Exception as e:
                log(f"Rename failed for {src_path}: {e}", "ERROR")
                skipped += 1
        
        print(f"   Renamed: {renamed} | Skipped: {skipped}")
        log(f"Renamed {renamed} images by EXIF date")
    
    elif choice == '4':
        # Rename by camera model
        print("   Extracting camera models...")
        exif_data = batch_exif_extract(images)
        
        if not exif_data:
            print("   ! No EXIF data extracted.")
            return
        
        renamed = 0
        skipped = 0
        
        for item in exif_data:
            src_path = item.get('SourceFile', '')
            if not src_path or not os.path.exists(src_path):
                continue
            
            make = item.get('Make', '').strip()
            model = item.get('Model', '').strip()
            
            if not make and not model:
                skipped += 1
                continue
            
            try:
                # Clean camera name
                camera = f"{make}_{model}".replace(' ', '_').replace('/', '-')
                camera = re.sub(r'[^\w\-_]', '', camera)
                
                ext = os.path.splitext(src_path)[1]
                
                # Create sequential naming per camera
                new_name = f"{camera}_{renamed + 1:04d}{ext}"
                new_path = os.path.join(os.path.dirname(src_path), new_name)
                
                counter = 1
                while os.path.exists(new_path):
                    new_name = f"{camera}_{renamed + 1:04d}_{counter}{ext}"
                    new_path = os.path.join(os.path.dirname(src_path), new_name)
                    counter += 1
                
                os.rename(src_path, new_path)
                renamed += 1
                
            except Exception as e:
                log(f"Rename failed for {src_path}: {e}", "ERROR")
                skipped += 1
        
        print(f"   Renamed: {renamed} | Skipped: {skipped}")
        log(f"Renamed {renamed} images by camera model")
    
    elif choice == '5':
        # Sequential rename
        prefix = input("   Enter prefix (default: IMG): ").strip() or "IMG"
        start_num = 1
        try:
            start_num = int(input("   Start number (default: 1): ").strip() or "1")
        except:
            pass
        
        print(f"   Renaming {len(images)} images...")
        
        renamed = 0
        for i, img in enumerate(images, start=start_num):
            try:
                ext = os.path.splitext(img)[1]
                new_name = f"{prefix}_{i:05d}{ext}"
                new_path = os.path.join(os.path.dirname(img), new_name)
                
                if img != new_path:
                    os.rename(img, new_path)
                    renamed += 1
            except Exception as e:
                log(f"Rename failed for {img}: {e}", "ERROR")
        
        print(f"   Renamed {renamed} images")
        log(f"Sequential rename: {renamed} images")
    
    elif choice == '6':
        # EXIF Summary
        print("   Analyzing EXIF data...")
        exif_data = batch_exif_extract(images)
        
        if not exif_data:
            print("   ! No EXIF data extracted.")
            return
        
        cameras = defaultdict(int)
        dates = []
        has_gps = 0
        total_size = 0
        
        for item in exif_data:
            make = item.get('Make', '')
            model = item.get('Model', '')
            if make or model:
                cameras[f"{make} {model}".strip()] += 1
            
            date_str = item.get('DateTimeOriginal') or item.get('CreateDate')
            if date_str:
                dates.append(date_str[:10])  # YYYY:MM:DD
            
            if item.get('GPSLatitude') or item.get('GPSLongitude'):
                has_gps += 1
            
            size = item.get('FileSize', '')
            if size:
                # Parse size (e.g., "2.5 MB")
                try:
                    if 'MB' in size:
                        total_size += float(size.split()[0])
                    elif 'KB' in size:
                        total_size += float(size.split()[0]) / 1024
                except:
                    pass
        
        print("\n   === EXIF SUMMARY ===")
        print(f"   Total Images: {len(exif_data)}")
        print(f"   Total Size: {total_size:.2f} MB")
        print(f"   Images with GPS: {has_gps}")
        
        if cameras:
            print(f"\n   Camera Models ({len(cameras)}):")
            for cam, count in sorted(cameras.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"     {cam}: {count} photos")
        
        if dates:
            dates.sort()
            print(f"\n   Date Range:")
            print(f"     First: {dates[0]}")
            print(f"     Last: {dates[-1]}")
    
    elif choice == '7':
        # Strip EXIF
        print("   WARNING: This will remove ALL metadata from images!")
        confirm = input("   Continue? (yes/no): ").strip().lower()
        
        if confirm != 'yes':
            print("   Cancelled.")
            return
        
        print("   Stripping EXIF data...")
        
        for img in images:
            try:
                # Use exiftool to strip all metadata
                run_command(f'exiftool -all= -overwrite_original "{img}"', timeout=30)
            except Exception as e:
                log(f"EXIF strip failed for {img}: {e}", "ERROR")
        
        print(f"   EXIF stripped from {len(images)} images")
        log(f"Stripped EXIF from {len(images)} images")
    
    elif choice == '8':
        # Find duplicate images
        print("   Analyzing for duplicates...")
        print("   Method:")
        print("   1. Quick (file size + quick hash)")
        print("   2. Full (complete hash)")
        
        dup_choice = input("   Select: ").strip()
        
        hash_map = {}
        
        iterator = images
        if TQDM_AVAILABLE:
            iterator = tqdm(images, desc="   Hashing")
        
        for img in iterator:
            try:
                size = os.path.getsize(img)
                
                if dup_choice == '1':
                    h = f"{size}:{quick_hash(img)}"
                else:
                    h = file_hash(img)
                
                if h:
                    if h not in hash_map:
                        hash_map[h] = []
                    hash_map[h].append(img)
            except:
                pass
        
        duplicates = {h: files for h, files in hash_map.items() if len(files) > 1}
        
        if not duplicates:
            print("   No duplicate images found!")
            return
        
        print(f"\n   Found {len(duplicates)} sets of duplicates:")
        
        report_path = os.path.join(OUTPUT_DIR, "image_duplicates.txt")
        with open(report_path, "w", encoding="utf-8") as report:
            for idx, (h, files) in enumerate(duplicates.items(), 1):
                size = os.path.getsize(files[0]) / 1024
                report.write(f"\n=== Duplicate Set #{idx} ===\n")
                report.write(f"Count: {len(files)}\n")
                report.write(f"Size: {size:.2f} KB\n")
                
                print(f"\n   Set #{idx}: {len(files)} copies ({size:.2f} KB)")
                
                for f in files:
                    report.write(f"  - {f}\n")
                    print(f"     - {f}")
        
        print(f"\n   Report saved: {report_path}")
        
        print("\n   Delete duplicates? (Keep first)")
        del_choice = input("   (y/n): ").strip().lower()
        
        if del_choice == 'y':
            deleted = 0
            for h, files in duplicates.items():
                for f in files[1:]:
                    try:
                        os.remove(f)
                        deleted += 1
                    except Exception as e:
                        log(f"Delete failed for {f}: {e}", "ERROR")
            
            print(f"   Deleted {deleted} duplicate images")
            log(f"Deleted {deleted} duplicate images")

# =========================================
# MODULE 7: DUPLICATE FINDER
# =========================================
def module_duplicate_finder():
    print("\n--- MODULE 7: DUPLICATE PDF FINDER ---")
    log("Starting duplicate finder")
    
    print("   Analysis method:")
    print("   1. Quick scan (header/footer hash)")
    print("   2. Full scan (complete file hash)")
    choice = input("   Select: ").strip()
    
    pdfs = get_all_pdfs()
    total = len(pdfs)
    
    print(f"   Analyzing {total} PDFs...")
    hash_map = {}
    
    iterator = pdfs
    if TQDM_AVAILABLE:
        iterator = tqdm(pdfs, desc="   Hashing")
    
    for pdf in iterator:
        if choice == '1':
            h = quick_hash(pdf)
        else:
            h = file_hash(pdf)
        
        if h:
            if h not in hash_map:
                hash_map[h] = []
            hash_map[h].append(pdf)
    
    duplicates = {h: files for h, files in hash_map.items() if len(files) > 1}
    
    if not duplicates:
        print("   No duplicate PDFs found!")
        log("No duplicates found")
        return
    
    print(f"\n   Found {len(duplicates)} sets of duplicate PDFs:")
    
    report_path = os.path.join(OUTPUT_DIR, "duplicate_report.txt")
    csv_path = os.path.join(OUTPUT_DIR, "duplicates.csv")
    
    with open(report_path, "w", encoding="utf-8") as report:
        with open(csv_path, "w", encoding="utf-8", newline='') as csvfile:
            csv_writer = csv.writer(csvfile)
            csv_writer.writerow(["Hash", "FileCount", "Size_MB", "FilePaths"])
            
            for idx, (h, files) in enumerate(duplicates.items(), 1):
                size = os.path.getsize(files[0]) / 1024 / 1024
                report.write(f"\n=== Duplicate Set #{idx} ===\n")
                report.write(f"Hash: {h}\n")
                report.write(f"File Count: {len(files)}\n")
                report.write(f"Size: {size:.2f} MB\n")
                report.write("Files:\n")
                
                print(f"\n   Set #{idx}: {len(files)} copies ({size:.2f} MB each)")
                
                for f in files:
                    report.write(f"  - {f}\n")
                    print(f"     - {f}")
                
                csv_writer.writerow([h, len(files), f"{size:.2f}", "|".join(files)])
    
    print(f"\n   Reports saved:")
    print(f"   - {report_path}")
    print(f"   - {csv_path}")
    
    print("\n   Delete duplicates? (Keep first occurrence)")
    print("   WARNING: This cannot be undone!")
    del_choice = input("   (y/n): ").strip().lower()
    
    if del_choice == 'y':
        deleted = 0
        for h, files in duplicates.items():
            for f in files[1:]:
                try:
                    os.remove(f)
                    deleted += 1
                    print(f"   Deleted: {f}")
                except Exception as e:
                    log(f"Failed to delete {f}: {e}", "ERROR")
        
        print(f"\n   Deleted {deleted} duplicate files")
        log(f"Deleted {deleted} duplicates")
    
    log("Duplicate finder complete")

# =========================================
# MAIN
# =========================================
def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    
    log("=== POD MASTER v13 FIXED Started ===")
    
    while True:
        clear_screen()
        print("====== POD MASTER v13 (FIXED) ======")
        print(f" Pypdf: {PYPDF_AVAILABLE} | Tqdm: {TQDM_AVAILABLE}")
        print(f" Working Dir: {WORKING_DIR}")
        print("---------------------------------------")
        print(" 1. [Extract] PDF Images + Convert")
        print(" 2. [Merge]   PDF Vector N-Up + Split")
        print(" 3. [Data]    PDF Deep Mine + Financial")
        print(" 4. [Index]   PDF Visual Montage")
        print(" 5. [Utils]   PDF Split/Rotate/Stats")
        print(" 6. [Images]  Image Toolkit (EXIF/Montage)")
        print(" 7. [Dupes]   Find PDF Duplicates")
        print(" 8. [All]     Run PDF Tasks 1-4")
        print(" 9. [Cache]   Clear PDF Cache")
        print(" 0. Exit")
        
        c = input(" Select: ").strip()
        try:
            if c == '1':
                module_image_extractor()
                print("\n   Additional image operations?")
                print("   1. Skip")
                print("   2. Batch convert")
                sub = input("   Select: ").strip()
                if sub == '2':
                    batch_image_convert()
            elif c == '2':
                module_merge_menu()
            elif c == '3':
                module_data_mining()
            elif c == '4':
                module_visual_index()
            elif c == '5':
                module_utils_menu()
            elif c == '6':
                module_image_toolkit()
            elif c == '7':
                module_duplicate_finder()
            elif c == '8':
                module_image_extractor()
                module_merge_menu()
                module_data_mining()
                module_visual_index()
            elif c == '9':
                if os.path.exists(CACHE_FILE):
                    os.remove(CACHE_FILE)
                if os.path.exists(CHECKPOINT_FILE):
                    os.remove(CHECKPOINT_FILE)
                print("   Cache cleared!")
                log("Cache cleared")
            elif c == '0':
                save_pdf_cache()
                log("=== POD MASTER v13 FIXED Exited ===")
                break
        except KeyboardInterrupt:
            print("\n   ! Interrupted by user.")
            log("User interrupted operation", "WARN")
        except Exception as e:
            print(f"\n   ! Unexpected error: {e}")
            log(f"Unexpected error: {e}", "ERROR")
        
        input("\n Press Enter...")

if __name__ == "__main__":
    main()
