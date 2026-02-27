import os,sys,csv,re,subprocess,pikepdf,hashlib,zlib,base64
from pikepdf import Pdf,Name,Array,Dictionary,Stream
from PIL import Image,ImageChops,ImageEnhance,ImageDraw,ImageFont
from glob import glob
from datetime import datetime
from collections import defaultdict,Counter
import io

Image.MAX_IMAGE_PIXELS=None
EXPAND_SIZE=[-150,-150,300,300]  # FIXED: Reasonable expansion (not -1000!)
ELA_QUALITY,ELA_SCALE=95,20

def log(m):print(f"[>] {m}")
def cmd(c):
    try:return subprocess.check_output(c,shell=True,stderr=subprocess.STDOUT).decode('utf-8','ignore').strip()
    except:return"Error"

def perform_ela(ip,od):
    try:
        if not os.path.exists(ip):return"Missing"
        o=Image.open(ip).convert('RGB');fn=os.path.basename(ip)
        tmp=os.path.join(od,f"tmp_{fn}.jpg");o.save(tmp,'JPEG',quality=ELA_QUALITY)
        r=Image.open(tmp);e=ImageChops.difference(o,r);ex=e.getextrema()
        md=max([x[1]for x in ex]);md=1 if md==0 else md
        e=ImageEnhance.Brightness(e).enhance((255.0/md)*ELA_SCALE)
        sp=os.path.join(od,f"ELA_{fn}.png");e.save(sp);os.remove(tmp)
        return f"ELA_{fn}.png"
    except Exception as e:return f"ELA Err:{e}"

# === FIXED: Robust Image Extraction with Transparency Support ===
def extract_images_enhanced(pdf,output_dir,rd):
    """Fixed image extraction - handles inline, masked, transparency"""
    total=0;img_metadata=[]
    
    for pg_num,page in enumerate(pdf.pages,1):
        page_imgs=0
        
        # Extract from XObject resources
        if'/Resources'in page and'/XObject'in page.Resources:
            for img_name,img_obj in page.Resources.XObject.items():
                if img_obj.get('/Subtype')=='/Image':
                    try:
                        # Use pikepdf's PdfImage
                        pdf_image=pikepdf.PdfImage(img_obj)
                        
                        # Get image properties
                        w=img_obj.get('/Width',0)
                        h=img_obj.get('/Height',0)
                        bpc=img_obj.get('/BitsPerComponent',0)
                        cs=str(img_obj.get('/ColorSpace','Unknown'))
                        filt=str(img_obj.get('/Filter','None'))
                        
                        # Determine if transparency exists
                        has_mask='/Mask'in img_obj or'/SMask'in img_obj
                        
                        # Choose extension based on transparency
                        if has_mask or'RGBA'in str(pdf_image.mode):
                            ext='png'  # Preserve alpha
                        else:
                            ext=pdf_image.extension if pdf_image.extension else'png'
                        
                        fn=f"p{pg_num:02d}_img{total+1:03d}_{img_name.strip('/')}.{ext}"
                        fp=os.path.join(output_dir,fn)
                        
                        # METHOD 1: Try PIL conversion (best for transparency)
                        try:
                            pil_img=pdf_image.as_pil_image()
                            pil_img.save(fp)
                            success=True
                        except:
                            # METHOD 2: Fallback to raw extraction
                            try:
                                with open(fp,'wb')as f:
                                    pdf_image.extract_to(stream=f)
                                success=True
                            except:
                                success=False
                        
                        if success:
                            # Record metadata
                            img_metadata.append({
                                'page':pg_num,
                                'file':fn,
                                'size':f"{w}x{h}",
                                'bpc':bpc,
                                'colorspace':cs,
                                'filter':filt,
                                'alpha':'Yes'if has_mask else'No'
                            })
                            total+=1;page_imgs+=1
                    
                    except Exception as e:
                        rd.append(["Image Error",f"Page {pg_num} - {img_name}",str(e)[:100]])
                
                # Detect masks/transparency
                elif img_obj.get('/Subtype')=='/Image':
                    if'/Mask'in img_obj:
                        rd.append(["Alpha Mask",f"Page {pg_num}",f"{img_name} has hard mask"])
                    if'/SMask'in img_obj:
                        rd.append(["Soft Mask",f"Page {pg_num}",f"{img_name} has soft mask"])
        
        if page_imgs>0:
            rd.append(["Images per Page",f"Page {pg_num}",str(page_imgs)])
    
    # Statistics
    if img_metadata:
        rd.append(["Image Stats","Total Extracted",str(total)])
        
        cs_counts=Counter([x['colorspace']for x in img_metadata])
        for cs,cnt in cs_counts.most_common(3):
            rd.append(["Image ColorSpace",cs,f"{cnt} images"])
        
        filt_counts=Counter([x['filter']for x in img_metadata])
        for filt,cnt in filt_counts.most_common(3):
            rd.append(["Image Compression",filt,f"{cnt} images"])
        
        alpha_count=sum(1 for x in img_metadata if x['alpha']=='Yes')
        if alpha_count>0:
            rd.append(["Transparency","Images with Alpha",str(alpha_count)])
    
    return total

# === NEW: Full Text Extraction ===
def extract_full_text(pdf,output_dir,rd):
    """Extract ALL text including covered/hidden layers"""
    text_file=os.path.join(output_dir,"extracted_text.txt")
    all_text="";page_texts=[]
    
    with open(text_file,'w',encoding='utf-8',errors='ignore')as f:
        f.write("="*70+"\n")
        f.write("PDF FORENSICS - FULL TEXT EXTRACTION\n")
        f.write("="*70+"\n\n")
        
        for pg_num,page in enumerate(pdf.pages,1):
            f.write(f"\n{'─'*70}\n")
            f.write(f"PAGE {pg_num}\n")
            f.write(f"{'─'*70}\n\n")
            
            page_text=""
            
            # Extract from content streams
            try:
                if hasattr(page,'get_contents'):
                    content=page.get_contents().read_bytes()
                    
                    # Parse PDF text operators: (text) Tj, (text) ', (text) ", [(text)] TJ
                    patterns=[
                        rb'\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj',  # (text) Tj
                        rb'\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*\'',   # (text) '
                        rb'\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*"',    # (text) "
                        rb'\[\s*\(([^)]+)\)',                    # [(text)]
                    ]
                    
                    found_text=[]
                    for pattern in patterns:
                        matches=re.findall(pattern,content)
                        for match in matches:
                            try:
                                # Decode with multiple encodings
                                for enc in['utf-8','latin-1','cp1252']:
                                    try:
                                        decoded=match.decode(enc)
                                        # Clean escaped characters
                                        decoded=decoded.replace('\\(','(').replace('\\)',')')
                                        decoded=decoded.replace('\\\\','\\')
                                        found_text.append(decoded)
                                        break
                                    except:
                                        continue
                            except:
                                pass
                    
                    page_text=" ".join(found_text)
            except Exception as e:
                rd.append(["Text Extract Error",f"Page {pg_num}",str(e)[:80]])
            
            # Write to file
            if page_text.strip():
                f.write(page_text+"\n\n")
                page_texts.append(page_text)
                all_text+=page_text+" "
    
    # Statistics
    total_chars=len(all_text)
    total_words=len(all_text.split())
    pages_with_text=len(page_texts)
    
    rd.append(["Text Extraction","Output File","extracted_text.txt"])
    rd.append(["Text Stats","Total Characters",str(total_chars)])
    rd.append(["Text Stats","Total Words",str(total_words)])
    rd.append(["Text Stats","Pages with Text",f"{pages_with_text}/{len(pdf.pages)}"])
    
    return text_file,all_text

# === NEW: Advanced Pattern Detection (Email, Phone, IP, etc.) ===
def detect_patterns(pdf,extracted_text,rd):
    """Detect emails, phones, IPs, SSNs, credit cards, etc."""
    
    # Scan both extracted text AND raw streams
    scan_data=extracted_text
    
    for page in pdf.pages:
        try:
            scan_data+=" "+page.get_contents().read_bytes().decode('latin-1','ignore')
        except:
            pass
    
    # Pattern definitions
    patterns={
        'Email':r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'Phone':r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
        'IPv4':r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
        'URL':r'https?://[^\s<>"\)]+|www\.[^\s<>"\)]+',
        'SSN':r'\b\d{3}-\d{2}-\d{4}\b',
        'Credit Card':r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
        'Date':r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
        'Bitcoin':r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b',
        'MAC Address':r'\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b',
    }
    
    total_patterns=0
    
    for pattern_name,regex in patterns.items():
        matches=re.findall(regex,scan_data)
        
        # Deduplicate and clean
        unique=[]
        seen=set()
        for match in matches:
            # Handle tuple matches (from groups)
            if isinstance(match,tuple):
                match_str=''.join(match)
            else:
                match_str=match
            
            # Basic validation
            if match_str and match_str not in seen:
                # Skip common false positives
                if pattern_name=='IPv4'and match_str.startswith('0.'):
                    continue
                if pattern_name=='Email'and'@example'in match_str.lower():
                    continue
                
                seen.add(match_str)
                unique.append(match_str)
        
        if unique:
            rd.append(["Pattern Detection",pattern_name,f"Found {len(unique)} unique"])
            total_patterns+=len(unique)
            
            # Add samples (first 5)
            for i,sample in enumerate(unique[:5],1):
                rd.append([pattern_name,f"#{i}",str(sample)])
            
            if len(unique)>5:
                rd.append([pattern_name,"...","(see extracted_text.txt for all)"])
    
    rd.append(["Pattern Summary","Total Patterns Found",str(total_patterns)])
    return total_patterns

def extract_javascript(pdf,rd):
    js_items=[];seen=set()
    if'/Names'in pdf.Root and'/JavaScript'in pdf.Root.Names:
        try:
            js_tree=pdf.Root.Names.JavaScript
            if'/Names'in js_tree:
                names=js_tree.Names
                for i in range(0,len(names),2):
                    name,action=names[i],names[i+1]
                    if'/JS'in action:
                        js_code=str(action.JS)
                        if js_code not in seen:
                            seen.add(js_code)
                            js_items.append(["Document Level",str(name),js_code[:200]])
        except:pass
    for i,pg in enumerate(pdf.pages):
        for action_key in['/AA','/A']:
            if action_key in pg:
                try:
                    act=pg[action_key]
                    if'/JS'in act:
                        js_code=str(act.JS)
                        if js_code not in seen:
                            seen.add(js_code)
                            js_items.append([f"Page {i+1}",action_key,js_code[:200]])
                except:pass
    if'/AcroForm'in pdf.Root and'/Fields'in pdf.Root.AcroForm:
        try:
            for field in pdf.Root.AcroForm.Fields:
                if'/AA'in field:
                    for k,v in field.AA.items():
                        if'/JS'in v:
                            js_code=str(v.JS)
                            if js_code not in seen:
                                seen.add(js_code)
                                js_items.append(["Form Field",str(k),js_code[:200]])
        except:pass
    for item in js_items:rd.append(["JavaScript"]+item)
    return len(js_items)

def parse_incremental_updates(fp,rd):
    with open(fp,'rb')as f:raw=f.read()
    eof_positions=[m.start()for m in re.finditer(b'%%EOF',raw)]
    if len(eof_positions)>1:
        rd.append(["Incremental Updates","Versions Found",str(len(eof_positions))])
        for i,pos in enumerate(eof_positions):
            chunk=raw[max(0,pos-500):pos]
            xref_match=re.search(b'xref\s+(\d+)\s+(\d+)',chunk)
            if xref_match:
                rd.append(["Version",f"Update {i+1}",f"Objects: {xref_match.group(2).decode()}"])
            info_match=re.search(b'/ModDate\s*\(([^)]+)\)',chunk)
            if info_match:
                rd.append(["Version",f"Modified {i+1}",info_match.group(1).decode('latin-1')])
    return len(eof_positions)

def analyze_fonts(pdf,rd):
    fonts=set();font_details=[]
    for i,pg in enumerate(pdf.pages):
        if'/Resources'in pg and'/Font'in pg.Resources:
            for fname,fobj in pg.Resources.Font.items():
                font_name=str(fobj.get('/BaseFont','Unknown'))
                font_type=str(fobj.get('/Subtype','Unknown'))
                embedded='Yes'if'/FontDescriptor'in fobj else'No'
                font_sig=f"{font_name}|{font_type}|{embedded}"
                if font_sig not in fonts:
                    fonts.add(font_sig)
                    font_details.append([font_name,font_type,embedded,f"First: p{i+1}"])
    for fd in font_details:rd.append(["Font"]+fd)
    return len(fonts)

def extract_embedded_files(pdf,od,rd):
    cnt=0
    if'/Names'in pdf.Root and'/EmbeddedFiles'in pdf.Root.Names:
        try:
            ef_tree=pdf.Root.Names.EmbeddedFiles
            if'/Names'in ef_tree:
                names=ef_tree.Names
                for i in range(0,len(names),2):
                    fname,fspec=names[i],names[i+1]
                    if'/EF'in fspec and'/F'in fspec.EF:
                        stream=fspec.EF.F
                        data=stream.read_bytes()
                        safe_name=re.sub(r'[^\w\-.]','_',str(fname))
                        save_path=os.path.join(od,f"embedded_{safe_name}")
                        with open(save_path,'wb')as f:f.write(data)
                        rd.append(["Embedded File",safe_name,f"Size: {len(data)} bytes"])
                        cnt+=1
        except Exception as e:rd.append(["Error","Embedded Files",str(e)])
    return cnt

def analyze_text_layers(pdf,rd):
    suspicious=[]
    for i,pg in enumerate(pdf.pages):
        try:
            text_content=pg.get_contents().read_bytes()if hasattr(pg,'get_contents')else b''
            patterns=[
                (b'3 Tr',b'Text Rendering Mode 3 (invisible)'),
                (b'0 g\s*0 G',b'White on white'),
                (b'Tm\s*\[\s*\]',b'Empty text positioning'),
                (b'/OCGs',b'Optional Content (layers)')
            ]
            for pattern,desc in patterns:
                if re.search(pattern,text_content):
                    suspicious.append([f"Page {i+1}",desc.decode()])
        except:pass
    for s in suspicious:rd.append(["Hidden Text"]+s)
    return len(suspicious)

def extract_actions_links(pdf,rd):
    links=[]
    for i,pg in enumerate(pdf.pages):
        if'/Annots'in pg:
            for annot in pg.Annots:
                try:
                    if'/A'in annot and'/URI'in annot.A:
                        uri=str(annot.A.URI)
                        links.append([f"Page {i+1}","URI",uri])
                    elif'/A'in annot and'/S'in annot.A:
                        action_type=str(annot.A.S)
                        links.append([f"Page {i+1}","Action",action_type])
                    if'/A'in annot and'/F'in annot.A:
                        remote=str(annot.A.F)
                        links.append([f"Page {i+1}","Remote File",remote])
                except:pass
    for lnk in links:rd.append(["Link/Action"]+lnk)
    return len(links)

def extract_form_fields(pdf,rd):
    fields=[]
    if'/AcroForm'in pdf.Root and'/Fields'in pdf.Root.AcroForm:
        try:
            for field in pdf.Root.AcroForm.Fields:
                fname=str(field.get('/T','Unnamed'))
                ftype=str(field.get('/FT','Unknown'))
                fvalue=str(field.get('/V',''))
                flags=field.get('/Ff',0)
                hidden='Yes'if(int(flags)&2)else'No'
                fields.append([fname,ftype,fvalue[:50],f"Hidden:{hidden}"])
        except:pass
    for f in fields:rd.append(["Form Field"]+f)
    return len(fields)

def fingerprint_software(pdf,rd):
    indicators=[]
    for obj in pdf.objects:
        if isinstance(obj,Stream):
            try:
                data=obj.read_bytes()[:1000]
                sigs={
                    b'Adobe':('Adobe','Adobe Acrobat/Reader'),
                    b'Microsoft':('Microsoft','MS Office'),
                    b'LibreOffice':('LibreOffice','LibreOffice'),
                    b'iText':('iText','iText Library'),
                    b'PDFKit':('PDFKit','PDFKit'),
                    b'ReportLab':('ReportLab','ReportLab'),
                    b'wkhtmltopdf':('wkhtmltopdf','WebKit HTML to PDF'),
                    b'Ghostscript':('Ghostscript','Ghostscript')
                }
                for sig,info in sigs.items():
                    if sig in data:
                        if info[0]not in[x[1]for x in indicators]:
                            indicators.append(["Stream Signature",info[0],info[1]])
            except:pass
    for ind in indicators:rd.append(["Software Fingerprint"]+ind)
    return len(indicators)

def detect_anomalies(pdf,rd):
    obj_sizes=[];stream_types=Counter()
    for obj in pdf.objects:
        try:
            if isinstance(obj,Stream):
                size=len(obj.read_bytes())
                obj_sizes.append(size)
                if'/Filter'in obj:
                    filt=str(obj.Filter)
                    stream_types[filt]+=1
        except:pass
    if obj_sizes:
        avg=sum(obj_sizes)/len(obj_sizes)
        max_size=max(obj_sizes)
        rd.append(["Statistics","Total Objects",str(len(pdf.objects))])
        rd.append(["Statistics","Avg Stream Size",f"{int(avg)} bytes"])
        rd.append(["Statistics","Largest Stream",f"{max_size} bytes"])
        outliers=[s for s in obj_sizes if s>avg*10]
        if outliers:
            rd.append(["Anomaly","Large Objects",f"{len(outliers)} streams >10x average"])
    for ftype,cnt in stream_types.most_common(5):
        rd.append(["Compression",ftype,f"Count: {cnt}"])
    return len(stream_types)

# === MAIN ANALYSIS ===
def analyze_pdf(tf):
    ts=datetime.now().strftime("%H%M%S")
    bd=f"Forensics_{tf}_{ts}"
    dirs={
        "root":bd,
        "images":os.path.join(bd,"Images"),
        "renders_original":os.path.join(bd,"Renders_Original"),  # NEW: Separate dirs
        "renders_expanded":os.path.join(bd,"Renders_Expanded"),
        "ela":os.path.join(bd,"ELA"),
        "modified":os.path.join(bd,"Modified_PDFs"),
        "embedded":os.path.join(bd,"Embedded_Files"),
        "text":os.path.join(bd,"Text")  # NEW: Text output
    }
    for d in dirs.values():os.makedirs(d,exist_ok=True)
    
    rd=[]
    
    # ExifTool
    log("ExifTool...")
    exif=cmd(f'exiftool "{tf}"')
    for line in exif.splitlines():
        if":"in line:
            k,v=line.split(":",1)
            rd.append(["ExifTool",k.strip(),v.strip()])
    
    try:pdf=pikepdf.Pdf.open(tf)
    except Exception as e:
        log(f"CRITICAL: {e}");return
    
    # Structure
    log("Structure Analysis...")
    parse_incremental_updates(tf,rd)
    
    # FIXED: Image Extraction with Transparency
    log("Image Extraction (Enhanced)...")
    total_imgs=extract_images_enhanced(pdf,dirs['images'],rd)
    log(f"✓ Extracted {total_imgs} images")
    
    # NEW: Full Text Extraction
    log("Text Extraction (Full)...")
    text_file,extracted_text=extract_full_text(pdf,dirs['text'],rd)
    log(f"✓ Text saved to {text_file}")
    
    # NEW: Pattern Detection
    log("Pattern Detection (Email, Phone, IP, etc.)...")
    pattern_count=detect_patterns(pdf,extracted_text,rd)
    log(f"✓ Found {pattern_count} pattern matches")
    
    # FIXED: Render ORIGINAL first, then do ELA ONLY on originals
    log("Rendering Original Pages...")
    subprocess.call(["pdftoppm","-png","-rx","100","-ry","100",tf,
                    os.path.join(dirs['renders_original'],"page")],
                   stderr=subprocess.DEVNULL)
    
    # FIXED: ELA only on ORIGINAL renders
    log("ELA on Original Renders...")
    ela_count=0
    for imgf in glob(os.path.join(dirs['renders_original'],"*.png")):
        perform_ela(imgf,dirs['ela'])
        ela_count+=1
    
    # Also ELA on extracted images
    for imgf in glob(os.path.join(dirs['images'],"*")):
        if imgf.lower().endswith(('.png','.jpg','.jpeg')):
            perform_ela(imgf,dirs['ela'])
            ela_count+=1
    
    rd.append(["ELA Analysis","Images Analyzed",str(ela_count)])
    log(f"✓ ELA completed on {ela_count} images")
    
    # FIXED: Moderate Expansion (not -1000!)
    log("Geometry Expansion (Moderate)...")
    exp_path=os.path.join(dirs['modified'],"expanded.pdf")
    try:
        pdf_exp=pikepdf.Pdf.open(tf)
        for pg in pdf_exp.pages:
            pg.MediaBox=Array(EXPAND_SIZE)
            if'/CropBox'in pg:del pg['/CropBox']
        pdf_exp.save(exp_path)
        rd.append(["Geometry","Expansion Size",f"{EXPAND_SIZE}"])
        rd.append(["Geometry","Expanded PDF","expanded.pdf"])
        
        # Render expanded (NO ELA on these - just for viewing)
        subprocess.call(["pdftoppm","-png","-rx","72","-ry","72",exp_path,
                        os.path.join(dirs['renders_expanded'],"page")],
                       stderr=subprocess.DEVNULL)
        log("✓ Expanded PDF rendered (view to see hidden content)")
    except Exception as e:
        rd.append(["Error","Expansion",str(e)])
    
    # Other analyses
    log("JavaScript Analysis...")
    js_cnt=extract_javascript(pdf,rd)
    log(f"✓ Found {js_cnt} JS items")
    
    log("Font Analysis...")
    font_cnt=analyze_fonts(pdf,rd)
    log(f"✓ Found {font_cnt} fonts")
    
    log("Embedded Files...")
    emb_cnt=extract_embedded_files(pdf,dirs['embedded'],rd)
    log(f"✓ Extracted {emb_cnt} embedded files")
    
    log("Hidden Text Analysis...")
    hidden_cnt=analyze_text_layers(pdf,rd)
    log(f"✓ Found {hidden_cnt} suspicious text patterns")
    
    log("Links & Actions...")
    link_cnt=extract_actions_links(pdf,rd)
    log(f"✓ Found {link_cnt} links/actions")
    
    log("Form Fields...")
    form_cnt=extract_form_fields(pdf,rd)
    log(f"✓ Found {form_cnt} form fields")
    
    log("Software Fingerprinting...")
    fp_cnt=fingerprint_software(pdf,rd)
    log(f"✓ Found {fp_cnt} software signatures")
    
    log("Anomaly Detection...")
    detect_anomalies(pdf,rd)
    
    # Save Report
    csv_path=os.path.join(dirs['root'],"Final_Report.csv")
    with open(csv_path,'w',newline='',encoding='utf-8')as f:
        w=csv.writer(f)
        w.writerow(["Category","Item","Value"])
        w.writerows(rd)
    
    log(f"\n{'═'*60}")
    log(f"ANALYSIS COMPLETE")
    log(f"{'═'*60}")
    log(f"Report: {csv_path}")
    log(f"Text: {text_file}")
    log(f"Images: {total_imgs} extracted to Images/")
    log(f"ELA: {ela_count} images analyzed in ELA/")
    log(f"Total Categories: {len(set(x[0]for x in rd))}")
    log(f"{'═'*60}\n")

# === MENU ===
if __name__=="__main__":
    os.system('clear')
    files=glob("*.pdf");files.sort(key=os.path.getmtime,reverse=True)
    
    if not files:print(" No PDFs found in current directory.");sys.exit()
    
    print("╔═══════════════════════════════════════════════════╗")
    print("║   PDF FORENSICS PRO v4.1 (FIXED)                 ║")
    print("║   Professional-Grade Mobile Analysis              ║")
    print("╚═══════════════════════════════════════════════════╝")
    print("─"*53)
    for i,f in enumerate(files):
        sz=os.path.getsize(f)/1024
        print(f"  {i+1:2d}. {f:35s} ({sz:>7.1f} KB)")
    print("─"*53)
    
    try:
        sel=int(input("\n Select File (1-{}): ".format(len(files))))-1
        if 0<=sel<len(files):
            print(f"\n Analyzing: {files[sel]}\n")
            analyze_pdf(files[sel])
        else:
            print("Invalid selection")
    except(ValueError,KeyboardInterrupt):
        print("\n Cancelled")
