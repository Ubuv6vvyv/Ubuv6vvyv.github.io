import os
import math
import random
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color, CMYKColor

# ==================== CONFIGURATION ====================
OUTPUT_DIR = "/sdcard/Download/PDF_Stress_Test_Extreme"
if not os.path.exists(OUTPUT_DIR):
    try:
        os.makedirs(OUTPUT_DIR)
        print(f"[OK] Saving to: {OUTPUT_DIR}")
    except:
        OUTPUT_DIR = "." # Fallback

# Clashing Colors for Maximum Discomfort
PURE_RED = Color(1, 0, 0)
PURE_BLUE = Color(0, 0, 1)
PURE_GREEN = Color(0, 1, 0)
NEON_MAGENTA = Color(1, 0, 1)
NEON_CYAN = Color(0, 1, 1)
ELECTRIC_YELLOW = Color(1, 1, 0)
BLACK = colors.black
WHITE = colors.white

# ==================== THE EXTREME DISCOMFORT DISHES ====================

def dish_01_ultra_fine_rotation_moire(filename):
    """
    Two grids of hairline stripes spaced 0.3pt apart. 
    Layer 2 is rotated 0.2 degrees. Creates massive, shifting interference bands.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    diag = math.sqrt(w**2 + h**2)
    
    # Extremely thin lines and dense spacing
    line_w = 0.1
    spacing = 0.3
    
    def draw_grid():
        x = -diag/2
        while x < diag*1.5:
            c.line(x, -diag/2, x, diag*1.5)
            x += spacing

    c.setLineWidth(line_w)
    c.setStrokeColor(BLACK)

    # Layer 1
    c.saveState()
    draw_grid()
    c.restoreState()
    
    # Layer 2: Rotated 0.2 degrees
    c.saveState()
    c.translate(w/2, h/2)
    c.rotate(0.2)
    c.translate(-w/2, -h/2)
    draw_grid()
    c.restoreState()
    c.showPage(); c.save()

def dish_02_rgb_channel_split_glitch(filename):
    """
    Simulates severe chromatic aberration. A dense grid drawn three times
    in pure R, G, and B, with tiny sub-pixel offsets. Makes eyes lose focus.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    c.setFillColor(BLACK)
    c.rect(0,0,w,h,fill=1) # Black background
    
    c.setLineWidth(0.5)
    spacing = 5
    
    def draw_content(color, x_off, y_off):
        c.setStrokeColor(color)
        # Draw a dense grid of circles
        for x in range(0, int(w), spacing):
            for y in range(0, int(h), spacing):
                c.circle(x+x_off, y+y_off, 1.5, stroke=1, fill=0)

    # Red Channel (Center)
    draw_content(PURE_RED, 0, 0)
    # Green Channel (Offset Left/Up slightly)
    draw_content(PURE_GREEN, -0.5, 0.5)
    # Blue Channel (Offset Right/Down slightly)
    draw_content(PURE_BLUE, 0.5, -0.5)
    
    c.showPage(); c.save()

def dish_03_peripheral_dazzle_diamonds(filename):
    """
    High-frequency, high-contrast checkered diamonds. The sharp corners
    overload peripheral vision edge-detection, causing "shimmering".
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    diag = math.sqrt(w**2 + h**2)

    c.setFillColor(WHITE)
    c.rect(0,0,w,h,fill=1)
    c.setFillColor(BLACK)
    
    size = 8 # Tiny squares
    
    c.saveState()
    # Rotate 45 degrees to make diamonds
    c.translate(w/2, h/2)
    c.rotate(45)
    c.translate(-diag/2, -diag/2)
    
    cols = int(diag/size) + 2
    rows = int(diag/size) + 2
    
    for r in range(rows):
        for col in range(cols):
            if (r+col) % 2 == 0:
                c.rect(col*size, r*size, size, size, fill=1, stroke=0)
    c.restoreState()
    c.showPage(); c.save()

def dish_04_the_enigma_rings_variant(filename):
    """
    Based on the Isia Leviant illusion. Dense concentric rings interrupted
    by radial spokes. Causes illusory swirling motion in peripheral vision.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    max_r = min(w,h)/2 * 0.9
    
    # 1. Dense Concentric Rings (Black on White)
    c.setLineWidth(1)
    for r in range(5, int(max_r), 3):
        c.circle(cx, cy, r, stroke=1, fill=0)
        
    # 2. Radial interrupting spokes (White)
    c.setStrokeColor(WHITE)
    c.setLineWidth(2)
    num_spokes = 36
    for i in range(num_spokes):
        angle = math.radians(i * (360/num_spokes))
        # Start slightly out from center
        x1 = cx + math.cos(angle) * 20
        y1 = cy + math.sin(angle) * 20
        x2 = cx + math.cos(angle) * max_r
        y2 = cy + math.sin(angle) * max_r
        c.line(x1, y1, x2, y2)

    c.showPage(); c.save()

def dish_05_crt_phosphor_misalignment(filename):
    """
    Simulates a broken CRT monitor. Alternating vertical hairlines of R, G, B
    that are slightly misaligned horizontally. Extremely hard to focus on.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    c.setFillColor(BLACK)
    c.rect(0,0,w,h,fill=1)
    
    c.setLineWidth(0.2)
    spacing = 0.6 # Total cycle spacing
    
    # Draw Red lines
    c.setStrokeColor(PURE_RED)
    for x in range(0, int(w), 1):
        c.line(x, 0, x, h)

    # Draw Green lines (Offset 0.2)
    c.setStrokeColor(PURE_GREEN)
    for x in range(0, int(w), 1):
        c.line(x + 0.2, 0, x + 0.2, h)
        
    # Draw Blue lines (Offset 0.4)
    c.setStrokeColor(PURE_BLUE)
    for x in range(0, int(w), 1):
        c.line(x + 0.4, 0, x + 0.4, h)

    c.showPage(); c.save()

def dish_06_aggressive_chromatic_ouchi(filename):
    """
    An Ouchi illusion using clashing, vibrating colors (Magenta/Green)
    instead of black/white. High frequency lines. Nauseating.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    bar_w = 2 # Very thin bars
    
    # Background: Magenta/Green Horizontal
    c.setFillColor(NEON_MAGENTA)
    c.rect(0,0,w,h,fill=1)
    c.setFillColor(PURE_GREEN)
    for y in range(0, int(h), bar_w*2):
        c.rect(0, y, w, bar_w, fill=1, stroke=0)
        
    # Foreground: Magenta/Green Vertical in circle
    r = 120
    p = c.beginPath()
    p.circle(cx, cy, r)
    c.clipPath(p, stroke=0, fill=0)
    
    c.setFillColor(NEON_MAGENTA)
    c.rect(cx-r, cy-r, r*2, r*2, fill=1)
    c.setFillColor(PURE_GREEN)
    # Slight offset in spacing for jitter
    for x in range(int(cx-r), int(cx+r), bar_w*2 - 1):
        c.rect(x, cy-r, bar_w, r*2, fill=1, stroke=0)
    c.showPage(); c.save()

def dish_07_high_frequency_static_snow(filename):
    """
    Approximates 'visual snow' static. Thousands of tiny, random, high-contrast
    lines. Torture for vector rasterizers and compression engines.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    c.setFillColor(BLACK)
    c.rect(0,0,w,h,fill=1)
    c.setStrokeColor(WHITE)
    c.setLineWidth(0.5)
    
    # Draw 50,000 tiny random lines
    for _ in range(50000):
        x = random.uniform(0, w)
        y = random.uniform(0, h)
        # Tiny line, 2 points long, random orientation
        angle = random.uniform(0, math.pi)
        length = 2
        c.line(x, y, x + math.cos(angle)*length, y + math.sin(angle)*length)
        
    c.showPage(); c.save()

def dish_08_nauseating_warped_checkerboard(filename):
    """
    A dense checkerboard where the intersection points are distorted by
    sine waves, creating a woozy, undulating surface.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    c.setFillColor(WHITE)
    c.rect(0,0,w,h,fill=1)
    c.setFillColor(BLACK)
    
    cell_s = 15
    cols = int(w/cell_s)+2
    rows = int(h/cell_s)+2
    
    for r in range(rows):
        for col in range(cols):
            if (r+col)%2==0:
                x_orig = col * cell_s
                y_orig = r * cell_s
                
                # Apply wavy distortion based on position
                x_warp = math.sin(y_orig * 0.02) * 10
                y_warp = math.cos(x_orig * 0.03) * 10
                
                # Draw slightly distorted rect (using polygon for warp effect)
                p = c.beginPath()
                p.moveTo(x_orig + x_warp, y_orig + y_warp)
                p.lineTo(x_orig + cell_s + x_warp, y_orig + y_warp)
                p.lineTo(x_orig + cell_s + x_warp, y_orig + cell_s + y_warp)
                p.lineTo(x_orig + x_warp, y_orig + cell_s + y_warp)
                p.close()
                c.drawPath(p, fill=1, stroke=0)

    c.showPage(); c.save()

def dish_09_clashing_stripes_migraine(filename):
    """
    Rapidly alternating stripes of highly saturated, clashing colors.
    Magenta/Yellow causes intense retinal fatigue.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    bar_h = 3 # Very thin stripes
    
    for y in range(0, int(h), bar_h*2):
        # Stripe 1: Neon Magenta
        c.setFillColor(NEON_MAGENTA)
        c.rect(0, y, w, bar_h, fill=1, stroke=0)
        # Stripe 2: Electric Yellow
        c.setFillColor(ELECTRIC_YELLOW)
        c.rect(0, y+bar_h, w, bar_h, fill=1, stroke=0)
        
    c.showPage(); c.save()

def dish_10_offset_tunnel_interference(filename):
    """
    Thousands of concentric squares. Each square's center is slightly
    offset from the previous one, creating a dizzying, seemingly endless tunnel.
    """
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    c.setLineWidth(0.5)
    c.setStrokeColor(BLACK)
    
    max_s = min(w,h)
    steps = 1000
    
    current_cx = cx
    current_cy = cy
    
    for i in range(steps):
        size = max_s * ((steps-i)/steps)
        
        c.rect(current_cx - size/2, current_cy - size/2, size, size)
        
        # Slight cumulative offset per step spiraling inwards
        current_cx += math.sin(i * 0.1) * 0.2
        current_cy += math.cos(i * 0.1) * 0.2

    c.showPage(); c.save()

if __name__ == "__main__":
    print(f"--- Cooking Extreme Discomfort Menu in {OUTPUT_DIR} ---")
    dishes = [
        dish_01_ultra_fine_rotation_moire, dish_02_rgb_channel_split_glitch,
        dish_03_peripheral_dazzle_diamonds, dish_04_the_enigma_rings_variant,
        dish_05_crt_phosphor_misalignment, dish_06_aggressive_chromatic_ouchi,
        dish_07_high_frequency_static_snow, dish_08_nauseating_warped_checkerboard,
        dish_09_clashing_stripes_migraine, dish_10_offset_tunnel_interference
    ]
    for i, func in enumerate(dishes):
        try: func(f"Extreme_{i+1:02d}_{func.__name__}.pdf")
        except Exception as e: print(f"!! Error: {e}")
    print("[DONE] Check your Downloads folder. CAUTION: Contents may cause eye strain.")
