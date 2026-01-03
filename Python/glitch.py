import os
import sys
import numpy as np
from PIL import Image, ImageOps, ImageFilter

# --- HELPER FUNCTIONS (The Math) ---

def numpy_sort(arr, axis, key_arr):
    """
    The engine room. Sorts the RGB array 'arr' along 'axis' 
    based on the values in 'key_arr'.
    Uses np.take_along_axis for lightning-fast sorting.
    """
    # Get the indices that would sort the key array
    idx = np.argsort(key_arr, axis=axis)
    
    # Expand indices to match RGB shape (e.g., (H,W) becomes (H,W,1) for broadcasting)
    idx_expanded = np.expand_dims(idx, axis=2)
    
    # Apply those indices to the original RGB data
    sorted_arr = np.take_along_axis(arr, idx_expanded, axis=axis)
    return sorted_arr

# --- THE VARIATIONS ---

def sort_classic_melt(img):
    """Variation 1: The Classic Horizontal Melt. Sorts rows by sum of RGB (brightness)."""
    arr = np.array(img.convert("RGB"))
    
    # Key: Sum of RGB values per pixel (proxy for brightness)
    brightness_key = np.sum(arr, axis=2)
    
    # Sort axis 1 (rows)
    sorted_arr = numpy_sort(arr, 1, brightness_key)
    return Image.fromarray(sorted_arr)

def sort_vertical_drip(img):
    """Variation 2: Vertical Drip. Same as classic, but sorts columns."""
    arr = np.array(img.convert("RGB"))
    brightness_key = np.sum(arr, axis=2)
    
    # Sort axis 0 (columns)
    sorted_arr = numpy_sort(arr, 0, brightness_key)
    return Image.fromarray(sorted_arr)

def sort_rainbow_slick(img):
    """Variation 3: Hue Sort. Sorts based on color value, not brightness."""
    # Convert to HSV to get Hue easily
    hsv = np.array(img.convert("HSV"))
    rgb = np.array(img.convert("RGB"))
    
    # Key: The Hue channel (hsv[:,:,0])
    hue_key = hsv[:,:,0]
    
    # Sort horizontally based on hue
    sorted_arr = numpy_sort(rgb, 1, hue_key)
    return Image.fromarray(sorted_arr)

def sort_red_channel_tear(img):
    """Variation 4: Channel Split. Sorts based only on how much RED is in a pixel."""
    arr = np.array(img.convert("RGB"))
    
    # Key: The Red channel only
    red_key = arr[:,:,0]
    
    # Sort horizontally. This separates cyan (low red) from orange/red (high red)
    sorted_arr = numpy_sort(arr, 1, red_key)
    return Image.fromarray(sorted_arr)

def sort_highlight_fracture(img, threshold=180):
    """
    Variation 5: Threshold Sort.
    Only sorts rows that are generally bright. Leaves dark areas intact.
    This requires slower iterative processing but gives more control.
    """
    arr = np.array(img.convert("RGB")).copy() # Copy to avoid modifying original
    h, w, c = arr.shape
    
    # Iterate over rows
    for i in range(h):
        row = arr[i]
        # Calculate average brightness of the row
        avg_brightness = np.mean(row)
        
        # THE HACK: Only sort if row exceeds threshold
        if avg_brightness > threshold:
            # Calculate brightness key for just this row
            row_key = np.sum(row, axis=1)
            # Get sorted indices
            sorted_idx = np.argsort(row_key)
            # Apply sort to row
            arr[i] = row[sorted_idx]
            
    return Image.fromarray(arr)

def sort_edge_glitch(img):
    """
    Variation 6: Edge Mask Sort.
    Finds edges, and only sorts pixels *on* the edges.
    Creates a "shattered glass" look around subjects.
    """
    # 1. Find Edges to create a mask
    edges = img.convert("L").filter(ImageFilter.FIND_EDGES)
    # Threshold edges to binary black/white mask
    mask = edges.point(lambda p: 255 if p > 50 else 0)
    mask_arr = np.array(mask)

    arr = np.array(img.convert("RGB")).copy()
    h, w, c = arr.shape
    
    # Iterative approach needed for masking
    for i in range(h):
        # Check if this row has significant edges
        if np.sum(mask_arr[i]) > 0:
            row = arr[i]
            row_mask = mask_arr[i]
            
            # Extract pixels that are on edges
            edge_pixels = row[row_mask == 255]
            
            if len(edge_pixels) > 1:
                # Sort them by brightness
                brightness_key = np.sum(edge_pixels, axis=1)
                sorted_idx = np.argsort(brightness_key)
                sorted_edge_pixels = edge_pixels[sorted_idx]
                
                # Put them back into the row using the mask
                row[row_mask == 255] = sorted_edge_pixels
                arr[i] = row

    return Image.fromarray(arr)

# --- MAIN CONTROLLER ---

def generate_sorter_gallery(image_path):
    print(f"\n--- Initializing Pixel Sort on: {image_path} ---")
    
    try:
        # exif_transpose fixes orientation issues with phone photos
        original_img = ImageOps.exif_transpose(Image.open(image_path))
        
        # Resize large images for speed (optional, but recommended for sorting)
        max_dim = 1500
        if max(original_img.size) > max_dim:
            original_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            print(f"Resized to {original_img.size} for processing speed.")
            
    except Exception as e:
        print(f"Error opening file: {e}")
        return

    # Folder setup
    filename_base = os.path.splitext(os.path.basename(image_path))[0]
    out_dir = os.path.join(os.getcwd(), f"{filename_base}_sorted")
    os.makedirs(out_dir, exist_ok=True)
    print(f"Output Folder: {out_dir}/")

    # The Variations Menu
    variations = [
        (sort_classic_melt, "01_ClassicMelt_H.jpg"),
        (sort_vertical_drip, "02_VerticalDrip_V.jpg"),
        (sort_rainbow_slick, "03_RainbowSlick_Hue.jpg"),
        (sort_red_channel_tear, "04_RedChannelTear.jpg"),
        (sort_highlight_fracture, "05_HighlightFracture.jpg"),
        (sort_edge_glitch, "06_EdgeGlitch.jpg"),
    ]

    # Save original for comparison
    original_img.save(os.path.join(out_dir, "00_Original.jpg"))

    for func, name in variations:
        print(f"Sorting: {name}...")
        try:
            res = func(original_img)
            res.save(os.path.join(out_dir, name), quality=95)
        except Exception as e:
            print(f"  Error on {name}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n--- Done. Check folder: {out_dir} ---")


if __name__ == "__main__":
    target = ""
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        cwd = os.getcwd()
        candidates = [f for f in os.listdir(cwd) if f.lower().endswith(('.jpg', '.jpeg', '.png')) and "_sorted" not in f]
        if candidates:
            print(f"Found files: {', '.join(candidates[:3])}...")
        
        target = input("Enter filename to sort: ").strip().replace("'", "").replace('"', "")
    
    if target and os.path.exists(target):
        generate_sorter_gallery(target)
    else:
        print("File not found.")
