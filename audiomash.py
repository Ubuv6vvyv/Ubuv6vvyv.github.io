import os, glob, random, gc, argparse, tempfile, time
import numpy as np
from pydub import AudioSegment
from pydub.effects import normalize
from pydub.silence import detect_nonsilent

# ==============================================================================
#                              CONFIGURATION
# ==============================================================================
TARGET_DURATION_MS    = int(2.5 * 60 * 1000)
CROSSFADE_MS          = 2000
LOG_FILE              = "mashup_workings.txt"
PLAY_DURATION_MS      = 30000
MIN_CHUNK_MS          = 15000
SEARCH_WINDOW_MS      = 120000
TAPE_STOP_DURATION_MS = 2000
TAPE_STOP_END_SPEED   = 0.25
MAX_CUT_MEMORY        = 12
MAX_CONSECUTIVE_SKIPS = 3

SPEED_OPTIONS_STANDARD = [0.93, 0.97, 1.0, 1.03, 1.07]
SPEED_OPTIONS_DYNAMIC  = [0.95, 0.89, 0.85, 0.91, 1.0, 1.10, 1.20, 1.35, 1.50]
WARP_SPLIT_SPEED_PAIRS = [
    (1.40, 0.90), (1.30, 0.95), (0.90, 1.40), (1.50, 0.90), (0.90, 1.25),
]
VALLEY_RADIUS_MS = 8000
MASHUP_PADDING_TRIM_MS = 40  # Trim FFmpeg resampler padding in mashup mode (mirrors DJ mode)

# ── DJ EDIT MODE CONFIG ────────────────────────────────────────────────────────
DJ_BLOCK_DURATION_MS = 20000           # Full warp wave cycle happens exactly every 30 seconds
DJ_STREAM_STEP_MS    = 2000            # Pure 1-second hard blocks for seamless rendering
DJ_PADDING_TRIM_MS   = 40              # Trims 30ms of edge data to discard FFmpeg resampler gaps
DJ_CHORUS_CHANCE     = 0.90            # 30% chance to overlay close vocal doubling harmonies
# ==============================================================================

_log_fh = None

def log_step(msg):
    print(msg)
    if _log_fh:
        _log_fh.write(msg + "\n")
        _log_fh.flush()

def format_time(ms):
    return f"{int(ms/60000)}:{int(ms/1000)%60:02d}"

def get_mp3_files():
    files = glob.glob("*.mp3")
    files.sort(key=os.path.getmtime, reverse=True)
    return files

# ── BPM UTILITIES ─────────────────────────────────────────────────────────────

def snap_to_beat(ms, bpm, anchor_ms=0):
    """Snap a position (ms) to the nearest beat boundary given bpm and anchor."""
    if not bpm or bpm <= 0: return ms
    beat_ms = 60000.0 / bpm
    offset  = ms - anchor_ms
    return int(anchor_ms + round(offset / beat_ms) * beat_ms)

def bars_to_ms(bars, bpm, beats_per_bar=4):
    """Convert bar count to ms at given BPM."""
    if not bpm or bpm <= 0: return None
    return int((60000.0 / bpm) * beats_per_bar * bars)

def prompt_bpm_for_files(selected_files):
    """Interactively ask for optional BPM per file. Returns {filepath: float_or_None}."""
    song_bpms = {}
    print("\n--- Optional BPM Lock (Enter to skip each) ---")
    print("  Set BPM to snap cuts to musical bar boundaries.")
    for f in selected_files:
        raw = input(f"  BPM for '{os.path.basename(f)}' [40-300, Enter=skip]: ").strip()
        if raw:
            try:
                b = float(raw)
                if 40.0 <= b <= 300.0:
                    song_bpms[f] = b
                    beat_ms = 60000.0 / b
                    print(f"    ✓ {b:.1f} BPM | beat={beat_ms:.0f}ms | bar={beat_ms*4:.0f}ms")
                else:
                    print(f"    ✗ {b} out of range 40-300 — skipping")
            except ValueError:
                print("    ✗ Invalid — skipping")
        else:
            print(f"    – Skipped (energy-based cuts)")
    return song_bpms

def get_audio_duration(filepath):
    try:
        from mutagen.mp3 import MP3
        return int(MP3(filepath).info.length * 1000)
    except Exception:
        audio = AudioSegment.from_mp3(filepath)
        dur = len(audio); del audio; gc.collect(); return dur

# ── LOADING ────────────────────────────────────────────────────────────────────

def load_window(filepath, start_ms, end_ms):
    log_step(f"  [load] {os.path.basename(filepath)}  {format_time(start_ms)}–{format_time(end_ms)}")
    audio = AudioSegment.from_mp3(filepath)
    end_ms = min(end_ms, len(audio))
    start_ms = min(start_ms, end_ms)
    raw_window = audio[start_ms:end_ms]
    del audio; gc.collect()
    if len(raw_window) == 0:
        return raw_window, True
    # FIX 3: Looser silence detection — was (dBFS-14 / 300ms), now (-20dBFS / 500ms)
    # Avoids mis-detecting quiet musical sections as silence, reducing false gaps.
    ns = detect_nonsilent(raw_window, min_silence_len=500, silence_thresh=-20)
    if ns:
        trimmed = raw_window[ns[0][0]:ns[-1][1]]
        if len(trimmed) >= MIN_CHUNK_MS:
            return normalize(trimmed), False
        log_step(f"  [load] Trim gave {len(trimmed)}ms < MIN — using raw.")
        return normalize(raw_window), True
    log_step("  [load] No nonsilent regions — using raw.")
    return normalize(raw_window), True

def load_entire_file(filepath):
    log_step(f"  [load] FORCE full file: {os.path.basename(filepath)}")
    return normalize(AudioSegment.from_mp3(filepath))

# ── ENERGY ANALYSIS ────────────────────────────────────────────────────────────

def energy_profile(audio, start_ms=0, end_ms=None, window_ms=500):
    if end_ms is None: end_ms = len(audio)
    end_ms = min(end_ms, len(audio))
    if end_ms <= start_ms: return [(start_ms, 0.0)]
    section = audio[start_ms:end_ms]
    mono    = section.set_channels(1)
    samples = np.frombuffer(mono.raw_data, dtype=np.int16).astype(np.float32)
    del mono, section
    if len(samples) == 0: return [(start_ms, 0.0)]
    sr  = audio.frame_rate
    spw = max(1, int(window_ms / 1000.0 * sr))
    return [(start_ms + int(i/sr*1000),
             float(np.sqrt(np.mean(samples[i:i+spw]**2))) if len(samples[i:i+spw]) else 0.0)
            for i in range(0, len(samples), spw)]

def find_valley(audio, target_ms, radius_ms, forward_only=False):
    lo = target_ms if forward_only else max(0, target_ms - radius_ms)
    hi = min(len(audio), target_ms + radius_ms)
    if hi <= lo: return target_ms
    profile = energy_profile(audio, lo, hi, window_ms=200)
    if not profile: return target_ms
    return min(profile, key=lambda x: x[1])[0]

def find_peak(audio, start_ms, end_ms):
    end_ms = min(end_ms, len(audio))
    if end_ms <= start_ms: return start_ms
    macro = energy_profile(audio, start_ms, end_ms, window_ms=500)
    if not macro: return start_ms
    best = max(macro, key=lambda x: x[1])[0]
    s0 = max(start_ms, best - 400); s1 = min(end_ms, best + 600)
    micro = energy_profile(audio, s0, s1, window_ms=40)
    return max(micro, key=lambda x: x[1])[0] if micro else best

# ── ENTRY / EXIT (mashup modes) ───────────────────────────────────────────────

def find_entry(audio, search_start, search_end, used_cuts, force=False):
    search_end = min(search_end, len(audio))
    if search_end - search_start < 1000: return search_start
    if not force:
        macro = energy_profile(audio, search_start, search_end, window_ms=500)
        macro_sorted = sorted(macro, key=lambda x: x[1], reverse=True)
        best_peak = next((t for t, _ in macro_sorted
                          if not any(abs(t - u) < 15000 for u in used_cuts)), None)
        if best_peak is not None:
            s0 = max(search_start, best_peak - 400); s1 = min(search_end, best_peak + 600)
            micro = energy_profile(audio, s0, s1, window_ms=40)
            if micro: best_peak = max(micro, key=lambda x: x[1])[0]
            valley_lo = max(search_start, best_peak - 6000)
            if valley_lo < best_peak:
                prof = energy_profile(audio, valley_lo, best_peak, window_ms=150)
                if prof:
                    v = min(prof, key=lambda x: x[1])[0]
                    log_step(f"  [entry T1] valley={format_time(search_start+v)}")
                    return v
            return best_peak
    log_step("  [entry T2] ignoring cut memory")
    macro = energy_profile(audio, search_start, search_end, window_ms=500)
    if macro: return max(macro, key=lambda x: x[1])[0]
    log_step("  [entry T3] random")
    return random.randint(search_start, max(search_start, search_end - MIN_CHUNK_MS))

def find_exit(audio, rel_entry, target_exit):
    audio_len = len(audio)
    min_exit  = rel_entry + MIN_CHUNK_MS
    if target_exit < audio_len:
        lo = target_exit; hi = min(audio_len, target_exit + VALLEY_RADIUS_MS)
        if hi > lo:
            profile = energy_profile(audio, lo, hi, window_ms=200)
            if profile:
                c = min(profile, key=lambda x: x[1])[0]
                if c >= min_exit:
                    log_step(f"  [exit T1] {format_time(c)}"); return c
    if audio_len > min_exit + 1000:
        profile = energy_profile(audio, min_exit, audio_len, window_ms=300)
        if profile:
            c = min(profile, key=lambda x: x[1])[0]
            if c >= min_exit:
                log_step(f"  [exit T2] {format_time(c)}"); return c
    c = min(target_exit, audio_len)
    if c >= min_exit:
        log_step(f"  [exit T3] {format_time(c)}"); return c
    log_step(f"  [exit T4] forced min {format_time(min_exit)}")
    return min(min_exit, audio_len)

# ── FX PRIMITIVES ──────────────────────────────────────────────────────────────

def change_speed(audio, speed):
    if speed == 1.0 or len(audio) < 10: 
        return audio
    new_rate = int(audio.frame_rate * speed)
    if new_rate <= 1000: 
        return audio
    return audio._spawn(audio.raw_data, overrides={'frame_rate': new_rate}).set_frame_rate(audio.frame_rate)

def apply_chorus_doubling(audio):
    """Generates thick background vocalist doubling via a short Haas spatial delay."""
    if len(audio) < 40:
        return audio
    delay_ms = random.randint(18, 32)
    silence = AudioSegment.silent(duration=delay_ms, frame_rate=audio.frame_rate)
    
    # Attenuate background echo by -5dB to prevent clipping and keep vocals solid
    delayed_layer = (silence + audio).apply_gain(-5.0)
    return audio.overlay(delayed_layer)[:len(audio)]

def tape_stop_effect(audio, end_speed=TAPE_STOP_END_SPEED):
    dur = min(TAPE_STOP_DURATION_MS, len(audio) // 3)
    if dur < 200: return audio
    body  = audio[:-dur]
    tail  = audio[-dur:]
    n     = max(1, dur // 80)
    slices = [s for s in [change_speed(tail[i*80:(i+1)*80],
              1.0 - (1.0-end_speed)*(i/n)) for i in range(n)] if len(s) > 0]
    return body + (sum(slices[1:], slices[0]) if slices else AudioSegment.empty())

def apply_warp(chunk):
    if len(chunk) < MIN_CHUNK_MS * 2:
        spd = random.choice([s for s in SPEED_OPTIONS_DYNAMIC if s != 1.0])
        return change_speed(chunk, spd)
    pair     = random.choice(WARP_SPLIT_SPEED_PAIRS)
    mid      = len(chunk) // 2
    split_ms = find_valley(chunk, mid, radius_ms=3000)
    split_ms = max(MIN_CHUNK_MS, min(split_ms, len(chunk) - MIN_CHUNK_MS))
    first    = change_speed(chunk[:split_ms], pair[0])
    second   = change_speed(chunk[split_ms:], pair[1])
    if len(first) < 500 or len(second) < 500:
        return change_speed(chunk, pair[0])
    fade = max(0, min(500, len(first)-1, len(second)-1))
    log_step(f"  [warp] {pair[0]}x→{pair[1]}x at {format_time(split_ms)}")
    return first.append(second, crossfade=fade)

def eq_crossfade(seg1, seg2, fade_ms=CROSSFADE_MS):
    # FIX 2: Cap fade to min(len-100) buffer on both sides; hard cut if < 50ms.
    # Prevents zero-length audio and content loss when chunks shrink after speed FX.
    max_fade = min(len(seg1) - 100, len(seg2) - 100, fade_ms)
    if max_fade < 50:
        log_step("  [xfade] Chunks too short for fade — hard cut")
        return seg1 + seg2
    fade_ms = max(0, max_fade)
    body1 = seg1[:-fade_ms]; tail1 = seg1[-fade_ms:].high_pass_filter(350)
    head2 = seg2[:fade_ms].low_pass_filter(550); body2 = seg2[fade_ms:]
    return (body1 + tail1).append(head2 + body2, crossfade=fade_ms)

# ── DJ EDIT MODE ───────────────────────────────────────────────────────────────

def build_dj_edit(filepath, intensity=2):
    """
    Strict Gapless Hard Cut DJ Engine.
    Oversamples the continuous timeline and shaves off FFmpeg padding zones.
    Enforces a locked speed window boundaries of 0.90x to 1.20x.
    """
    log_step(f"\n--- SEAMLESS HARD-CUT DJ ENGINE | {os.path.basename(filepath)} | intensity {intensity} ---")

    audio = load_entire_file(filepath)
    dur   = len(audio)
    log_step(f"  Track Duration: {format_time(dur)}")

    segments      = []
    cursor        = 0.0
    block_time_out = 0
    target_speed  = 1.0
    block_count   = 0

    out_step = DJ_STREAM_STEP_MS
    trim_ms  = DJ_PADDING_TRIM_MS

    while cursor < dur - (out_step * 1.5):
        # Every 30 seconds of output timeline playtime, flip the glide path direction
        if block_time_out >= DJ_BLOCK_DURATION_MS or block_time_out == 0:
            block_time_out = 0
            block_count += 1
            is_warp_up = random.choice([True, False])
            
            # Speed limits locked tightly inside the requested musical 0.90x - 1.20x zone
            if is_warp_up:
                if intensity == 1:    target_speed = random.uniform(1.02, 1.05)
                elif intensity == 2:  target_speed = random.uniform(1.05, 1.12)
                else:                 target_speed = random.uniform(0.95, 1.05)
                direction = "GLIDE UP"
            else:
                if intensity == 1:    target_speed = random.uniform(0.96, 0.98)
                elif intensity == 2:  target_speed = random.uniform(0.93, 0.96)
                else:                 target_speed = random.uniform(0.95, 0.80)
                direction = "GLIDE DOWN"
            log_step(f"  [Block #{block_count}] Position: {format_time(cursor)} | Range Balanced {direction} -> peak {target_speed:.2f}x")

        # Dynamic progression curve calculations
        if block_time_out < (DJ_BLOCK_DURATION_MS // 2):
            progress = block_time_out / (DJ_BLOCK_DURATION_MS // 2)
            current_speed = 1.0 + (target_speed - 1.0) * progress
        else:
            progress = (block_time_out - (DJ_BLOCK_DURATION_MS // 2)) / (DJ_BLOCK_DURATION_MS // 2)
            current_speed = target_speed + (1.0 - target_speed) * progress

        # Fetch an expanded oversampled window to absorb resampler padding
        total_out_needed = out_step + (2 * trim_ms)
        input_needed     = total_out_needed * current_speed
        
        start_in = int(cursor)
        end_in   = int(cursor + input_needed)
        
        if end_in > dur:
            break

        chunk = audio[start_in:end_in]
        
        # Modify pitch/speed via FFmpeg
        warped_chunk = change_speed(chunk, current_speed)
        
        # Discard the padding blocks from both ends to extract pure audio data
        cleaned_chunk = warped_chunk[trim_ms : trim_ms + out_step]

        if len(cleaned_chunk) > 0:
            # Drop in multi-vocalist double layer harmonies randomly
            if random.random() < DJ_CHORUS_CHANCE:
                cleaned_chunk = apply_chorus_doubling(cleaned_chunk)
            
            # Force standard truncation lengths to block any sample truncation drift
            segments.append(cleaned_chunk[:out_step])

        # Step forward precisely past the data consumed for the clean portion
        cursor        += (out_step * current_speed)
        block_time_out += out_step

    log_step(f"\n  Assembling {len(segments)} blocks with strict hard cuts...")
    del audio; gc.collect()

    if not segments:
        return AudioSegment.silent(1000)

    # Combine blocks using standard array additions (Zero crossfade, pure seamless hard-join)
    result = segments[0]
    for i, seg in enumerate(segments[1:], 1):
        result = result + seg
        if i % 20 == 0: gc.collect()

    return result

# ── TEMP / ASSEMBLY (mashup modes) ────────────────────────────────────────────

def write_temp(chunk, tmp_dir, idx):
    path = os.path.join(tmp_dir, f"chunk_{idx:04d}.wav")
    chunk.export(path, format="wav")
    del chunk; gc.collect()
    return path

def assemble(chunk_paths, dynamic):
    log_step(f"\n[*] Assembling {len(chunk_paths)} chunks...")
    if not chunk_paths: return AudioSegment.empty()
    result = AudioSegment.from_wav(chunk_paths[0])
    for i, path in enumerate(chunk_paths[1:], 1):
        log_step(f"  > Join {i+1}/{len(chunk_paths)}")
        nxt = AudioSegment.from_wav(path)
        if len(nxt) == 0: continue
        if dynamic:
            t = random.choices(["crossfade","tape_stop","hard_cut"], weights=[50,30,20])[0]
        else:
            t = "crossfade"
        if t == "tape_stop" and len(result) > 5000:
            log_step("  >> Tape stop"); result = tape_stop_effect(result) + nxt
        elif t == "hard_cut":
            log_step("  >> Hard cut"); result = result + nxt
        else:
            log_step("  >> EQ crossfade"); result = eq_crossfade(result, nxt)
        del nxt; gc.collect()
    return result

# ── MASHUP CORE LOOP ───────────────────────────────────────────────────────────

def build_mashup(audio_files, dynamic=False, song_bpms=None):
    log_step(f"\n--- {'DYNAMIC' if dynamic else 'STANDARD'} MASHUP | {len(audio_files)} file(s) ---")
    song_bpms   = song_bpms or {}
    single      = len(audio_files) == 1
    durations   = {f: get_audio_duration(f) for f in audio_files}
    bookmarks   = {f: 0 for f in audio_files}
    cut_memory  = {f: [] for f in audio_files}
    skip_counts = {f: 0 for f in audio_files}
    chunk_paths = []; total_ms = 0; file_idx = 0; stall_guard = 0
    tmp_dir = tempfile.mkdtemp(prefix="audiomash_")
    log_step(f"  Temp: {tmp_dir}")
    try:
        while total_ms < TARGET_DURATION_MS:
            stall_guard += 1
            if stall_guard > 60:
                log_step("[FATAL] 60 iterations no progress — aborting."); break
            filepath = audio_files[file_idx]
            dur      = durations[filepath]
            bm       = bookmarks[filepath]
            force    = skip_counts[filepath] >= MAX_CONSECUTIVE_SKIPS
            if force: log_step(f"  [{os.path.basename(filepath)}] Skip limit — forcing.")
            if bm + MIN_CHUNK_MS >= dur:
                if single:
                    bm = bookmarks[filepath] = random.randint(0, min(30000, dur//4))
                    log_step(f"  [single] Wrap to {format_time(bm)}")
                else:
                    bm = bookmarks[filepath] = 0
                    log_step(f"  > Bookmark reset {os.path.basename(filepath)}")
            search_start = bm
            search_end   = min(bm + SEARCH_WINDOW_MS, dur)
            window, _ = load_window(filepath, search_start, search_end)
            if len(window) < MIN_CHUNK_MS:
                if force or single:
                    log_step(f"  Window tiny — loading full file.")
                    window = load_entire_file(filepath)
                    search_start = 0; search_end = len(window)
                if len(window) < MIN_CHUNK_MS:
                    log_step(f"  File too short — skipping.")
                    file_idx = (file_idx + 1) % len(audio_files); continue
            rel_used  = [max(0, u - search_start) for u in cut_memory[filepath]]
            rel_entry = find_entry(window, 0, len(window), rel_used, force=force)

            # ── BPM-AWARE ENTRY & EXIT ─────────────────────────────────────────
            bpm = song_bpms.get(filepath)
            if bpm:
                beat_ms = 60000.0 / bpm
                bar_ms  = beat_ms * 4
                # Snap entry to nearest beat (anchored from absolute file position)
                abs_raw  = search_start + rel_entry
                abs_snap = snap_to_beat(abs_raw, bpm)
                rel_snap = abs_snap - search_start
                rel_entry = max(0, min(rel_snap, len(window) - MIN_CHUNK_MS))
                # Exit = nearest bar multiple to PLAY_DURATION_MS
                target_bars = max(2, round(PLAY_DURATION_MS / bar_ms))
                bpm_exit    = rel_entry + int(target_bars * bar_ms)
                if rel_entry + MIN_CHUNK_MS <= bpm_exit <= len(window):
                    rel_exit = bpm_exit
                    log_step(f"  [BPM {bpm:.1f}] entry snapped, {target_bars} bars → {format_time(int(target_bars*bar_ms))}")
                else:
                    rel_exit = find_exit(window, rel_entry, rel_entry + PLAY_DURATION_MS)
                    log_step(f"  [BPM {bpm:.1f}] bar exit OOB — energy fallback")
            else:
                rel_exit = find_exit(window, rel_entry, rel_entry + PLAY_DURATION_MS)
            # ──────────────────────────────────────────────────────────────────

            rel_exit  = min(rel_exit, len(window))
            chunk_len = rel_exit - rel_entry
            if chunk_len < MIN_CHUNK_MS:
                if force or single:
                    rel_exit  = min(rel_entry + MIN_CHUNK_MS, len(window))
                    chunk_len = rel_exit - rel_entry
                    log_step(f"  [forced] short chunk {chunk_len}ms")
                else:
                    log_step(f"  [skip] {chunk_len}ms too short")
                    skip_counts[filepath] += 1
                    bookmarks[filepath] = search_end
                    file_idx = (file_idx + 1) % len(audio_files)
                    del window; gc.collect(); continue
            skip_counts[filepath] = 0; stall_guard = 0
            chunk = window[rel_entry:rel_exit]; del window; gc.collect()
            abs_entry = search_start + rel_entry; abs_exit = search_start + rel_exit
            log_step(f"  > [{os.path.basename(filepath)}] {format_time(abs_entry)}→{format_time(abs_exit)} ({format_time(chunk_len)})")
            bookmarks[filepath] = abs_exit
            if single: bookmarks[filepath] = abs_entry + (PLAY_DURATION_MS // 2)
            cut_memory[filepath].append(abs_entry)
            if len(cut_memory[filepath]) > MAX_CUT_MEMORY: cut_memory[filepath].pop(0)
            # ── FX + FFmpeg PADDING TRIM (FIX 1) ──────────────────────────────
            # After change_speed/apply_warp, FFmpeg resampler leaves 20-40ms of
            # silence at chunk edges. Trim both ends to prevent gap accumulation.
            trim = MASHUP_PADDING_TRIM_MS
            if dynamic:
                fx = random.choices(["none","speed","warp"], weights=[25,45,30])[0]
                if fx == "speed":
                    spd = random.choice(SPEED_OPTIONS_DYNAMIC)
                    if spd != 1.0:
                        log_step(f"  > Speed {spd}x")
                        chunk = change_speed(chunk, spd)
                        if len(chunk) > trim * 3:
                            chunk = chunk[trim:-trim]
                elif fx == "warp":
                    chunk = apply_warp(chunk)
                    if len(chunk) > trim * 3:
                        chunk = chunk[trim:-trim]
            else:
                spd = random.choice(SPEED_OPTIONS_STANDARD)
                if spd != 1.0:
                    chunk = change_speed(chunk, spd)
                    if len(chunk) > trim * 3:
                        chunk = chunk[trim:-trim]
            # ──────────────────────────────────────────────────────────────────
            if len(chunk) < 1000:
                log_step("  [fx] Post-FX too short — skipping.")
                file_idx = (file_idx + 1) % len(audio_files); continue
            cpath = write_temp(chunk, tmp_dir, len(chunk_paths))
            chunk_paths.append(cpath)
            total_ms += chunk_len
            log_step(f"  > Total: {format_time(total_ms)} / {format_time(TARGET_DURATION_MS)}\n")
            file_idx = (file_idx + 1) % len(audio_files)
        if not chunk_paths:
            log_step("[ERROR] No chunks — empty output.")
            return AudioSegment.silent(1000)
        return assemble(chunk_paths, dynamic)
    finally:
        for p in chunk_paths:
            try: os.remove(p)
            except: pass
        try: os.rmdir(tmp_dir)
        except: pass

# ── MAIN ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AudioMash — MP3 mashup + DJ edit tool")
    parser.add_argument("--mode",      choices=["1","2","3"], help="1=Standard 2=Dynamic 3=DJ Edit")
    parser.add_argument("--files",     help="1-based indices e.g. 1,3,4")
    parser.add_argument("--output",    help="Output filename (default: timestamped)")
    parser.add_argument("--intensity", choices=["1","2","3"], default="2",
                        help="DJ Edit intensity: 1=subtle 2=medium 3=heavy (mode 3 only)")
    args = parser.parse_args()

    global _log_fh
    _log_fh = open(LOG_FILE, "w", encoding="utf-8")
    _log_fh.write("=== AUTOMASH INITIALIZED ===\n")

    files = get_mp3_files()
    if not files:
        print("No MP3 files found."); return

    print("\n--- MP3 Files (newest first) ---")
    for i, f in enumerate(files): print(f"  [{i+1}] {f}")
    print("--------------------------------")

    raw = args.files or input("File numbers (e.g. 1,3): ")
    try:
        indices  = [int(x.strip())-1 for x in raw.split(",")]
        selected = [files[i] for i in indices if 0 <= i < len(files)]
    except ValueError:
        print("Invalid input."); return
    if not selected: print("No valid files."); return
    for f in selected:
        if not os.path.isfile(f): print(f"Not found: {f}"); return

    log_step(f"Selected ({len(selected)}): {', '.join(os.path.basename(f) for f in selected)}")

    if not args.mode:
        print("\n  [1] Standard  — seamless 30s cuts, EQ crossfades, light pitch")
        print("  [2] Dynamic   — tape stops, warp FX, wide pitch range")
        print("  [3] DJ Edit   — single song, linear playback + automated FX drops")
        mode = input("Mode (1/2/3): ").strip()
    else:
        mode = args.mode

    if mode == "3":
        if len(selected) > 1:
            print("DJ Edit mode works on one song. Using first selected file.")
        filepath  = selected[0]
        intensity = int(args.intensity)
        if not args.intensity or not args.mode:
            print("\n  [1] Subtle  — mild pitch warps")
            print("  [2] Medium  — moderate pitch warps")
            print("  [3] Heavy   — deep pitch warps")
            intensity = int(input("Intensity (1/2/3): ").strip() or "2")
        t0        = time.time()
        final_mix = build_dj_edit(filepath, intensity=intensity)
    else:
        # Optional per-file BPM lock for beat-aligned cuts (modes 1 & 2)
        song_bpms = prompt_bpm_for_files(selected)
        dynamic   = (mode == "2")
        t0        = time.time()
        final_mix = build_mashup(selected, dynamic, song_bpms=song_bpms)

    final_mix = final_mix.fade_out(4000)
    out = args.output or f"mashup_{int(time.time())}.mp3"
    log_step(f"\n[*] Exporting → {out}")
    final_mix.export(out, format="mp3", bitrate="192k")
    log_step(f"[SUCCESS] {out}  ({time.time()-t0:.0f}s)")
    _log_fh.close()

if __name__ == "__main__":
    main()