import os
import math
import random
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

# --- CONFIGURATION ---
OUTPUT_DIR = 'Optical_Illusions_Blended_Master'
WIDTH, HEIGHT = A4
CX, CY = WIDTH / 2, HEIGHT / 2

# --- THE "HYPER-STIMULUS" PALETTES ---

# 1. CHROMATIC DRIFT (Motion + Vibration)
# We replace Grey scales with Red/Cyan scales to trigger motion AND depth vibration.
C_RED_DARK   = colors.Color(0.6, 0, 0)
C_RED_BRIGHT = colors.Color(1, 0, 0)
C_CYAN_DARK  = colors.Color(0, 0.6, 0.6)
C_CYAN_BRIGHT= colors.Color(0, 1, 1)

# The Sequence: Black -> Red -> Cyan -> White
# This creates a "Shimmering" motion.
SEQ_CHROMO = [colors.black, C_RED_DARK, C_CYAN_BRIGHT, colors.white]

# 2. HIGH CONTRAST
C_BLACK = colors.black
C_WHITE = colors.white
C_RED   = colors.Color(1, 0, 0)
C_BLUE  = colors.Color(0, 0, 1)

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def save_pdf(c, filename):
    c.showPage()
    c.save()
    print(f"[+] Blended: {filename}")

# --- 1. THE NEURO-GRID (Ouchi + Scintillating + Chromatic) ---
# Vertical Red stripes vs Horizontal Blue stripes (Ouchi friction).
# Overlaid with White intersections (Scintillation).
# Result: A vibrating, flashing, floating mesh.
def b01_neuro_grid(filename="01_Neuro_Grid.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_WHITE); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    # 1. Background: Vertical Red Stripes (Dense)
    c.setFillColor(C_RED)
    for x in range(0, int(WIDTH), 5):
        c.rect(x, 0, 5, HEIGHT, fill=1, stroke=0)
        
    # 2. Foreground: Horizontal Blue Stripes (Dense)
    # We use 'Multiply' blend mode logic by simply drawing over.
    # The visual clash creates the purple/black vibration.
    c.setFillColor(C_BLUE)
    for y in range(0, int(HEIGHT), 5):
        c.rect(0, y, WIDTH, 5, fill=1, stroke=0)
        
    # 3. The Scintillator: White Dots at Intersections
    # This breaks the Ouchi friction and adds flashing.
    c.setFillColor(C_WHITE)
    for x in range(0, int(WIDTH), 10):
        for y in range(0, int(HEIGHT), 10):
            # Draw slightly offset to create "3D" scintillation
            c.circle(x + 2.5, y + 2.5, 2.5, fill=1, stroke=0)
            
    save_pdf(c, filename)

# --- 2. CHROMO-ROTORS (Biohazard + Anaglyph Drift) ---
# Peripheral drift rotors, but using the Red/Cyan sequence.
# It looks like it's spinning AND popping out of the screen.
def b02_chromo_rotors(filename="02_Chromo_Rotors.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(colors.black); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    spacing = 60
    
    for x in range(0, int(WIDTH), spacing):
        for y in range(0, int(HEIGHT), spacing):
            cx = x + spacing/2
            cy = y + spacing/2
            
            # Checker rotation
            is_cw = ((x+y)//spacing) % 2 == 0
            # Sequence: Black -> Red -> Cyan -> White
            seq = SEQ_CHROMO if is_cw else list(reversed(SEQ_CHROMO))
            
            # Draw 12-blade rotor
            blades = 64
            for i in range(blades):
                angle = i * (360/blades)
                c.saveState()
                c.translate(cx, cy)
                c.rotate(angle)
                
                # Draw the gradient blade
                # 4 segments per blade
                r = 42
                w = (2 * math.pi * r) / blades
                seg_h = r / 4
                
                for k in range(4):
                    c.setFillColor(seq[k])
                    # Trapezoid shape for better rotor feel
                    p = c.beginPath()
                    # Inner width
                    wi = ((k) * w) / 4 
                    # Outer width
                    wo = ((k+1) * w) / 4
                    
                    # Simplification: Stacked Rects
                    c.rect(-2, k*(r/4), 4, r/4, fill=1, stroke=0)
                
                c.restoreState()
    save_pdf(c, filename)

# --- 3. WARPED MOIRE (Interference + Fish-Eye) ---
# Two radial starbursts. One is perfect, one is distorted.
# Creates unpredictable, organic interference bands.
def b03_warped_moire(filename="03_Warped_Moire.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_WHITE); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    # Layer 1: Perfect Starburst
    c.setLineWidth(1)
    c.setStrokeColor(C_BLACK)
    rays = 180
    for i in range(rays):
        a = (i/rays) * 2 * math.pi
        c.line(CX, CY, CX + math.cos(a)*500, CY + math.sin(a)*500)
        
    # Layer 2: Warped Starburst (Red)
    # We offset the center AND curve the lines
    c.setStrokeColor(C_RED)
    ox, oy = CX + 5, CY + 5
    
    for i in range(rays):
        a = (i/rays) * 2 * math.pi
        
        path = c.beginPath()
        path.moveTo(ox, oy)
        
        # Curve the line slightly
        cp_x = ox + math.cos(a + 0.1) * 250
        cp_y = oy + math.sin(a + 0.1) * 250
        end_x = ox + math.cos(a) * 500
        end_y = oy + math.sin(a) * 500
        
        path.curveTo(ox, oy, cp_x, cp_y, end_x, end_y)
        c.drawPath(path, stroke=1, fill=0)
        
    save_pdf(c, filename)

# --- 4. GLITCH TUNNEL (Tunnel + Jitter + Anaglyph) ---
# Concentric rings that are jagged (Glitch) and offset colors.
# High discomfort.
def b04_glitch_tunnel(filename="04_Glitch_Tunnel.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_BLACK); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    max_r = 4/100
    
    for r in range(10, max_r, 10):
        # We draw the ring as a polygon with noise
        pts = 50
        
        # Red Channel
        c.setStrokeColor(C_RED)
        c.setLineWidth(2)
        p = c.beginPath()
        for i in range(pts+1):
            a = (i/pts) * 2 * math.pi
            noise = random.randint(-2, 2)
            rad = r + noise
            x = CX + math.cos(a) * rad
            y = CY + math.sin(a) * rad
            if i==0: p.moveTo(x,y)
            else: p.lineTo(x,y)
        c.drawPath(p, stroke=1, fill=0)
        
        # Cyan Channel (Offset)
        c.setStrokeColor(C_CYAN_BRIGHT)
        p = c.beginPath()
        for i in range(pts+1):
            a = (i/pts) * 2 * math.pi
            noise = random.randint(-2, 2)
            rad = r + noise
            # Offset center slightly
            x = (CX+3) + math.cos(a) * rad
            y = (CY+3) + math.sin(a) * rad
            if i==0: p.moveTo(x,y)
            else: p.lineTo(x,y)
        c.drawPath(p, stroke=1, fill=0)
        
    save_pdf(c, filename)

# --- 5. OUCHI SNAKE (Orthogonal + Peripheral Drift) ---
# Background: Vertical Stripes.
# Foreground: Floating Circle containing a Rotating Snake.
# The relative motion between the snake and the stripes is sickening.
def b05_ouchi_snake(filename="05_Ouchi_Snake.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_WHITE); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    # 1. Background: Vertical Ouchi Stripes
    c.setFillColor(C_BLACK)
    for x in range(0, int(WIDTH), 8):
        c.rect(x, 0, 4, HEIGHT, fill=1, stroke=0)
        
    # 2. Foreground Circle
    r = 400
    c.setFillColor(colors.gray)
    c.circle(CX, CY, r, fill=1, stroke=0)
    
    # Clip to circle? Hard in simple reportlab without path ops.
    # We will just draw the snake ON TOP, effectively masking.
    
    # Draw Concentric Snake Rings inside the circle area
    # Sequence: Black -> Dark -> White -> Light
    seq = [colors.black, colors.darkgrey, colors.white, colors.lightgrey]
    
    c.saveState()
    # Masking manually by just drawing carefully? 
    # Let's just draw a big snake. The contrast with the background lines is key.
    
    for ring_r in range(r, 0, -25):
        # Draw ring background to hide stripes
        c.setFillColor(colors.gray)
        c.circle(CX, CY, ring_r, fill=1, stroke=1)
        
        # Draw teeth
        segs = 250
        for i in range(segs):
            a = (i/segs) * 360
            c.saveState()
            c.translate(CX, CY)
            c.rotate(a)
            c.translate(0, ring_r - 12)
            
            # Draw gradient block
            for k in range(4):
                c.setFillColor(seq[k])
                c.rect(-2, k*6, 4, 6, fill=1, stroke=0)
            c.restoreState()
            
    c.restoreState()
    save_pdf(c, filename)

# --- 6. SAWTOOTH NOVA (Linear Drift + Radial Geometry) ---
# Sawtooth drift patterns arranged radially. 
# Looks like a star that is continuously expanding/pulsing.
def b06_sawtooth_nova(filename="06_Sawtooth_Nova.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_WHITE); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    spokes = 200
    
    for i in range(spokes):
        angle = i * (360/spokes)
        c.saveState()
        c.translate(CX, CY)
        c.rotate(angle)
        
        # Draw a "Spoke" made of Sawtooth patterns
        # Luminance Sequence moving OUTWARD: B -> D -> L -> W
        seq = [colors.black, colors.dimgrey, colors.silver, colors.white]
        
        # Draw the strip
        for y in range(50, 400, 15): # Distance from center
            # Draw gradient tooth
            w = 10 # width of spoke at this distance
            h = 15 # height of tooth segment
            
            # 4 bands per tooth
            band_h = h / 4
            for k in range(4):
                c.setFillColor(seq[k])
                # Draw rect
                c.rect(-w/2, y + (k*band_h), w, band_h, fill=1, stroke=0)
        
        c.restoreState()
    save_pdf(c, filename)

# --- 7. TREMOR HIVE (Hex Grid + Hatching + Chromatic) ---
# Hexagonal grid. Red borders, Cyan offset borders.
# Filled with high-frequency hatching.
def b07_tremor_hive(filename="07_Tremor_Hive.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_WHITE); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    def draw_hex(cx, cy, r, color):
        c.setStrokeColor(color)
        c.setLineWidth(1)
        p = c.beginPath()
        for i in range(6):
            a = math.radians(60*i)
            x = cx + math.cos(a)*r
            y = cy + math.sin(a)*r
            if i==0: p.moveTo(x,y)
            else: p.lineTo(x,y)
        p.close()
        c.drawPath(p, stroke=1, fill=0)
        
    r = 5
    h = math.sqrt(3) * r
    
    for col in range(int(WIDTH/(r*1.5))):
        for row in range(int(HEIGHT/h)):
            cx = col * r * 1.5
            cy = row * h
            if col%2==1: cy += h/2
            
            # 1. Red Hex
            draw_hex(cx, cy, r, C_RED)
            # 2. Cyan Hex (Offset)
            draw_hex(cx+2, cy, r, C_CYAN_BRIGHT)
            
            # 3. Filling: High Frequency Hatching
            c.setStrokeColor(C_BLACK)
            c.setLineWidth(0.5)
            # Draw diagonal lines inside
            c.line(cx-r/2, cy-r/2, cx+r/2, cy+r/2)
            c.line(cx+r/2, cy-r/2, cx-r/2, cy+r/2)
            
    save_pdf(c, filename)

# --- 8. SCINTILLATING WAVES (Fringe + Scintillator) ---
# Wavy grid lines (Motion) with intersections (Flashing).
def b08_scintillating_waves(filename="08_Scintillating_Waves.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_BLACK); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    step = 25
    c.setLineWidth(4)
    c.setStrokeColor(colors.gray)
    
    # Vertical Wavy Lines
    for x in range(0, int(WIDTH), step):
        p = c.beginPath()
        p.moveTo(x, 0)
        for y in range(0, int(HEIGHT), 10):
            # Sine wave
            off = 5 * math.sin(y * 0.1)
            p.lineTo(x + off, y)
        c.drawPath(p, stroke=1, fill=0)
        
    # Horizontal Wavy Lines
    for y in range(0, int(HEIGHT), step):
        p = c.beginPath()
        p.moveTo(0, y)
        for x in range(0, int(WIDTH), 10):
            off = 5 * math.sin(x * 0.1)
            p.lineTo(x, y + off)
        c.drawPath(p, stroke=1, fill=0)
        
    # White Intersections
    c.setFillColor(C_WHITE)
    for x in range(0, int(WIDTH), step):
        for y in range(0, int(HEIGHT), step):
            # Calculate rough intersection pos including wave offset
            ox = x + (5 * math.sin(y * 0.1))
            oy = y + (5 * math.sin(x * 0.1))
            c.circle(ox, oy, 3, fill=1, stroke=0)
            
    save_pdf(c, filename)

# --- 9. BINARY DRIFT (Static Rain + Motion Gradient) ---
# Vertical columns of random noise (like Matrix rain).
# But the noise pixels follow the luminance gradient (B->D->L->W).
# Creates "falling" sensation without moving.
def b09_binary_drift(filename="09_Binary_Drift.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_BLACK); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    col_w = 12
    
    for x in range(0, int(WIDTH), col_w):
        # Determine speed/phase
        phase = random.random() * 10
        
        for y in range(0, int(HEIGHT), 12):
            # We draw a "Pixel"
            # The color depends on Y + Phase, cycling through the Motion Sequence
            
            # Sequence: Black -> Dark -> Light -> White (Upward motion?)
            # Let's do Downward: White -> Light -> Dark -> Black
            seq = [colors.white, colors.silver, colors.dimgrey, colors.black]
            
            # Index based on Y position (Spatial phase)
            idx = int((y / 12) + phase) % 4
            
            c.setFillColor(seq[idx])
            # Draw pixel with slight gap
            c.rect(x+1, y+1, col_w-2, 10, fill=1, stroke=0)
            
    save_pdf(c, filename)

# --- 10. ABYSSAL FRINGE (Tunnel + Fringe) ---
# Square tunnel.
# Edges of squares are "Fringed" (High freq ticking).
# Alternating Red/Cyan borders.
def b10_abyssal_fringe(filename="10_Abyssal_Fringe.pdf"):
    c = canvas.Canvas(os.path.join(OUTPUT_DIR, filename), pagesize=A4)
    c.setFillColor(C_BLACK); c.rect(0,0,WIDTH,HEIGHT,fill=1)
    
    c.setLineWidth(2)
    
    size = 10
    angle = 0
    
    for i in range(100):
        c.saveState()
        c.translate(CX, CY)
        c.rotate(angle)
        
        # Color alternates Red/Cyan
        color = C_RED if i%2==0 else C_CYAN_BRIGHT
        c.setStrokeColor(color)
        
        # Draw Square
        c.rect(-size/2, -size/2, size, size, stroke=1, fill=0)
        
        # Draw Fringe (Ticks) along top edge
        c.setLineWidth(0.5)
        step = size / 20
        if step < 1: step = 1
        
        # Only draw fringe if size is visible
        if size > 20:
            for k in range(int(size/step)):
                fx = -size/2 + (k*step)
                c.line(fx, -size/2, fx, -size/2 - (size*0.1)) # Tick outwards
        
        c.restoreState()
        
        # Growth
        size *= 1.05
        angle += 1
        
    save_pdf(c, filename)

if __name__ == "__main__":
    print("--- GENERATING BLENDED MASTER SET ---")
    patterns = [
        b01_neuro_grid, b02_chromo_rotors, b03_warped_moire,
        b04_glitch_tunnel, b05_ouchi_snake, b06_sawtooth_nova,
        b07_tremor_hive, b08_scintillating_waves, b09_binary_drift,
        b10_abyssal_fringe
    ]
    
    for p in patterns:
        try:
            p()
        except Exception as e:
            print(f"Error: {e}")
