#!/usr/bin/env python3
import os,subprocess,random,sys,json,time

R="\033[0m";BOLD="\033[1m";DIM="\033[2m"
CY="\033[96m";GR="\033[92m";YL="\033[93m";RD="\033[91m";BL="\033[94m";MG="\033[95m"
def c(col,s):return f"{col}{s}{R}"

def header():
    print(f"\n{CY}{BOLD}╔══════════════════════════════════════════════╗\n║   🐸  FROG GLITCHER  v3  —  Termux FFmpeg   ║\n║      Chops video to the Crazy Frog melody   ║\n╚══════════════════════════════════════════════╝{R}")

def pbar(label,n,total,width=26):
    f=int(width*n/max(total,1))
    print(f"\r  {DIM}{label}{R} [{CY}{'█'*f}{'░'*(width-f)}{R}] {GR}{int(100*n/max(total,1)):3d}%{R}",end="",flush=True)

def probe_ffmpeg():
    r=subprocess.run(['ffmpeg','-filters'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    txt=r.stdout+r.stderr
    return {k:k in txt for k in ('rubberband','xfade','acrossfade','dynaudnorm')}

def get_media_files():
    exts=('.mp4','.mkv','.avi','.mov','.webm','.m4v','.flv','.ts')
    return sorted(f for f in os.listdir('.') if f.lower().endswith(exts))

def get_video_info(fp):
    r=subprocess.run(['ffprobe','-v','quiet','-print_format','json',
        '-show_streams','-show_format',fp],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try: d=json.loads(r.stdout)
    except: print(c(RD,"ffprobe failed")); sys.exit(1)
    dur=float(d.get('format',{}).get('duration',0))
    w=1280;h=720;fps_n=25;fps_d=1;has_a=False
    for s in d.get('streams',[]):
        if s.get('codec_type')=='video':
            w=int(s.get('width',1280));h=int(s.get('height',720))
            fr=s.get('r_frame_rate','25/1').split('/')
            fps_n,fps_d=int(fr[0]),max(int(fr[1]),1)
        elif s.get('codec_type')=='audio': has_a=True
    return dur,w,h,fps_n,fps_d,has_a

def analyse_zones(fp,duration):
    print(f"\n  {DIM}Pass 1/2 — silence detection...{R}")
    r=subprocess.run(['ffmpeg','-hide_banner','-i',fp,
        '-af','silencedetect=n=-30dB:d=0.12','-f','null','-'],
        stderr=subprocess.PIPE,text=True)
    silences=[];cur=0.0
    for line in r.stderr.split('\n'):
        if 'silence_start' in line:
            try: silences.append({'start':float(line.split('silence_start: ')[1].split()[0]),'end':duration})
            except: pass
        elif 'silence_end' in line:
            try:
                e=float(line.split('silence_end: ')[1].split()[0])
                if silences: silences[-1]['end']=e
            except: pass
    loud=[]
    for s in silences:
        if s['start']>cur+0.05: loud.append([cur,s['start']])
        cur=s['end']
    if duration>cur+0.05: loud.append([cur,duration])
    if not loud: loud=[[0.0,duration]]
    print(f"  {DIM}Pass 2/2 — scoring {len(loud)} zones by RMS...{R}")
    scored=[]
    for i,(zs,ze) in enumerate(loud):
        pbar("Scoring",i+1,len(loud))
        zdur=min(ze-zs,2.0)
        rr=subprocess.run(['ffmpeg','-hide_banner','-ss',str(zs),'-t',str(zdur),
            '-i',fp,'-af','astats=metadata=1:reset=1','-f','null','-'],
            stderr=subprocess.PIPE,text=True)
        rms=0.0
        for line in rr.stderr.split('\n'):
            if 'RMS_level' in line and 'Overall' not in line:
                try: rms=max(rms,float(line.split()[-1])); break
                except: pass
        energy=min(1.0,10**((rms+60)/40)) if rms<0 else 1.0
        scored.append({'start':zs,'end':ze,'energy':energy})
    print()
    return scored

def weighted_zone(zones,min_e=0.1):
    pool=[z for z in zones if z['energy']>=min_e] or zones
    w=[z['energy']**2 for z in pool]
    total=sum(w);r=random.uniform(0,total);acc=0
    for z,ww in zip(pool,w):
        acc+=ww
        if r<=acc: return z
    return pool[-1]

def pick_start(zone,chop,margin=0.04):
    lo=zone['start']+margin;hi=zone['end']-chop-margin
    return random.uniform(lo,hi) if hi>lo else zone['start']+margin

def snap(dur,rate=44100):
    return max(round(dur*rate)/rate,0.05)

def build_segment(v_src,a_start,grab,target,semitones,idx,caps):
    """
    v_src  : video input pad label e.g. "vs42" (pre-split from [0:v]split)
             OR a stutter pad label e.g. "st42" (pre-trimmed to target already)
             Passing None is no longer supported — caller always provides a pad.
    a_start: timestamp in source to grab audio from
    grab   : seconds to trim from source audio (the raw chop window)
    target : exact beat duration the output segment must fill
    semitones: pitch shift in semitones from D4

    Video path (SHUFFLE):
      [vs_idx] is one copy of [0:v] from the upfront split=N.
      trim grab secs, setpts=(target/grab)*PTS to stretch to target duration.
      No pitch-related speed change — rubberband handles pitch independently.
      For asetrate fallback, setpts also incorporates pitch speed factor.

    Video path (STUTTER):
      [st_idx] is already trimmed to target duration by build_stutter_video.
      Just relabel it — no trim or setpts needed.

    Audio path (both modes):
      atrim grab secs → pitch+timestretch to target → normalise → fade.
    """
    import math
    pm=2.0**(semitones/12.0)
    ts=grab/target          # timestretch ratio: >1 squash, <1 stretch
    fd=min(0.015,target*0.06); fo=max(0.0,target-fd)
    vi,ai=f"v{idx}",f"a{idx}"

    # ── VIDEO ────────────────────────────────────────────────────────────────
    if v_src.startswith("st"):
        # STUTTER pad: already trimmed to target, just relabel
        vf=f"[{v_src}]null[{vi}]"
    else:
        # SHUFFLE: v_src is a split copy of [0:v], trim + stretch to target
        # setpts = (target/grab)*PTS-STARTPTS
        # Derivation: frame at T=grab must appear at output T=target
        # → scale = target/grab = 1/ts
        vpts=target/grab  # = 1/ts, written explicitly for clarity
        if caps['rubberband']:
            # rubberband handles pitch independently; video only needs duration match
            vf=(f"[{v_src}]trim=start={a_start:.6f}:duration={grab:.6f},"
                f"setpts={vpts:.6f}*(PTS-STARTPTS)[{vi}]")
        else:
            # asetrate couples pitch and speed, so video also gets pitch speed factor
            # final video duration = grab * vpts / pm = target/pm ... wait that's wrong
            # asetrate path: audio out_dur after asetrate = grab/pm, then atempo fixes to target
            # video must match audio = target, so setpts = target/grab (same as rubberband)
            vf=(f"[{v_src}]trim=start={a_start:.6f}:duration={grab:.6f},"
                f"setpts={vpts:.6f}*(PTS-STARTPTS)[{vi}]")

    # ── AUDIO ────────────────────────────────────────────────────────────────
    if caps['rubberband']:
        pp=f"rubberband=pitch={pm:.6f}:tempo={ts:.6f}"
    else:
        nr=int(44100*pm)
        atempo_val=(grab/pm)/target
        # atempo must be in 0.5–2.0; chain two stages if outside range
        if atempo_val<0.5:
            half=math.sqrt(atempo_val)
            atempo_str=f"atempo={half:.6f},atempo={half:.6f}"
        elif atempo_val>2.0:
            half=math.sqrt(atempo_val)
            atempo_str=f"atempo={half:.6f},atempo={half:.6f}"
        else:
            atempo_str=f"atempo={atempo_val:.6f}"
        pp=f"asetrate={nr},aresample=44100:async=1000:first_pts=0,{atempo_str}"

    norm="dynaudnorm=p=0.9:m=20:s=8" if caps['dynaudnorm'] else "volume=1.0"
    af=(f"[0:a]atrim=start={a_start:.6f}:duration={grab:.6f},"
        f"asetpts=PTS-STARTPTS,{pp},{norm},"
        f"afade=t=in:ss=0:d={fd:.4f},"
        f"afade=t=out:st={fo:.4f}:d={fd:.4f}[{ai}]")
    return vf,af,target

def build_stutter_video(hero_start,hero_dur,chops,drift_s,caps,fps_n,fps_d):
    """
    STUTTER mode video + audio alignment.

    Video:
      1. Trim the hero window from [0:v] once → [hero_src]
      2. split=N fans it into N copies [sp0..spN]
      3. Each copy sub-trims to chop duration at a random drift offset
         → pad labels [st0..stN], each already exactly chop seconds long

    Audio (returned via drifts list):
      The main loop uses hero_start + drift_offset as the audio atrim start,
      so audio and video are always reading from the SAME moment in the source.
      This is what makes stutter mode actually stutter the source clip — not
      random zones from across the whole file.

    Returns (pre_filters, pad_labels, drift_offsets)
      drift_offsets[i] = the offset used for pad i, so audio can mirror it.
    """
    n=len(chops)
    max_chop=max(chops)
    hero_window=max_chop+drift_s+0.1
    hero_window=min(hero_window,hero_dur-0.05)
    hero_window=max(hero_window,max_chop+0.02)

    pre=[]
    pre.append(f"[0:v]trim=start={hero_start:.6f}:duration={hero_window:.6f},"
               f"setpts=PTS-STARTPTS[hero_src]")
    split_outs="".join(f"[sp{i}]" for i in range(n))
    pre.append(f"[hero_src]split={n}{split_outs}")

    pad_labels=[]; drift_offsets=[]
    for i,chop in enumerate(chops):
        max_offset=max(0.0,hero_window-chop-0.01)
        offset=min(random.uniform(0,max(0.0,drift_s)),max_offset)
        lbl=f"st{i}"
        pre.append(f"[sp{i}]trim=start={offset:.6f}:duration={chop:.6f},"
                   f"setpts=PTS-STARTPTS[{lbl}]")
        pad_labels.append(lbl)
        drift_offsets.append(offset)  # audio uses hero_start+offset to stay in sync

    return pre,pad_labels,drift_offsets

def build_synth(freq,dur,idx):
    atk=0.004;decay=5.5
    expr=(f"(min(t/{atk:.4f},1.0))*"
          f"(0.65*sin(2*PI*{freq:.3f}*t)"
          f"+0.25*sin(4*PI*{freq:.3f}*t)"
          f"+0.10*sin(6*PI*{freq:.3f}*t))"
          f"*exp(-{decay:.2f}*t)")
    return f"aevalsrc=exprs='{expr}':s=44100:d={dur:.6f}[s{idx}]"

CRAZY_FROG=[
    (0,2),(3,1.5),(0,1.5),(0,1),(5,2),(0,2),(-2,2),
    (0,2),(7,1.5),(0,1.5),(0,1),(8,2),(7,2),(3,2),
    (0,1),(7,1),(12,2),(0,1),(-2,1),(-2,1),(-5,2),(2,2),(0,4)
]
ACCENTS={0,3,7,10,14,16,22}

def ask(prompt,default,cast=str,valid=None):
    hint=f"{DIM}[{default}]{R}"
    while True:
        raw=input(f"  {GR}>{R} {prompt} {hint}: ").strip()
        val=raw if raw else str(default)
        try:
            v=cast(val)
            if valid and v not in valid: print(f"    {YL}Options: {valid}{R}"); continue
            return v
        except: print(f"    {YL}Invalid.{R}")

def get_config():
    print(f"\n{BOLD}{BL}-- Configuration ------------------------------{R}")
    print(f"  {DIM}Modes:{R}")
    print(f"  {CY}shuffle{R} — random clips from whole video, fresh cut per note")
    print(f"  {CY}stutter{R} — one hero block, repeated + drifted to the melody")
    mode=ask("Mode","shuffle",str,valid=["shuffle","stutter"])
    cfg=dict(
        mode=mode,
        bpm=      ask("BPM",120,float),
        loops=    ask("Melody loops",2,int),
        synth_vol=ask("Synth volume %",42,int)/100,
        vid_vol=  ask("Video audio %",58,int)/100,
        crf=      ask("CRF quality (18=best / 28=fast)",23,int),
        xfade=    ask("Video crossfades? y/n","y",str,valid=["y","n"])=="y",
        drift=    0.0,
        hero_time=None,
    )
    if mode=="stutter":
        cfg['drift']=ask("Drift per note ms (0=freeze, 100=wander)",80,int)/1000.0
        ht=ask("Hero block start sec (Enter=auto best zone)","auto",str)
        cfg['hero_time']=None if ht.strip().lower() in ("","auto") else float(ht)
    return cfg

def main():
    header()
    files=get_media_files()
    if not files: print(c(RD,"\n  No video files found.")); return
    print(f"\n{BOLD}{BL}-- Select File --------------------------------{R}")
    for i,f in enumerate(files):
        sz=os.path.getsize(f)/(1024*1024)
        print(f"  {CY}[{i+1}]{R} {f}  {DIM}({sz:.1f}MB){R}")
    try: inp=files[int(ask("File number",1,int))-1]
    except: print(c(RD,"  Invalid.")); return

    print(f"\n  {DIM}Probing...{R}",end=" ",flush=True)
    caps=probe_ffmpeg()
    dur,W,H,fps_n,fps_d,has_a=get_video_info(inp)
    print(c(GR,"OK"))
    print(f"  {('rubberband '+c(GR,'OK')) if caps['rubberband'] else c(YL,'rubberband MISSING — asetrate fallback')}"
          f"  {('xfade '+c(GR,'OK')) if caps['xfade'] else c(DIM,'xfade N/A')}"
          f"  {('dynaudnorm '+c(GR,'OK')) if caps['dynaudnorm'] else c(DIM,'dynaudnorm N/A')}")
    print(f"  {DIM}{W}x{H} @ {fps_n//fps_d}fps | {dur:.1f}s | audio:{has_a}{R}")
    if not has_a: print(c(RD,"  No audio stream found.")); return

    cfg=get_config()
    zones=analyse_zones(inp,dur)

    top=sorted(zones,key=lambda z:-z['energy'])[:3]
    print(f"  {DIM}Top energy zones:{R}")
    for z in top:
        bw=int(z['energy']*20)
        print(f"    {z['start']:.1f}s-{z['end']:.1f}s  {GR}{'#'*bw}{DIM}{'.'*(20-bw)}{R}  {z['energy']:.2f}")

    beat_s=60.0/cfg['bpm'];t16=beat_s/4.0;base_freq=293.66
    vf_list,af_list,sf_list=[],[],[]
    seg_out_durs=[];seg_chops=[];n=0
    total_segs=cfg['loops']*len(CRAZY_FROG)

    # ── STUTTER MODE: pre-build hero block split fan-out ─────────────────────
    stutter_pads=None; stutter_drifts=None; hero_start=None
    if cfg['mode']=="stutter":
        # Pick hero zone: user-specified time or highest-energy zone
        if cfg['hero_time'] is not None:
            hero_start=float(cfg['hero_time'])
            hero_src_dur=dur-hero_start
            print(f"  {DIM}Hero block: user-specified @ {hero_start:.2f}s{R}")
        else:
            best=sorted(zones,key=lambda z:-z['energy'])[0]
            hero_start=best['start']+0.05
            hero_src_dur=best['end']-hero_start
            print(f"  {DIM}Hero block: best zone @ {hero_start:.2f}s (energy {best['energy']:.2f}){R}")

        # Compute all chop lengths first so build_stutter_video knows the max
        all_chops=[]
        for loop in range(cfg['loops']):
            sq=1.0-(loop*0.05)
            for ni,(st,bm) in enumerate(CRAZY_FROG):
                all_chops.append(snap(t16*bm*sq))

        stutter_pre,stutter_pads,stutter_drifts=build_stutter_video(
            hero_start,hero_src_dur,all_chops,cfg['drift'],caps,fps_n,fps_d)
        vf_list.extend(stutter_pre)

    # grab_dur: fixed source window to chop per note (~220ms of real audio).
    # rubberband tempo will stretch/squash it to fill each note's target duration.
    grab_dur=snap(0.22)

    # ── SHUFFLE: pre-split [0:v] into N copies so each trim has its own pad ──
    # ffmpeg does NOT allow multiple [0:v]trim consumers from the same pad.
    # Without split, only the first consumer gets frames; the rest see nothing
    # (frozen last frame or black).  split=N fans the stream out safely.
    if cfg['mode']=="shuffle":
        vsplit_outs="".join(f"[vs{i}]" for i in range(total_segs))
        vf_list.append(f"[0:v]split={total_segs}{vsplit_outs}")

    print(f"\n{BOLD}{BL}-- Building Segments --------------------------{R}")
    print(f"  {DIM}Grab: {grab_dur*1000:.0f}ms  16th: {t16*1000:.0f}ms @ {cfg['bpm']}bpm{R}")
    pad_idx=0
    for loop in range(cfg['loops']):
        pr=loop*2.0; sq=1.0-(loop*0.05)
        for ni,(st,bm) in enumerate(CRAZY_FROG):
            pbar("Segments",n+1,total_segs)
            total_st=st+pr
            target=snap(t16*bm*sq)
            grab=snap(min(grab_dur,target*1.5))

            if cfg['mode']=="stutter":
                # STUTTER: audio also comes from the hero block only.
                # Use the same drift offset the stutter video pad was trimmed with.
                # We stored drifts in stutter_drifts[] during build_stutter_video.
                drift_offset=stutter_drifts[pad_idx]
                a_start=hero_start+drift_offset
                v_src=stutter_pads[pad_idx]
            else:
                # SHUFFLE: pick a fresh loud-zone clip; video comes from split pad
                zone=weighted_zone(zones,min_e=0.4 if ni in ACCENTS else 0.1)
                a_start=pick_start(zone,grab)
                v_src=f"vs{n}"

            vf,af,out_dur=build_segment(v_src,a_start,grab,target,total_st,n,caps)
            sf=build_synth(base_freq*(2**(total_st/12.0)),out_dur,n)
            vf_list.append(vf); af_list.append(af); sf_list.append(sf)
            seg_out_durs.append(out_dur); seg_chops.append(target)
            n+=1; pad_idx+=1
    print()

    xf_list=[]

    # ── Video chain: xfade or plain concat ───────────────────────────────────
    if caps['xfade'] and cfg['xfade'] and n>=2:
        cumtime=seg_out_durs[0]; prev="v0"
        for i in range(1,n):
            xd=max(round(min(seg_out_durs[i-1],seg_out_durs[i])*0.4,4),0.01)
            offset=max(0.001,cumtime-xd)
            out=f"xv{i}"
            xf_list.append(f"[{prev}][v{i}]xfade=transition=fade:duration={xd:.4f}:offset={offset:.4f}[{out}]")
            cumtime+=seg_out_durs[i]-xd; prev=out
        xf_list.append(f"[{prev}]copy[vout]")
    else:
        vin="".join(f"[v{i}]" for i in range(n))
        xf_list.append(f"{vin}concat=n={n}:v=1:a=0[vout]")

    # ── Audio: always plain concat ────────────────────────────────────────────
    # acrossfade chains across 46 segments accumulate floating-point duration
    # error and silently truncate the tail. concat is exact.
    # Per-segment afade in/out already handles smooth transitions.
    ain="".join(f"[a{i}]" for i in range(n))
    xf_list.append(f"{ain}concat=n={n}:v=0:a=1[araw]")

    # Synth concat
    sin_="".join(f"[s{i}]" for i in range(n))
    xf_list.append(f"{sin_}concat=n={n}:v=0:a=1[sraw]")

    sv=cfg['synth_vol'];vv=cfg['vid_vol']
    mix=[
        f"[araw]volume={vv:.3f}[avid]",
        f"[sraw]volume={sv:.3f}[ssyn]",
        # duration=longest: keeps audio alive as long as the longer input.
        # duration=first was killing audio early if araw was even 1ms short.
        "[avid][ssyn]amix=inputs=2:duration=longest:dropout_transition=0.005[amixed]",
        "[amixed]acompressor=threshold=-20dB:ratio=3:attack=5:release=100:makeup=2[acomp]",
        "[acomp]aecho=1.0:0.8:18:0.08[awid]",
        "[awid]alimiter=level_in=1:level_out=0.95:limit=0.95:attack=2:release=20[aout]",
    ]

    all_f=vf_list+af_list+sf_list+xf_list+mix
    fgraph="frog_filtergraph.txt"
    with open(fgraph,"w") as f: f.write(";\n".join(all_f))

    out_file=f"frog_{os.path.splitext(inp)[0]}.mp4"
    print(f"\n{BOLD}{BL}-- Encoding -----------------------------------{R}")
    print(f"  {DIM}-> {out_file}{R}")
    mode_tag=f"{CY}STUTTER{R} drift={cfg['drift']*1000:.0f}ms" if cfg['mode']=="stutter" else f"{MG}SHUFFLE{R}"
    print(f"  {DIM}Mode:{R} {mode_tag}  {DIM}Segs:{n}  BPM:{cfg['bpm']}  Loops:{cfg['loops']}  "
          f"Vid:{'xfade' if caps['xfade'] and cfg['xfade'] else 'concat'}{R}\n")

    t0=time.time()
    result=subprocess.run([
        "ffmpeg","-loglevel","error","-stats","-y","-i",inp,
        "-filter_complex_script",fgraph,
        "-map","[vout]","-map","[aout]",
        "-c:v","libx264","-preset","ultrafast","-tune","fastdecode",
        "-crf",str(cfg['crf']),
        "-c:a","aac","-b:a","192k","-ar","44100",
        "-movflags","+faststart",
        out_file
    ])
    elapsed=time.time()-t0
    if os.path.exists(fgraph): os.remove(fgraph)
    if result.returncode==0:
        sz=os.path.getsize(out_file)/(1024*1024)
        print(f"\n  {GR}{BOLD}Done!{R}  {out_file}  {DIM}({sz:.1f}MB, {elapsed:.0f}s){R}")
    else:
        print(f"\n  {RD}{BOLD}FFmpeg failed.{R}")
        with open(fgraph,"w") as f: f.write(";\n".join(all_f))
        print(f"  {DIM}Filter graph saved to {fgraph} — inspect with:{R}")
        print(f"  {DIM}ffmpeg -v verbose -i {inp} -filter_complex_script {fgraph} -f null -{R}")

if __name__=="__main__":
    main()