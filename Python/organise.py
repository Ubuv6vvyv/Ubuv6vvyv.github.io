#!/usr/bin/env python3
import os
import shutil
from datetime import datetime

# ================= CONFIGURATION =================
# Path to your existing chaotic folder
ROOT_DIR = "webcam_archive" 
ORIGINALS_DIR = os.path.join(ROOT_DIR, "originals")
THUMBS_DIR = os.path.join(ROOT_DIR, "thumbs")
# =================================================

def organize_folder(target_dir):
    """Moves files from flat list into YYYY/MM subfolders"""
    if not os.path.exists(target_dir):
        print(f"[-] Directory not found: {target_dir}")
        return

    print(f"[*] Organizing {target_dir}...")
    
    files = [f for f in os.listdir(target_dir) if f.endswith(".jpg")]
    count = 0

    for filename in files:
        # Expected format: YYYYMMDD_HH.jpg (e.g., 20231215_14.jpg)
        try:
            date_part = filename.split('_')[0] # 20231215
            year = date_part[:4]
            month = date_part[4:6]
            
            # Create Year/Month structure
            month_dir = os.path.join(target_dir, year, month)
            if not os.path.exists(month_dir):
                os.makedirs(month_dir)

            # Move file
            src = os.path.join(target_dir, filename)
            dst = os.path.join(month_dir, filename)
            
            shutil.move(src, dst)
            count += 1
            
            if count % 1000 == 0:
                print(f"    Moved {count} files...")
                
        except Exception as e:
            print(f"[!] Skipped {filename}: {e}")

    print(f"[✓] Organized {count} files in {target_dir}")

def main():
    # Organize both originals and thumbnails
    organize_folder(ORIGINALS_DIR)
    organize_folder(THUMBS_DIR)

if __name__ == "__main__":
    main()
