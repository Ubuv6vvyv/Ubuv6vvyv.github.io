import os
import math
import random
import pikepdf
from pikepdf import Name, Operator, Pdf, Stream, Array

# ==================== CONFIGURATION ====================
INPUT_FILE = "/sdcard/Download/input.pdf"
OUTPUT_DIR = "/sdcard/Download/PDF_Thrashed_Master"

if not os.path.exists(OUTPUT_DIR):
    try:
        os.makedirs(OUTPUT_DIR)
    except PermissionError:
        print("!! Error: Permission denied.")
        exit()

# ==================== TRANSFORMATION LOGIC ====================

def get_expansion_needs(matrix):
    """
    Estimates how much extra space is needed based on the transformation matrix.
    Matrix: [a b c d e f] -> e is X-shift, f is Y-shift.
    Returns (x_expand, y_expand)
    """
    # This is a heuristic. We check the Translation components (e, f)
    # and the Scale components (a, d) to guess expansion.
    x_shift = abs(matrix[4])
    y_shift = abs(matrix[5])
    
    # If scaling up (a, d > 1), we need more room generally
    scale_factor = max(abs(matrix[0]), abs(matrix[3]))
    
    return x_shift + (scale_factor * 100), y_shift + (scale_factor * 100)

# --- STYLE GROUP 1: CHAOS ---

def style_earthquake(i, op, h):
    return [1, 0, 0, 1, random.uniform(-10, 10), random.uniform(-10, 10)]

def style_tornado(i, op, h):
    angle = i * 0.05
    c, s = math.cos(angle), math.sin(angle)
    return [c, s, -s, c, 0, 0]

def style_melting(i, op, h):
    return [1, 0, -0.5 - (i * 0.01), 1, 0, 0]

def style_mirror_dimension(i, op, h):
    return [-1, 0, 0, 1, 0, 0] if random.random() < 0.3 else [1, 0, 0, 1, 0, 0]

def style_banishment(i, op, h):
    # Throws items far away. We need massive page resize for this.
    return [1, 0, 0, 1, 2000, 2000] if random.random() < 0.1 else [1, 0, 0, 1, 0, 0]

def style_micro_text(i, op, h):
    if op in [Operator("Tm"), Operator("Td"), Operator("Tj")]: return [0.1, 0, 0, 0.1, 0, 0]
    return [1, 0, 0, 1, 0, 0]

def style_macro_scream(i, op, h):
    if op in [Operator("Tm"), Operator("Td"), Operator("Tj")]: return [5, 0, 0, 5, 0, 0]
    return [1, 0, 0, 1, 0, 0]

def style_aspect_hell(i, op, h):
    return [0.5, 0, 0, 3, 0, 0] if i % 2 == 0 else [3, 0, 0, 0.5, 0, 0]

def style_the_shredder(i, op, h):
    return [1, 1 if i%2==0 else -1, 0, 1, 0, 0]

def style_zero_gravity(i, op, h):
    return [1, 0, 0, 1, math.sin(i * 0.1) * 20, i * 5]

# --- STYLE GROUP 2: GEOMETRY ---

def geo_sine_wave(i, op, h):
    return [1, 0, 0, 1, math.sin(i * 0.1) * 100, 0]

def geo_implosion(i, op, h):
    s = max(0.1, 1.0 - (i * 0.005))
    return [s, 0, 0, s, 0, 0]

def geo_v_formation(i, op, h):
    return [1, 0, 0, 1, abs(i - 50) * 5, 0]

def geo_spiral_galaxy(i, op, h):
    a = i * 0.1
    r = i * 2.0
    c, s = math.cos(a), math.sin(a)
    return [c, s, -s, c, c*r, s*r]

def geo_step_pyramid(i, op, h):
    return [1, 0, 0, 1, int(i/10) * 50, 0]

def geo_fisheye(i, op, h):
    phase = (i % 50) / 25.0
    if phase > 1: phase = 2 - phase
    s = 0.5 + (phase * 2.0)
    return [s, 0, 0, s, 0, 0]

def geo_bouncing_ball(i, op, h):
    return [1, 0, 0, 1, 0, abs(math.sin(i * 0.1)) * 200]

def geo_pixelation(i, op, h):
    return [1, 0, 0, 1, (i % 5) * 20, 0]

def geo_wind_shear(i, op, h):
    return [1, 0, i * 0.02, 1, 0, 0]

def geo_dna_helix(i, op, h):
    x = math.sin(i * 0.2) * 100
    s = 1.0 + (math.cos(i * 0.2) * 0.5)
    return [s, 0, 0, s, x, 0]

# --- STYLE GROUP 3: EXTREMES ---

def extreme_explosion(i, op, h):
    # Moves everything away from center based on index
    dx = (random.random() - 0.5) * i * 10
    dy = (random.random() - 0.5) * i * 10
    return [1, 0, 0, 1, dx, dy]

def extreme_crush_x(i, op, h):
    return [0.05, 0, 0, 1, 0, 0]

def extreme_crush_y(i, op, h):
    return [1, 0, 0, 0.05, 0, 0]

def extreme_noise(i, op, h):
    return [random.uniform(0.5, 1.5), random.uniform(-1, 1), 
            random.uniform(-1, 1), random.uniform(0.5, 1.5), 
            random.uniform(-100, 100), random.uniform(-100, 100)]

# Master List
STYLES = [
    ("01_Earthquake", style_earthquake), ("02_Tornado", style_tornado),
    ("03_Melting", style_melting), ("04_Mirror", style_mirror_dimension),
    ("05_Banishment", style_banishment), ("06_MicroText", style_micro_text),
    ("07_MacroScream", style_macro_scream), ("08_AspectHell", style_aspect_hell),
    ("09_Shredder", style_the_shredder), ("10_ZeroGrav", style_zero_gravity),
    ("11_SineWave", geo_sine_wave), ("12_Implosion", geo_implosion),
    ("13_V_Form", geo_v_formation), ("14_Spiral", geo_spiral_galaxy),
    ("15_Pyramid", geo_step_pyramid), ("16_Fisheye", geo_fisheye),
    ("17_Bounce", geo_bouncing_ball), ("18_Pixel", geo_pixelation),
    ("19_WindShear", geo_wind_shear), ("20_DNA", geo_dna_helix),
    ("21_Explosion", extreme_explosion), ("22_CrushX", extreme_crush_x),
    ("23_CrushY", extreme_crush_y), ("24_Noise", extreme_noise)
]

# ==================== PROCESSING ENGINE ====================

def expand_page_boundary(page, max_x_expand, max_y_expand):
    """
    Updates the MediaBox of the page to accommodate the thrashing.
    We center the existing content in the new larger box.
    """
    # Original Box
    try:
        mbox = [float(x) for x in page.MediaBox]
    except:
        mbox = [0, 0, 595, 842] # Fallback A4

    w = mbox[2] - mbox[0]
    h = mbox[3] - mbox[1]
    
    # Calculate new dimensions
    # We add padding based on the maximum expansion detected
    add_w = max_x_expand * 2.5 # Safety factor
    add_h = max_y_expand * 2.5
    
    new_w = w + add_w
    new_h = h + add_h
    
    # Update MediaBox (0, 0, new_w, new_h)
    page.MediaBox = Array([0, 0, new_w, new_h])
    
    # Return offset needed to center the old content
    # (New Center - Old Center)
    offset_x = (new_w - w) / 2
    offset_y = (new_h - h) / 2
    
    return offset_x, offset_y

def process_file():
    if not os.path.exists(INPUT_FILE):
        print(f"!! Missing input file: {INPUT_FILE}")
        return

    print(f"--- Loaded {INPUT_FILE} ---")

    for name, style_func in STYLES:
        try:
            pdf = Pdf.open(INPUT_FILE)
        except:
            continue
            
        print(f"Cooking {name}...")
        
        for page in pdf.pages:
            # 1. First Pass: Analyze how wild this style gets
            # We run a simulation to see max displacement
            sim_max_x, sim_max_y = 0, 0
            
            # Rough count of ops to simulate index
            raw_commands = pikepdf.parse_content_stream(page)
            op_count = len(raw_commands)
            
            # Sample start, middle, end indices to guess max expansion
            check_indices = [0, int(op_count/2), op_count]
            for idx in check_indices:
                # Dummy call
                m = style_func(idx, Operator("cm"), 842)
                expand_x, expand_y = get_expansion_needs(m)
                sim_max_x = max(sim_max_x, expand_x)
                sim_max_y = max(sim_max_y, expand_y)

            # 2. Expand Page Boundary
            # This creates a huge canvas so things don't fly off screen
            offset_x, offset_y = expand_page_boundary(page, sim_max_x, sim_max_y)

            # 3. Process Content
            commands = pikepdf.parse_content_stream(page)
            new_commands = []
            
            # Wrap in Save State
            new_commands.append( ([], Operator("q")) )
            
            # Apply Centering Offset (Shift everything to middle of new giant page)
            center_matrix = [1, 0, 0, 1, offset_x, offset_y]
            new_commands.append( (center_matrix, Operator("cm")) )
            
            cmd_index = 0
            TARGET_OPS = [Operator("Tm"), Operator("Td"), Operator("cm"), 
                          Operator("Do"), Operator("re"), Operator("Tj"), Operator("TJ")]
            
            for cmd in commands:
                if isinstance(cmd, tuple):
                    operands, operator = cmd
                else:
                    operands = cmd.operands
                    operator = cmd.operator
                
                if operator in TARGET_OPS:
                    # Get Style Matrix
                    # We pass page height if needed by algo
                    matrix = style_func(cmd_index, operator, 842)
                    new_commands.append( (matrix, Operator("cm")) )
                    cmd_index += 1
                
                new_commands.append( (operands, operator) )
            
            new_commands.append( ([], Operator("Q")) )

            # Save
            content_bytes = pikepdf.unparse_content_stream(new_commands)
            new_stream = Stream(pdf, content_bytes)
            page.Contents = new_stream
            
        out_name = f"Thrashed_{name}.pdf"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        pdf.save(out_path)
        print(f"  [+] Saved {out_name}")

if __name__ == "__main__":
    process_file()
