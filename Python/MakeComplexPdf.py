import os
import math
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import Color
from reportlab.lib.units import mm

# ==================== CONFIGURATION ====================
OUTPUT_DIR = "PDF_Maximum_Intensity"
if not os.path.exists(OUTPUT_DIR):
    try:
        os.makedirs(OUTPUT_DIR)
        print(f"[OK] Saving to: {OUTPUT_DIR}")
    except:
        OUTPUT_DIR = "."

# ==================== HIGH-INTENSITY COLOR PALETTE ====================
# Pure RGB/CMY for maximum cone saturation
RED = Color(1, 0, 0)
GREEN = Color(0, 1, 0)
BLUE = Color(0, 0, 1)
CYAN = Color(0, 1, 1)
MAGENTA = Color(1, 0, 1)
YELLOW = Color(1, 1, 0)
BLACK = colors.black
WHITE = colors.white
# "Isoluminant" Clash Colors (Vibrates strongly against each other)
NEON_ORANGE = Color(1, 0.3, 0)
ELECTRIC_PURPLE = Color(0.6, 0, 1)

def draw_background_grid(c, w, h, spacing=5, color=colors.lightgrey):
    """Helper to fill background with high-frequency noise."""
    c.setStrokeColor(color)
    c.setLineWidth(0.1)
    for x in range(0, int(w), spacing):
        c.line(x, 0, x, h)
    for y in range(0, int(h), spacing):
        c.line(0, y, w, y)

# ==================== INTENSIFIED DISHES ====================

def dish_01_hyper_ouchi(filename, bar_w=2, r=180):
    """Significantly tighter bars for stronger floating effect."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    # Background: Horizontal Bars (High Density)
    c.setFillColor(BLACK)
    c.rect(0,0,w,h,fill=1)
    c.setFillColor(WHITE)
    for y in range(0, int(h), bar_w*2):
        c.rect(0, y, w, bar_w, fill=1, stroke=0)
        
    # Foreground: Vertical Bars
    p = c.beginPath()
    p.circle(cx, cy, r)
    c.clipPath(p, stroke=0, fill=0)
    
    c.setFillColor(BLACK)
    c.rect(cx-r, cy-r, r*2, r*2, fill=1)
    c.setFillColor(WHITE)
    # Offset the foreground bars slightly to increase tension
    for x in range(int(cx-r), int(cx+r), bar_w*2):
        c.rect(x + bar_w/2, cy-r, bar_w, r*2, fill=1, stroke=0)
    c.showPage(); c.save()

def dish_02_retinal_burn_ouchi(filename, bar_w=3, r=180):
    """Uses Red and Cyan (Anaglyph colors) for maximum depth conflict."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    c.setFillColor(RED)
    c.rect(0,0,w,h,fill=1)
    c.setFillColor(CYAN)
    
    # Background
    for y in range(0, int(h), bar_w*2):
        c.rect(0, y, w, bar_w, fill=1, stroke=0)
        
    # Foreground rotated 90 degrees
    p = c.beginPath()
    p.circle(cx, cy, r)
    c.clipPath(p, stroke=0, fill=0)
    c.setFillColor(RED)
    c.rect(cx-r, cy-r, r*2, r*2, fill=1)
    c.setFillColor(CYAN)
    for x in range(int(cx-r), int(cx+r), bar_w*2):
        c.rect(x, cy-r, bar_w, r*2, fill=1, stroke=0)
    c.showPage(); c.save()

def dish_03_triple_layer_moire(filename, spacing=0.4, rotation=2.5):
    """Three layers of hair-thin lines. The third layer creates chaotic interference."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    diag = math.sqrt(w**2 + h**2)
    c.setLineWidth(0.15) # Hairline
    
    def draw_lines(color):
        c.setStrokeColor(color)
        x = -diag
        while x < diag:
            c.line(x, -diag, x, diag)
            x += spacing

    # Layer 1
    draw_lines(BLACK)
    
    # Layer 2
    c.saveState()
    c.translate(w/2, h/2); c.rotate(rotation); c.translate(-w/2, -h/2)
    draw_lines(BLACK)
    c.restoreState()

    # Layer 3 (Opposite rotation)
    c.saveState()
    c.translate(w/2, h/2); c.rotate(-rotation * 0.8); c.translate(-w/2, -h/2)
    draw_lines(BLACK)
    c.restoreState()
    c.showPage(); c.save()

def dish_04_chromatic_seizure_waves(filename, wave_amp=10, spacing=2):
    """High-frequency sine waves in Magenta/Green. Visually painful."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    c.setLineWidth(0.5)
    
    # Fill background
    c.setFillColor(BLACK); c.rect(0,0,w,h,fill=1)

    def draw_waves(color, x_shift, freq):
        c.setStrokeColor(color)
        for y_base in range(-20, int(h)+20, spacing): 
            p = c.beginPath()
            p.moveTo(0, y_base)
            for x in range(0, int(w), 3):
                # Frequency modulation
                y_wobble = math.sin((x + x_shift) * freq) * wave_amp
                p.lineTo(x, y_base + y_wobble)
            c.drawPath(p)

    draw_waves(MAGENTA, 0, 0.08)
    draw_waves(GREEN, 15, 0.082) # Slightly different freq creates "beats"
    c.showPage(); c.save()

def dish_05_siemens_star_hell(filename, num_lines=360):
    """Maximum density Siemens star. The center turns gray due to resolution limit."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    diag = math.sqrt(w**2 + h**2)
    
    # Alternating black and white wedges
    for i in range(num_lines * 2):
        angle = (360 / (num_lines * 2)) * i
        c.setFillColor(BLACK if i % 2 == 0 else WHITE)
        p = c.beginPath()
        p.moveTo(cx, cy)
        # Calculate large outer triangle
        rad = math.radians(angle)
        next_rad = math.radians(angle + (360/(num_lines*2)))
        p.lineTo(cx + math.cos(rad)*diag, cy + math.sin(rad)*diag)
        p.lineTo(cx + math.cos(next_rad)*diag, cy + math.sin(next_rad)*diag)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
    
    c.showPage(); c.save()

def dish_06_dazzle_grid(filename, spacing=4):
    """Blue/Yellow grid on Red background. Extreme chromatic vibration."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    c.setFillColor(RED); c.rect(0,0,w,h,fill=1)
    
    c.setLineWidth(1)
    
    c.setStrokeColor(BLUE)
    for x in range(0, int(w), spacing):
        c.line(x, 0, x, h)
        
    c.setStrokeColor(YELLOW)
    for y in range(0, int(h), spacing):
        c.line(0, y, w, y)
    c.showPage(); c.save()

def dish_07_warped_tunnel(filename):
    """Non-concentric, variable width circles. Creates depth vertigo."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    max_r = 400
    
    c.setFillColor(BLACK)
    c.rect(0,0,w,h,fill=1)
    
    # Logarithmic spacing for "infinite tunnel" look
    for i in range(100, 0, -1):
        r = 10 * math.exp(i * 0.04)
        gray_val = (i % 2) 
        c.setFillColor(WHITE if gray_val else BLACK)
        
        # Offset center based on radius to curve the tunnel
        off_x = cx + math.sin(i * 0.1) * 30
        off_y = cy + math.cos(i * 0.1) * 30
        
        c.circle(off_x, off_y, r, stroke=0, fill=1)
        
    c.showPage(); c.save()

def dish_08_stepping_motion_intensified(filename):
    """Very thin lines make the stepping effect jerkier."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    # 1. High frequency background grid
    bar_w = 4
    for x in range(0, int(w), bar_w*2):
        c.setFillColor(BLACK)
        c.rect(x, 0, bar_w, h, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.rect(x+bar_w, 0, bar_w, h, fill=1, stroke=0)

    # 2. Moving blocks (Dark Blue vs Bright Yellow)
    # The illusion works because Dark Blue is low luminance (blends with black)
    # Yellow is high luminance (blends with white)
    block_h = 30
    block_w = 60
    gap = 20
    
    for y in range(0, int(h), block_h + gap):
        c.setFillColor(colors.darkblue)
        c.rect(100, y, block_w, block_h, fill=1, stroke=0)
        c.setFillColor(YELLOW)
        c.rect(100 + block_w + 10, y, block_w, block_h, fill=1, stroke=0)
        
    c.showPage(); c.save()

def dish_09_peripheral_drift_gradient(filename):
    """Asymmetric gradients (Black-DarkGray-White-LightGray-Black) trigger motion."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    cell_size = 30
    cols = int(w/cell_size)+1
    rows = int(h/cell_size)+1
    
    # Pattern: Black -> Blue -> White -> Yellow -> Black
    # This sequence triggers strong motion detectors
    colors_list = (BLACK, BLUE, WHITE, YELLOW, BLACK)
    positions = (0, 0.25, 0.5, 0.75, 1)
    
    for r in range(rows):
        for col in range(cols):
            x = col * cell_size
            y = r * cell_size
            
            # Flip direction every row
            if r % 2 == 0:
                c.linearGradient(x, y, x+cell_size, y, colors_list, positions=positions)
            else:
                c.linearGradient(x+cell_size, y, x, y, colors_list, positions=positions)
            c.rect(x, y, cell_size, cell_size, fill=1, stroke=0)
            
    c.showPage(); c.save()

def dish_10_hex_scintillation(filename):
    """Dense hexagonal grid with contrasting intersections."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    side = 6
    c.setFillColor(BLACK); c.rect(0,0,w,h,fill=1)
    c.setStrokeColor(colors.gray)
    c.setLineWidth(1)
    
    dx = side * 1.5
    dy = side * math.sqrt(3)
    
    for r in range(int(h/dy)+2):
        for col in range(int(w/dx)+2):
            cx = col * dx * 2
            cy = r * dy
            if r % 2 == 1: cx += dx
            
            # Draw Hexagon
            p = c.beginPath()
            for i in range(6):
                angle = math.radians(60 * i + 30)
                px = cx + side * math.cos(angle)
                py = cy + side * math.sin(angle)
                if i==0: p.moveTo(px,py)
                else: p.lineTo(px,py)
            p.close()
            c.drawPath(p, fill=0, stroke=1)
            
            # Scintillating dot at center
            c.setFillColor(WHITE)
            c.circle(cx, cy, 1.5, fill=1, stroke=0)
            
    c.showPage(); c.save()

def dish_11_pinna_brelstaff(filename):
    """Approximation of the Pinna illusion (expanding/rotating circles)."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    c.setFillColor(colors.grey) # Mid-grey background is crucial
    c.rect(0,0,w,h,fill=1)
    
    for r in range(20, 280, 20):
        # Number of elements increases with radius
        num_elements = int(r * 0.8)
        for i in range(num_elements):
            angle = math.radians(i * (360/num_elements))
            
            # Tilt the rhombuses to create spiral effect
            c.saveState()
            x = cx + math.cos(angle) * r
            y = cy + math.sin(angle) * r
            c.translate(x, y)
            c.rotate(math.degrees(angle) + 45) # The twist is key
            
            # Inner white, Outer black (creates depth)
            size = 4
            c.setFillColor(WHITE)
            c.rect(-size/2, -size/2, size, size, fill=1, stroke=0)
            c.setStrokeColor(BLACK)
            c.setLineWidth(1)
            c.rect(-size/2, -size/2, size, size, fill=0, stroke=1)
            c.restoreState()
            
    # Central dot
    c.setFillColor(BLACK); c.circle(cx, cy, 3, fill=1)
    c.showPage(); c.save()

def dish_12_hyper_spiral_interference(filename):
    """Two high-frequency spirals rotating against each other."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    # Intense red/blue overlap
    def draw_spiral(color, coils, reverse=False):
        c.setStrokeColor(color)
        c.setLineWidth(0.5)
        p = c.beginPath()
        steps = 2000
        for t in range(steps):
            theta = t * 0.1
            if reverse: theta = -theta
            r = t * 0.15
            x = cx + r * math.cos(theta)
            y = cy + r * math.sin(theta)
            if t==0: p.moveTo(x,y)
            else: p.lineTo(x,y)
        c.drawPath(p)

    draw_spiral(RED, 50, False)
    draw_spiral(BLUE, 50, True) # Counter-rotating
    c.showPage(); c.save()

def dish_13_glare_effect(filename):
    """Center gradient that forces the pupil to contract, creating pulsation."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    # Petals
    num_petals = 60
    for i in range(num_petals):
        angle = (360/num_petals) * i
        c.setFillColor(BLACK if i%2==0 else WHITE)
        p = c.beginPath()
        p.moveTo(cx, cy)
        p.lineTo(cx + math.cos(math.radians(angle-2))*300, cy + math.sin(math.radians(angle-2))*300)
        p.lineTo(cx + math.cos(math.radians(angle+2))*300, cy + math.sin(math.radians(angle+2))*300)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
        
    # Gradient center overlay
    for r in range(100, 0, -5):
        alpha = 1 - (r/100)
        c.setFillColor(colors.Color(1,1,1, alpha=0.1))
        c.circle(cx, cy, r, fill=1, stroke=0)
        
    c.showPage(); c.save()

def dish_14_rotating_snakes_lite(filename):
    """High contrast segments arranged in circles."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    c.setFillColor(colors.Color(0.5, 0.5, 0.5)) # Gray bg
    c.rect(0,0,w,h,fill=1)
    
    circles = [40, 70, 100, 130, 160]
    
    for r in circles:
        n_segs = int(r * 0.6)
        for i in range(n_segs):
            angle = math.radians(i * (360/n_segs))
            x = cx + math.cos(angle) * r
            y = cy + math.sin(angle) * r
            
            c.saveState()
            c.translate(x,y)
            c.rotate(math.degrees(angle))
            
            # The sequence Black -> Blue -> White -> Yellow drives rotation
            sz = 10
            c.setFillColor(BLACK); c.rect(-sz, -sz/2, sz/2, sz, fill=1, stroke=0)
            c.setFillColor(BLUE); c.rect(-sz/2, -sz/2, sz/2, sz, fill=1, stroke=0)
            c.setFillColor(WHITE); c.rect(0, -sz/2, sz/2, sz, fill=1, stroke=0)
            c.setFillColor(YELLOW); c.rect(sz/2, -sz/2, sz/2, sz, fill=1, stroke=0)
            
            c.restoreState()
            
    c.showPage(); c.save()

def dish_15_scintillating_grid_max(filename):
    """The Hermann Grid on steroids. Dots appear and disappear rapidly."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    c.setFillColor(BLACK)
    c.rect(0,0,w,h,fill=1)
    
    grid_size = 30
    line_w = 4
    
    # Gray lines (essential for Scintillating version, white is for Hermann)
    c.setStrokeColor(colors.gray)
    c.setLineWidth(line_w)
    
    for x in range(0, int(w), grid_size):
        c.line(x, 0, x, h)
    for y in range(0, int(h), grid_size):
        c.line(0, y, w, y)
        
    # White dots at intersections
    c.setFillColor(WHITE)
    for x in range(0, int(w), grid_size):
        for y in range(0, int(h), grid_size):
            c.circle(x, y, 3, fill=1, stroke=0)
            
    c.showPage(); c.save()

def dish_16_cafe_wall_skew(filename):
    """Slanted bricks. The contrast makes parallel lines look very crooked."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    c.setFillColor(WHITE)
    c.rect(0,0,w,h,fill=1)
    
    tile_h = 15
    tile_w = 30
    
    for row in range(int(h/tile_h)+1):
        y = row * tile_h
        # Variable offset creates a "wave" in the wall
        offset = 10 * math.sin(row * 0.5) 
        
        for col in range(int(w/tile_w)+2):
            x = col * tile_w + offset - 20
            c.setFillColor(BLACK if (col+row)%2==0 else WHITE)
            c.rect(x, y, tile_w, tile_h, fill=1, stroke=0)
            
        # The mortar color must be mid-grey for the illusion to work
        c.setStrokeColor(colors.Color(0.5, 0.5, 0.5))
        c.setLineWidth(2)
        c.line(0, y, w, y)
        
    c.showPage(); c.save()

def dish_17_fresnel_zone_migraine(filename):
    """Mathematically generated Fresnel Zone Plate. Extremely dizzying."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    max_r = 300
    # The formula is sin(r^2). We approximate by drawing rings where sin > 0
    # Density increases with r. 
    
    c.setLineWidth(0.5)
    c.setStrokeColor(BLACK)
    
    # To prevent PDF bloat, we simulate it with increasing density concentric circles
    # rather than pixel-perfect sin wave rendering
    r = 0
    n = 1
    while r < max_r:
        # The gap gets smaller as r gets larger: dr ~ 1/r
        dr = 400 / (r + 50) 
        if dr < 0.2: dr = 0.2 # Clamp minimum line width
        
        c.circle(cx, cy, r, stroke=1)
        r += dr
        
    c.showPage(); c.save()

def dish_18_isoluminant_vibration(filename):
    """Neon Orange vs Electric Purple. Hard to focus on."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    
    c.setFillColor(NEON_ORANGE)
    c.rect(0,0,w,h,fill=1)
    
    c.setFillColor(ELECTRIC_PURPLE)
    # Wavy organic shapes
    for y in range(0, int(h), 10):
        p = c.beginPath()
        p.moveTo(0, y)
        for x in range(0, int(w), 5):
            p.lineTo(x, y + math.sin(x*0.05 + y*0.1)*5)
        p.lineTo(w, y+10)
        p.lineTo(0, y+10)
        p.close()
        c.drawPath(p, fill=1, stroke=0)
        
    c.showPage(); c.save()

def dish_19_fraser_twisted_cord(filename):
    """The 'letters' of the cord are angled, creating a spiral illusion from circles."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    # Checkered background
    sz = 10
    for x in range(0, int(w), sz):
        for y in range(0, int(h), sz):
            if (x+y)//sz % 2 == 0:
                c.setFillColor(colors.Color(0.8, 0.2, 0.2)) # Reddish check
                c.rect(x,y,sz,sz,fill=1,stroke=0)
    
    c.setLineWidth(4)
    for r in range(20, 280, 25):
        # Draw dashed line where dashes are angled
        num_dashes = int(r * 0.5)
        for i in range(num_dashes):
            angle = math.radians(i * (360/num_dashes))
            # Twist angle depends on direction
            twist = math.radians(15)
            
            x1 = cx + math.cos(angle - twist)*r
            y1 = cy + math.sin(angle - twist)*r
            x2 = cx + math.cos(angle + twist)*(r+5) # Spiraling out slightly in visual weight
            y2 = cy + math.sin(angle + twist)*(r+5)
            
            c.setStrokeColor(BLACK if i%2==0 else WHITE)
            c.line(x1, y1, x2, y2)
            
    c.showPage(); c.save()

def dish_20_final_boss_noise(filename):
    """Random high-frequency noise + concentric interference. The 'TV Static' effect."""
    print(f"Cooking {filename}...")
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    w, h = A4
    cx, cy = w/2, h/2
    
    # 1. Random noise background (simulated with tiny rects for PDF efficiency)
    import random
    c.setFillColor(BLACK)
    for _ in range(3000):
        x = random.randint(0, int(w))
        y = random.randint(0, int(h))
        w_rect = random.randint(1, 4)
        h_rect = random.randint(1, 4)
        c.rect(x, y, w_rect, h_rect, fill=1, stroke=0)
        
    # 2. Overlay concentric rings
    c.setStrokeColor(WHITE)
    c.setLineWidth(1)
    for r in range(10, 300, 3):
        c.circle(cx, cy, r, stroke=1, fill=0)
        
    c.showPage(); c.save()

if __name__ == "__main__":
    print(f"--- GENERATING MAXIMUM INTENSITY ILLUSIONS IN {OUTPUT_DIR} ---")
    print("WARNING: These images contain high-frequency patterns that may cause discomfort.")
    
    dishes = [
        dish_01_hyper_ouchi, dish_02_retinal_burn_ouchi,
        dish_03_triple_layer_moire, dish_04_chromatic_seizure_waves,
        dish_05_siemens_star_hell, dish_06_dazzle_grid,
        dish_07_warped_tunnel, dish_08_stepping_motion_intensified,
        dish_09_peripheral_drift_gradient, dish_10_hex_scintillation,
        dish_11_pinna_brelstaff, dish_12_hyper_spiral_interference,
        dish_13_glare_effect, dish_14_rotating_snakes_lite,
        dish_15_scintillating_grid_max, dish_16_cafe_wall_skew,
        dish_17_fresnel_zone_migraine, dish_18_isoluminant_vibration,
        dish_19_fraser_twisted_cord, dish_20_final_boss_noise
    ]
    
    for i, func in enumerate(dishes):
        try: 
            func(f"Intense_{i+1:02d}_{func.__name__}.pdf")
        except Exception as e: 
            print(f"!! Error in {func.__name__}: {e}")
            
    print("[DONE] Illusions served. View with caution.")
