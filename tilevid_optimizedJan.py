import os
import math
import sys
import subprocess
import shutil
from PIL import Image, ImageOps
from multiprocessing import Pool, cpu_count
from functools import lru_cache
import numpy as np

# --- CONFIGURATION ---
SUPPORTED_EXTS = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')

def get_image_files():
    """Scans current directory for image files."""
    files = [f for f in os.listdir('.') if f.lower().endswith(SUPPORTED_EXTS)]
    files.sort()
    return files

def get_average_color_fast(image):
    """Fast average color calculation using numpy."""
    img = image.convert('RGB')
    # Downscale for faster calculation
    img = img.resize((50, 50), Image.Resampling.LANCZOS)
    np_img = np.array(img)
    avg_color = np_img.mean(axis=(0, 1)).astype(int)
    return tuple(avg_color)

def get_color_distance(c1, c2):
    """Calculates Euclidean distance between RGB colors."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def process_tile(args):
    """Worker function for parallel tile processing."""
    file, render_size = args
    try:
        img = Image.open(file)
        img = ImageOps.fit(img, (render_size, render_size), Image.Resampling.LANCZOS)
        avg_color = get_average_color_fast(img)
        return {"img": img, "avg": avg_color, "file": file}
    except Exception as e:
        return None

def load_tiles_parallel(tile_files, render_size):
    """Loads images in parallel with progress tracking."""
    print(f"Loading and analyzing {len(tile_files)} tile images...")
    
    # Use all available CPU cores
    num_workers = min(cpu_count(), len(tile_files))
    args = [(f, render_size) for f in tile_files]
    
    tiles = []
    with Pool(num_workers) as pool:
        results = pool.imap_unordered(process_tile, args)
        for i, result in enumerate(results, 1):
            if result:
                tiles.append(result)
            sys.stdout.write(f"\rLoading tiles: {i}/{len(tile_files)} ({int(i/len(tile_files)*100)}%)")
            sys.stdout.flush()
    
    print(f"\n✓ Loaded {len(tiles)} tiles successfully")
    return tiles

def find_best_match_fast(target_avg, tiles, tile_colors):
    """Fast tile matching using precomputed numpy array."""
    target = np.array(target_avg)
    distances = np.sqrt(((tile_colors - target) ** 2).sum(axis=1))
    best_idx = distances.argmin()
    return tiles[best_idx]['img']

def analyze_target_image(image_path):
    """Analyzes target image and suggests optimal settings."""
    with Image.open(image_path) as img:
        width, height = img.size
        aspect_ratio = width / height
        orientation = "landscape" if width > height else "portrait" if height > width else "square"
        megapixels = (width * height) / 1_000_000
        
    # Calculate intelligent suggestions
    if megapixels < 2:
        suggested_tiles = 60
        suggested_res = 40
    elif megapixels < 5:
        suggested_tiles = 80
        suggested_res = 50
    elif megapixels < 10:
        suggested_tiles = 100
        suggested_res = 60
    else:
        suggested_tiles = 120
        suggested_res = 70
    
    # Adjust for orientation
    if orientation == "portrait":
        suggested_tiles = int(suggested_tiles * 0.7)  # Fewer tiles across for portrait
    
    final_width = suggested_tiles * suggested_res
    final_height = int(final_width / aspect_ratio)
    
    print(f"\n📊 Target Image Analysis:")
    print(f"  Dimensions: {width}x{height}px ({orientation})")
    print(f"  Aspect Ratio: {aspect_ratio:.2f}:1")
    print(f"  Size: {megapixels:.1f} megapixels")
    print(f"\n💡 Recommended Settings:")
    print(f"  Tiles across: {suggested_tiles}")
    print(f"  Tile resolution: {suggested_res}px")
    print(f"  Final mosaic: {final_width}x{final_height}px (~{(final_width*final_height)/1_000_000:.1f}MP)")
    
    return {
        "width": width,
        "height": height,
        "aspect_ratio": aspect_ratio,
        "suggested_tiles": suggested_tiles,
        "suggested_res": suggested_res,
        "orientation": orientation
    }

def generate_mosaic(target_file, tile_files, tiles_across, tile_res):
    """Generates mosaic with proper dimension handling."""
    
    # Load and prepare tiles in parallel
    tiles = load_tiles_parallel(tile_files, tile_res)
    if not tiles:
        print("❌ No valid tiles found.")
        sys.exit(1)
    
    # Precompute tile colors as numpy array for fast matching
    tile_colors = np.array([tile['avg'] for tile in tiles])
    
    # Load target image
    print("\n🎨 Processing target image...")
    target_img = Image.open(target_file).convert('RGB')
    target_w, target_h = target_img.size
    
    # Calculate proper grid dimensions maintaining aspect ratio
    aspect_ratio = target_w / target_h
    tiles_down = int(tiles_across / aspect_ratio)
    
    # Ensure we don't lose coverage
    if tiles_down < 1:
        tiles_down = 1
    
    # Resize target to exact grid dimensions (prevents cutoff)
    grid_w = tiles_across
    grid_h = tiles_down
    target_resized = target_img.resize((grid_w, grid_h), Image.Resampling.LANCZOS)
    
    # Create final mosaic
    final_w = tiles_across * tile_res
    final_h = tiles_down * tile_res
    mosaic = Image.new('RGB', (final_w, final_h))
    
    print(f"\n🔨 Building {tiles_across}x{tiles_down} mosaic...")
    print(f"   Final size: {final_w}x{final_h}px")
    
    total_tiles = tiles_across * tiles_down
    processed = 0
    
    # Process each grid cell
    for y in range(tiles_down):
        for x in range(tiles_across):
            # Get pixel color from resized target
            target_color = target_resized.getpixel((x, y))
            
            # Find best matching tile
            match_img = find_best_match_fast(target_color, tiles, tile_colors)
            
            # Paste into mosaic
            mosaic.paste(match_img, (x * tile_res, y * tile_res))
            processed += 1
        
        # Update progress
        progress = int((processed / total_tiles) * 100)
        bar_length = 40
        filled = int(bar_length * processed / total_tiles)
        bar = '█' * filled + '░' * (bar_length - filled)
        sys.stdout.write(f"\r[{bar}] {progress}%")
        sys.stdout.flush()
    
    print("\n")
    return mosaic, final_w, final_h

def generate_zoom_video(image_path, target_analysis):
    """Generates optimized zoom-out video with intelligent settings."""
    if not shutil.which("ffmpeg"):
        print("\n❌ FFmpeg not found. Install with: pkg install ffmpeg")
        return

    print("\n🎬 Generating Video...")
    
    try:
        with Image.open(image_path) as img:
            w, h = img.size
        
        # Optimize video dimensions for mobile/performance
        max_dimension = 1920  # Max for mobile
        if w > h:  # Landscape
            vid_w = min(w, max_dimension)
            vid_h = int(vid_w * h / w)
        else:  # Portrait
            vid_h = min(h, max_dimension)
            vid_w = int(vid_h * w / h)
        
        # Ensure even dimensions for h264
        vid_w = vid_w + (vid_w % 2)
        vid_h = vid_h + (vid_h % 2)
        
        output_file = os.path.splitext(image_path)[0] + "_reveal.mp4"
        
        # Adaptive settings based on orientation
        fps = 30
        zoom_duration = 8.0
        hold_duration = 2.0
        start_zoom = 15  # Higher zoom for more dramatic effect
        
        zoom_frames = int(zoom_duration * fps)
        total_frames = int((zoom_duration + hold_duration) * fps)
        total_seconds = zoom_duration + hold_duration
        
        print(f"  Resolution: {vid_w}x{vid_h}")
        print(f"  Duration: {zoom_duration}s zoom + {hold_duration}s hold")
        print(f"  Rendering {total_frames} frames...")
        
        # Smooth zoom with easing
        zoom_expr = (
            f"if(lte(on,{zoom_frames}), "
            f"{start_zoom} - ({start_zoom}-1.0)*pow(on/{zoom_frames},1.5), "
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
            "-preset", "medium",  # Balance speed/quality
            "-crf", "23",  # Good quality
            "-t", str(total_seconds),
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",  # Fast streaming start
            output_file
        ]
        
        subprocess.run(cmd, check=True, stderr=subprocess.PIPE)
        
        # Get file size
        size_mb = os.path.getsize(output_file) / (1024 * 1024)
        print(f"✓ Video saved: {output_file} ({size_mb:.1f}MB)")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg error: {e.stderr.decode() if e.stderr else 'Unknown error'}")
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("=" * 50)
    print("🎨 OPTIMIZED MOSAIC GENERATOR")
    print("=" * 50)
    
    image_files = get_image_files()
    if len(image_files) < 2:
        print("❌ Need at least 2 images in this folder.")
        sys.exit(1)

    print(f"\n📁 Found {len(image_files)} images")
    print("\n--- STEP 1: Select Target Image ---")
    for i, file in enumerate(image_files):
        print(f"  {i + 1}. {file}")
    
    while True:
        try:
            sel = int(input(f"\nSelect target image (1-{len(image_files)}): ")) - 1
            if 0 <= sel < len(image_files):
                target_file = image_files[sel]
                break
        except (ValueError, KeyboardInterrupt):
            print("\n❌ Cancelled")
            sys.exit(0)

    tile_files = [f for i, f in enumerate(image_files) if i != sel]
    
    # Analyze target image
    analysis = analyze_target_image(target_file)
    
    print("\n--- STEP 2: Configure Settings ---")
    use_suggested = input("\nUse recommended settings? (y/n) [y]: ").lower()
    
    if use_suggested in ['', 'y', 'yes']:
        tiles_across = analysis['suggested_tiles']
        tile_res = analysis['suggested_res']
        print(f"✓ Using: {tiles_across} tiles × {tile_res}px resolution")
    else:
        try:
            tiles_across = int(input(f"Tiles across (rec: {analysis['suggested_tiles']}): "))
            tile_res = int(input(f"Tile resolution (rec: {analysis['suggested_res']}): "))
        except ValueError:
            print("❌ Invalid input. Using recommended settings.")
            tiles_across = analysis['suggested_tiles']
            tile_res = analysis['suggested_res']
    
    # Memory check
    final_width = tiles_across * tile_res
    tiles_down = int(tiles_across / analysis['aspect_ratio'])
    final_height = tiles_down * tile_res
    estimated_mb = (final_width * final_height * 3) / (1024 * 1024)
    
    if estimated_mb > 500:
        print(f"\n⚠️  Large output: ~{estimated_mb:.0f}MB in memory")
        if input("Continue? (y/n): ").lower() != 'y':
            sys.exit(0)
    
    # Generate mosaic
    mosaic, final_w, final_h = generate_mosaic(target_file, tile_files, tiles_across, tile_res)
    
    # Save output
    print("💾 Saving mosaic...")
    output_name = f"mosaic_{tiles_across}x{tile_res}px.jpg"
    mosaic.save(output_name, quality=92, optimize=True)
    
    size_mb = os.path.getsize(output_name) / (1024 * 1024)
    print(f"✓ Saved: {output_name} ({size_mb:.1f}MB)")
    
    # Video generation
    print("\n--- STEP 3: Video Output ---")
    make_vid = input("Generate zoom-out reveal video? (y/n) [y]: ").lower()
    if make_vid in ['', 'y', 'yes']:
        generate_zoom_video(output_name, analysis)
    
    print("\n" + "=" * 50)
    print("✅ ALL DONE!")
    print("=" * 50)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(0)
