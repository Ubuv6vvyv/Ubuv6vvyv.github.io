#!/usr/bin/env python3
import os
import subprocess
import shutil
import concurrent.futures
import time
from datetime import datetime, timedelta

# ================= CONFIGURATION =================
BASE_URL = "https://ralphhosking.com/images/webcam/"
ROOT_DIR = "webcam_archive"
ORIGINALS_DIR = os.path.join(ROOT_DIR, "originals")
THUMBS_DIR = os.path.join(ROOT_DIR, "thumbs")

# Settings
MAX_WORKERS = 10       # Keep moderate to avoid system lag
CONNECTION_TIMEOUT = 10 # Seconds before giving up on a stuck file
# =================================================

def setup_dirs():
    for d in [ORIGINALS_DIR, THUMBS_DIR]:
        os.makedirs(d, exist_ok=True)

def generate_thumb(orig_path, thumb_path):
    """Generates a thumbnail using ImageMagick if missing or empty"""
    try:
        thumb_dir = os.path.dirname(thumb_path)
        os.makedirs(thumb_dir, exist_ok=True)
        
        # If thumb exists and has content, skip
        if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
            return False

        # Use 'nice' to prevent CPU hogging
        subprocess.run(
            ["nice", "-n", "10", "convert", orig_path, "-resize", "200x", "-quality", "80", thumb_path], 
            check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL
        )
        return True
    except Exception:
        return False

def download_image(date_str, hour):
    """Attempts to download an image for a specific timeslot, checking multiple 'seconds' variations"""
    hh = f"{hour:02d}"
    year, month = date_str[:4], date_str[4:6]
    
    # Standardized local filename: YYYYMMDD_HH.jpg
    filename = f"{date_str}_{hh}.jpg"
    
    orig_path = os.path.join(ORIGINALS_DIR, year, month, filename)
    thumb_path = os.path.join(THUMBS_DIR, year, month, filename)
    
    # Ensure subdirs exist
    os.makedirs(os.path.dirname(orig_path), exist_ok=True)

    # 1. CHECK LOCAL: If we already have it, just ensure thumb exists
    if os.path.exists(orig_path) and os.path.getsize(orig_path) > 0:
        if generate_thumb(orig_path, thumb_path):
            return "THUMB_FIXED"
        return "EXISTS"

    # 2. DOWNLOAD: Try variations of seconds (00 to 09)
    # The server files look like: 01-YYYYMMDD-HHMMSS-utc.jpg
    # We check 00-09 seconds because your logs showed 00, 01, 03, 04...
    
    found = False
    for sec in range(10): 
        sec_str = f"{sec:02d}"
        url = BASE_URL + f"01-{date_str}-{hh}00{sec_str}-utc.jpg"
        
        try:
            # -f (fail on 404), -s (silent), -L (follow redirect), --connect-timeout
            subprocess.run(
                ["curl", "-f", "-s", "-L", "--connect-timeout", str(CONNECTION_TIMEOUT), 
                 "-A", "Mozilla/5.0", "-o", orig_path, url], 
                check=True
            )
            
            # Verify download success
            if os.path.exists(orig_path) and os.path.getsize(orig_path) > 0:
                generate_thumb(orig_path, thumb_path)
                return "DOWNLOADED"
                
        except subprocess.CalledProcessError:
            continue # Try next second
            
    return "MISSING"

def get_date_range_tasks(days):
    """Generates a list of (date_str, hour) tuples for the last N days"""
    tasks = []
    curr = datetime.now()
    for i in range(days):
        d = curr - timedelta(days=i)
        d_str = d.strftime("%Y%m%d")
        # Reverse hours (23 down to 00) to get latest images first
        for h in range(23, -1, -1):
            tasks.append((d_str, h))
    return tasks

def worker_wrapper(args):
    """Unpacks arguments for the thread pool"""
    return download_image(*args)

def run_smart_repair():
    """Scans for gaps and repairs thumbnails without freezing"""
    print("\n[=] Starting Smart Repair Scan...")
    
    # 1. Fix Missing Thumbnails (Original exists, Thumb does not)
    print("[-] Checking for missing thumbnails (Streaming Mode)...")
    fixed_thumbs = 0
    
    # os.walk is a generator - it won't load everything into RAM at once
    for root, dirs, files in os.walk(ORIGINALS_DIR):
        for name in files:
            if not name.endswith('.jpg'): continue
            
            orig_full = os.path.join(root, name)
            
            # Calculate where the thumb SHOULD be
            rel_path = os.path.relpath(orig_full, ORIGINALS_DIR)
            thumb_full = os.path.join(THUMBS_DIR, rel_path)
            
            if generate_thumb(orig_full, thumb_full):
                fixed_thumbs += 1
                # Overwrite line to show activity without spamming scrollback
                print(f"    Fixed: {rel_path}          ", end='\r')
                
    print(f"\n    [OK] Generated {fixed_thumbs} missing thumbnails.")
    
    # 2. Clean Orphan Thumbnails (Thumb exists, Original does not)
    print("[-] Cleaning orphan thumbnails...")
    orphans = 0
    for root, dirs, files in os.walk(THUMBS_DIR):
        for name in files:
            if not name.endswith('.jpg'): continue
            
            thumb_full = os.path.join(root, name)
            rel_path = os.path.relpath(thumb_full, THUMBS_DIR)
            orig_full = os.path.join(ORIGINALS_DIR, rel_path)
            
            if not os.path.exists(orig_full):
                try:
                    os.remove(thumb_full)
                    orphans += 1
                except: pass
    print(f"    [OK] Removed {orphans} orphan thumbnails.")

def organize_loose_files():
    """Moves loose files in root folders to YYYY/MM subfolders"""
    if not os.path.exists(ORIGINALS_DIR): return
    
    moves = 0
    with os.scandir(ORIGINALS_DIR) as it:
        for entry in it:
            if entry.is_file() and entry.name.endswith(".jpg") and "_" in entry.name:
                try:
                    # Format: YYYYMMDD_HH.jpg
                    date_part = entry.name.split('_')[0]
                    year, month = date_part[:4], date_part[4:6]
                    if len(year) != 4 or len(month) != 2: continue
                    
                    target_dir = os.path.join(ORIGINALS_DIR, year, month)
                    os.makedirs(target_dir, exist_ok=True)
                    shutil.move(entry.path, os.path.join(target_dir, entry.name))
                    moves += 1
                except: continue
    
    if moves > 0:
        print(f"[+] Organized {moves} loose files.")

# === MAIN MENU ===

def main():
    setup_dirs()
    organize_loose_files()

    while True:
        print("\n══════ WEBCAM MANAGER v2.1 (FIXED) ══════")
        print("1. Scan & Download (Smart Fill)")
        print("2. Repair System (Fix Thumbs/Orphans)")
        print("3. Exit")
        
        choice = input("\nSelect: ").strip()

        if choice == "1":
            try: 
                days = int(input("Days back to check: "))
            except: 
                print("Invalid input"); continue
            
            tasks = get_date_range_tasks(days)
            print(f"[*] Analyzing {len(tasks)} time slots for gaps...")
            
            download_count = 0
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                # Map preserves order for the progress display
                results = executor.map(worker_wrapper, tasks)
                
                total = len(tasks)
                for i, status in enumerate(results):
                    # Only print if we actually did something (reduces visual clutter)
                    if status == "DOWNLOADED":
                        download_count += 1
                        print(f" [V] Retrieved: {tasks[i][0]}_{tasks[i][1]:02d}")
                    
                    if i % 50 == 0:
                        print(f"\rProgress: {i}/{total} | New Files: {download_count}", end='', flush=True)

            print(f"\n[=] Scan Complete. Downloaded {download_count} missing images.")
                
        elif choice == "2":
            run_smart_repair()
            
        elif choice == "3":
            print("Bye.")
            break

if __name__ == "__main__":
    main()
