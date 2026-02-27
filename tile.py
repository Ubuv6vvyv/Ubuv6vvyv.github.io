import os
import math
import sys
from PIL import Image, ImageOps

# --- CONFIGURATION ---
# Supported image types
SUPPORTED_EXTS = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')

def get_image_files():
    """Scans current directory for image files."""
    files = [f for f in os.listdir('.') if f.lower().endswith(SUPPORTED_EXTS)]
    files.sort()
    return files

def get_average_color(image):
    """Calculates the average (R, G, B) color of an image."""
    # Resize to 1x1 to mathematically average all pixels
    img = image.copy()
    img = img.convert('RGB')
    img = img.resize((1, 1), Image.Resampling.LANCZOS)
    return img.getpixel((0, 0))

def get_color_distance(c1, c2):
    """Calculates the Euclidean distance between two RGB colors."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def load_tiles(tile_files, render_size):
    """
    Loads images and pre-sizes them to the output render size.
    This ensures they are high quality when pasted.
    """
    tiles = []
    print(f"Loading and analyzing {len(tile_files)} tile images...")
    
    for file in tile_files:
        try:
            img = Image.open(file)
            # Crop/Resize to the sharp render size (e.g., 100x100)
            img = ImageOps.fit(img, (render_size, render_size), Image.Resampling.LANCZOS)
            
            # Analyze color (we can do this on the resized version)
            avg_color = get_average_color(img)
            
            tiles.append({"img": img, "avg": avg_color})
        except Exception as e:
            # Silently skip bad files to keep the tool smooth
            pass
            
    return tiles

def find_best_match(target_avg, tiles):
    """Finds the tile closest in color."""
    best_fit = None
    min_dist = float('inf')
    
    for tile in tiles:
        dist = get_color_distance(target_avg, tile['avg'])
        if dist < min_dist:
            min_dist = dist
            best_fit = tile['img']
            
    return best_fit

def main():
    image_files = get_image_files()
    if len(image_files) < 2:
        print("Error: Need at least 2 images in this folder.")
        sys.exit()

    print("\n--- Step 1: Select Target ---")
    for i, file in enumerate(image_files):
        print(f"{i + 1}. {file}")
    
    while True:
        try:
            sel = int(input(f"\nSelect target image (1-{len(image_files)}): ")) - 1
            if 0 <= sel < len(image_files):
                target_file = image_files[sel]
                break
        except ValueError:
            pass

    # Separate target from resources
    tile_files = [f for i, f in enumerate(image_files) if i != sel]

    # --- INPUTS FOR QUALITY VS SIZE ---
    print("\n--- Step 2: Settings ---")
    try:
        # 1. Grid Density
        tiles_across = int(input("How many tiles across? (rec: 50-150): "))
        
        # 2. Tile Resolution
        tile_res = int(input("Pixel resolution of each tile? (rec: 50-200): "))
    except ValueError:
        print("Invalid input. Using defaults (100 tiles, 50px).")
        tiles_across = 100
        tile_res = 50

    # Safety Check for RAM/Size
    final_width = tiles_across * tile_res
    print(f"\nWarning: Final image width will be {final_width} pixels.")
    if final_width > 15000:
        print("!! VERY LARGE IMAGE DETECTED !! This might crash on a phone.")
        confirm = input("Continue anyway? (y/n): ")
        if confirm.lower() != 'y':
            sys.exit()

    # --- EXECUTION ---
    # Load tiles at the High Quality resolution
    tiles = load_tiles(tile_files, tile_res)
    if not tiles:
        print("No valid tiles found.")
        sys.exit()

    # Open Target
    target_img = Image.open(target_file).convert('RGB')
    target_w, target_h = target_img.size
    
    # Calculate grid based on "Tiles Across"
    # This determines the size of the 'chunks' we analyze in the target
    block_size = target_w // tiles_across
    if block_size < 1: block_size = 1
    
    # Calculate rows needed to maintain aspect ratio
    tiles_down = target_h // block_size
    
    # Create the massive canvas
    final_w = tiles_across * tile_res
    final_h = tiles_down * tile_res
    mosaic = Image.new('RGB', (final_w, final_h))
    
    print(f"\nBuilding Mosaic: {tiles_across}x{tiles_down} grid.")
    print(f"Analysis Block: {block_size}px | Render Tile: {tile_res}px")

    total_tiles = tiles_across * tiles_down
    processed = 0

    for y in range(tiles_down):
        for x in range(tiles_across):
            # 1. Analyze the 'block' from the target (Low Res Logic)
            box = (x * block_size, y * block_size, 
                   (x + 1) * block_size, (y + 1) * block_size)
            chunk = target_img.crop(box)
            chunk_avg = get_average_color(chunk)
            
            # 2. Find match
            match_img = find_best_match(chunk_avg, tiles)
            
            # 3. Paste the 'tile' into the canvas (High Res Logic)
            # No resizing needed here because load_tiles() already did it!
            paste_box = (x * tile_res, y * tile_res)
            mosaic.paste(match_img, paste_box)
            
            processed += 1
        
        # Progress Bar
        percent = int((processed / total_tiles) * 100)
        sys.stdout.write(f"\rProgress: {percent}%")
        sys.stdout.flush()

    print("\n\nSaving... (Do not close!)")
    output_name = f"mosaic_{tiles_across}x{tile_res}.jpg"
    mosaic.save(output_name, quality=90)
    print(f"Done! Saved as {output_name}")

if __name__ == "__main__":
    main()
