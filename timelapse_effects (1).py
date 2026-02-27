import subprocess
import os

def print_menu(effects):
    print("\n" + "="*58)
    print("  NIGHT TRAFFIC TIMELAPSE EFFECTS")
    print("="*58)
    for i, (name, _, desc) in enumerate(effects, 1):
        print(f"  [{i:02d}] {name:<30} {desc}")
    print("  [00] Run ALL effects")
    print("="*58)

def get_selection(effects):
    while True:
        raw = input("\nEnter numbers separated by commas (e.g. 1,3,7): ").strip()
        if raw in ("0", "00"):
            return list(range(len(effects)))
        try:
            chosen = [int(x.strip()) - 1 for x in raw.split(",")]
            if all(0 <= c < len(effects) for c in chosen):
                return chosen
            print(f"  Enter numbers between 1 and {len(effects)}")
        except ValueError:
            print("  Invalid input.")

def run_effect(input_file, output_dir, base_name, name, flag, filter_string):
    output_file = os.path.join(output_dir, f"{base_name}_{name}.mp4")
    command = [
        "ffmpeg", "-y",
        "-i", input_file,
        flag, filter_string,
        "-c:v", "libx264",
        "-crf", "20",
        "-preset", "ultrafast",
        "-c:a", "copy",
        output_file
    ]
    print(f"\n---> Generating: {name}")
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"     ✓ Saved: {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"     ✗ FAILED\n     {e.stderr[-500:] if e.stderr else 'no stderr'}")

def generate_timelapse_effects(input_file, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(input_file))[0]

    effects = [

        # ── TRAILS ────────────────────────────────────────────────────────────

        # Medium comet tails — crisp decaying trails behind each light source
        (
            "phosphor_med",
            ("-vf", "lagfun=decay=0.97:planes=1"),
            "Medium comet tails, crisp"
        ),

        # Near-infinite persistence — builds a complete luminance map of all
        # traffic paths, lights never fully leave the frame
        (
            "phosphor_ultra",
            ("-vf", "lagfun=decay=0.997:planes=1"),
            "Near-permanent light map builds up"
        ),

        # Silk trails — phosphor smoothed through weighted tmix, feels liquid
        # rather than a hard comet. Blurs the decay into soft flowing motion
        (
            "silk_trails",
            ("-filter_complex",
             "[0:v]lagfun=decay=0.985:planes=1[lagged];"
             "[lagged]tmix=frames=6:weights='1 1 2 2 3 4'"),
            "Liquid smooth trails, soft edges"
        ),

        # Double-pass decay — trails of trails, no comet heads at all.
        # Pure diffuse glow that builds softly and fades very slowly
        (
            "light_memory",
            ("-filter_complex",
             "[0:v]lagfun=decay=0.98:planes=1[p1];"
             "[p1]lagfun=decay=0.97:planes=1"),
            "Double-pass decay, pure diffuse glow"
        ),

        # Ultra trails + 3-radius bloom: tight core, mid halo, wide aura
        (
            "trails_bloom_mega",
            ("-filter_complex",
             "[0:v]lagfun=decay=0.992:planes=1[lagged];"
             "[lagged]split=4[base][g1][g2][g3];"
             "[g1]lutyuv=y='if(gt(val,210),val,0)':u='128':v='128',gblur=sigma=5[b1];"
             "[g2]lutyuv=y='if(gt(val,190),val,0)':u='128':v='128',gblur=sigma=12[b2];"
             "[g3]lutyuv=y='if(gt(val,165),val,0)':u='128':v='128',gblur=sigma=20[b3];"
             "[base][b1]blend=all_mode=screen[s1];"
             "[s1][b2]blend=all_mode=screen[s2];"
             "[s2][b3]blend=all_mode=screen"),
            "Ultra trails + 3-radius bloom"
        ),

        # ── SMEAR ─────────────────────────────────────────────────────────────

        # Solid smear: 14-frame brightest-pixel stack. No fading, no averaging.
        # Lights become thick solid bars — every frame at full intensity
        (
            "smear_solid",
            ("-vf",
             "tmix=frames=14:weights='1 1 1 1 1 1 1 1 1 1 1 1 1 1'"),
            "Solid 14-frame brightest-pixel bars"
        ),

        # ── TEMPORAL LAYERING ─────────────────────────────────────────────────

        # Dense echo stack: 5 offsets at 0.25s intervals all lighten-merged.
        # Every car simultaneously occupies 5 positions — stuttered light ribbon
        (
            "echo_dense",
            ("-filter_complex",
             "[0:v]split=5[a][b][c][d][e];"
             "[b]setpts=PTS+0.25/TB[e1];"
             "[c]setpts=PTS+0.5/TB[e2];"
             "[d]setpts=PTS+0.75/TB[e3];"
             "[e]setpts=PTS+1.0/TB[e4];"
             "[a][e1]blend=all_mode=lighten[l1];"
             "[l1][e2]blend=all_mode=lighten[l2];"
             "[l2][e3]blend=all_mode=lighten[l3];"
             "[l3][e4]blend=all_mode=lighten"),
            "5 offsets x0.25s = ribbon of positions"
        ),

        # Wide temporal spread: 4 offsets spaced 1 second apart.
        # Full trajectory arc across the intersection visible at once
        (
            "echo_wide",
            ("-filter_complex",
             "[0:v]split=4[a][b][c][d];"
             "[b]setpts=PTS+1.0/TB[e1];"
             "[c]setpts=PTS+2.0/TB[e2];"
             "[d]setpts=PTS+3.0/TB[e3];"
             "[a][e1]blend=all_mode=lighten[l1];"
             "[l1][e2]blend=all_mode=lighten[l2];"
             "[l2][e3]blend=all_mode=lighten"),
            "4 offsets x1s = full arc of journey visible"
        ),

        # Bidirectional smear: 2 past and 2 future offsets merged.
        # Cars stretch symmetrically both ways — like a long exposure
        # where shutter opens before and after the moment simultaneously
        (
            "bidir_smear",
            ("-filter_complex",
             "[0:v]split=5[now][p1][p2][f1][f2];"
             "[p1]setpts=PTS+0.4/TB[past1];"
             "[p2]setpts=PTS+0.8/TB[past2];"
             "[f1]setpts=PTS-0.4/TB[fwd1];"
             "[f2]setpts=PTS-0.8/TB[fwd2];"
             "[now][past1]blend=all_mode=lighten[l1];"
             "[l1][past2]blend=all_mode=lighten[l2];"
             "[l2][fwd1]blend=all_mode=lighten[l3];"
             "[l3][fwd2]blend=all_mode=lighten"),
            "Past + future merged = symmetrical stretch"
        ),

        # Pulse echo: offsets at 0.5s, 1.5s, 2.5s — spaced to match traffic
        # rhythm. High-traffic positions amplify as ghosts stack on each other
        (
            "pulse_echo",
            ("-filter_complex",
             "[0:v]split=4[a][b][c][d];"
             "[b]setpts=PTS+0.5/TB[e1];"
             "[c]setpts=PTS+1.5/TB[e2];"
             "[d]setpts=PTS+2.5/TB[e3];"
             "[a][e1]blend=all_mode=lighten[l1];"
             "[l1][e2]blend=all_mode=lighten[l2];"
             "[l2][e3]blend=all_mode=lighten"),
            "Rhythmic offsets, busy lanes amplify"
        ),

        # Temporal average river: 24-frame weighted average, recency-biased.
        # Lights merge into a continuous glowing river of averaged luminance
        (
            "traffic_accumulator",
            ("-vf",
             "tmix=frames=24:weights='1 1 1 1 1 1 1 1 2 2 2 2 2 2 3 3 3 3 4 4 4 5 5 6'"),
            "24-frame weighted average, glowing river"
        ),

        # Echo + phosphor: 3 time offsets stacked then lagfun on the result.
        # The merged echoes themselves get comet tails — dense light ribbons
        (
            "echo_river",
            ("-filter_complex",
             "[0:v]split=4[a][b][c][d];"
             "[b]setpts=PTS+0.35/TB[e1];"
             "[c]setpts=PTS+0.7/TB[e2];"
             "[d]setpts=PTS+1.05/TB[e3];"
             "[a][e1]blend=all_mode=lighten[l1];"
             "[l1][e2]blend=all_mode=lighten[l2];"
             "[l2][e3]blend=all_mode=lighten[l3];"
             "[l3]lagfun=decay=0.96:planes=1"),
            "3 echoes then phosphor applied on result"
        ),

        # Temporal slab: 6 offsets tightly packed at 0.1s intervals.
        # So close together the car positions fuse into a single solid slab
        # of light — thicker and more continuous than echo_dense
        (
            "temporal_slab",
            ("-filter_complex",
             "[0:v]split=6[a][b][c][d][e][f];"
             "[b]setpts=PTS+0.1/TB[e1];"
             "[c]setpts=PTS+0.2/TB[e2];"
             "[d]setpts=PTS+0.3/TB[e3];"
             "[e]setpts=PTS+0.4/TB[e4];"
             "[f]setpts=PTS+0.5/TB[e5];"
             "[a][e1]blend=all_mode=lighten[l1];"
             "[l1][e2]blend=all_mode=lighten[l2];"
             "[l2][e3]blend=all_mode=lighten[l3];"
             "[l3][e4]blend=all_mode=lighten[l4];"
             "[l4][e5]blend=all_mode=lighten"),
            "6 x0.1s offsets fuse into solid slab"
        ),

        # ── GHOST ─────────────────────────────────────────────────────────────

        # Ghost trails: phosphor then lighten-blended 0.45s echo.
        # The ghost itself has a tail — compound persistence
        (
            "ghost_trails",
            ("-filter_complex",
             "[0:v]lagfun=decay=0.96:planes=1[lagged];"
             "[lagged]split[a][b];"
             "[b]setpts=PTS+0.45/TB[delayed];"
             "[a][delayed]blend=all_mode=lighten"),
            "Decaying ghost that itself trails"
        ),

        # ── SPLIT / COMPARISON ─────────────────────────────────────────────────

        # Left = raw, right = ultra trails
        (
            "split_screen_trails",
            ("-filter_complex",
             "[0:v]split[raw][trailed];"
             "[trailed]lagfun=decay=0.988:planes=1[tr];"
             "[raw]crop=iw/2:ih:0:0[left];"
             "[tr]crop=iw/2:ih:iw/2:0[right];"
             "[left][right]hstack"),
            "Left=original  |  Right=ultra trails"
        ),

        # Four trail strengths stacked vertically — none through permanent
        (
            "quad_trails_column",
            ("-filter_complex",
             "[0:v]split=4[a][b][c][d];"
             "[a]lagfun=decay=0.78:planes=1,scale=iw:ih/4[r1];"
             "[b]lagfun=decay=0.91:planes=1,scale=iw:ih/4[r2];"
             "[c]lagfun=decay=0.97:planes=1,scale=iw:ih/4[r3];"
             "[d]lagfun=decay=0.997:planes=1,scale=iw:ih/4[r4];"
             "[r1][r2][r3][r4]vstack=inputs=4"),
            "4 decay strengths stacked: none→permanent"
        ),
    ]

    print_menu(effects)
    chosen_indices = get_selection(effects)

    print(f"\nGenerating {len(chosen_indices)} effect(s)...\n" + "-"*58)

    for i in chosen_indices:
        name, (flag, filter_string), _ = effects[i]
        run_effect(input_file, output_dir, base_name, name, flag, filter_string)

    print("\n" + "="*58)
    print(f"  ✓ Complete. {len(chosen_indices)} file(s) in: {output_dir}")
    print("="*58 + "\n")

if __name__ == "__main__":
    INPUT_VIDEO = "input.mp4"
    OUTPUT_DIRECTORY = "timelapse_renders"
    generate_timelapse_effects(INPUT_VIDEO, OUTPUT_DIRECTORY)
