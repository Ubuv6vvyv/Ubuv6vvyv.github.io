# -*- coding: utf-8 -*-
import os
import random
import math
import pikepdf
from pikepdf import Operator, Pdf, Stream

# ==================== CONFIGURATION ====================
OUTPUT_DIR = "/sdcard/Download/PDF_Drunk_Typesetter"

if not os.path.exists(OUTPUT_DIR):
    try:
        os.makedirs(OUTPUT_DIR)
        print(f"[OK] Directory created: {OUTPUT_DIR}")
    except PermissionError:
        print("!! Error: Permission denied. Run 'termux-setup-storage'.")
        exit()

# ==================== DRUNK ALGORITHMS ====================

def drunk_tipsy(i):
    """VARIATION 1: THE TIPSY - Very subtle"""
    angle = random.uniform(-0.008, 0.008) # ~0.5 deg
    c, s = math.cos(angle), math.sin(angle)
    dx = random.uniform(-0.5, 0.5)
    dy = random.uniform(-0.5, 0.5)
    return [c, s, -s, c, dx, dy]

def drunk_wobbly(i):
    """VARIATION 2: THE WOBBLY - Noticeable"""
    angle = random.uniform(-0.035, 0.035) # ~2 deg
    c, s = math.cos(angle), math.sin(angle)
    dx = random.uniform(-2, 2)
    dy = random.uniform(-2, 2)
    return [c, s, -s, c, dx, dy]

def drunk_sloshed(i):
    """VARIATION 3: THE SLOSHED - Heavy"""
    angle = random.uniform(-0.08, 0.08) # ~5 deg
    c, s = math.cos(angle), math.sin(angle)
    dx = random.uniform(-10, 10)
    dy = random.uniform(-5, 5)
    return [c, s, -s, c, dx, dy]

def drunk_hiccups(i):
    """VARIATION 4: THE HICCUPS - Every 10th item jumps"""
    if i % 10 == 0:
        dy = random.choice([-15, 15])
        return [1, 0, 0, 1, 0, dy]
    return [1, 0, 0, 1, 0, 0]

def drunk_supernova(i):
    """VARIATION 5: SUPERNOVA - Explosive radial burst"""
    angle = random.uniform(0, 2 * math.pi)
    power = random.uniform(5, 30)
    dx = math.cos(angle) * power
    dy = math.sin(angle) * power
    rot = random.uniform(-1.0, 1.0)
    c, s = math.cos(rot), math.sin(rot)
    scale = random.uniform(0.3, 2.0)
    return [c * scale, s * scale, -s * scale, c * scale, dx, dy]

def drunk_shrapnel(i):
    """VARIATION 6: SHRAPNEL - Violent fragmentation"""
    dx = random.uniform(-40, 40)
    dy = random.uniform(-40, 40)
    angle = random.uniform(-math.pi, math.pi)
    c, s = math.cos(angle), math.sin(angle)
    return [c, s, -s, c, dx, dy]

def drunk_vortex(i):
    """VARIATION 7: VORTEX - Chaotic whirlpool"""
    base_angle = random.uniform(0, 2 * math.pi)
    spiral = i * 0.2
    total_angle = base_angle + spiral
    radius = random.uniform(0, 25)
    dx = math.cos(total_angle) * radius
    dy = math.sin(total_angle) * radius
    rot = total_angle + random.uniform(-0.5, 0.5)
    c, s = math.cos(rot), math.sin(rot)
    return [c, s, -s, c, dx, dy]

def drunk_scatter(i):
    """VARIATION 8: SCATTER BOMB - Complete randomization"""
    dx = random.uniform(-35, 35)
    dy = random.uniform(-35, 35)
    angle = random.uniform(-1.5, 1.5)
    c, s = math.cos(angle), math.sin(angle)
    scale_x = random.uniform(0.4, 1.8)
    scale_y = random.uniform(0.4, 1.8)
    return [c * scale_x, s * scale_x, -s * scale_y, c * scale_y, dx, dy]

def drunk_ricochet(i):
    """VARIATION 9: RICOCHET - Bouncing chaos"""
    if random.random() < 0.4:
        velocity = random.uniform(15, 35)
        angle = random.choice([0.785, 2.356, 3.927, 5.498])  # 45deg increments
        dx = math.cos(angle) * velocity
        dy = math.sin(angle) * velocity
        rot = random.uniform(-0.8, 0.8)
        c, s = math.cos(rot), math.sin(rot)
        return [c, s, -s, c, dx, dy]
    return [1, 0, 0, 1, 0, 0]

def drunk_checkerboard(i):
    """VARIATION 10: CHECKERBOARD - Alternating diagonal offset"""
    is_black = (i % 2 == 0)
    if is_black:
        dx, dy = 3, 3
    else:
        dx, dy = -3, -3
    angle = 0.1 if is_black else -0.1
    c, s = math.cos(angle), math.sin(angle)
    return [c, s, -s, c, dx, dy]

def drunk_concentric(i):
    """VARIATION 11: CONCENTRIC RINGS - Circular wave pattern"""
    ring = (i // 8) % 6
    angle = (i % 8) * (math.pi / 4)
    radius = ring * 2.5
    dx = math.cos(angle) * radius
    dy = math.sin(angle) * radius
    return [1, 0, 0, 1, dx, dy]

def drunk_hexagon(i):
    """VARIATION 12: HEXAGON TILING - Honeycomb pattern"""
    hex_angle = (i % 6) * (math.pi / 3)
    layer = (i // 6) % 4
    radius = layer * 3
    dx = math.cos(hex_angle) * radius
    dy = math.sin(hex_angle) * radius
    rot = hex_angle
    c, s = math.cos(rot), math.sin(rot)
    return [c, s, -s, c, dx, dy]

def drunk_wave(i):
    """VARIATION 13: WAVE - Sine wave pattern"""
    wave_y = math.sin(i * 0.1) * 5
    wave_x = math.cos(i * 0.1) * 3
    return [1, 0, 0, 1, wave_x, wave_y]

def drunk_tornado(i):
    """VARIATION 14: TORNADO - Spiral rotation pattern"""
    angle = (i * 0.03) % (2 * math.pi)
    c, s = math.cos(angle), math.sin(angle)
    radius = min(i * 0.05, 8)
    dx = math.cos(angle) * radius
    dy = math.sin(angle) * radius
    return [c, s, -s, c, dx, dy]

def drunk_tall(i):
    """VARIATION 15: TALL - Random vertical stretching"""
    sy = random.uniform(0.8, 2.0)
    return [1, 0, 0, sy, 0, 0]

def drunk_wide(i):
    """VARIATION 16: WIDE - Random horizontal stretching"""
    sx = random.uniform(0.5, 2.5)
    return [sx, 0, 0, 1, 0, 0]

def drunk_zigzag(i):
    """VARIATION 17: ZIGZAG - Alternating left/right shifts"""
    direction = 1 if (i // 5) % 2 == 0 else -1
    dx = direction * random.uniform(3, 8)
    return [1, 0, 0, 1, dx, 0]

def drunk_earthquake(i):
    """VARIATION 18: EARTHQUAKE - Heavy random displacement"""
    if random.random() < 0.2:
        dx = random.uniform(-15, 15)
        dy = random.uniform(-15, 15)
        angle = random.uniform(-0.2, 0.2)
        c, s = math.cos(angle), math.sin(angle)
        return [c, s, -s, c, dx, dy]
    return [1, 0, 0, 1, 0, 0]

def drunk_stairs(i):
    """VARIATION 19: STAIRS - Stepped diagonal pattern"""
    step = (i // 3) % 8
    dx = step * 1.5
    dy = -step * 2
    return [1, 0, 0, 1, dx, dy]

def drunk_kaleidoscope(i):
    """VARIATION 20: KALEIDOSCOPE - Random scale + rotation chaos"""
    angle = random.uniform(-0.3, 0.3)
    c, s = math.cos(angle), math.sin(angle)
    scale = random.uniform(0.7, 1.3)
    dx = random.uniform(-8, 8)
    dy = random.uniform(-8, 8)
    return [c * scale, s * scale, -s * scale, c * scale, dx, dy]

RECIPES = [
    ("01_Tipsy", drunk_tipsy),
    ("02_Wobbly", drunk_wobbly),
    ("03_Sloshed", drunk_sloshed),
    ("04_Hiccups", drunk_hiccups),
    ("05_Supernova", drunk_supernova),
    ("06_Shrapnel", drunk_shrapnel),
    ("07_Vortex", drunk_vortex),
    ("08_Scatter", drunk_scatter),
    ("09_Ricochet", drunk_ricochet),
    ("10_Checkerboard", drunk_checkerboard),
    ("11_Concentric", drunk_concentric),
    ("12_Hexagon", drunk_hexagon),
    ("13_Wave", drunk_wave),
    ("14_Tornado", drunk_tornado),
    ("15_Tall", drunk_tall),
    ("16_Wide", drunk_wide),
    ("17_Zigzag", drunk_zigzag),
    ("18_Earthquake", drunk_earthquake),
    ("19_Stairs", drunk_stairs),
    ("20_Kaleidoscope", drunk_kaleidoscope)
]

# ==================== FILE SELECTION ====================

def find_pdfs():
    """Scan current directory for PDF files"""
    current_dir = os.getcwd()
    pdfs = [f for f in os.listdir(current_dir) if f.lower().endswith('.pdf')]
    return sorted(pdfs)

def select_files():
    """Interactive file selection menu"""
    pdfs = find_pdfs()
    
    if not pdfs:
        print("!! No PDF files found in current directory.")
        exit()
    
    print("\n" + "="*50)
    print("🍺 DRUNK TYPESETTER - FILE SELECTION 🍺")
    print("="*50)
    print("\nAvailable PDF files:\n")
    
    for i, pdf in enumerate(pdfs, 1):
        print(f"  [{i}] {pdf}")
    
    print(f"\n  [0] CREATE ALL - Process all {len(pdfs)} files")
    print("="*50)
    
    while True:
        choice = input("\nEnter number (or 0 for all): ").strip()
        
        if choice == "0":
            return pdfs  # Return all files
        
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(pdfs):
                return [pdfs[idx]]  # Return single file in list
            else:
                print(f"!! Invalid number. Enter 1-{len(pdfs)} or 0")
        except ValueError:
            print("!! Please enter a valid number")

def select_effects():
    """Interactive effect selection menu"""
    print("\n" + "="*50)
    print("🎭 EFFECT SELECTION 🎭")
    print("="*50)
    print("\nAvailable effects:\n")
    
    for i, (name, _) in enumerate(RECIPES, 1):
        print(f"  [{i:2d}] {name}")
    
    print(f"\n  [ 0] ALL EFFECTS - Apply all {len(RECIPES)} effects")
    print("="*50)
    
    while True:
        choice = input("\nEnter effect number (or 0 for all): ").strip()
        
        if choice == "0":
            return RECIPES  # Return all effects
        
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(RECIPES):
                return [RECIPES[idx]]  # Return single effect in list
            else:
                print(f"!! Invalid number. Enter 1-{len(RECIPES)} or 0")
        except ValueError:
            print("!! Please enter a valid number")

# ==================== PROCESSING ====================

def process_pdf(input_file, func_name, func):
    """Process a single PDF with a drunk algorithm"""
    try:
        pdf = Pdf.open(input_file)
    except Exception as e:
        print(f"  [X] Failed to open: {e}")
        return False
    
    for page in pdf.pages:
        commands = pikepdf.parse_content_stream(page)
        new_commands = []
        new_commands.append(([], Operator("q")))
        
        cmd_index = 0
        for cmd in commands:
            if isinstance(cmd, tuple):
                operands, operator = cmd
            else:
                operands = cmd.operands
                operator = cmd.operator
            
            op_str = str(operator)
            TARGETS = ["Tm", "Td", "TD", "Tj", "TJ", "cm", "Do", "re"]
            
            if op_str in TARGETS:
                matrix = func(cmd_index)
                new_commands.append((matrix, Operator("cm")))
                cmd_index += 1
            
            new_commands.append((operands, operator))
        
        new_commands.append(([], Operator("Q")))
        content_bytes = pikepdf.unparse_content_stream(new_commands)
        new_stream = Stream(pdf, content_bytes)
        page.Contents = new_stream
    
    # Create output filename
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    out_name = f"Drunk_{func_name}_{base_name}.pdf"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    
    pdf.save(out_path)
    return True

def process_files():
    """Main processing loop"""
    selected_files = select_files()
    selected_effects = select_effects()
    
    print(f"\n{'='*50}")
    print(f"Processing {len(selected_files)} file(s)")
    print(f"with {len(selected_effects)} effect(s)...")
    print(f"{'='*50}\n")
    
    total = len(selected_files) * len(selected_effects)
    current = 0
    
    for input_file in selected_files:
        print(f"\n📄 {input_file}")
        
        for name, func in selected_effects:
            current += 1
            print(f"  [{current}/{total}] Pouring {name}...", end=" ")
            
            if process_pdf(input_file, name, func):
                print("✓")
            else:
                print("✗")
    
    print(f"\n{'='*50}")
    print(f"🎉 Done! Output saved to:")
    print(f"   {OUTPUT_DIR}")
    print(f"{'='*50}\n")

# ==================== MAIN ====================

if __name__ == "__main__":
    process_files()
