javascript:(function(){
  // --- Optimized state and settings ---
  const v=new Set(),q=[],r={p:new Set(),m:new Set(),t:new Set(),s:[]};
  let c=false,p=false,pc=0,qc=0,af=0;
  let startTime = 0; // Declare and initialize startTime
  const s={
    d:3,cc:5,ie:false,rr:true,to:10000,fs:true,tt:false
  };

  // --- Create optimized UI ---
  const ui=document.createElement('div');
  ui.id='web-crawler-ui';
  ui.style.cssText=`position:fixed;top:0;left:0;width:100%;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.3;color:#fff; text-align:left;`;

  const tb=document.createElement('div');
  tb.style.cssText=`background-color:#222;padding:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;box-shadow:0 2px 5px rgba(0,0,0,0.3)`;

  const ch=`
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:4px">
      <span>Depth:</span>
      <input type="number" id="crawler-depth" min="1" max="10" value="${s.d}" style="width:40px;color:#000;background:#fff;border:1px solid #555;border-radius:3px;padding:2px 4px;">
      <span>Concurrent:</span>
      <input type="number" id="crawler-concurrent" min="1" max="20" value="${s.cc}" style="width:40px;color:#000;background:#fff;border:1px solid #555;border-radius:3px;padding:2px 4px;">
      <span>Timeout:</span>
      <input type="number" id="crawler-timeout" min="1000" max="30000" step="1000" value="${s.to}" style="width:60px;color:#000;background:#fff;border:1px solid #555;border-radius:3px;padding:2px 4px;">
      <label style="display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" id="crawler-external" ${s.ie?'checked':''}> External links</label>
      <label style="display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" id="crawler-robots" ${s.rr?'checked':''}> Respect robots.txt</label>
      <label style="display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" id="crawler-sitemap" ${s.fs?'checked':''}> Follow sitemap</label>
      <label style="display:inline-flex;align-items:center;gap:4px;"><input type="checkbox" id="crawler-thumbs" ${s.tt?'checked':''}> Generate thumbnails</label>
    </div>
  `;
  const bh=`
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      <button id="crawler-start" style="padding:4px 8px;background:#4CAF50;border:none;color:white;border-radius:4px;cursor:pointer">Start</button>
      <button id="crawler-pause" style="padding:4px 8px;background:#FFC107;border:none;color:black;border-radius:4px;cursor:pointer" disabled>Pause</button>
      <button id="crawler-stop" style="padding:4px 8px;background:#F44336;border:none;color:white;border-radius:4px;cursor:pointer" disabled>Stop</button>
      <button id="crawler-export-json" style="padding:4px 8px;background:#2196F3;border:none;color:white;border-radius:4px;cursor:pointer" disabled>Export JSON</button>
      <button id="crawler-export-sitemap" style="padding:4px 8px;background:#9C27B0;border:none;color:white;border-radius:4px;cursor:pointer" disabled>Export Sitemap/Report</button>
      <button id="crawler-clear" style="padding:4px 8px;background:#607D8B;border:none;color:white;border-radius:4px;cursor:pointer">Clear Log</button>
      <button id="crawler-close" style="padding:4px 8px;background:#555;border:none;color:white;border-radius:4px;cursor:pointer">Close</button>
    </div>
  `;
  tb.innerHTML=ch+bh;
  ui.appendChild(tb);

  const rc=document.createElement('div');
  rc.style.cssText=`max-height:300px;overflow-y:auto;background-color:rgba(0,0,0,0.85);padding:8px;display:none;box-sizing:border-box;`;
  ui.appendChild(rc);

  const sb=document.createElement('div');
  sb.style.cssText=`background-color:#333;padding:8px;display:flex;justify-content:space-between;align-items:center`;
  const st=document.createElement('div');
  st.textContent='Ready';
  st.style.color='#fff';
  const pb=document.createElement('div');
  pb.style.cssText=`flex-grow:1;margin:0 10px;height:8px;background-color:#444;border-radius:4px;overflow:hidden`;
  const pf=document.createElement('div');
  pf.style.cssText=`width:0%;height:100%;background-color:#4CAF50;transition:width 0.3s ease`;
  pb.appendChild(pf);
  sb.appendChild(st);
  sb.appendChild(pb);
  const ss=document.createElement('div');
  ss.textContent='URLs: 0';
  ss.style.color='#fff';
  sb.appendChild(ss);
  ui.appendChild(sb);
  document.body.appendChild(ui);

  function l(m,t='info'){
    const e=document.createElement('div');
    e.style.cssText=`padding:4px 0;border-bottom:1px solid #333;color:${t==='error'?'#F44336':t==='warning'?'#FFC107':'#fff'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
    e.textContent=m;
    e.title=m;
    if(rc.firstChild){
      rc.insertBefore(e,rc.firstChild);
    }else{
      rc.appendChild(e);
    }
    if(rc.style.display==='none'){
      rc.style.display='block';
    }
    console.log(`[Crawler] ${m}`);
  }

  function us(){
    ss.textContent=`Processed: ${pc} | Found: ${r.p.size} pages, ${r.m.size} media${r.t.size?', '+r.t.size+' thumbs':''}`;
    const progress=qc>0?(pc/qc)*100:0;
    pf.style.width=`${Math.min(progress,100)}%`;
    st.textContent=p?'Paused':c?'Crawling...':'Ready';
  }

  function isv(u){
    try{return Boolean(new URL(u))}catch(e){return false}
  }

  function iso(u){
    try{return new URL(u).origin===window.location.origin}catch(e){return false}
  }

  function nu(u){
    try{
      const pu=new URL(u,window.location.href);
      pu.hash='';
      const pr=['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','msclkid','ref','source','mc_cid','mc_eid','_ga','_gl','yclid','dclid','zanpid','igshid'];
      pr.forEach(p=>pu.searchParams.delete(p));
      const fe=['.jpg','.jpeg','.png','.gif','.webp','.svg','.pdf','.mp4','.webm','.mp3']; // Common file extensions whose params are often useless
      if(fe.some(e=>pu.pathname.toLowerCase().endsWith(e))){
        pu.search='';
      }
      return pu.href;
    }catch(e){return null}
  }

  function im(u){
    if(!u)return false;
    const me=['.jpg','.jpeg','.png','.gif','.webp','.svg','.ico','.bmp','.tiff','.mp4','.webm','.mov','.avi','.wmv','.flv','.ogg','.mp3','.wav','.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.zip','.rar','.tar','.gz','.7z'];
    const ul=u.toLowerCase();
    return me.some(e=>ul.endsWith(e));
  }

  function imty(u){
    if(!u)return null;
    const ul=u.toLowerCase();
    if(/\.(jpe?g|png|gif|webp|svg|ico|bmp|tiff)$/i.test(ul))return'image';
    if(/\.(mp4|webm|mov|avi|wmv|flv)$/i.test(ul))return'video';
    if(/\.(mp3|wav|ogg|flac)$/i.test(ul))return'audio';
    if(/\.(pdf|docx?|xlsx?|pptx?)$/i.test(ul))return'document';
    if(/\.(zip|rar|tar|gz|7z)$/i.test(ul))return'archive';
    return'other';
  }

  const rob={dp:[],l:false};
  async function lr(){
    if(!s.rr)return;
    rob.dp = []; rob.l = false; // Reset
    try{
      const res=await fetch(`${window.location.origin}/robots.txt`);
      if(!res.ok)return;
      const t=await res.text();
      const ln=t.split('\n');
      let u=false;
      for(const li of ln){
        const tr=li.trim().toLowerCase();
        if(tr.startsWith('user-agent:')){
          const a=tr.substring(11).trim();
          u=a==='*'||a.includes('googlebot') || a.includes('crawler') || a.includes('bot'); // Broader user-agent match
        }else if(u&&tr.startsWith('disallow:')){
          const p=tr.substring(9).trim();
          if(p)rob.dp.push(p);
        }
      }
      rob.l=true;
      l(`Loaded robots.txt with ${rob.dp.length} disallowed paths`);
    }catch(e){
      l(`Error loading robots.txt: ${e.message}`,'error');
    }
  }

  function iar(u){
    if(!s.rr||!rob.l)return true;
    try{
      const p=new URL(u).pathname;
      for(const d of rob.dp){
        if(d==='/') { if (p==='/') return false; continue; } // Handle root disallow
        if(p.startsWith(d))return false;
      }
      return true;
    }catch(e){
      return true;
    }
  }

  async function ps(){
    if(!s.fs)return;
    try{
      l('Checking for sitemap.xml...');
      const res=await fetch(`${window.location.origin}/sitemap.xml`);
      if(!res.ok){
        l('No sitemap.xml found','warning');
        return;
      }
      const t=await res.text();
      const p=new DOMParser();
      const x=p.parseFromString(t,'text/xml');
      const ur=x.querySelectorAll('url > loc');
      l(`Found ${ur.length} URLs in sitemap.xml`);
      for(const ue of ur){
        const u=ue.textContent;
        if(isv(u)){
          qu(u,0);
        }
      }
    }catch(e){
      l(`Error processing sitemap: ${e.message}`,'error');
    }
  }

  function eu(h,bu){
    const p=new DOMParser();
    const d=p.parseFromString(h,'text/html');
    const pu=new Set();
    
    d.querySelectorAll('a[href]').forEach(a=>{
      const hr=nu(a.getAttribute('href'));
      if(hr&&(s.ie||iso(hr))){
        if(im(hr)){
          r.m.add(hr);
          if(s.tt&&/\.(jpe?g|png|gif|webp|svg)$/i.test(hr)){
            gth(hr);
          }
        }else{
          pu.add(hr);
        }
      }
    });
    const ms=[
      ['script','src'],['link[rel="stylesheet"]','href'],['link[rel="alternate"]','href'],['link[rel="canonical"]','href'], // More specific link types
      ['img','src'],['img','srcset'],['source','src'],['source','srcset'], // Added srcset
      ['iframe','src'],['embed','src'],['object','data'],['video','src'],['video','poster'], // Added poster
      ['audio','src'],['track','src'],['input[type="image"]','src']
    ];
    ms.forEach(([sel,attr])=>{
      d.querySelectorAll(sel).forEach(el=>{
        const val=el.getAttribute(attr);
        if(!val) return;
        // Handle srcset by splitting and processing individual URLs
        if (attr === 'srcset') {
            val.split(',').forEach(part => {
                const url = nu(part.trim().split(/\s+/)[0]); // Get URL part from "url.jpg 100w"
                if(url) {
                    r.m.add(url);
                    if(s.tt && sel === 'img' && /\.(jpe?g|png|gif|webp|svg)$/i.test(url)){ gth(url); }
                }
            });
        } else {
            const sUrl=nu(val);
            if(sUrl){
              r.m.add(sUrl);
              if(s.tt&&attr==='src'&&sel==='img'&&/\.(jpe?g|png|gif|webp|svg)$/i.test(sUrl)){
                gth(sUrl);
              }
            }
        }
      });
    });
    try{
      Array.from(d.styleSheets||[]).forEach(ss=>{
        try{
          Array.from(ss.cssRules||[]).forEach(rule=>{
            if (rule.style && rule.style.backgroundImage) {
                const bgMatches = rule.style.backgroundImage.match(/url\(['"]?([^'"]+?)['"]?\)/g) || [];
                bgMatches.forEach(match => {
                    const url = match.replace(/url\(['"]?([^'"]+?)['"]?\)/, '$1');
                    const fullUrl = nu(url);
                    if (fullUrl && im(fullUrl)) r.m.add(fullUrl);
                });
            }
          });
        }catch(e){}
      });
    }catch(e){}
    
    fsi(h,bu);
    d.querySelectorAll('script').forEach(script => { if(script.textContent) fsi(script.textContent, bu); });
    d.querySelectorAll('style').forEach(style => { if(style.textContent) fsi(style.textContent, bu); });


    return[...pu];
  }

 function fsi(t, u) {
  const patterns = [
    {
      name: 'Generic API Key',
      regex: /\b(?:api_?key|api?-?key|access_?key|access?-?key|client_?secret|app_?secret|auth_?token|secret_?key|api_token|auth_key)\b\s*(?:[:=]|=>)\s*(?:['"]?)((?:[a-zA-Z0-9_\-\.]){24,})(?:['"]?)/gi,
      valueGroup: 1
    },
    {
      name: 'Authorization Bearer Token / JWT',
      regex: /\b(?:bearer|token|authorization)\s+([a-zA-Z0-9\-_=]+\.[a-zA-Z0-9\-_=]+\.[a-zA-Z0-9\-_=]+|[a-zA-Z0-9_\-\.]{30,})/gi,
      valueGroup: 1
    },
    {
      name: 'AWS Access Key ID',
      regex: /\b(AKIA[0-9A-Z]{16})\b/g,
      valueGroup: 1
    },
    {
      name: 'AWS Secret Access Key', // Often found in context, very generic pattern alone
      regex: /(?:AWS_SECRET_ACCESS_KEY|aws_secret_access_key|SecretAccessKey)\s*(?:[:=]|=>)\s*(?:['"]?)([a-zA-Z0-9/+=]{40})(?:['"]?)/gi,
      valueGroup: 1
    },
    {
      name: 'Google API Key (AIza)',
      regex: /\b(AIza[0-9A-Za-z_\-]{35})\b/g,
      valueGroup: 1
    },
    {
      name: 'GitHub Token (ghp, gho, ghu, ghs)',
      regex: /\b(gh[pous]_[a-zA-Z0-9]{36,251})\b/g,
      valueGroup: 1
    },
    {
      name: 'Stripe API Key (sk_live, pk_live, sk_test, pk_test)',
      regex: /\b((?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,})\b/g,
      valueGroup: 1
    },
    {
      name: 'Slack Token (xoxp, xoxb, xapp, xoxc)',
      regex: /\b(xox[pbc]|xapp)-[a-zA-Z0-9\-]{20,}\b/g, // Simplified general structure
      valueGroup: 0
    },
    {
      name: 'Private Key Block',
      regex: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----[\s\S]*?-----END (?:RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/gim,
      valueGroup: 0
    },
    {
      name: 'Password in Code/Config',
      regex: /\b(?:password|passwd|pwd|pass)\b\s*(?:[:=]|=>)\s*(?:['"]?)((?!\s*['"]?\s*$)[\S]{8,})(?:['"]?)/gi, // Value must have non-whitespace, min 8 chars
      valueGroup: 1
    },
    {
      name: 'Email (Labeled)',
      regex: /\b(?:email|mail|username|user)\b\s*(?:[:=]|=>)\s*(?:['"]?)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:['"]?)/gi,
      valueGroup: 1
    },
    {
      name: 'Connection String',
      regex: /\b(?:mongodb|postgres(?:ql)?|mysql|redis|jdbc|ldap|amqp|mqtt|oracle|sqlserver|sqlite|file|mariadb|ftp|sftp|ssh):\/\/[^\s'"<>()`]+/gi,
      valueGroup: 0
    },
    { // Generic high entropy string that might be a secret (use with caution, can be noisy)
      name: 'High Entropy String (Generic)',
      regex: /(?:['"]?)([a-zA-Z0-9/+]{32,})(?:['"]?)/g, // String of 32+ b64-like chars, possibly quoted
      valueGroup: 1,
      entropyThreshold: 3.5 // Optional: minimum Shannon entropy
    }
  ];

  const foundSecretsInText = new Set();

  for (const p of patterns) {
    let match;
    while ((match = p.regex.exec(t)) !== null) {
      let secretValue = match[p.valueGroup].trim();
      
      // Remove surrounding quotes if they are part of the capture group but not the secret itself
      // (Some regexes capture quotes, some don't. Standardize by removing if present)
      if ((secretValue.startsWith('"') && secretValue.endsWith('"')) || (secretValue.startsWith("'") && secretValue.endsWith("'"))) {
        secretValue = secretValue.substring(1, secretValue.length - 1);
      }

      if (!secretValue || secretValue.length < (p.minLength || 6)) { // Skip if empty or too short (use pattern's minLength or default)
        continue;
      }

      // Entropy check for generic patterns if specified
      if (p.entropyThreshold) {
        const shannonEntropy = (str) => {
          const len = str.length;
          if (len === 0) return 0;
          const map = {};
          for (let i = 0; i < len; i++) {
            map[str[i]] = (map[str[i]] || 0) + 1;
          }
          return Object.values(map).reduce((sum, freq) => {
            const prob = freq / len;
            return sum - prob * Math.log2(prob);
          }, 0);
        };
        if (shannonEntropy(secretValue) < p.entropyThreshold) {
          continue;
        }
      }

      if (foundSecretsInText.has(secretValue)) {
        continue;
      }

      const potentialSecret = {
        type: p.name,
        url: u,
        value: secretValue // Store full, trimmed, unquoted value
      };

      const isDuplicateInGlobalList = r.s.some(existingSecret =>
        existingSecret.type === potentialSecret.type &&
        existingSecret.url === potentialSecret.url &&
        existingSecret.value === potentialSecret.value
      );

      if (!isDuplicateInGlobalList) {
        r.s.push(potentialSecret);
        foundSecretsInText.add(secretValue);
        l(`Found potential ${p.name} in ${u}`, 'warning');
      }
    }
  }
}


  async function gth(u){
    try{
      if(!/\.(jpe?g|png|gif|webp|svg)$/i.test(u))return;
      const thumbUrl=new URL(u);
      thumbUrl.searchParams.set('thumb','1');
      thumbUrl.searchParams.set('w','100');
      thumbUrl.searchParams.set('h','100');
      const thu=thumbUrl.toString();
      r.t.add(thu);
    }catch(e){
      l(`Error generating thumbnail for ${u.substring(0,100)}: ${e.message}`,'error');
    }
  }

  function qu(u,d){
    const n=nu(u);
    if(!n)return;
    if(v.has(n))return;
    if(d>s.d)return;
    if(!iar(n)){
      l(`Skipped (robots.txt): ${n}`,'info');
      return;
    }
    v.add(n);
    q.push({u:n,d:d});
    qc++;
    us();
  }

  async function pnu(){
    if(!c||p||q.length===0||af>=s.cc){
      return;
    }
    
    const i=q.shift();
    af++;
    try{
      if(im(i.u)){
        r.m.add(i.u);
        if(s.tt&&/\.(jpe?g|png|gif|webp|svg)$/i.test(i.u)){
          gth(i.u);
        }
        pc++; af--; us(); setTimeout(pcq,0); // Media processed faster
        return;
      }
      
      const ct=new AbortController();
      const tid=setTimeout(()=>ct.abort(),s.to);
      const res=await fetch(i.u,{
        credentials:'omit', // Omit credentials for third-party requests to avoid CORB/CORS issues with credentials
        signal:ct.signal,
        headers:{
          'User-Agent':'Mozilla/5.0 (compatible; WebCrawlerBookmarklet/2.1; +https://github.com/user/repo)' // Example good UA
        }
      });
      clearTimeout(tid);
      
      if(!res.ok){
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const contentType=res.headers.get('content-type')||'';
      if(contentType.includes('text/html')){
        const h=await res.text();
        const ur=eu(h,i.u);
        r.p.add(i.u);
        l(`Crawled: ${i.u}`);
        ur.forEach(u=>qu(u,i.d+1));
      }else if(contentType.includes('javascript')||contentType.includes('text/javascript')||contentType.includes('application/javascript')||i.u.endsWith('.js')){
        const t=await res.text();
        fsi(t,i.u); // Scan JS content for secrets
        // Simple URL extraction from JS - can be improved
        const jsUrlRegex = /(?:['"`])(https?:\/\/[^'"`\s]+|\/[^'"`\s./][^'"`\s]*|\.\.\/[^'"`\s]*|\.\/[^'"`\s]*)(?:['"`])/g;
        let m;
        while((m = jsUrlRegex.exec(t)) !== null) {
            const extractedUrl = nu(m[1]);
            if (extractedUrl && (s.ie || iso(extractedUrl))) {
                if(im(extractedUrl)) r.m.add(extractedUrl); else qu(extractedUrl, i.d + 1);
            }
        }
        r.m.add(i.u); // Add the JS file itself as media
        l(`Parsed script: ${i.u}`);
      }else if(contentType.includes('css')||i.u.endsWith('.css')){
        const css=await res.text();
        fsi(css,i.u); // Scan CSS content for secrets (e.g. in comments)
        const urlRegex=/url\(['"]?([^'"]+?)['"]?\)/g;
        let m;
        while((m=urlRegex.exec(css))!==null){
          const cssUrl=nu(m[1]);
          if(cssUrl&&im(cssUrl)){
            r.m.add(cssUrl);
            if(s.tt&&/\.(jpe?g|png|gif|webp|svg)$/i.test(cssUrl)){ gth(cssUrl); }
          }
        }
        r.m.add(i.u); // Add the CSS file itself as media
        l(`Parsed CSS: ${i.u}`);
      }else{
        r.m.add(i.u); // Other content types treated as media
      }
      pc++;
    }catch(error){
      l(`Error crawling ${i.u.substring(0,100)}: ${error.message}`,'error');
    }finally{
      af--;
      us();
      setTimeout(pcq,0);
    }
  }

  function pcq(){
    if(!c||p)return;
    const a=s.cc-af;
    for(let i=0;i<a&&q.length>0;i++){ // Check q.length
      pnu();
    }
    if(af===0&&q.length===0){
      c=false;
      l('Crawl complete!');
      us();
      document.getElementById('crawler-start').disabled=false;
      document.getElementById('crawler-pause').disabled=true;
      document.getElementById('crawler-stop').disabled=true;
      document.getElementById('crawler-export-json').disabled=false;
      document.getElementById('crawler-export-sitemap').disabled=false;
    }else if (c && q.length > 0 && af < s.cc) { // If crawl active, items in queue, and workers available
        setTimeout(pcq, 50); // Check again soon if more work can be done
    } else if (c && q.length === 0 && af > 0) {
        // Waiting for active fetches to complete
    }
  }

  async function sc(){
    if(c)return;
    startTime = Date.now(); // Initialize startTime
    s.d=parseInt(document.getElementById('crawler-depth').value,10)||3;
    s.cc=parseInt(document.getElementById('crawler-concurrent').value,10)||5;
    s.to=parseInt(document.getElementById('crawler-timeout').value,10)||10000;
    s.ie=document.getElementById('crawler-external').checked;
    s.rr=document.getElementById('crawler-robots').checked;
    s.fs=document.getElementById('crawler-sitemap').checked;
    s.tt=document.getElementById('crawler-thumbs').checked;
    
    v.clear(); q.length=0; r.p.clear(); r.m.clear(); r.t.clear(); r.s=[]; // Reset results
    af=0; pc=0; qc=0; // Reset counters

    c=true; p=false;
    document.getElementById('crawler-start').disabled=true;
    document.getElementById('crawler-pause').disabled=false;
    document.getElementById('crawler-stop').disabled=false;
    document.getElementById('crawler-export-json').disabled=true;
    document.getElementById('crawler-export-sitemap').disabled=true;
    rc.innerHTML = ''; // Clear log display
    l('Starting enhanced crawl...');
    us();
    if(s.rr){
      await lr();
    }
    qu(window.location.href,0);
    if(s.fs){
      await ps();
    }
    pcq();
  }

  function tp(){
    p=!p;
    l(p?'Crawl paused':'Crawl resumed');
    us();
    if(!p){
      pcq();
    }
  }

  function stc(){
    c=false;
    p=false;
    q.length=0; // Clear queue
    l('Crawl stopped');
    us();
    document.getElementById('crawler-start').disabled=false;
    document.getElementById('crawler-pause').disabled=true;
    document.getElementById('crawler-stop').disabled=true;
    document.getElementById('crawler-export-json').disabled=r.p.size === 0 && r.m.size === 0; // Enable if there's data
    document.getElementById('crawler-export-sitemap').disabled=r.p.size === 0 && r.m.size === 0;
  }

  function ej(){
    const processingTimeMs = startTime ? Date.now()-startTime : 0;
    const d={
      site:window.location.origin,
      crawl_date:new Date().toISOString(),
      pages:Array.from(r.p).sort(),
      media:Array.from(r.m).sort(),
      thumbnails:s.tt?Array.from(r.t).sort():[],
      secrets:r.s,
      stats:{
        total_pages:r.p.size,
        total_media:r.m.size,
        total_thumbnails:r.t.size,
        total_secrets: r.s.length,
        processing_time_ms: processingTimeMs
      }
    };
    const j=JSON.stringify(d,null,2);
    df(j,'crawl-results.json','application/json');
  }

  function ex(t){ // HTML Escaper
    if (typeof t !== 'string') t = String(t);
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function es(){ // Export Sitemap and HTML Report
    const crawlEndTime = Date.now();
    const processingTimeMs = startTime ? crawlEndTime - startTime : 0;

    let pageSitemap=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    Array.from(r.p).sort().forEach(u=>{
      pageSitemap+=`  <url>
    <loc>${ex(u)}</loc>
    <lastmod>${new Date(crawlEndTime).toISOString().split('T')[0]}</lastmod>
  </url>
`;
    });
    pageSitemap+='</urlset>';
    
    let mediaSitemap=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
`;
    Array.from(r.m).sort().forEach(u=>{
      const t=imty(u);
      mediaSitemap+=`  <url>\n    <loc>${ex(u)}</loc>\n`;
      if(t==='image'){
        mediaSitemap+=`    <image:image>\n      <image:loc>${ex(u)}</image:loc>\n    </image:image>\n`;
      }else if(t==='video'){
        mediaSitemap+=`    <video:video>\n      <video:content_loc>${ex(u)}</video:content_loc>\n    </video:video>\n`;
      }
      mediaSitemap+=`  </url>\n`;
    });
    mediaSitemap+='</urlset>';

    let h=`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crawl Results - ${ex(window.location.hostname)}</title>
  <style>
    :root{--primary:#2196F3;--success:#4CAF50;--warning:#FFC107;--danger:#F44336;--dark:#222;--light:#f5f5f5; --text-main: #333; --text-light: #fff;}
    body{font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;margin:0;line-height:1.6;color:var(--text-main);background:var(--light); font-size:14px;}
    .container{padding:20px;max-width:1200px;margin:0 auto; background:#fff; box-shadow: 0 0 15px rgba(0,0,0,0.1); border-radius: 8px;}
    h1,h2{margin-top:25px;margin-bottom:15px;color:var(--dark); border-bottom: 2px solid var(--primary); padding-bottom: 5px;}
    h1{font-size:24px;} h2{font-size:20px;}
    pre{max-height:400px;overflow:auto;background:#2d2d2d;color:#f0f0f0;padding:15px;border-radius:4px;font-size:13px; white-space:pre-wrap; word-break:break-all;}
    ul{list-style-type:none;padding-left:0;margin:0;}
    li{margin-bottom:8px;word-break:break-all;border-bottom:1px solid #eee;padding:8px 0;}
    li:last-child{border-bottom:none;}
    .secret-item{background:#fff9c4;padding:12px;margin-bottom:12px;border-radius:4px;border-left:5px solid var(--warning); box-shadow: 0 2px 4px rgba(0,0,0,0.1);}
    .secret-item strong{color:var(--danger);}
    .secret-item pre{background:#fdf5e6; color: var(--text-main); max-height:100px; margin-top:5px;}
    a{color:var(--primary);text-decoration:none;} a:hover{text-decoration:underline;}
    .tab{overflow:hidden;border:1px solid #ccc;background-color:#f1f1f1;border-radius:4px 4px 0 0; margin-top:20px;}
    .tab button{background-color:inherit;float:left;border:none;outline:none;cursor:pointer;padding:12px 18px;transition:0.3s;font-weight:500; font-size:14px;}
    .tab button:hover{background-color:#ddd;}
    .tab button.active{background-color:var(--primary);color:var(--text-light);}
    .tabcontent{display:none;padding:15px;border:1px solid #ccc;border-top:none;border-radius:0 0 4px 4px; animation: fadeIn 0.5s;}
    @keyframes fadeIn{from{opacity:0} to{opacity:1}}
    .stats{background:var(--dark);color:var(--text-light);padding:20px;border-radius:4px;margin:20px 0;display:flex;flex-wrap:wrap;gap:20px;justify-content:space-around;}
    .stat-box{flex:1;min-width:150px;background:rgba(255,255,255,0.1);padding:15px;border-radius:4px;text-align:center;}
    .stat-num{font-size:28px;font-weight:bold;margin-bottom:5px;}
    .stat-label{font-size:13px;text-transform:uppercase;opacity:0.8;}
    .media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:15px;margin-top:15px;}
    .media-item{border:1px solid #ddd;border-radius:4px;overflow:hidden;display:flex;flex-direction:column; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1);}
    .media-img{height:120px;display:flex;align-items:center;justify-content:center;background:#f9f9f9;overflow:hidden;}
    .media-img img{max-width:100%;max-height:100%;object-fit:contain;transition:transform 0.2s ease-in-out;}
    .media-item:hover .media-img img{transform:scale(1.05);}
    .img-icon{font-size:48px;color:#ccc;}
    .media-info{padding:10px;font-size:12px;word-break:break-all;background:#f9f9f9;}
    .search-box{margin:15px 0;padding:0;display:flex;gap:10px;}
    .search-box input{flex:1;padding:10px;border:1px solid #ddd;border-radius:4px; font-size:14px;}
    button.dl-button{padding:8px 12px; background:var(--success);color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px; margin-right:10px;}
    button.dl-button:hover{opacity:0.9;}
    @media (max-width:768px){
      .stat-box{min-width:120px;} .stat-num{font-size:22px;} .stat-label{font-size:12px;}
      .media-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));}
      .tab button{padding:10px 14px; font-size:13px;}
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Crawl Results - ${ex(window.location.hostname)}</h1>
    <p>Date: ${new Date(crawlEndTime).toLocaleString()}</p>
    <div class="stats">
      <div class="stat-box"><div class="stat-num">${r.p.size}</div><div class="stat-label">Pages</div></div>
      <div class="stat-box"><div class="stat-num">${r.m.size}</div><div class="stat-label">Media</div></div>
      <div class="stat-box"><div class="stat-num">${s.tt?r.t.size:0}</div><div class="stat-label">Thumbnails</div></div>
      <div class="stat-box"><div class="stat-num">${r.s.length}</div><div class="stat-label">Potential Secrets</div></div>
      <div class="stat-box"><div class="stat-num">${(processingTimeMs/1000).toFixed(1)}s</div><div class="stat-label">Processing Time</div></div>
    </div>
    <div class="tab">
      <button class="tablinks active" onclick="openTab(event, 'pages')">Pages (${r.p.size})</button>
      <button class="tablinks" onclick="openTab(event, 'media')">Media (${r.m.size})</button>
      ${s.tt?`<button class="tablinks" onclick="openTab(event, 'thumbs')">Thumbnails (${r.t.size})</button>`:''}
      <button class="tablinks" onclick="openTab(event, 'secrets')">Secrets (${r.s.length})</button>
      <button class="tablinks" onclick="openTab(event, 'sitemaps')">Sitemaps</button>
      <button class="tablinks" onclick="openTab(event, 'json')">JSON Data</button>
    </div>
    <div id="pages" class="tabcontent" style="display:block;">
      <div class="search-box"><input type="text" id="pageSearch" onkeyup="filterList('pageSearch', 'pageList', 'li > a')" placeholder="Search pages..."></div>
      <ul id="pageList">${Array.from(r.p).sort().map(u=>`<li><a href="${ex(u)}" target="_blank">${ex(u)}</a></li>`).join('')}</ul>
    </div>
    <div id="media" class="tabcontent">
      <div class="search-box"><input type="text" id="mediaSearch" onkeyup="filterList('mediaSearch', 'mediaGrid', '.media-item')" placeholder="Search media..."></div>
      <div class="media-grid" id="mediaGrid">${Array.from(r.m).sort().map(u=>{
        const t=imty(u); const isImg=/\.(jpe?g|png|gif|webp|svg|ico)$/i.test(u);
        return `<div class="media-item" data-url="${ex(u)}">
          <div class="media-img">${isImg?`<img src="${ex(u)}" alt="Media" loading="lazy">`:`<div class="img-icon">${ex(t?t.charAt(0).toUpperCase():'?')}</div>`}</div>
          <div class="media-info"><a href="${ex(u)}" target="_blank">${ex(u.substring(u.lastIndexOf('/')+1))}</a><div>${ex(t||'unknown')}</div></div>
        </div>`;}).join('')}
      </div>
    </div>
    ${s.tt?`<div id="thumbs" class="tabcontent">
      <div class="search-box"><input type="text" id="thumbSearch" onkeyup="filterList('thumbSearch', 'thumbGrid', '.media-item')" placeholder="Search thumbnails..."></div>
      <div class="media-grid" id="thumbGrid">${Array.from(r.t).sort().map(u=>{
        const orig=u.replace(/[?&]thumb=1/,'').replace(/[?&]w=\d+/,'').replace(/[?&]h=\d+/,'');
        return `<div class="media-item" data-url="${ex(u)}">
          <div class="media-img"><img src="${ex(u)}" alt="Thumbnail" loading="lazy"></div>
          <div class="media-info"><a href="${ex(orig)}" target="_blank">${ex(orig.substring(orig.lastIndexOf('/')+1))}</a></div>
        </div>`;}).join('')}
      </div>
    </div>`:''}
    <div id="secrets" class="tabcontent">
      ${r.s.length>0?r.s.map(s=>`
        <div class="secret-item">
          <strong>${ex(s.type)} detected</strong><br>
          URL: <a href="${ex(s.url)}" target="_blank">${ex(s.url)}</a><br>
          Value: <pre>${ex(s.value)}</pre>
        </div>`).join(''):'<p>No potential secrets detected.</p>'}
    </div>
    <div id="sitemaps" class="tabcontent">
      <h2>Page Sitemap XML</h2>
      <p><button class="dl-button" onclick="downloadFile(pageSitemapData, 'sitemap-pages.xml', 'application/xml')">Download Page Sitemap</button>Copy and paste this sitemap XML.</p>
      <pre id="pageSitemapOutput"></pre>
      <h2>Media Sitemap XML</h2>
      <p><button class="dl-button" onclick="downloadFile(mediaSitemapData, 'sitemap-media.xml', 'application/xml')">Download Media Sitemap</button>Copy and paste this sitemap XML.</p>
      <pre id="mediaSitemapOutput"></pre>
    </div>
    <div id="json" class="tabcontent">
      <h2>JSON Export</h2>
      <p><button class="dl-button" onclick="downloadFile(jsonData, 'crawl-results.json', 'application/json')">Download JSON</button>Copy and paste this JSON.</p>
      <pre id="jsonOutput"></pre>
    </div>
  </div>
  <script>
    const jsonData = ${JSON.stringify({
      site:window.location.origin, crawl_date:new Date(crawlEndTime).toISOString(),
      pages:Array.from(r.p).sort(), media:Array.from(r.m).sort(),
      thumbnails:s.tt?Array.from(r.t).sort():[], secrets:r.s,
      stats:{total_pages:r.p.size, total_media:r.m.size, total_thumbnails:s.tt?r.t.size:0, total_secrets:r.s.length, processing_time_ms: processingTimeMs }
    },null,2)};
    const pageSitemapData = \`${pageSitemap.replace(/`/g, '\\`')}\`;
    const mediaSitemapData = \`${mediaSitemap.replace(/`/g, '\\`')}\`;

    function openTab(evt, tabName) {
      var i, tabcontent, tablinks;
      tabcontent = document.getElementsByClassName("tabcontent");
      for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; }
      tablinks = document.getElementsByClassName("tablinks");
      for (i = 0; i < tablinks.length; i++) { tablinks[i].className = tablinks[i].className.replace(" active", "");}
      document.getElementById(tabName).style.display = "block";
      evt.currentTarget.className += " active";
      if(tabName === "json") { document.getElementById("jsonOutput").textContent = JSON.stringify(jsonData, null, 2); }
      if(tabName === "sitemaps") { 
        document.getElementById("pageSitemapOutput").textContent = pageSitemapData;
        document.getElementById("mediaSitemapOutput").textContent = mediaSitemapData;
      }
    }
    function filterList(inputId, listContainerId, itemSelector) {
      const input = document.getElementById(inputId);
      const filter = input.value.toLowerCase();
      const listContainer = document.getElementById(listContainerId);
      const items = listContainer.querySelectorAll(itemSelector);
      items.forEach(item => {
        const textContent = item.textContent || item.innerText || item.getAttribute('data-url');
        item.style.display = textContent.toLowerCase().indexOf(filter) > -1 ? "" : "none";
      });
    }
    window.downloadFile = function(content, fileName, contentType) { // Make it global for inline onclick
      const a = document.createElement("a");
      const file = new Blob([content], {type: contentType});
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() { document.body.removeChild(a); window.URL.revokeObjectURL(a.href); }, 100);
    }
    // Activate the first tab
    document.querySelector('.tablinks.active').click();
  <\/script> 
</body></html>`;
    df(h,'crawl-report.html','text/html');
  }

  function df(c,n,t){ // Download File
    const b=new Blob([c],{type:t});
    const uRL=URL.createObjectURL(b);
    const a=document.createElement('a');
    a.href=uRL;
    a.download=n;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      document.body.removeChild(a);
      URL.revokeObjectURL(uRL);
    },100); // Increased timeout slightly
  }

  // --- Event listeners ---
  document.getElementById('crawler-start').addEventListener('click',sc);
  document.getElementById('crawler-pause').addEventListener('click',tp);
  document.getElementById('crawler-stop').addEventListener('click',stc);
  document.getElementById('crawler-clear').addEventListener('click',()=>{
    rc.innerHTML='';
    rc.style.display='none';
    st.textContent='Log Cleared';
  });
  document.getElementById('crawler-close').addEventListener('click',()=>{
    document.body.removeChild(ui);
    if(document.head.contains(mst)) document.head.removeChild(mst); // Clean up added style
    if(document.head.contains(mtr)) document.head.removeChild(mtr); // Clean up added meta
  });
  document.getElementById('crawler-export-json').addEventListener('click',ej);
  document.getElementById('crawler-export-sitemap').addEventListener('click',es);

  const mtr=document.createElement('meta'); // Viewport meta
  mtr.name='viewport';
  mtr.content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  if(!document.querySelector('meta[name="viewport"]')) document.head.appendChild(mtr); // Add if not exists

  const mst=document.createElement('style'); // Mobile responsive styles
  mst.textContent=`
    @media (max-width: 768px) {
      #web-crawler-ui { font-size: 12px; }
      #web-crawler-ui button, #web-crawler-ui input[type="number"], #web-crawler-ui label { font-size: 11px; }
      #web-crawler-ui button { padding: 5px 8px; }
      #web-crawler-ui input[type="number"] { width: 38px; padding: 4px; }
      #web-crawler-ui .tab button {padding: 8px 10px; font-size:11px;}
    }
  `;
  document.head.appendChild(mst);
  
  let isDragging = false;
  let dragOffsetX = 0, dragOffsetY = 0;
  
  tb.style.cursor = 'move';
  tb.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return; // Don't drag if clicking on interactive elements
    isDragging = true;
    dragOffsetX = e.clientX - ui.offsetLeft;
    dragOffsetY = e.clientY - ui.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (isDragging) {
      ui.style.left = (e.clientX - dragOffsetX) + 'px';
      ui.style.top = (e.clientY - dragOffsetY) + 'px';
      ui.style.right = 'auto'; // Ensure these are reset if previously set by, e.g., window snapping
      ui.style.bottom = 'auto';
      e.preventDefault();
    }
  });
  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
  
  tb.addEventListener('touchstart', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL' || (e.target.parentElement && e.target.parentElement.tagName === 'LABEL')) return;
    isDragging = true;
    dragOffsetX = e.touches[0].clientX - ui.offsetLeft;
    dragOffsetY = e.touches[0].clientY - ui.offsetTop;
    // e.preventDefault(); // Removed based on previous fix to allow button clicks
  }, { passive: true }); // Toolbar touchstart can be passive if not preventing default for drag initiation.

  document.addEventListener('touchmove', function(e) {
    if (isDragging) {
      ui.style.left = (e.touches[0].clientX - dragOffsetX) + 'px';
      ui.style.top = (e.touches[0].clientY - dragOffsetY) + 'px';
      ui.style.right = 'auto';
      ui.style.bottom = 'auto';
      e.preventDefault(); // This is intended to prevent scroll while dragging UI
    }
  }, { passive: false }); // Explicitly not passive due to preventDefault

  document.addEventListener('touchend', function() {
    isDragging = false;
  });

  l('Web Crawler Utility ready (v2.1)');
})();
