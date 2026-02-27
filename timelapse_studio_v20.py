#!/usr/bin/env python3
"""
TIMELAPSE STUDIO v20 — Smooth Edition
Melbourne webcam hourly images → creative timelapses

Key improvements over v19:
  • Named filter presets (raw → extreme) combining deflicker + hqdn3d + tmix + normalize
  • Heavy luma-jump penalty in sorting to prevent day/night flicker
  • smooth_luma_jumps(): inserts hold frames at brightness discontinuities
  • brightness_lift option: raises dark/night frames so they don't go black
  • analyze_jumps(): shows you the problem before you render
  • Test Matrix mode: batch renders all preset×fps combos as short clips
  • Fixed filter_breathing (was referencing missing img.date_str)
  • Added Golden Hour only filter
  • Duration-aware output labelling
"""
import os, subprocess, tempfile, json, math, colorsys, random, time, sys
from datetime import datetime, timedelta, timezone
from collections import defaultdict

try:
    from PIL import Image, ImageStat
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False

# ========== CONFIG ==========
ROOT_DIR      = "webcam_archive"
ORIGINALS_DIR = os.path.join(ROOT_DIR, "originals")
OUTPUT_DIR    = "timelapses"
TEST_DIR      = os.path.join(OUTPUT_DIR, "test_matrix")
INDEX_FILE    = os.path.join(ROOT_DIR, "library_index.json")
LAST_OUTPUT   = None

# ========== FILTER PRESETS ==========
# Filter chain order: scale → normalize → hqdn3d → deflicker → tmix → format
# normalize=independence=0 requires ffmpeg ≥4.4. If it errors, set normalize=False in custom.
FILTER_PRESETS = {
    'raw':     {'deflicker': None,
                'hqdn3d':    None,
                'tmix':      None,
                'normalize': False,
                'desc': 'No processing — see the raw flicker'},

    'light':   {'deflicker': 'deflicker=mode=am:size=5',
                'hqdn3d':    None,
                'tmix':      'tblend=all_mode=average',
                'normalize': False,
                'desc': 'Light — minimal smoothing, preserves snap'},

    'medium':  {'deflicker': 'deflicker=mode=am:size=7',
                'hqdn3d':    'hqdn3d=0:0:3:3',
                'tmix':      "tmix=frames=3:weights='1 2 1'",
                'normalize': True,
                'desc': 'Medium — recommended starting point'},

    'heavy':   {'deflicker': 'deflicker=mode=am:size=10',
                'hqdn3d':    'hqdn3d=0:0:6:6',
                'tmix':      "tmix=frames=5:weights='1 2 3 2 1'",
                'normalize': True,
                'desc': 'Heavy — smooth, slight softness, good for mixed day/night'},

    'extreme': {'deflicker': 'deflicker=mode=am:size=15',
                'hqdn3d':    'hqdn3d=0:0:9:9',
                'tmix':      "tmix=frames=7:weights='1 1 2 3 2 1 1'",
                'normalize': True,
                'desc': 'Extreme — buttery smooth, painterly, slow render'},
}

RES_MAP = {
    '360p':  (640,  360),
    '480p':  (854,  480),
    '720p':  (1280, 720),
    '1080p': (1920, 1080),
    '4k':    (3840, 2160),
}

# ========== SETUP ==========
def setup():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(TEST_DIR,    exist_ok=True)
    if not PILLOW_AVAILABLE:
        print("[!] Pillow missing → pip install Pillow --break-system-packages")

# ========== IMAGE ==========
class ImageFile:
    __slots__ = ['path','filename','rgb','stats','dt','year','month','day','hour',
                 'month_key','is_sunrise','is_golden','is_night','is_day',
                 'luma','hue','saturation','value','sky_luma','building_luma',
                 'exposure_variance','valid']

    def __init__(self, path, filename, color_data=None, stats=None):
        self.path     = os.path.abspath(path)
        self.filename = filename
        self.rgb      = color_data
        self.stats    = stats or {}
        try:
            parts  = filename.replace(".jpg","").split("_")
            utc_dt = datetime.strptime(f"{parts[0]} {int(parts[1]):02d}", "%Y%m%d %H").replace(tzinfo=timezone.utc)
            self.dt = utc_dt + timedelta(hours=11)       # Melbourne UTC+11 approx
            self.year, self.month, self.day, self.hour = self.dt.year, self.dt.month, self.dt.day, self.dt.hour
            self.month_key = f"{self.year}-{self.month:02d}"

            m = self.month
            if m in [12,1,2]:   # Summer
                self.is_sunrise = self.hour in [5,6,7];   self.is_golden = self.hour in [18,19,20]; self.is_night = self.hour>=22 or self.hour<=4
            elif m in [6,7,8]:  # Winter
                self.is_sunrise = self.hour in [6,7,8];   self.is_golden = self.hour in [16,17,18]; self.is_night = self.hour>=19 or self.hour<=5
            else:               # Autumn/Spring
                self.is_sunrise = self.hour in [6,7];     self.is_golden = self.hour in [17,18,19]; self.is_night = self.hour>=21 or self.hour<=5
            self.is_day = not self.is_night

            if color_data:
                r,g,b = color_data
                self.luma           = int(0.299*r + 0.587*g + 0.114*b)
                h,s,v               = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
                self.hue, self.saturation, self.value = h*360, s, v
                st = stats or {}
                self.sky_luma           = st.get('sky_luma', self.luma)
                self.building_luma      = st.get('building_luma', self.luma)
                self.exposure_variance  = st.get('exposure_var', 0)
            else:
                self.luma = self.sky_luma = self.building_luma = 128
                self.hue  = self.saturation = self.exposure_variance = 0
                self.value = 0.5
        except:
            self.valid = False
        else:
            self.valid = True

# ========== CACHE ==========
def load_cache():
    try:
        with open(INDEX_FILE) as f: return json.load(f)
    except: return {}

def save_cache(c):
    with open(INDEX_FILE,'w') as f: json.dump(c,f)

def get_image_stats(path):
    try:
        with Image.open(path) as img:
            img = img.convert('RGB'); W,H = img.size
            st   = ImageStat.Stat(img)
            sky  = ImageStat.Stat(img.crop((0, 0, W, int(H*.4))))
            bld  = ImageStat.Stat(img.crop((0, int(H*.6), W, H)))
            luma = lambda s: int(0.299*s.mean[0]+0.587*s.mean[1]+0.114*s.mean[2])
            return {'color':tuple(map(int,st.mean[:3])), 'sky_luma':luma(sky),
                    'building_luma':luma(bld), 'exposure_var':sum(st.stddev)}
    except:
        return {'color':(128,128,128),'sky_luma':128,'building_luma':128,'exposure_var':0}

def scan_library():
    print("[*] Scanning library...")
    cache, dirty = load_cache(), False
    if not os.path.exists(ORIGINALS_DIR):
        print(f"[!] Not found: {ORIGINALS_DIR}"); return []

    files = [(r,f) for r,_,fs in os.walk(ORIGINALS_DIR) for f in fs if f.endswith('.jpg') and '_' in f]
    print(f"    Found {len(files)} images")
    lib = []

    for i,(root,fname) in enumerate(files):
        path = os.path.join(root, fname)
        c = cache.get(fname,{})
        if isinstance(c, list):   color, stats = (tuple(c) if len(c)==3 else None), None
        elif isinstance(c, dict): color, stats = c.get('color'), c.get('stats')
        else:                     color, stats = None, None

        if PILLOW_AVAILABLE and (color is None or stats is None):
            if (i+1)%100==0: print(f"    Analyzing {i+1}/{len(files)}...", end='\r', flush=True)
            d = get_image_stats(path)
            color = d['color']; stats = {k:v for k,v in d.items() if k!='color'}
            cache[fname] = {'color':color,'stats':stats}; dirty = True

        img = ImageFile(path, fname, color, stats)
        if img.valid: lib.append(img)

    if dirty: save_cache(cache)
    lib.sort(key=lambda x: x.dt)
    print(f"    Loaded {len(lib)} valid frames      ")
    return lib

# ========== SORTING & SMOOTHING ==========

def perceptual_distance(a, b, luma_penalty=1.0):
    """
    Perceptual distance between two frames.
    luma_penalty > 0 adds heavy cost to large brightness jumps —
    the main cause of day/night flicker.
    """
    if not (a.rgb and b.rgb): return 999.0
    sky_d = abs(a.sky_luma      - b.sky_luma)      / 255.0
    bld_d = abs(a.building_luma - b.building_luma) / 255.0
    hue_d = min(abs(a.hue-b.hue), 360-abs(a.hue-b.hue)) / 180.0
    sat_d = abs(a.saturation - b.saturation)
    lum_d = abs(a.luma - b.luma) / 255.0
    base  = math.sqrt((sky_d*3)**2 + (bld_d*2)**2 + (hue_d*1.5)**2 + sat_d**2 + lum_d**2)
    # Exponential penalty for brightness jumps beyond 25% of range
    if luma_penalty > 0 and lum_d > 0.25:
        base += (lum_d ** 1.5) * luma_penalty * 6.0
    return base

def nearest_neighbor_sort(images, luma_penalty=1.0):
    """
    Sort frames by visual similarity.
    luma_penalty controls how aggressively we avoid brightness jumps.
    Higher = smoother but less chronologically faithful.
    """
    if not images: return []
    rem = list(images)
    cur = min(rem, key=lambda x: x.sky_luma)   # Start from darkest frame
    rem.remove(cur); result = [cur]
    step = max(1, len(images)//10)

    while rem:
        cur = min(rem, key=lambda x: perceptual_distance(cur, x, luma_penalty))
        rem.remove(cur); result.append(cur)
        if len(result) % step == 0:
            print(f"      Sorted {len(result)}/{len(images)}...", end='\r', flush=True)

    print(f"      Sort done ({len(result)} frames)            ")
    return result

def smooth_luma_jumps(images, max_jump=45, max_pad=3):
    """
    Detect large brightness discontinuities and insert duplicate frames
    to cushion the transition. This gives FFmpeg's temporal filters
    something to blend across instead of a hard cut.

    max_jump : luma units (0-255) that trigger padding
    max_pad  : maximum frames to insert per transition
    """
    if len(images) < 2: return images
    result = [images[0]]
    total_pads = 0
    for i in range(1, len(images)):
        jump = abs(images[i].luma - images[i-1].luma)
        pads = min(max_pad, int(jump / max_jump))
        for _ in range(pads):
            result.append(images[i-1])   # Hold last frame briefly
        total_pads += pads
        result.append(images[i])
    if total_pads:
        print(f"    [+] Inserted {total_pads} padding frames at brightness jumps")
    return result

def analyze_jumps(images):
    """Print brightness-jump stats so you understand what the filter faces."""
    if len(images) < 2: return
    lumas = [x.luma for x in images]
    jumps = [abs(lumas[i]-lumas[i-1]) for i in range(1, len(lumas))]
    big = sum(1 for j in jumps if j > 40)
    very_big = sum(1 for j in jumps if j > 80)
    print(f"    Luma jumps: max={max(jumps):.0f}  avg={sum(jumps)/len(jumps):.1f}"
          f"  big(>40)={big}  severe(>80)={very_big}  total_frames={len(images)}")
    if very_big > len(images) * 0.05:
        print("    ⚠  HIGH flicker risk — consider 'heavy' or 'extreme' preset")
    elif big > len(images) * 0.1:
        print("    ⚠  Moderate flicker risk — 'medium' preset recommended")
    else:
        print("    ✓  Low flicker risk — 'light' or 'medium' should suffice")

# ========== FFMPEG FILTER CHAIN ==========

def build_vf(preset_name, res, brightness_lift=0.0, use_normalize=None):
    """
    Build the complete -vf string.
    brightness_lift: 0.0=off, 0.05–0.15 lifts dark/night frames.
    use_normalize: override preset's normalize value (None = use preset default).
    """
    p = FILTER_PRESETS.get(preset_name, FILTER_PRESETS['medium'])
    w, h = RES_MAP.get(res, (1280,720))
    chain = [f"scale={w}:{h}:flags=lanczos"]

    # Slightly lift night/dark frames so they don't flash to black
    if brightness_lift and brightness_lift > 0.001:
        chain.append(f"eq=brightness={brightness_lift:.3f}:gamma={1.0/(1.0+brightness_lift):.3f}:saturation=1.05")

    # Global temporal brightness normalisation
    do_norm = p['normalize'] if use_normalize is None else use_normalize
    if do_norm:
        chain.append("normalize=independence=0:strength=0.25")

    # Temporal noise & flicker suppression (very effective, slight softness)
    if p['hqdn3d']:
        chain.append(p['hqdn3d'])

    # Deflicker (windowed luminance equalisation)
    if p['deflicker']:
        chain.append(p['deflicker'])

    # Temporal frame blending (motion blur / smoothness)
    if p['tmix']:
        chain.append(p['tmix'])

    chain.append("format=yuv420p")
    return ",".join(chain)

# ========== RENDER ==========

def write_concat_file(frames, fps, speed=1, pad_jumps=True):
    if speed > 1: frames = frames[::speed]
    if pad_jumps and len(frames) > 1:
        frames = smooth_luma_jumps(frames)
    dur = 1.0 / fps
    tf  = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    for img in frames:
        p = img.path.replace("'", "'\\''")
        tf.write(f"file '{p}'\nduration {dur:.6f}\n")
    # FFmpeg concat needs a final file entry with no duration
    tf.write(f"file '{frames[-1].path.replace(chr(39), chr(39)+chr(92)+chr(39)+chr(39))}'\n")
    tf.close()
    return tf.name, frames

def render(images, out_path, fps, preset, res, speed=1, crf='23',
           ffpreset='medium', pad_jumps=True, brightness_lift=0.0):
    """
    Core render function.
    Always call this directly — settings_menu returns a dict you can **unpack.
    """
    global LAST_OUTPUT
    if len(images) < 10:
        print("[!] Too few frames to render"); return None

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    list_path, frames = write_concat_file(images, fps, speed, pad_jumps)
    vf  = build_vf(preset, res, brightness_lift)
    dur = len(frames) / fps

    cmd = ["ffmpeg","-y","-f","concat","-safe","0","-i",list_path,
           "-vf", vf,
           "-c:v","libx264","-preset",ffpreset,"-crf",str(crf),
           "-r",str(fps),"-movflags","+faststart","-pix_fmt","yuv420p",
           out_path]

    print(f"\n  → {os.path.basename(out_path)}")
    print(f"    {len(frames)} frames | {fps}fps | {dur:.0f}s | preset={preset} | {res} | lift={brightness_lift}")
    t0 = time.time()
    try:
        proc = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            print(f"    ✗ FAILED:\n{proc.stderr.decode()[-400:]}")
            return None
        mb = os.path.getsize(out_path) / 1048576
        print(f"    ✓ {time.time()-t0:.1f}s | {mb:.1f} MB")
        LAST_OUTPUT = out_path
        return out_path
    except FileNotFoundError:
        print("    ✗ ffmpeg not found — install: pkg install ffmpeg"); return None
    finally:
        try: os.remove(list_path)
        except: pass

# ========== TEST MATRIX ==========

def run_test_matrix(library):
    """
    Generate a grid of short test clips across presets × fps so you can
    pick the right settings visually without committing to a full render.
    """
    print("\n" + "="*58)
    print("  TEST MATRIX — Compare Settings Visually")
    print("="*58)
    print("\nGenerates short clips for each combination so you can")
    print("watch them and pick what looks best.\n")

    print("Sample type:")
    print("  1. Day/Night transitions (best for testing flicker)")
    print("  2. Sunrise + Golden hour only")
    print("  3. Midday only (stable lighting baseline)")
    print("  4. Chronological slice of recent days")
    src = input("Select (default=1): ").strip() or '1'

    if src == '2':
        pool = [x for x in library if x.is_sunrise or x.is_golden]
    elif src == '3':
        pool = [x for x in library if 10 <= x.hour <= 14]
    elif src == '4':
        cutoff = library[-1].dt - timedelta(days=14)
        pool   = [x for x in library if x.dt >= cutoff]
    else:
        # Mix: dusk/dawn frames — maximum transition stress-test
        pool = [x for x in library if x.is_sunrise or x.is_golden or x.hour in [12,13,14]]

    if len(pool) < 30:
        print("[!] Not enough sample frames"); return

    n_req = input(f"Frames per clip (default=150, pool={len(pool)}): ").strip() or '150'
    try: n_req = min(int(n_req), len(pool))
    except: n_req = 150

    step = max(1, len(pool)//n_req)
    base_frames = sorted(pool[::step][:n_req], key=lambda x: x.dt)
    print(f"\nUsing {len(base_frames)} frames per clip")

    print("\nWhat to vary:")
    print("  A. Filter presets only (5 clips, fast)")
    print("  B. FPS only (5 clips, fast)")
    print("  C. Preset × FPS grid (15 clips, ~5 min)")
    print("  D. Preset × FPS × Sort (30 clips, slow)")
    dim = (input("Select (default=C): ").strip() or 'C').upper()

    preset_opts = list(FILTER_PRESETS.keys()) if dim in ['A','C','D'] else ['medium']
    fps_opts    = [15, 24, 30, 48, 60]         if dim == 'B' else ([15, 24, 30] if dim in ['C','D'] else [24])
    sort_opts   = ['chrono','smooth']           if dim == 'D' else ['chrono']

    test_res = input("Test resolution (default=480p): ").strip() or '480p'
    lift_str = input("Brightness lift 0.0–0.2 (default=0.05): ").strip() or '0.05'
    try: bl = float(lift_str)
    except: bl = 0.05

    total = len(preset_opts) * len(fps_opts) * len(sort_opts)
    print(f"\nRendering {total} clips → {TEST_DIR}/\n")
    clips, n = [], 0

    for srt in sort_opts:
        if srt == 'smooth':
            frames = nearest_neighbor_sort(base_frames)
        else:
            frames = sorted(base_frames, key=lambda x: x.dt)

        for pname in preset_opts:
            for fps in fps_opts:
                n += 1
                tag = f"T{n:02d}_{srt}_{pname}_{fps}fps"
                out = os.path.join(TEST_DIR, f"{tag}.mp4")
                print(f"[{n:02d}/{total}]", end=' ')
                result = render(frames, out, fps=fps, preset=pname, res=test_res,
                                speed=1, crf='26', ffpreset='veryfast',
                                pad_jumps=True, brightness_lift=bl)
                clips.append({'tag':tag,'ok':result is not None,'path':out})

    print(f"\n{'='*58}")
    print(f"  {sum(1 for c in clips if c['ok'])}/{total} clips rendered OK")
    print(f"  Location: {TEST_DIR}/")
    print(f"{'='*58}\n")
    for c in clips:
        if c['ok']:
            sz = f"{os.path.getsize(c['path'])/1048576:.1f}MB"
            print(f"  ✓ {c['tag']:38s} {sz}")
        else:
            print(f"  ✗ {c['tag']:38s} FAILED")
    print()

# ========== FILTERS ==========

def filter_chronological(lib):
    return sorted(lib, key=lambda x: x.dt), "chrono"

def filter_day_only(lib):
    return sorted([x for x in lib if x.is_day], key=lambda x: x.dt), "day_only"

def filter_golden_only(lib):
    frames = [x for x in lib if x.is_sunrise or x.is_golden]
    return sorted(frames, key=lambda x: x.dt), "golden_only"

def filter_monthly_smooth(lib):
    monthly = defaultdict(list)
    for img in lib: monthly[img.month_key].append(img)
    result = []
    for k in sorted(monthly.keys()):
        sm = nearest_neighbor_sort(monthly[k])
        if result:
            # Align month start to best visual match with last frame
            best = min(range(len(sm)), key=lambda i: perceptual_distance(result[-1], sm[i]))
            sm   = sm[best:] + sm[:best]
        result.extend(sm)
    return result, "monthly_smooth"

def filter_smooth(lib):
    return nearest_neighbor_sort(lib), "smooth"

def filter_hourly_stack(lib):
    print("\n[Hourly Stack] Each hour across all days in sequence.")
    print("Example: '6-20' = day hours only, '5-22' = wide")
    rng = input("Hour range (default 6-20): ").strip() or '6-20'
    try: h1,h2 = map(int, rng.split('-'))
    except: h1,h2 = 6,20
    hour_map = defaultdict(list)
    for x in lib:
        if h1 <= x.hour <= h2: hour_map[x.hour].append(x)
    result = []
    for h in range(h1, h2+1):
        result.extend(sorted(hour_map.get(h,[]), key=lambda x: x.dt))
    return result, f"hourly_{h1}-{h2}"

def filter_breathing(lib):
    """Alternates forward/reverse day-by-day for a breathing effect."""
    days = defaultdict(list)
    for x in lib: days[x.dt.strftime('%Y%m%d')].append(x)
    result, rev = [], False
    for dk in sorted(days.keys()):
        frames = sorted(days[dk], key=lambda x: x.dt)
        result.extend(frames[::-1] if rev else frames)
        rev = not rev
    return result, "breathing"

def filter_spiral(lib):
    """First, Last, Second, Second-last... converges to midday."""
    chron = sorted(lib, key=lambda x: x.dt)
    result, l, r = [], 0, len(chron)-1
    while l <= r:
        result.append(chron[l])
        if l != r: result.append(chron[r])
        l += 1; r -= 1
    return result, "spiral"

# ========== ANALYSIS & MENUS ==========

def auto_analyze(images):
    """Inspect the frame set and recommend settings."""
    if not images: return {}
    night_r  = sum(1 for x in images if x.is_night) / len(images)
    golden_r = sum(1 for x in images if x.is_golden) / len(images)
    n        = min(len(images)-1, 500)
    jumps    = [abs(images[i].luma-images[i-1].luma) for i in range(1, n+1)]
    avg_j    = sum(jumps)/len(jumps) if jumps else 0
    max_j    = max(jumps) if jumps else 0

    if avg_j > 65 or max_j > 160: preset = 'extreme'
    elif avg_j > 45 or max_j > 100: preset = 'heavy'
    elif avg_j > 25: preset = 'medium'
    else: preset = 'light'

    fps  = 24 if night_r > 0.35 else 30
    res  = '720p' if len(images) > 1000 else '1080p'
    lift = 0.06 if night_r > 0.3 else 0.0

    print(f"\n  ── Auto Analysis ──────────────────────────")
    print(f"  Night ratio    : {night_r*100:.0f}%")
    print(f"  Golden ratio   : {golden_r*100:.0f}%")
    print(f"  Avg luma jump  : {avg_j:.1f} / max: {max_j:.0f}  (out of 255)")
    print(f"  Recommendation : preset={preset}  fps={fps}  res={res}  lift={lift}")
    print(f"  ────────────────────────────────────────────")

    return {'preset':preset,'fps':fps,'res':res,'crf':'23',
            'ffpreset':'medium','speed':1,'pad_jumps':True,'brightness_lift':lift}

def settings_menu(auto):
    """Override auto settings interactively."""
    print("\n  Render Mode:")
    print("  1. Auto (use recommended above)")
    print("  2. Quick Preview (480p, fast render)")
    print("  3. Custom")
    m = (input("  Select (default=1): ").strip() or '1')

    if m == '2':
        return {**auto, 'res':'480p','crf':'28','ffpreset':'veryfast','preset':'medium'}
    if m != '3':
        return auto

    cfg = auto.copy()

    print("\n  [Filter Preset]")
    for i,(k,v) in enumerate(FILTER_PRESETS.items(),1):
        marker = '← current' if k==cfg['preset'] else ''
        print(f"  {i}. {k:9s} — {v['desc']}  {marker}")
    p = input(f"  Select 1-{len(FILTER_PRESETS)} (Enter=keep): ").strip()
    if p.isdigit():
        pk = list(FILTER_PRESETS.keys())
        if 1 <= int(p) <= len(pk): cfg['preset'] = pk[int(p)-1]

    print(f"\n  [Resolution] {', '.join(RES_MAP.keys())}")
    r = input(f"  Enter (default={cfg['res']}): ").strip()
    if r in RES_MAP: cfg['res'] = r

    print("\n  [FPS]  15 / 24 / 30 / 48 / 60")
    print("  Tip: 24 for moody/cinematic, 30 for smooth day, 15 for slow drift")
    f = input(f"  Enter (default={cfg['fps']}): ").strip()
    if f.isdigit(): cfg['fps'] = int(f)

    print("\n  [Brightness Lift]  Raises dark frames to prevent black flashes")
    print("  0.0=off  0.05=subtle  0.10=noticeable  0.15=strong")
    bl = input(f"  Enter (default={cfg.get('brightness_lift',0.0)}): ").strip()
    try: cfg['brightness_lift'] = float(bl)
    except: pass

    print("\n  [Pad Jumps]  Insert hold frames at brightness discontinuities? (y/n)")
    pj = input(f"  (default={'y' if cfg.get('pad_jumps',True) else 'n'}): ").strip().lower()
    cfg['pad_jumps'] = (pj != 'n')

    print("\n  [Speed Multiplier]  1=real, 2=2x skip, 3=3x skip")
    sp = input("  Enter (default=1): ").strip()
    if sp.isdigit(): cfg['speed'] = int(sp)

    print("\n  [Quality CRF]  18=high quality  23=normal  28=smaller file")
    crf = input(f"  Enter (default={cfg['crf']}): ").strip()
    if crf.isdigit(): cfg['crf'] = crf

    return cfg

# ========== MAIN ==========

FILTER_MAP = {
    '1': filter_chronological,
    '2': filter_day_only,
    '3': filter_golden_only,
    '4': filter_monthly_smooth,
    '5': filter_smooth,
    '6': filter_hourly_stack,
    '7': filter_breathing,
    '8': filter_spiral,
}

def main():
    setup()
    library = scan_library()
    if not library:
        print("[!] No images found in", ORIGINALS_DIR); return

    while True:
        print("\n" + "="*50)
        print("  TIMELAPSE STUDIO v20 — Smooth Edition")
        print("="*50)
        print("  STANDARD")
        print("  1. Chronological (all frames, time order)")
        print("  2. Day Only      (skip night frames)")
        print("  3. Golden Only   (sunrise + sunset windows)")
        print("  4. Monthly Smooth (per-month similarity sort)")
        print()
        print("  CREATIVE")
        print("  5. Pure Smooth   (global similarity sort / art)")
        print("  6. Hourly Stack  (one hour across all days)")
        print("  7. Breathing     (fwd/rev alternating days)")
        print("  8. Temporal Spiral (extremes converging to middle)")
        print()
        print("  TOOLS")
        print("  9. Test Matrix   (batch render settings comparison)")
        print("  0. Exit")

        choice = input("\n  Select: ").strip()
        if choice == '0': break
        if choice == '9':
            run_test_matrix(library)
            continue
        if choice not in FILTER_MAP:
            print("  Invalid choice"); continue

        days_str = input("  Days back (0=All, Enter=7): ").strip()
        days = int(days_str) if days_str.isdigit() else 7
        if days > 0:
            cutoff = library[-1].dt - timedelta(days=days)
            subset = [x for x in library if x.dt >= cutoff]
        else:
            subset = library

        if not subset:
            print("  [!] No frames in that date range"); continue

        print(f"\n[*] Applying filter to {len(subset)} frames...")
        frames, tag = FILTER_MAP[choice](subset)

        if not frames:
            print("  [!] No frames after filter"); continue

        print(f"    Assembled: {len(frames)} frames")
        analyze_jumps(frames)

        auto = auto_analyze(frames)
        cfg  = settings_menu(auto)

        label    = f"{tag}_{cfg['res']}_{cfg['fps']}fps_{cfg['preset']}"
        out_path = os.path.join(OUTPUT_DIR, f"{label}.mp4")

        render(
            images           = frames,
            out_path         = out_path,
            fps              = cfg['fps'],
            preset           = cfg['preset'],
            res              = cfg['res'],
            speed            = cfg['speed'],
            crf              = cfg['crf'],
            ffpreset         = cfg['ffpreset'],
            pad_jumps        = cfg['pad_jumps'],
            brightness_lift  = cfg.get('brightness_lift', 0.0),
        )

if __name__ == "__main__":
    main()
