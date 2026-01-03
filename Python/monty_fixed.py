#!/usr/bin/env python3
import os
import sys
import subprocess
import json
import glob
import math
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- CONFIGURATION ---
CACHE_DIR = ".montage_cache"
THUMB_DIR = os.path.join(CACHE_DIR, "thumbs")
STATS_FILE = os.path.join(CACHE_DIR, "analysis_stats.json")
MAX_THUMB_SIZE = "300x300"
MAX_WORKERS = os.cpu_count() or 4

# ANSI Colors
C_RESET  = "\033[0m"
C_CYAN   = "\033[36m"
C_GREEN  = "\033[32m"
C_YELLOW = "\033[33m"
C_RED    = "\033[31m"
C_MAGENTA = "\033[35m"

class MontageTool:
    def __init__(self):
        self.stats = {}
        self.files = []
        self.current_sort = "ink_density" 
        self.grid_mode = "smart" 
        self.custom_grid_geo = None
        self.style_mode = "clean"
        self.output_format = "jpg"
        self.use_snake_grid = False 
        
        self.init_cache()

    def log(self, msg, color=C_RESET, end="\n"):
        sys.stdout.write(f"{color}{msg}{C_RESET}{end}")
        sys.stdout.flush()

    def check_dependencies(self):
        try:
            subprocess.run(["magick", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError:
            self.log("ERROR: ImageMagick missing. Run: pkg install imagemagick", C_RED)
            sys.exit(1)

    def init_cache(self):
        if not os.path.exists(THUMB_DIR):
            os.makedirs(THUMB_DIR)
        if os.path.exists(STATS_FILE):
            try:
                with open(STATS_FILE, 'r') as f:
                    self.stats = json.load(f)
            except: self.stats = {}

    def save_stats(self):
        with open(STATS_FILE, 'w') as f:
            json.dump(self.stats, f)

    def get_safe_filename(self, filename):
        base = os.path.basename(filename)
        name, ext = os.path.splitext(base)
        h = abs(hash(filename))
        return f"{name[:10]}_{h}.jpg"

    def _process_thumb(self, file_data):
        f_orig = file_data['orig']
        f_thumb = file_data['cache']
        
        if os.path.exists(f_thumb):
            return None

        try:
            cmd = [
                "magick", f"{f_orig}[0]", 
                "-resize", MAX_THUMB_SIZE, 
                "-quality", "80", 
                "-background", "white", 
                "-alpha", "remove",
                "-strip", 
                f_thumb
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return f_orig
        except:
            return None

    def ingest_content(self):
        self.log("\n--- Scanning & Ingesting ---", C_CYAN)
        exts = ['*.jpg', '*.jpeg', '*.png', '*.webp', '*.pdf', '*.gif', '*.bmp', '*.tif', '*.tiff']
        raw_files = []
        for ext in exts:
            raw_files.extend(glob.glob(ext))
            raw_files.extend(glob.glob(ext.upper()))
        
        raw_files = sorted(list(set(raw_files)))
        if not raw_files:
            self.log("No images found.", C_RED)
            return

        self.files = []
        tasks = []
        for f in raw_files:
            thumb_name = self.get_safe_filename(f)
            thumb_path = os.path.join(THUMB_DIR, thumb_name)
            item = {'orig': f, 'cache': thumb_path}
            self.files.append(item)
            tasks.append(item)

        self.log(f"Processing {len(tasks)} items with {MAX_WORKERS} threads...", C_YELLOW)
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [executor.submit(self._process_thumb, item) for item in tasks]
            completed = 0
            for _ in as_completed(futures):
                completed += 1
                print(f"Thumbnails: {completed}/{len(tasks)}", end='\r')
        
        print("\nIngestion complete.")
        self.analyze_content()

    def _analyze_single(self, item):
        orig = item['orig']
        cache = item['cache']
        
        if orig in self.stats and 'ink' in self.stats[orig]: 
            return None

        try:
            cmd = [
                "magick", cache,
                "-colorspace", "HSL",
                "-format", 
                "%[fx:mean.b],%[fx:mean.r],%[fx:mean.g],%[fx:standard_deviation],%[fx:maxima.y]", 
                "info:"
            ]
            res = subprocess.run(cmd, capture_output=True, text=True)
            vals = res.stdout.strip().split(',')
            
            cmd_ink = ["magick", cache, "-colorspace", "Gray", "-format", "%[fx:mean]", "info:"]
            res_ink = subprocess.run(cmd_ink, capture_output=True, text=True)
            ink_val = float(res_ink.stdout.strip() or 0)

            cmd_rgb = ["magick", cache, "-format", "%[fx:mean.r-mean.b]", "info:"]
            res_rgb = subprocess.run(cmd_rgb, capture_output=True, text=True)
            
            cmd_edge = ["magick", cache, "-edge", "1", "-format", "%[fx:mean]", "info:"]
            res_edge = subprocess.run(cmd_edge, capture_output=True, text=True)

            return (orig, {
                "bright": float(vals[0]),
                "hue": float(vals[1]),
                "sat": float(vals[2]),
                "drama": float(vals[3]),
                "y_pos": float(vals[4]),
                "ink": ink_val,
                "temp": float(res_rgb.stdout.strip() or 0),
                "edge": float(res_edge.stdout.strip() or 0),
                "size": os.path.getsize(orig)
            })
        except Exception:
            return None

    def analyze_content(self):
        self.log("--- Analyzing Visual Data ---", C_CYAN)
        updates = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [executor.submit(self._analyze_single, item) for item in self.files]
            count = 0
            for f in as_completed(futures):
                count += 1
                print(f"Analyzing: {count}/{len(self.files)}", end='\r')
                result = f.result()
                if result:
                    self.stats[result[0]] = result[1]
                    updates += 1
        
        if updates > 0:
            self.save_stats()
            self.log(f"\nUpdated stats for {updates} files.", C_GREEN)
        else:
            self.log("\nAnalysis up to date.", C_GREEN)

    def get_sorted_files(self, override_sort=None):
        decorated = []
        for item in self.files:
            s = self.stats.get(item['orig'], {})
            d = {"bright": 0.5, "hue": 0, "sat": 0, "drama": 0, "ink": 0.5, "temp": 0, "edge": 0, "y_pos": 0.5}
            d.update(s)
            decorated.append((item, d))

        key = override_sort if override_sort else self.current_sort
        
        if key == "ink_density":
            # Enhanced: Smooth gradient from dark to light with slight saturation weighting
            decorated.sort(key=lambda x: x[1]['ink'] + (x[1]['sat'] * 0.1))
            
        elif key == "aesthetic_flow":
            # Enhanced: Better separation and smoother transitions
            docs = [x for x in decorated if x[1]['ink'] > 0.75 and x[1]['sat'] < 0.12]
            vibrant = [x for x in decorated if x[1]['sat'] > 0.4 and x[1]['bright'] > 0.3]
            muted = [x for x in decorated if x[1]['sat'] <= 0.4 and not (x[1]['ink'] > 0.75 and x[1]['sat'] < 0.12)]
            
            vibrant.sort(key=lambda x: x[1]['hue'])
            muted.sort(key=lambda x: (x[1]['bright'], x[1]['ink']))
            docs.sort(key=lambda x: x[1]['ink'])
            decorated = vibrant + muted + docs
            
        elif key == "smart_temperature":
            # Enhanced: Smooth warm-to-cool gradient with brightness balancing
            decorated.sort(key=lambda x: (x[1]['temp'] * 2) + (x[1]['bright'] * 0.3))
            
        elif key == "smart_rainbow":
            # Enhanced: Vibrant rainbow with smooth neutral transitions
            colored = [x for x in decorated if x[1]['sat'] > 0.2]
            neutral = [x for x in decorated if x[1]['sat'] <= 0.2]
            
            colored.sort(key=lambda x: (x[1]['hue'], -x[1]['sat']))
            neutral.sort(key=lambda x: (x[1]['bright'], x[1]['ink']))
            decorated = colored + neutral
            
        elif key == "vertical_flow":
            # Enhanced: Top-to-bottom with brightness continuity
            decorated.sort(key=lambda x: (x[1]['y_pos'], x[1]['bright']))
            
        elif key == "central_focus":
            # Enhanced: Logos/sharp edges first, then soft content
            decorated.sort(key=lambda x: (-x[1]['edge'], x[1]['sat']))
            
        elif key == "mood_ring":
            # Enhanced: Emotional gradient with better weighting
            decorated.sort(key=lambda x: (x[1]['temp'] * 1.5) + (x[1]['drama'] * 0.8) + (x[1]['sat'] * 0.3))
            
        elif key == "deep_hue":
            # Enhanced: Rich saturated colors with hue priority
            decorated.sort(key=lambda x: (x[1]['hue'] * 2) + (x[1]['sat'] * 1.5) - (x[1]['bright'] * 0.2))
            
        elif key == "drama":
            # Enhanced: High contrast first with brightness balance
            decorated.sort(key=lambda x: (-x[1]['drama'], abs(x[1]['bright'] - 0.5)))
            
        elif key == "filename":
            decorated.sort(key=lambda x: x[0]['orig'])

        return [x[0]['cache'] for x in decorated]

    def _apply_snake_sort(self, file_list, rows, cols):
        if not self.use_snake_grid: return file_list
        snaked_list = []
        for i in range(0, len(file_list), cols):
            chunk = file_list[i:i+cols]
            row_idx = i // cols
            if row_idx % 2 == 1: 
                chunk = chunk[::-1]
            snaked_list.extend(chunk)
        return snaked_list

    def generate(self, override_sort=None):
        sort_key = override_sort if override_sort else self.current_sort
        self.log(f"\n--- Processing: {sort_key.upper()} ---", C_MAGENTA)
        
        sorted_files = self.get_sorted_files(override_sort=sort_key)
        if not sorted_files: return
        count = len(sorted_files)

        geometry_setting = "+0+0"
        
        if self.grid_mode == "single_page":
            cols = math.ceil(math.sqrt(count))
            rows = math.ceil(count / cols)
            tile_geo = f"{cols}x{rows}"
            limit = count
            if count > 400: geometry_setting = "200x200+0+0"
            elif count > 900: geometry_setting = "150x150+0+0"
            else: geometry_setting = "+0+0"
                
        elif self.grid_mode == "smart":
            if count < 10: rows, cols = 3, 3
            elif count < 50: rows, cols = 5, 5
            else: rows, cols = 10, 10
            tile_geo = f"{cols}x{rows}"
            limit = rows * cols
            
        elif self.grid_mode == "10x10":
            rows, cols = 10, 10
            tile_geo = "10x10"
            limit = 100
        elif self.grid_mode == "netflix":
            rows, cols = 4, 5
            tile_geo = "5x4"
            limit = 20
        elif self.grid_mode == "strip":
            tile_geo = "1x20"
            limit = 20
            rows, cols = 20, 1
        elif self.grid_mode == "custom":
            if self.custom_grid_geo:
                rows, cols = self.custom_grid_geo
                tile_geo = f"{cols}x{rows}"
                limit = rows * cols
            else:
                rows, cols = 10, 10
                limit = 100
                tile_geo = "10x10"

        chunks = [sorted_files[i:i + limit] for i in range(0, len(sorted_files), limit)]
        ts = datetime.now().strftime("%H%M")
        base_name = f"Montage_{sort_key}_{ts}"
        out_files = []

        for idx, chunk in enumerate(chunks):
            if len(chunks) > 1:
                print(f"Rendering Page {idx+1}/{len(chunks)}...", end='\r')
            else:
                print(f"Rendering Single Page ({count} images)...", end='\r')
            
            if self.use_snake_grid and self.grid_mode != "strip":
                chunk = self._apply_snake_sort(chunk, rows, cols)

            list_file = os.path.join(CACHE_DIR, "temp_list.txt")
            with open(list_file, 'w') as f:
                for path in chunk: f.write(path + "\n")

            out_name = f"{base_name}_p{idx+1}.jpg" if len(chunks) > 1 else f"{base_name}_FULL.jpg"
            
            cmd = ["magick", "montage", f"@{list_file}"]
            
            if self.style_mode == "netflix":
                cmd.extend([
                    "-background", "#101010", "-fill", "#aaaaaa",
                    "-pointsize", "10", "-shadow", 
                    "-geometry", "+4+4", 
                    "-bordercolor", "#101010", "-border", "2",
                    "-title", f"PAGE {idx+1} | {sort_key.upper()}"
                ])
            else:
                cmd.extend([
                    "-background", "white",
                    "-geometry", geometry_setting, 
                    "-tile", tile_geo
                ])

            cmd.append(out_name)
            subprocess.run(cmd)
            out_files.append(out_name)

        if self.output_format == "pdf" and len(out_files) > 1:
            self.log("\nCompiling PDF...", C_CYAN)
            pdf_name = f"{base_name}.pdf"
            subprocess.run(["magick"] + out_files + [pdf_name])
            for f in out_files: os.remove(f)
            self.log(f"Done: {pdf_name}", C_GREEN)
        else:
            self.log(f"\nDone: {len(out_files)} file(s).", C_GREEN)

    def generate_all(self):
        self.log("\n--- BATCH MODE: GENERATING ALL VARIATIONS ---", C_YELLOW)
        all_modes = [
            'ink_density', 'aesthetic_flow', 'smart_rainbow', 
            'vertical_flow', 'central_focus', 'mood_ring', 'deep_hue'
        ]
        for mode in all_modes:
            self.generate(override_sort=mode)
        
        self.log("\nAll variations complete.", C_GREEN)
        input("Press Enter...")

    def menu(self):
        while True:
            print(f"\n{C_CYAN}=== VISUAL FLOW ENGINE ==={C_RESET}")
            print(f"Files: {len(self.files)} | Grid: {C_YELLOW}{self.grid_mode}{C_RESET}")
            print(f"Sort:  {C_YELLOW}{self.current_sort.upper()}{C_RESET}")
            print(f"Flow:  {C_YELLOW}{'SNAKE' if self.use_snake_grid else 'STANDARD'}{C_RESET}")
            print("-" * 30)
            print(f"{C_MAGENTA}--- SORT STRATEGIES ---{C_RESET}")
            print("1. Ink Density (Dark Ink -> Light Paper)")
            print("2. Aesthetic Flow (Rainbow Content -> Docs)")
            print("3. Smart Rainbow (Sat Weighted)")
            print("4. Vertical Flow (Top -> Bottom Heavy)")
            print("5. Central Focus (Logos -> Photos)")
            print("6. Mood Ring (Temp + Drama)")
            print(f"{C_MAGENTA}--- ACTIONS ---{C_RESET}")
            print("g. Grid Settings")
            print("f. Flow/Style Settings")
            print("o. Output Settings")
            print(f"{C_GREEN}9. CREATE ALL TYPES{C_RESET}")
            print("x. GENERATE CURRENT")
            print("q. Quit")
            
            c = input(f"{C_MAGENTA}> {C_RESET}").strip().lower()
            
            if c == '1': self.current_sort = 'ink_density'
            elif c == '2': self.current_sort = 'aesthetic_flow'
            elif c == '3': self.current_sort = 'smart_rainbow'
            elif c == '4': self.current_sort = 'vertical_flow'
            elif c == '5': self.current_sort = 'central_focus'
            elif c == '6': self.current_sort = 'mood_ring'
            elif c == '9': self.generate_all()
            
            elif c == 'g':
                print("1) Single Page (All-in-one)")
                print("2) Smart Paged (Auto)")
                print("3) 10x10 (Batcher)")
                print("4) Netflix Grid")
                print("5) Strip")
                print("6) Custom")
                gc = input("Choice: ")
                if gc == '1': self.grid_mode = 'single_page'
                elif gc == '2': self.grid_mode = 'smart'
                elif gc == '3': self.grid_mode = '10x10'
                elif gc == '4': self.grid_mode = 'netflix'
                elif gc == '5': self.grid_mode = 'strip'
                elif gc == '6':
                    try:
                        self.custom_grid_geo = (int(input("Rows: ")), int(input("Cols: ")))
                        self.grid_mode = 'custom'
                    except: pass
            
            elif c == 'f':
                print("1) Toggle Snake Flow")
                print("2) Toggle Netflix Style")
                fc = input("Choice: ")
                if fc == '1': self.use_snake_grid = not self.use_snake_grid
                if fc == '2': self.style_mode = "netflix" if self.style_mode == "clean" else "clean"
                
            elif c == 'o':
                self.output_format = "pdf" if self.output_format == "jpg" else "jpg"
            elif c == 'x':
                self.generate()
            elif c == 'q':
                sys.exit()

if __name__ == "__main__":
    app = MontageTool()
    app.check_dependencies()
    app.ingest_content()
    app.menu()
