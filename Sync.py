import os
import subprocess
import glob
import random
BPM = 155
BEATS_PER_CUT = 4   
MAX_DURATION = 180  
OUTPUT_FILE = "shuffle_sync.mp4"
SHUFFLE_SEGMENTS = True
WIDTH = 1080
HEIGHT = 1920
ENCODING_PRESET = "superfast" 
CRF_VALUE = "28" 
def get_video_duration(filename):
    try:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration", "-of",
            "default=noprint_wrappers=1:nokey=1", filename
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return float(result.stdout)
    except:
        return 0.0
seconds_per_cut = (60 / BPM) * BEATS_PER_CUT
max_chunks = int(MAX_DURATION / seconds_per_cut)
extensions = ['*.mp4', '*.MP4', '*.mov', '*.MOV', '*.jpg', '*.png']
files = []
for ext in extensions:
    files.extend(glob.glob(ext))
files.sort()
if not files:
    print("No files found!")
    exit()
print(f"BPM: {BPM} | Cut Length: {seconds_per_cut:.3f}s")
print(f"Shuffle Mode: {'ON' if SHUFFLE_SEGMENTS else 'OFF'}")
segment_pool = []
scaling_filter = f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},setsar=1"
print("Inventorying available segments...")
for f in files:
    if f.lower().endswith(('.jpg', '.png', '.jpeg')):
        photo_slots = int(max_chunks * 0.05) 
        if photo_slots < 1: photo_slots = 1
        for _ in range(photo_slots):
            segment_pool.append({
                "file": f,
                "start": 0.0,
                "is_video": False
            })
    else:
        dur = get_video_duration(f)
        curr_time = 0.0
        while curr_time + seconds_per_cut <= dur:
            segment_pool.append({
                "file": f,
                "start": curr_time,
                "is_video": True
            })
            curr_time += seconds_per_cut
final_playlist = []
last_source = None
if SHUFFLE_SEGMENTS:
    random.shuffle(segment_pool)
    while len(final_playlist) < max_chunks and len(segment_pool) > 0:
        found_match = False
        for i, seg in enumerate(segment_pool):
            if seg["file"] != last_source:
                final_playlist.append(seg)
                last_source = seg["file"]
                segment_pool.pop(i) 
                found_match = True
                break
        if not found_match:
            print("Only duplicates remain in pool. Stopping early to prevent repetition.")
            break
else:
    segment_pool.sort(key=lambda x: (x['file'], x['start']))
    final_playlist = segment_pool[:max_chunks] 
print(f"Generated {len(final_playlist)} unique cuts.")
concat_list = []
generated_chunks = 0
for i, clip in enumerate(final_playlist):
    chunk_name = f"chunk_{i:03d}.mp4"
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    if clip["is_video"]:
        cmd += [
            "-ss", str(clip["start"]),
            "-i", clip["file"],
            "-t", str(seconds_per_cut),
            "-vf", scaling_filter,
            "-c:v", "libx264", 
            "-preset", ENCODING_PRESET, 
            "-crf", CRF_VALUE,
            "-an",
            chunk_name
        ]
    else:
        zoom_filter = f"{scaling_filter},zoompan=z='min(zoom+0.0015,1.5)':d={int(seconds_per_cut*30)}:s={WIDTH}x{HEIGHT}"
        cmd += [
            "-loop", "1",
            "-i", clip["file"],
            "-t", str(seconds_per_cut),
            "-vf", zoom_filter,
            "-c:v", "libx264", 
            "-preset", ENCODING_PRESET, 
            "-crf", CRF_VALUE,
            "-pix_fmt", "yuv420p",
            "-an",
            chunk_name
        ]
    print(f"[{i+1}/{len(final_playlist)}] Processing {clip['file']} @ {clip['start']:.2f}s")
    subprocess.run(cmd)
    concat_list.append(f"file '{chunk_name}'")
if concat_list:
    print(f"Stitching clips...")
    with open("mylist.txt", "w") as f:
        for item in concat_list:
            f.write(f"{item}\n")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", "mylist.txt", "-c", "copy", OUTPUT_FILE
    ])
    for chunk in concat_list:
        fname = chunk.split("'")[1]
        if os.path.exists(fname): os.remove(fname)
    os.remove("mylist.txt")
    print(f"Done! Saved as {OUTPUT_FILE}")
else:
    print("Could not generate any clips.")
