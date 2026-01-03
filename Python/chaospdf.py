import os
import random
import math
import pikepdf
from pikepdf import Operator, Pdf, Stream

# ==================== CONFIGURATION ====================
INPUT_FILE = "/sdcard/Download/input.pdf"
OUTPUT_DIR = "/sdcard/Download/PDF_Chaos_Styles"

if not os.path.exists(OUTPUT_DIR):
    try:
        os.makedirs(OUTPUT_DIR)
        print(f"[OK] Directory created: {OUTPUT_DIR}")
    except PermissionError:
        print("!! Error: Permission denied. Run 'termux-setup-storage'.")
        exit()

# ==================== CHAOS RECIPES (INTENSIFIED) ====================

def style_the_liquefier(op_type):
    """Everything slides downwards like melting wax."""
    skew_y = -1.5 + random.uniform(-0.5, 0.5)
    return [1, 0, skew_y, 1, 0, 0]

def style_text_nuke(op_type):
    """Text explodes to 5x size. Images shrink."""
    if op_type == 'text':
        return [5, 0, 0, 5, 0, 0]
    return [0.5, 0, 0, 0.5, 0, 0]

def style_horizontal_shred(op_type):
    """Violent alternating shears."""
    shear_x = random.choice([-2, 2]) 
    return [1, shear_x, 0, 1, 0, 0]

def style_zero_gravity(op_type):
    """Random rotation and float."""
    angle = random.uniform(-0.3, 0.3)
    c, s = math.cos(angle), math.sin(angle)
    dx = random.uniform(-100, 100)
    dy = random.uniform(-100, 100)
    return [c, s, -s, c, dx, dy]

def style_the_compactor(op_type):
    """Crush Y, Stretch X."""
    return [4.0, 0, 0, 0.1, 0, 0]

def style_mirror_verse(op_type):
    """Flip X axis randomly."""
    return [-1, 0, 0, 1, 0, 0]

def style_pixel_jitter(op_type):
    """Blurry vision effect."""
    dx = random.uniform(-5, 5)
    dy = random.uniform(-5, 5)
    return [1, 0, 0, 1, dx, dy]

def style_runaway_indent(op_type):
    """Push right aggressively."""
    return [1, 0, 0, 1, random.uniform(50, 500), 0]

def style_aspect_nightmare(op_type):
    """Alternating Needle X / Needle Y."""
    if random.random() < 0.5:
        return [0.05, 0, 0, 1, 0, 0] 
    else:
        return [1, 0, 0, 0.05, 0, 0]

def style_text_scramble(op_type):
    """Total rotation chaos for text."""
    if op_type == 'text':
        angle = random.uniform(0, 6.28)
        c, s = math.cos(angle), math.sin(angle)
        return [c, s, -s, c, 0, 0]
    return [1, 0, 0, 1, 0, 0]

RECIPES = [
    ("01_The_Liquefier", style_the_liquefier),
    ("02_Text_Nuke", style_text_nuke),
    ("03_Horizontal_Shred", style_horizontal_shred),
    ("04_Zero_Gravity", style_zero_gravity),
    ("05_The_Compactor", style_the_compactor),
    ("06_Mirror_Verse", style_mirror_verse),
    ("07_Pixel_Jitter", style_pixel_jitter),
    ("08_Runaway_Indent", style_runaway_indent),
    ("09_Aspect_Nightmare", style_aspect_nightmare),
    ("10_Text_Scramble", style_text_scramble)
]

# ==================== MAIN LOGIC ====================

def cook_pdf(filename, recipe_func):
    print(f"Cooking {filename}...")
    try:
        # Re-open file fresh every time to avoid compound damage
        pdf = Pdf.open(INPUT_FILE)
    except Exception as e:
        print(f"!! Error opening input: {e}")
        return

    total_mutations = 0

    for page in pdf.pages:
        # Parse content stream
        commands = pikepdf.parse_content_stream(page)
        new_commands = []
        
        # Save Global State (q)
        new_commands.append( ([], Operator("q")) )
        
        for cmd in commands:
            # Handle tuple/object difference
            if isinstance(cmd, tuple):
                operands, operator = cmd
            else:
                operands = cmd.operands
                operator = cmd.operator
            
            op_str = str(operator)
            op_type = None
            
            # --- FIX: REMOVED SLASHES FROM CHECKS ---
            if op_str in ["Tm", "Td", "TD", "Tj", "TJ"]:
                op_type = 'text'
            elif op_str in ["Do", "re", "BI"]: 
                op_type = 'image'
            elif op_str == "cm":
                op_type = 'matrix'
            
            # If valid target, inject chaos
            if op_type:
                # 90% Chance to mutate (High Intensity)
                if random.random() < 0.9:
                    matrix = recipe_func(op_type)
                    new_commands.append( (matrix, Operator("cm")) )
                    total_mutations += 1

            # Append Original
            new_commands.append( (operands, operator) )
            
            # Occasional Reset
            if random.random() < 0.05:
                new_commands.append( ([], Operator("Q")) )
                new_commands.append( ([], Operator("q")) )

        # Restore Global State (Q)
        new_commands.append( ([], Operator("Q")) )

        # Save to page
        content_bytes = pikepdf.unparse_content_stream(new_commands)
        new_stream = Stream(pdf, content_bytes)
        page.Contents = new_stream

    out_path = os.path.join(OUTPUT_DIR, filename)
    pdf.save(out_path)
    print(f"  [+] Served: {out_path} ({total_mutations} injections)")

if __name__ == "__main__":
    if not os.path.exists(INPUT_FILE):
        print(f"!! Missing {INPUT_FILE}")
    else:
        print("--- Opening the Chaos Kitchen V2 ---")
        for name, func in RECIPES:
            cook_pdf(f"{name}.pdf", func)
