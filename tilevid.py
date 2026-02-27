import os
import math
import sys
import subprocess
import shutil
from PIL import Image, ImageOps

# --- CONFIGURATION ---
SUPPORTED_EXTS = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')

def get_image_files():
    """Scans current directory for image files."""
    files = [f for f in os.listdir('.') if f.lower().endswith(SUPPORTED_EXTS)]
    files.sort()
    return files

def get_average_color(image):
    """Calculates the average (R, G, B) color of an image."""
    img = image.copy().convert('RGB')
    img = img.resize((1, 1), Image.Resampling.LANCZOS)
    return img.getpixel((0, 0))

def get_color_distance(c1, c2):
    """Calculates the Euclidean distance between two RGB colors."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def load_tiles(tile_files, render_size):
    """Loads images and pre-sizes them to the output render size."""
    tiles = []
    print(f"Loading and analyzing {len(tile_files)} tile images...")
    
    for file in tile_files:
        try:
            img = Image.open(file)
            img = ImageOps.fit(img, (render_size, render_size), Image.Resampling.LANCZOS)
            avg_color = get_average_color(img)
            tiles.append({"img": img, "avg": avg_color})
        except Exception:
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

def generate_zoom_video(image_path):
    """Generates a zoom-out video with a hold at the end using FFmpeg."""
    if not shutil.which("ffmpeg"):
        print("\nError: FFmpeg not found in system path. Cannot generate video.")
        return

    print("\n--- Generating Video ---")
    print("Reading image dimensions...")
    
    try:
        # Determine video resolution (Max height 1080p)
        with Image.open(image_path) as img:
            w, h = img.size
            aspect = w / h
        
        vid_h = 1080
        vid_w = int(vid_h * aspect)
        if vid_w % 2 != 0: vid_w += 1
        
        output_file = os.path.splitext(image_path)[0] + "_reveal.mp4"
        
        # --- VIDEO SETTINGS ---
        fps = 30
        zoom_duration = 8.0  # Seconds spent zooming out
        hold_duration = 2.0  # Seconds holding the full image
        
        zoom_frames = int(zoom_duration * fps)
        total_frames = int((zoom_duration + hold_duration) * fps)
        total_seconds = zoom_duration + hold_duration
        
        start_zoom = 12  # Starts at 12x magnification
        
        print(f"Rendering: {zoom_duration}s zoom + {hold_duration}s hold ({total_seconds}s total)...")
        
        # FFmpeg Filter Logic:
        # We use an 'if' statement in the zoom calculation:
        # if (current_frame <= zoom_frames):
        #    Calculate zoom from 12 down to 1
        # else:
        #    Stay at 1.0 (The Hold)
        
        zoom_expr = (
            f"if(lte(on,{zoom_frames}), "
            f"{start_zoom} - ({start_zoom}-1.0)*(on/{zoom_frames}), "
            f"1.0)"
        )

        cmd = [
            "ffmpeg", "-y",                  
            "-loop", "1",                    
            "-i", image_path,                
            "-vf",                           
            f"zoompan=z='{zoom_expr}':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"d={total_frames}:s={vid_w}x{vid_h}:fps={fps}",
            "-c:v", "libx264",               
            "-t", str(total_seconds),             
            "-pix_fmt", "yuv420p",           
            output_file
        ]
        
        subprocess.run(cmd, check=True, stderr=subprocess.DEVNULL)
        print(f"Success! Video saved as: {output_file}")
        
    except subprocess.CalledProcessError:
        print("Error: FFmpeg failed to render the video.")
    except Exception as e:
        print(f"An error occurred: {e}")

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

    tile_files = [f for i, f in enumerate(image_files) if i != sel]

    print("\n--- Step 2: Settings ---")
    try:
        tiles_across = int(input("How many tiles across? (rec: 50-150): "))
        tile_res = int(input("Pixel resolution of each tile? (rec: 50-200): "))
    except ValueError:
        print("Invalid input. Using defaults (100 tiles, 50px).")
        tiles_across = 100
        tile_res = 50

    final_width = tiles_across * tile_res
    if final_width > 15000:
        print(f"\nWarning: Final width {final_width}px. Large images might crash video generation.")
        if input("Continue? (y/n): ").lower() != 'y': sys.exit()

    tiles = load_tiles(tile_files, tile_res)
    if not tiles:
        print("No valid tiles found.")
        sys.exit()

    target_img = Image.open(target_file).convert('RGB')
    target_w, target_h = target_img.size
    
    block_size = max(1, target_w // tiles_across)
    tiles_down = target_h // block_size
    
    final_w = tiles_across * tile_res
    final_h = tiles_down * tile_res
    mosaic = Image.new('RGB', (final_w, final_h))
    
    print(f"\nBuilding Mosaic: {tiles_across}x{tiles_down} grid.")
    total_tiles = tiles_across * tiles_down
    processed = 0

    for y in range(tiles_down):
        for x in range(tiles_across):
            box = (x * block_size, y * block_size, (x + 1) * block_size, (y + 1) * block_size)
            chunk = target_img.crop(box)
            match_img = find_best_match(get_average_color(chunk), tiles)
            mosaic.paste(match_img, (x * tile_res, y * tile_res))
            processed += 1
        
        sys.stdout.write(f"\rProgress: {int((processed / total_tiles) * 100)}%")
        sys.stdout.flush()

    print("\n\nSaving Image...")
    output_name = f"mosaic_{tiles_across}x{tile_res}.jpg"
    mosaic.save(output_name, quality=90)
    print(f"Image Saved: {output_name}")
    
    print("\n--- Step 3: Video Output ---")
    make_vid = input("Generate a 12x zoom-out reveal video (approx 10s)? (y/n): ").lower()
    if make_vid == 'y':
        generate_zoom_video(output_name)
    else:
        print("Skipping video generation.")

    print("\nDone!")

if __name__ == "__main__":
    main()
