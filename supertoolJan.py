#!/usr/bin/env python3
"""
TERMUX SUPER-TOOL v6.0 - Python Edition
Optimized for Android/Termux with comprehensive media, PDF, and data utilities
"""

import os
import sys
import subprocess
import shutil
import json
import csv
import hashlib
import glob
import re
from pathlib import Path
from datetime import datetime
import time

# Color codes
class C:
    R='\033[0;31m';G='\033[0;32m';B='\033[0;34m';C='\033[0;36m'
    P='\033[0;35m';Y='\033[1;33m';W='\033[1;37m';N='\033[0m'
    BOLD='\033[1m';DIM='\033[2m'

def clear():os.system('clear')
def pause():input(f"\n{C.DIM}Press Enter...{C.N}")

def header(title):
    clear()
    print(f"{C.Y}{'='*50}{C.N}")
    print(f"{C.BOLD}{C.W}  {title}{C.N}")
    print(f"{C.Y}{'='*50}{C.N}")
    print(f"{C.DIM}📂 {os.getcwd()}{C.N}\n")

def check_deps():
    """Quick dependency check"""
    deps={'ffmpeg':'Media processing','magick':'ImageMagick','gs':'Ghostscript',
          'qpdf':'PDF tools','python3':'Python'}
    missing=[]
    for cmd,desc in deps.items():
        if not shutil.which(cmd):missing.append(f"{cmd} ({desc})")
    if missing:
        print(f"{C.Y}⚠ Missing (optional): {', '.join(missing)}{C.N}\n")

def list_files(pattern='*',exclude_dirs=True):
    """List files matching pattern with numbers"""
    files=[]
    patterns=pattern if isinstance(pattern,list) else [pattern]
    for p in patterns:
        for f in glob.glob(p):
            if exclude_dirs and os.path.isdir(f):continue
            files.append(f)
    return sorted(set(files))

def file_selector(pattern='*',title="Select File(s)"):
    """Interactive file selector with 0=all option"""
    files=list_files(pattern)
    if not files:
        print(f"{C.R}No matching files found{C.N}")
        pause()
        return None
    
    print(f"{C.C}{title}:{C.N}")
    print(f"{C.G}  0. ALL FILES ({len(files)} total){C.N}")
    for i,f in enumerate(files,1):
        size=os.path.getsize(f)/1024
        print(f"  {i}. {f} {C.DIM}({size:.1f}KB){C.N}")
    
    choice=input(f"\n{C.W}Select [0-{len(files)}] or Enter=cancel: {C.N}").strip()
    if not choice:return None
    
    try:
        idx=int(choice)
        if idx==0:return files
        if 1<=idx<=len(files):return [files[idx-1]]
    except:pass
    
    print(f"{C.R}Invalid selection{C.N}")
    pause()
    return None

def progress(text):
    """Simple progress indicator"""
    sys.stdout.write(f"\r{C.Y}⏳ {text}{C.N}")
    sys.stdout.flush()

def success(text):
    print(f"\r{C.G}✓ {text}{C.N}")

def error(text):
    print(f"\r{C.R}✗ {text}{C.N}")

# ==============================================================================
# 1. IMAGE ANALYTICS & SORTING
# ==============================================================================

def image_analytics():
    header("IMAGE ANALYTICS & SORTING")
    print("1. 🌈 Rainbow Sort (by Hue)")
    print("2. 🌑 Brightness Sort (Dark→Light)")
    print("3. 🕸️  Complexity Sort (Simple→Busy)")
    print("4. 📐 Aspect Ratio Sort (Portrait→Landscape)")
    print("5. 🔴 Find Red Stamps/Seals")
    print("6. 📊 Generate Statistics")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    if choice=='0':return
    
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        print(f"{C.R}Requires Pillow: pip install pillow{C.N}")
        pause()
        return
    
    files=file_selector(['*.jpg','*.jpeg','*.png','*.webp','*.pdf'])
    if not files:return
    
    # Ensure files is always a list
    if not isinstance(files,list):
        files=[files]
    
    def analyze_image(path):
        try:
            img=Image.open(path)
            if img.mode!='RGB':img=img.convert('RGB')
            img.thumbnail((300,300))
            arr=np.array(img)
            
            # Calculate metrics
            h,s,v=Image.fromarray(arr).convert('HSV').split()
            hue=np.mean(np.array(h))
            brightness=np.mean(arr)
            complexity=np.std(arr)
            aspect=img.width/img.height
            
            # Red detection
            r,g,b=arr[:,:,0],arr[:,:,1],arr[:,:,2]
            red_score=np.sum((r>100)&(r>g+40)&(r>b+40))
            
            return {'hue':hue,'brightness':brightness,'complexity':complexity,
                    'aspect':aspect,'red':red_score,'path':path,'img':img}
        except Exception as e:
            error(f"Failed: {path} - {e}")
            return None
    
    if choice=='1':  # Rainbow
        data=[d for d in [analyze_image(f) for f in files] if d]
        data.sort(key=lambda x:x['hue'])
        create_montage([d['path'] for d in data],'rainbow_sort.jpg')
        
    elif choice=='2':  # Brightness
        data=[d for d in [analyze_image(f) for f in files] if d]
        data.sort(key=lambda x:x['brightness'])
        create_montage([d['path'] for d in data],'brightness_sort.jpg')
        
    elif choice=='3':  # Complexity
        data=[d for d in [analyze_image(f) for f in files] if d]
        data.sort(key=lambda x:x['complexity'])
        create_montage([d['path'] for d in data],'complexity_sort.jpg')
        
    elif choice=='4':  # Aspect
        data=[d for d in [analyze_image(f) for f in files] if d]
        data.sort(key=lambda x:x['aspect'])
        create_montage([d['path'] for d in data],'aspect_sort.jpg')
        
    elif choice=='5':  # Red stamps
        os.makedirs('red_stamps',exist_ok=True)
        found=0
        for f in files:
            progress(f"Scanning {f}")
            d=analyze_image(f)
            if d and d['red']>1000:
                shutil.copy(f,'red_stamps/')
                found+=1
                success(f"Found: {f}")
        print(f"\n{C.G}Found {found} images with red stamps{C.N}")
        
    elif choice=='6':  # Statistics
        data=[d for d in [analyze_image(f) for f in files] if d]
        print(f"\n{C.C}Image Statistics:{C.N}")
        print(f"Total: {len(data)}")
        print(f"Avg Brightness: {np.mean([d['brightness'] for d in data]):.1f}")
        print(f"Avg Complexity: {np.mean([d['complexity'] for d in data]):.1f}")
        print(f"Aspect Range: {min(d['aspect'] for d in data):.2f} - {max(d['aspect'] for d in data):.2f}")
    
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

def create_montage(files,output):
    """Create image montage using ImageMagick"""
    progress("Creating montage...")
    cmd=['montage']+files+['-geometry','+5+5','-tile','4x','-border','2',output]
    subprocess.run(cmd,stderr=subprocess.DEVNULL)
    success(f"Saved: {output}")

# ==============================================================================
# 2. PDF ENGINEERING
# ==============================================================================

def pdf_tools():
    header("PDF ENGINEERING")
    print("1. 🔗 Merge PDFs (QPDF)")
    print("2. 📉 Compress PDFs (Ghostscript)")
    print("3. 🔓 Decrypt/Unlock PDFs")
    print("4. ✂️  Split PDF by Pages")
    print("5. 🔄 Extract Pages (Range)")
    print("6. 🔍 Search Text in PDFs")
    print("7. 📊 PDF Info & Metadata")
    print("8. 🖼️  Extract Images from PDF")
    print("9. 🌐 Linearize (Fast Web View)")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    if choice=='1':  # Merge
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        output=input("Output name [merged.pdf]: ").strip() or "merged.pdf"
        progress("Merging...")
        subprocess.run(['qpdf','--empty','--pages']+files+['--',output])
        success(f"Created: {output}")
        
    elif choice=='2':  # Compress
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        print("\nQuality: 1=Screen(72dpi) 2=eBook(150dpi) 3=Printer(300dpi)")
        q=input("Choice [2]: ").strip() or "2"
        quality={'1':'/screen','2':'/ebook','3':'/printer'}[q]
        
        os.makedirs('compressed',exist_ok=True)
        for f in files:
            progress(f"Compressing {f}")
            out=f"compressed/{Path(f).name}"
            subprocess.run(['gs','-sDEVICE=pdfwrite',f'-dPDFSETTINGS={quality}',
                          '-dNOPAUSE','-dQUIET','-dBATCH',f'-sOutputFile={out}',f],
                          stderr=subprocess.DEVNULL)
            success(f"{f} → {out}")
        
    elif choice=='3':  # Decrypt
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        pwd=input("Password: ").strip()
        os.makedirs('unlocked',exist_ok=True)
        for f in files:
            progress(f"Unlocking {f}")
            subprocess.run(['qpdf','--decrypt',f'--password={pwd}',f,f'unlocked/{Path(f).name}'])
            success(f)
            
    elif choice=='4':  # Split
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        os.makedirs('pages',exist_ok=True)
        for f in files:
            progress(f"Splitting {f}")
            base=Path(f).stem
            subprocess.run(['gs','-sDEVICE=pdfwrite','-o',f'pages/{base}_%03d.pdf',f],
                          stderr=subprocess.DEVNULL)
            success(f)
            
    elif choice=='5':  # Extract pages
        files=file_selector('*.pdf')
        if not files:return
        if isinstance(files,list) and len(files)>1:
            print(f"{C.R}Select single PDF{C.N}")
            pause()
            return
        if isinstance(files,list):files=files[0]
        
        pages=input("Pages (e.g., 1-5,7,10-12): ").strip()
        output=input("Output [extract.pdf]: ").strip() or "extract.pdf"
        subprocess.run(['qpdf',files,'--pages',files,pages,'--',output])
        success(f"Extracted: {output}")
        
    elif choice=='6':  # Search
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        term=input("Search term: ").strip()
        
        for f in files:
            try:
                text=subprocess.check_output(['pdftotext',f,'-'],text=True)
                if term.lower() in text.lower():
                    count=text.lower().count(term.lower())
                    print(f"{C.G}✓ {f} ({count} matches){C.N}")
            except:
                error(f"Failed: {f}")
                
    elif choice=='7':  # Info
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        for f in files:
            print(f"\n{C.C}{f}:{C.N}")
            subprocess.run(['qpdf','--show-object=trailer',f])
            
    elif choice=='8':  # Extract images
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        os.makedirs('extracted_images',exist_ok=True)
        for f in files:
            progress(f"Extracting from {f}")
            subprocess.run(['pdfimages','-all',f,f'extracted_images/{Path(f).stem}'],
                          stderr=subprocess.DEVNULL)
            success(f)
            
    elif choice=='9':  # Linearize
        files=file_selector('*.pdf')
        if not files:return
        if not isinstance(files,list):files=[files]
        for f in files:
            progress(f"Linearizing {f}")
            subprocess.run(['qpdf','--linearize',f,f'{f}.temp'])
            os.replace(f'{f}.temp',f)
            success(f)
            
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

# ==============================================================================
# 3. VIDEO & MEDIA
# ==============================================================================

def media_tools():
    header("VIDEO & MEDIA TOOLS")
    print("1. 📺 Download Video (yt-dlp)")
    print("2. 🎵 Extract Audio (MP3)")
    print("3. ✂️  Cut/Trim Video")
    print("4. 🎬 Create Video from Images")
    print("5. 🔄 Convert Video Format")
    print("6. 📊 Video Info & Metadata")
    print("7. 🖼️  Extract Frames")
    print("8. 🎭 Apply Filters (Speed/Reverse)")
    print("9. 📹 Compress Video")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    if choice=='1':  # Download
        url=input("URL: ").strip()
        quality=input("Quality [1080/720/480/audio]: ").strip() or "720"
        
        if quality=='audio':
            subprocess.run(['yt-dlp','-x','--audio-format','mp3',url])
        else:
            subprocess.run(['yt-dlp','-f',f'bestvideo[height<={quality}]+bestaudio',
                          '--merge-output-format','mp4',url])
        success("Downloaded")
        
    elif choice=='2':  # Extract audio
        files=file_selector(['*.mp4','*.mkv','*.avi','*.mov'])
        if not files:return
        if not isinstance(files,list):files=[files]
        for f in files:
            out=f"{Path(f).stem}.mp3"
            progress(f"Extracting {f}")
            subprocess.run(['ffmpeg','-i',f,'-vn','-ar','44100','-ac','2','-b:a','192k',out],
                          stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='3':  # Trim
        files=file_selector(['*.mp4','*.mkv','*.avi'])
        if not files:return
        if isinstance(files,list) and len(files)>1:
            print(f"{C.R}Select single video{C.N}")
            pause()
            return
        if isinstance(files,list):files=files[0]
        
        start=input("Start time (HH:MM:SS): ").strip()
        duration=input("Duration (seconds or HH:MM:SS): ").strip()
        out=f"trimmed_{Path(files).name}"
        
        subprocess.run(['ffmpeg','-i',files,'-ss',start,'-t',duration,'-c','copy',out],
                      stderr=subprocess.DEVNULL)
        success(out)
        
    elif choice=='4':  # Images to video
        files=file_selector(['*.jpg','*.jpeg','*.png'])
        if not files:return
        if not isinstance(files,list):files=[files]
        fps=input("FPS [1]: ").strip() or "1"
        out=input("Output [slideshow.mp4]: ").strip() or "slideshow.mp4"
        
        # Create temp file list
        with open('ffmpeg_list.txt','w') as f:
            for img in files:
                f.write(f"file '{img}'\n")
        
        subprocess.run(['ffmpeg','-f','concat','-safe','0','-i','ffmpeg_list.txt',
                       '-vf',f'fps={fps}','-pix_fmt','yuv420p',out],
                      stderr=subprocess.DEVNULL)
        os.remove('ffmpeg_list.txt')
        success(out)
        
    elif choice=='5':  # Convert
        files=file_selector(['*.mp4','*.mkv','*.avi','*.mov'])
        if not files:return
        if not isinstance(files,list):files=[files]
        fmt=input("Output format [mp4/mkv/avi]: ").strip() or "mp4"
        
        for f in files:
            out=f"{Path(f).stem}.{fmt}"
            progress(f"Converting {f}")
            subprocess.run(['ffmpeg','-i',f,out],stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='6':  # Info
        files=file_selector(['*.mp4','*.mkv','*.avi','*.mov'])
        if not files:return
        if not isinstance(files,list):files=[files]
        for f in files:
            print(f"\n{C.C}{f}:{C.N}")
            subprocess.run(['ffprobe','-hide_banner',f])
            
    elif choice=='7':  # Extract frames
        files=file_selector(['*.mp4','*.mkv','*.avi'])
        if not files:return
        if isinstance(files,list) and len(files)>1:
            print(f"{C.R}Select single video{C.N}")
            pause()
            return
        if isinstance(files,list):files=files[0]
        
        rate=input("Frame rate (e.g., 1=every second) [1]: ").strip() or "1"
        os.makedirs('frames',exist_ok=True)
        subprocess.run(['ffmpeg','-i',files,'-vf',f'fps={rate}','frames/frame_%04d.jpg'],
                      stderr=subprocess.DEVNULL)
        success("Frames extracted")
        
    elif choice=='8':  # Filters
        files=file_selector(['*.mp4','*.mkv','*.avi'])
        if not files:return
        if isinstance(files,list) and len(files)>1:
            print(f"{C.R}Select single video{C.N}")
            pause()
            return
        if isinstance(files,list):files=files[0]
        
        print("\n1. Speed up (2x)")
        print("2. Slow down (0.5x)")
        print("3. Reverse")
        filt=input("Choice: ").strip()
        
        if filt=='1':
            out=f"fast_{Path(files).name}"
            subprocess.run(['ffmpeg','-i',files,'-filter:v','setpts=0.5*PTS',
                          '-filter:a','atempo=2.0',out],stderr=subprocess.DEVNULL)
        elif filt=='2':
            out=f"slow_{Path(files).name}"
            subprocess.run(['ffmpeg','-i',files,'-filter:v','setpts=2*PTS',
                          '-filter:a','atempo=0.5',out],stderr=subprocess.DEVNULL)
        elif filt=='3':
            out=f"reverse_{Path(files).name}"
            subprocess.run(['ffmpeg','-i',files,'-vf','reverse','-af','areverse',out],
                          stderr=subprocess.DEVNULL)
        success(out)
        
    elif choice=='9':  # Compress
        files=file_selector(['*.mp4','*.mkv','*.avi'])
        if not files:return
        if not isinstance(files,list):files=[files]
        crf=input("CRF [23=balanced, 28=smaller, 18=higher quality]: ").strip() or "23"
        
        os.makedirs('compressed',exist_ok=True)
        for f in files:
            out=f"compressed/{Path(f).name}"
            progress(f"Compressing {f}")
            subprocess.run(['ffmpeg','-i',f,'-c:v','libx264','-crf',crf,'-preset','medium',out],
                          stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

# ==============================================================================
# 4. IMAGE PROCESSING
# ==============================================================================

def image_tools():
    header("IMAGE PROCESSING")
    print("1. 🔄 Batch Convert Format")
    print("2. 📏 Resize Images")
    print("3. 🎨 Apply Filters (B&W/Sepia/Blur)")
    print("4. 💧 Add Watermark")
    print("5. ✂️  Crop Images")
    print("6. 🔲 Add Border/Frame")
    print("7. 📐 Generate Grid Overlay")
    print("8. 🖼️  Create Montage/Collage")
    print("9. 🗜️  Compress/Optimize")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    if choice=='0':return
    
    files=file_selector(['*.jpg','*.jpeg','*.png','*.webp'])
    if not files:return
    
    # Ensure files is always a list
    if not isinstance(files,list):
        files=[files]
    
    if choice=='1':  # Convert
        fmt=input("Format [jpg/png/webp]: ").strip() or "jpg"
        os.makedirs(f'converted_{fmt}',exist_ok=True)
        for f in files:
            out=f"converted_{fmt}/{Path(f).stem}.{fmt}"
            progress(f"Converting {f}")
            subprocess.run(['convert',f,out],stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='2':  # Resize
        size=input("Size (e.g., 1920x1080 or 50%): ").strip()
        os.makedirs('resized',exist_ok=True)
        for f in files:
            out=f"resized/{Path(f).name}"
            progress(f"Resizing {f}")
            subprocess.run(['convert',f,'-resize',size,out],stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='3':  # Filters
        print("\n1. Grayscale")
        print("2. Sepia")
        print("3. Blur")
        print("4. Sharpen")
        print("5. Edge Detect")
        filt=input("Choice: ").strip()
        
        effects={'1':'-colorspace Gray','2':'-sepia-tone 80%',
                '3':'-blur 0x8','4':'-sharpen 0x1','5':'-edge 1'}
        
        os.makedirs('filtered',exist_ok=True)
        for f in files:
            out=f"filtered/{Path(f).name}"
            progress(f"Filtering {f}")
            subprocess.run(['convert',f]+effects.get(filt,'').split()+[out],
                          stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='4':  # Watermark
        text=input("Watermark text: ").strip()
        for f in files:
            progress(f"Watermarking {f}")
            subprocess.run(['convert',f,'-gravity','SouthEast','-pointsize','30',
                          '-fill','rgba(255,255,255,0.5)','-annotate','+10+10',text,
                          f'wm_{Path(f).name}'],stderr=subprocess.DEVNULL)
            success(f"wm_{Path(f).name}")
            
    elif choice=='5':  # Crop
        crop=input("Crop (WxH+X+Y, e.g., 800x600+100+50): ").strip()
        os.makedirs('cropped',exist_ok=True)
        for f in files:
            out=f"cropped/{Path(f).name}"
            progress(f"Cropping {f}")
            subprocess.run(['convert',f,'-crop',crop,out],stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='6':  # Border
        size=input("Border size [10]: ").strip() or "10"
        color=input("Color [black]: ").strip() or "black"
        os.makedirs('bordered',exist_ok=True)
        for f in files:
            out=f"bordered/{Path(f).name}"
            progress(f"Adding border to {f}")
            subprocess.run(['convert',f,'-bordercolor',color,'-border',size,out],
                          stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='7':  # Grid
        from PIL import Image,ImageDraw
        for f in files:
            progress(f"Adding grid to {f}")
            img=Image.open(f)
            draw=ImageDraw.Draw(img)
            w,h=img.size
            
            for i in range(1,10):
                x=int(w*i/10)
                draw.line([(x,0),(x,h)],fill='red',width=2)
            for i in range(1,10):
                y=int(h*i/10)
                draw.line([(0,y),(w,y)],fill='red',width=2)
            
            img.save(f"grid_{Path(f).name}")
            success(f"grid_{Path(f).name}")
            
    elif choice=='8':  # Montage
        cols=input("Columns [4]: ").strip() or "4"
        subprocess.run(['montage']+files+['-tile',f'{cols}x','-geometry','+5+5',
                       '-border','2','montage.jpg'])
        success("montage.jpg")
        
    elif choice=='9':  # Compress
        quality=input("Quality 1-100 [85]: ").strip() or "85"
        os.makedirs('optimized',exist_ok=True)
        for f in files:
            out=f"optimized/{Path(f).name}"
            progress(f"Optimizing {f}")
            subprocess.run(['convert',f,'-quality',quality,out],stderr=subprocess.DEVNULL)
            success(out)
            
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

# ==============================================================================
# 5. DATA & TEXT UTILITIES
# ==============================================================================

def data_tools():
    header("DATA & TEXT TOOLS")
    print("1. 📊 CSV to JSON")
    print("2. 📊 JSON to CSV")
    print("3. 📜 Pretty Print JSON")
    print("4. 🔍 Search in Files")
    print("5. 🧹 Clean Text (DOS/Trailing)")
    print("6. 📈 CSV Statistics")
    print("7. 🔀 Merge CSV Files")
    print("8. ✂️  Split Large File")
    print("9. 📝 Batch Rename")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    if choice=='1':  # CSV to JSON
        files=file_selector('*.csv')
        if not files:return
        if not isinstance(files,list):files=[files]
        for f in files:
            with open(f) as csvf:
                data=list(csv.DictReader(csvf))
            out=f"{Path(f).stem}.json"
            with open(out,'w') as jf:
                json.dump(data,jf,indent=2)
            success(out)
            
    elif choice=='2':  # JSON to CSV
        files=file_selector('*.json')
        if not files:return
        if not isinstance(files,list):files=[files]
        for f in files:
            with open(f) as jf:
                data=json.load(jf)
            
            if not isinstance(data,list):
                error(f"{f} - Must be list of objects")
                continue
            
            out=f"{Path(f).stem}.csv"
            with open(out,'w',newline='') as cf:
                if data:
                    writer=csv.DictWriter(cf,fieldnames=data[0].keys())
                    writer.writeheader()
                    writer.writerows(data)
            success(out)
            
    elif choice=='3':  # Pretty JSON
        files=file_selector('*.json')
        if not files:return
        if not isinstance(files,list):files=[files]
        for f in files:
            with open(f) as jf:
                data=json.load(jf)
            with open(f,'w') as jf:
                json.dump(data,jf,indent=2)
            success(f)
            
    elif choice=='4':  # Search
        term=input("Search term: ").strip()
        pattern=input("File pattern [*.*]: ").strip() or "*.*"
        
        for f in glob.glob(pattern):
            if os.path.isfile(f):
                try:
                    with open(f,encoding='utf-8',errors='ignore') as file:
                        for i,line in enumerate(file,1):
                            if term in line:
                                print(f"{C.G}{f}:{i}{C.N} {line.strip()}")
                except:pass
                
    elif choice=='5':  # Clean text
        files=file_selector(['*.txt','*.csv','*.json'])
        if not files:return
        if not isinstance(files,list):files=[files]
        
        for f in files:
            with open(f,'rb') as file:
                content=file.read()
            
            # Remove DOS line breaks and trailing spaces
            content=content.replace(b'\r\n',b'\n').replace(b'\r',b'\n')
            lines=[line.rstrip() for line in content.decode('utf-8',errors='ignore').split('\n')]
            
            with open(f,'w') as file:
                file.write('\n'.join(lines))
            success(f)
            
    elif choice=='6':  # CSV stats
        files=file_selector('*.csv')
        if not files:return
        if isinstance(files,list) and len(files)>1:
            print(f"{C.R}Select single CSV{C.N}")
            pause()
            return
        if isinstance(files,list):files=files[0]
        
        with open(files) as f:
            reader=csv.DictReader(f)
            data=list(reader)
        
        print(f"\n{C.C}CSV Statistics:{C.N}")
        print(f"Rows: {len(data)}")
        print(f"Columns: {len(data[0]) if data else 0}")
        print(f"Fields: {', '.join(data[0].keys()) if data else 'None'}")
        
        # Try numeric analysis
        for col in data[0].keys() if data else []:
            try:
                vals=[float(row[col]) for row in data if row[col]]
                print(f"\n{col}:")
                print(f"  Min: {min(vals):.2f}")
                print(f"  Max: {max(vals):.2f}")
                print(f"  Avg: {sum(vals)/len(vals):.2f}")
            except:pass
            
    elif choice=='7':  # Merge CSV
        files=file_selector('*.csv')
        if not files:return
        if not isinstance(files,list):files=[files]
        
        all_data=[]
        for f in files:
            with open(f) as csvf:
                all_data.extend(list(csv.DictReader(csvf)))
        
        if all_data:
            with open('merged.csv','w',newline='') as out:
                writer=csv.DictWriter(out,fieldnames=all_data[0].keys())
                writer.writeheader()
                writer.writerows(all_data)
            success("merged.csv")
            
    elif choice=='8':  # Split file
        files=file_selector('*.*')
        if not files:return
        if isinstance(files,list) and len(files)>1:
            print(f"{C.R}Select single file{C.N}")
            pause()
            return
        if isinstance(files,list):files=files[0]
        
        lines=int(input("Lines per file [1000]: ").strip() or "1000")
        
        with open(files) as f:
            chunk=[]
            num=1
            for line in f:
                chunk.append(line)
                if len(chunk)>=lines:
                    with open(f"{Path(files).stem}_part{num}.txt",'w') as out:
                        out.writelines(chunk)
                    success(f"part{num}")
                    chunk=[]
                    num+=1
            
            if chunk:
                with open(f"{Path(files).stem}_part{num}.txt",'w') as out:
                    out.writelines(chunk)
                success(f"part{num}")
                
    elif choice=='9':  # Batch rename
        files=file_selector('*.*')
        if not files:return
        if not isinstance(files,list):files=[files]
        
        print("\nRename pattern:")
        print("Use {n} for number, {old} for original name")
        print("Example: photo_{n:03d} → photo_001, photo_002...")
        pattern=input("Pattern: ").strip()
        
        for i,f in enumerate(files,1):
            new_name=pattern.format(n=i,old=Path(f).stem)
            new_path=f"{new_name}{Path(f).suffix}"
            os.rename(f,new_path)
            print(f"{f} → {new_path}")
        success("Renamed")
        
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

# ==============================================================================
# 6. SYSTEM UTILITIES
# ==============================================================================

def system_tools():
    header("SYSTEM UTILITIES")
    print("1. 📊 Disk Usage Analysis")
    print("2. 🧹 Clean Filename Spaces")
    print("3. 🔍 Find Duplicates (MD5)")
    print("4. 🗜️  Archive/Extract")
    print("5. 🔒 Remove Metadata (Privacy)")
    print("6. 📡 HTTP Server (Port 8000)")
    print("7. 📁 Directory Tree")
    print("8. 🔐 Hash Generator")
    print("9. 💾 Backup Current Directory")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    if choice=='1':  # Disk usage
        print(f"\n{C.C}Disk Usage (Top 20):{C.N}")
        result=subprocess.run(['du','-sh','*'],capture_output=True,text=True)
        lines=sorted(result.stdout.strip().split('\n'),reverse=True)[:20]
        for line in lines:
            print(line)
            
    elif choice=='2':  # Clean filenames
        count=0
        for f in os.listdir('.'):
            if ' ' in f:
                new=f.replace(' ','_')
                os.rename(f,new)
                print(f"{f} → {new}")
                count+=1
        print(f"\n{C.G}Fixed {count} filenames{C.N}")
        
    elif choice=='3':  # Duplicates
        print("Scanning for duplicates...")
        hashes={}
        for f in glob.glob('**/*',recursive=True):
            if os.path.isfile(f):
                progress(f"Hashing {f}")
                with open(f,'rb') as file:
                    h=hashlib.md5(file.read()).hexdigest()
                    if h in hashes:
                        print(f"\n{C.Y}Duplicate: {f} == {hashes[h]}{C.N}")
                    else:
                        hashes[h]=f
        success("Scan complete")
        
    elif choice=='4':  # Archive
        print("\n1. Create Archive")
        print("2. Extract Archive")
        sub=input("Choice: ").strip()
        
        if sub=='1':
            files=file_selector('*.*')
            if not files:return
            name=input("Archive name [archive.tar.gz]: ").strip() or "archive.tar.gz"
            subprocess.run(['tar','-czf',name]+files)
            success(name)
        elif sub=='2':
            files=file_selector(['*.tar.gz','*.zip','*.tar','*.tgz'])
            if not files:return
            if not isinstance(files,list):files=[files]
            for f in files:
                if f.endswith('.zip'):
                    subprocess.run(['unzip',f])
                else:
                    subprocess.run(['tar','-xf',f])
                success(f"Extracted {f}")
                
    elif choice=='5':  # Remove metadata
        files=file_selector(['*.jpg','*.jpeg','*.png','*.pdf'])
        if not files:return
        if not isinstance(files,list):files=[files]
        
        os.makedirs('cleaned',exist_ok=True)
        for f in files:
            progress(f"Cleaning {f}")
            if f.endswith('.pdf'):
                subprocess.run(['exiftool','-all=','-o',f'cleaned/{Path(f).name}',f],
                              stderr=subprocess.DEVNULL,stdout=subprocess.DEVNULL)
            else:
                subprocess.run(['exiftool','-all=','-overwrite_original',f],
                              stderr=subprocess.DEVNULL,stdout=subprocess.DEVNULL)
                shutil.move(f,f'cleaned/{Path(f).name}')
            success(f)
            
    elif choice=='6':  # HTTP server
        print(f"{C.G}Starting server on port 8000...{C.N}")
        print(f"Access at: http://localhost:8000")
        print(f"Press Ctrl+C to stop")
        try:
            subprocess.run(['python3','-m','http.server','8000'])
        except KeyboardInterrupt:
            print(f"\n{C.Y}Server stopped{C.N}")
            
    elif choice=='7':  # Tree
        if shutil.which('tree'):
            subprocess.run(['tree','-L','3'])
        else:
            # Simple Python tree
            def show_tree(path,prefix='',depth=0):
                if depth>2:return
                items=sorted(os.listdir(path))
                for i,item in enumerate(items):
                    full=os.path.join(path,item)
                    is_last=i==len(items)-1
                    print(f"{prefix}{'└── ' if is_last else '├── '}{item}")
                    if os.path.isdir(full):
                        show_tree(full,prefix+('    ' if is_last else '│   '),depth+1)
            show_tree('.')
            
    elif choice=='8':  # Hash
        files=file_selector('*.*')
        if not files:return
        if not isinstance(files,list):files=[files]
        
        print("\n1. MD5")
        print("2. SHA256")
        algo=input("Choice: ").strip()
        
        for f in files:
            with open(f,'rb') as file:
                if algo=='1':
                    h=hashlib.md5(file.read()).hexdigest()
                else:
                    h=hashlib.sha256(file.read()).hexdigest()
                print(f"{C.G}{h}{C.N}  {f}")
                
    elif choice=='9':  # Backup
        timestamp=datetime.now().strftime('%Y%m%d_%H%M%S')
        name=f"backup_{timestamp}.tar.gz"
        print(f"Creating {name}...")
        subprocess.run(['tar','-czf',name,'.'])
        success(name)
        
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

# ==============================================================================
# 7. WEB & DOWNLOAD
# ==============================================================================

def web_tools():
    header("WEB & DOWNLOAD TOOLS")
    print("1. 📺 YouTube Download (yt-dlp)")
    print("2. 🕷️  Scrape Images from URL")
    print("3. 🔗 Extract All Links")
    print("4. 📄 Download Webpage")
    print("5. 🎵 Audio from URL")
    print("6. 📋 Playlist Download")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    if choice=='1':  # YouTube
        if not shutil.which('yt-dlp'):
            print(f"{C.R}yt-dlp not found. Install: pip install yt-dlp{C.N}")
            pause()
            return
        
        url=input("URL: ").strip()
        print("\n1. Best Quality")
        print("2. 1080p")
        print("3. 720p")
        print("4. Audio Only (MP3)")
        q=input("Quality: ").strip()
        
        if q=='1':
            subprocess.run(['yt-dlp','-f','bestvideo+bestaudio',url])
        elif q=='2':
            subprocess.run(['yt-dlp','-f','bestvideo[height<=1080]+bestaudio',url])
        elif q=='3':
            subprocess.run(['yt-dlp','-f','bestvideo[height<=720]+bestaudio',url])
        elif q=='4':
            subprocess.run(['yt-dlp','-x','--audio-format','mp3',url])
        success("Downloaded")
        
    elif choice=='2':  # Scrape images
        url=input("URL: ").strip()
        print("Downloading images...")
        subprocess.run(['wget','-r','-l','1','-H','-nd','-A','jpg,jpeg,png,gif',url])
        success("Images downloaded")
        
    elif choice=='3':  # Extract links
        url=input("URL: ").strip()
        import urllib.request
        html=urllib.request.urlopen(url).read().decode()
        links=re.findall(r'href=["\'](.*?)["\']',html)
        
        print(f"\n{C.C}Found {len(links)} links:{C.N}")
        for link in set(links):
            print(link)
        
        save=input("\nSave to file? [y/N]: ").strip().lower()
        if save=='y':
            with open('links.txt','w') as f:
                f.write('\n'.join(set(links)))
            success("links.txt")
            
    elif choice=='4':  # Download page
        url=input("URL: ").strip()
        subprocess.run(['wget','-p','-k',url])
        success("Downloaded")
        
    elif choice=='5':  # Audio URL
        url=input("Audio URL: ").strip()
        name=input("Output name [audio.mp3]: ").strip() or "audio.mp3"
        subprocess.run(['wget','-O',name,url])
        success(name)
        
    elif choice=='6':  # Playlist
        if not shutil.which('yt-dlp'):
            print(f"{C.R}yt-dlp not found{C.N}")
            pause()
            return
        
        url=input("Playlist URL: ").strip()
        subprocess.run(['yt-dlp','-o','%(playlist_index)s-%(title)s.%(ext)s',url])
        success("Playlist downloaded")
        
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

# ==============================================================================
# 8. REPORT GENERATOR
# ==============================================================================

def report_tools():
    header("REPORT & DOCUMENT GENERATOR")
    print("1. 📊 Generate PDF Report")
    print("2. 📋 Markdown to HTML")
    print("3. 📄 Text to PDF")
    print("4. 🖼️  Images to PDF")
    print("0. Back")
    
    choice=input(f"\n{C.W}Choice: {C.N}").strip()
    
    try:
        from reportlab.lib.pagesizes import letter,A4
        from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Image as RLImage
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
    except ImportError:
        print(f"{C.R}Requires reportlab: pip install reportlab{C.N}")
        pause()
        return
    
    if choice=='1':  # PDF Report
        title=input("Report title: ").strip()
        author=input("Author: ").strip() or "Anonymous"
        
        doc=SimpleDocTemplate("report.pdf",pagesize=letter)
        story=[]
        styles=getSampleStyleSheet()
        
        story.append(Paragraph(title,styles['Title']))
        story.append(Spacer(1,0.2*inch))
        story.append(Paragraph(f"By {author}",styles['Normal']))
        story.append(Spacer(1,0.5*inch))
        
        print("\nEnter content (empty line to finish):")
        lines=[]
        while True:
            line=input()
            if not line:break
            lines.append(line)
        
        for line in lines:
            story.append(Paragraph(line,styles['BodyText']))
            story.append(Spacer(1,0.1*inch))
        
        doc.build(story)
        success("report.pdf")
        
    elif choice=='2':  # Markdown to HTML
        files=file_selector('*.md')
        if not files:return
        if not isinstance(files,list):files=[files]
        
        try:
            import markdown
        except:
            print(f"{C.R}Requires markdown: pip install markdown{C.N}")
            pause()
            return
        
        for f in files:
            with open(f) as mdf:
                html=markdown.markdown(mdf.read())
            
            out=f"{Path(f).stem}.html"
            with open(out,'w') as htmlf:
                htmlf.write(f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{Path(f).stem}</title>
<style>body{{font-family:sans-serif;max-width:800px;margin:2em auto;padding:1em;line-height:1.6}}</style>
</head><body>{html}</body></html>""")
            success(out)
            
    elif choice=='3':  # Text to PDF
        files=file_selector('*.txt')
        if not files:return
        if not isinstance(files,list):files=[files]
        
        for f in files:
            doc=SimpleDocTemplate(f"{Path(f).stem}.pdf",pagesize=letter)
            story=[]
            styles=getSampleStyleSheet()
            
            with open(f) as txt:
                for line in txt:
                    if line.strip():
                        story.append(Paragraph(line.strip(),styles['Normal']))
                        story.append(Spacer(1,0.1*inch))
            
            doc.build(story)
            success(f"{Path(f).stem}.pdf")
            
    elif choice=='4':  # Images to PDF
        files=file_selector(['*.jpg','*.jpeg','*.png'])
        if not files:return
        if not isinstance(files,list):files=[files]
        
        doc=SimpleDocTemplate("images.pdf",pagesize=A4)
        story=[]
        
        for f in files:
            try:
                img=RLImage(f,width=6*inch,height=8*inch,kind='proportional')
                story.append(img)
                story.append(Spacer(1,0.5*inch))
            except:
                error(f"Skipped {f}")
        
        doc.build(story)
        success("images.pdf")
        
    elif choice=='0':return
    else:error("Invalid choice")
    
    pause()

# ==============================================================================
# MAIN MENU
# ==============================================================================

def main():
    check_deps()
    
    while True:
        header("SUPER-TOOL v6.0 - Python Edition")
        print(f"{C.C}1.{C.N} 🖼️  Image Analytics & Sorting")
        print(f"{C.C}2.{C.N} 📄 PDF Engineering")
        print(f"{C.C}3.{C.N} 📺 Video & Media Tools")
        print(f"{C.C}4.{C.N} 🎨 Image Processing")
        print(f"{C.C}5.{C.N} 📊 Data & Text Tools")
        print(f"{C.C}6.{C.N} 🛠️  System Utilities")
        print(f"{C.C}7.{C.N} 🌐 Web & Download")
        print(f"{C.C}8.{C.N} 📋 Report Generator")
        print(f"{C.C}0.{C.N} Exit")
        
        choice=input(f"\n{C.BOLD}{C.W}Choice: {C.N}").strip()
        
        if choice=='1':image_analytics()
        elif choice=='2':pdf_tools()
        elif choice=='3':media_tools()
        elif choice=='4':image_tools()
        elif choice=='5':data_tools()
        elif choice=='6':system_tools()
        elif choice=='7':web_tools()
        elif choice=='8':report_tools()
        elif choice=='0':
            print(f"\n{C.G}Goodbye!{C.N}")
            break
        else:
            print(f"{C.R}Invalid choice{C.N}")
            time.sleep(1)

if __name__=='__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{C.Y}Interrupted by user{C.N}")
        sys.exit(0)
