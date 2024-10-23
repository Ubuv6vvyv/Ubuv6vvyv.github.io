javascript:(function(){
  // Content type definitions
  const CT={
    DOC:{
      PDF:['application/pdf'],
      OFFICE:['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint'],
      TEXT:['text/plain','text/csv','text/markdown']
    },
    MEDIA:{
      IMAGE:['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/bmp'],
      VIDEO:['video/mp4','video/webm','video/ogg','application/x-mpegURL','application/vnd.apple.mpegurl'],
      AUDIO:['audio/mpeg','audio/ogg','audio/wav','audio/webm']
    },
    ARCHIVE:['application/zip','application/x-rar-compressed','application/x-7z-compressed']
  };

  // Enhanced HLS processing utility
  const HLS={
    async fetch(url){
      try {
        const r=await fetch(url);
        if(!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return await r.text();
      } catch(e) {
        console.error(`Failed to fetch ${url}:`, e);
        return null;
      }
    },
    
    parseM3U8(content,baseUrl){
      const lines=content.split('\n');
      const segments=[];
      let quality='';
      let bandwidth='';
      
      lines.forEach(line=>{
        if(line.startsWith('#EXT-X-STREAM-INF:')){
          const resMatch=line.match(/RESOLUTION=(\d+x\d+)/);
          const bwMatch=line.match(/BANDWIDTH=(\d+)/);
          if(resMatch) quality=resMatch[1];
          if(bwMatch) bandwidth=Math.round(bwMatch[1]/1024)+'kbps';
        }else if(line.trim()&&!line.startsWith('#')){
          const url=line.startsWith('http')?line:
                   line.startsWith('/')?new URL(line,baseUrl).href:
                   new URL(line,baseUrl).href;
          segments.push({url,quality,bandwidth});
        }
      });
      
      return segments;
    },
    
    async process(url){
      const content=await this.fetch(url);
      if(!content) return null;
      
      try {
        if(content.includes('#EXTINF')){
          return [{type:'direct',url,quality:'original'}];
        }else{
          const streams=this.parseM3U8(content,url);
          const results=await Promise.all(
            streams.map(async s=>{
              const subContent=await this.fetch(s.url);
              return {
                type:'stream',
                masterUrl:url,
                streamUrl:s.url,
                quality:s.quality,
                bandwidth:s.bandwidth,
                segments:subContent?this.parseM3U8(subContent,s.url):[]
              };
            })
          );
          return results.filter(r=>r.segments.length>0);
        }
      }catch(e){
        console.error('HLS processing error:',e);
        return null;
      }
    }
  };

  // Enhanced utility functions
  const U={
    dl(f,d){
      const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
      const u=URL.createObjectURL(b);
      const a=document.createElement('a');
      a.href=u;
      a.download=f;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
    },
    
    url(u){
      try{
        if(!u)return null;
        if(u.startsWith('data:')||u.startsWith('blob:'))return u;
        if(u.startsWith('//'))u=window.location.protocol+u;
        if(u.startsWith('/'))u=window.location.origin+u;
        return new URL(u,window.location.href).href;
      }catch(e){return null;}
    },
    
    type(u,m){
      const e=u.split('.').pop().toLowerCase();
      const i={url:u,mime:m,type:'unknown',subtype:'unknown',ext:e};
      
      if(m){
        for(const[t,s]of Object.entries(CT)){
          if(typeof s==='object'&&!Array.isArray(s)){
            for(const[st,ms]of Object.entries(s)){
              if(ms.includes(m)){
                i.type=t;
                i.subtype=st;
                return i;
              }
            }
          }
        }
      }
      
      const p={
        PDF:/\.pdf$/i,
        OFFICE:/\.(doc|docx|xls|xlsx|ppt|pptx)$/i,
        IMAGE:/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i,
        VIDEO:/\.(mp4|webm|ogv|m3u8)$/i,
        AUDIO:/\.(mp3|ogg|wav)$/i,
        ARCHIVE:/\.(zip|rar|7z|tar|gz)$/i
      };
      
      for(const[t,r]of Object.entries(p)){
        if(r.test(u)){
          i.type=t;
          return i;
        }
      }
      return i;
    },

    async checkResource(url){
      try {
        const response = await fetch(url, {method:'HEAD'});
        return {
          accessible: response.ok,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        };
      } catch(e) {
        return {accessible: false, error: e.message};
      }
    }
  };

  // Enhanced content extractors
  const E={
    async media(){
      const m=new Set();
      
      // Enhanced selectors for hidden content
      const s={
        img:'img[src], *[style*="background-image"], *[data-src], *[data-background], picture source[srcset]',
        vid:'video[src], source[src^="blob:"], source[type*="video"], *[data-video-url]',
        aud:'audio[src], source[type*="audio"], *[data-audio-url]',
        doc:'a[href$=".pdf"], a[href*="document"], a[href*="download"], *[data-document-url]',
        emb:'embed[src], object[data], iframe[src]'
      };
      
      // Process each selector
      for(const[t,q]of Object.entries(s)){
        document.querySelectorAll(q).forEach(async e=>{
          let u;
          if(['IMG','VIDEO','AUDIO','EMBED','IFRAME'].includes(e.tagName)){
            u=e.src||e.dataset.src;
          }else if(e.tagName==='OBJECT'){
            u=e.data;
          }else if(e.tagName==='SOURCE'){
            u=e.srcset?e.srcset.split(',')[0].split(' ')[0]:e.src;
          }else if(e.tagName==='A'){
            u=e.href;
          }else{
            const bg=window.getComputedStyle(e).backgroundImage;
            if(bg&&bg!=='none')u=bg.slice(4,-1).replace(/['"]/g,'');
            // Check data attributes for URLs
            for(const[k,v] of Object.entries(e.dataset)){
              if(v&&(v.startsWith('http')||v.startsWith('//'))){
                u=v;
                break;
              }
            }
          }
          
          if(u=U.url(u)){
            const resourceInfo = await U.checkResource(u);
            m.add({
              url:u,
              type:t,
              el:e.tagName.toLowerCase(),
              info:U.type(u,resourceInfo.contentType),
              accessible:resourceInfo.accessible,
              size:resourceInfo.contentLength,
              attr:Object.fromEntries(Array.from(e.attributes).map(a=>[a.name,a.value]))
            });
          }
        });
      }
      
      // Monitor dynamic content
      new MutationObserver(async ms=>{
        for(const m of ms){
          m.addedNodes.forEach(async n=>{
            if(n.nodeType===1){
              // Re-run selectors on new nodes
              for(const[t,q]of Object.entries(s)){
                if(n.matches&&n.matches(q)||n.querySelector&&n.querySelector(q)){
                  const els=n.matches(q)?[n]:n.querySelectorAll(q);
                  for(const e of els){
                    // Process element (similar to above)
                    // Add to set m
                  }
                }
              }
            }
          });
        }
      }).observe(document.body,{childList:true,subtree:true});
      
      // Process network resources
      if(window.performance){
        performance.getEntriesByType('resource').forEach(async r=>{
          const u=U.url(r.name);
          if(u){
            const i=U.type(u);
            if(i.type!=='unknown'){
              const resourceInfo = await U.checkResource(u);
              m.add({
                url:u,
                type:'dynamic',
                init:r.initiatorType,
                info:i,
                accessible:resourceInfo.accessible,
                timing:{
                  start:r.startTime,
                  dur:r.duration,
                  size:r.transferSize||resourceInfo.contentLength
                }
              });
            }
          }
        });
      }

      // Process HLS streams
      const mediaItems = Array.from(m);
      const hlsStreams = mediaItems.filter(item=>
        item.url.includes('.m3u8')||
        (item.info&&item.info.ext==='m3u8')||
        (item.info&&item.info.mime&&item.info.mime.includes('mpegurl'))
      );
      
      for(const stream of hlsStreams){
        const processed=await HLS.process(stream.url);
        if(processed){
          stream.hlsData=processed;
        }
      }
      
      return mediaItems;
    },

    async net(){
      const r=new Set();
      const oxhr=window.XMLHttpRequest;
      
      window.XMLHttpRequest=function(){
        const x=new oxhr();
        const oo=x.open;
        const os=x.send;
        
        x.open=function(){
          this._rd={method:arguments[0],url:arguments[1],ts:Date.now()};
          oo.apply(this,arguments);
        };
        
        x.send=function(){
          this.addEventListener('load',async function(){
            try{
              const ct=this.getResponseHeader('content-type');
              const u=U.url(this._rd.url);
              if(u){
                const resourceInfo = await U.checkResource(u);
                r.add({
                  ...this._rd,
                  url:u,
                  status:this.status,
                  type:ct,
                  info:U.type(u,ct),
                  accessible:resourceInfo.accessible,
                  respType:this.responseType,
                  size:this.response?this.response.length:resourceInfo.contentLength
                });
              }
            }catch(e){}
          });
          os.apply(this,arguments);
        };
        return x;
      };
      
      const of=window.fetch;
      window.fetch=async function(){
        const t=Date.now();
        const q=arguments[0];
        const u=U.url(typeof q==='string'?q:q.url);
        const m=q.method||'GET';
        
        try{
          const p=await of.apply(this,arguments);
          const ct=p.headers.get('content-type');
          const resourceInfo = await U.checkResource(u);
          if(u)r.add({
            method:m,
            url:u,
            ts:t,
            status:p.status,
            type:ct,
            info:U.type(u,ct),
            accessible:resourceInfo.accessible,
            size:parseInt(p.headers.get('content-length')||resourceInfo.contentLength||'0')
          });
          return p;
        }catch(e){
          if(u)r.add({method:m,url:u,ts:t,error:e.message,accessible:false});
          throw e;
        }
      };
      
      return Array.from(r);
    },

    async app(){
      const c={routes:new Set(),state:{},dynamic:new Set()};
      const ops=history.pushState;
      
      history.pushState=function(){
        c.routes.add(arguments[2]);
        ops.apply(this,arguments);
      };
      
      window.addEventListener('hashchange',e=>c.routes.add(e.newURL));
      
      // Enhanced state extraction
      const stateKeys=['__INITIAL_STATE__','__REDUX_STATE__','__APOLLO_STATE__','__NEXT_DATA__',
                      'window.__PRELOADED_STATE__','window.__NUXT__'];
      stateKeys.forEach(s=>{
        try{
          const v=eval(s);
          if(v)c.state[s]=v;
        }catch(e){}
      });
      
      // Monitor dynamic content changes
      new MutationObserver(ms=>{
        ms.forEach(m=>{
          m.addedNodes.forEach(n=>{
            if(n.nodeType===1)c.dynamic.add({
              ts:Date.now(),
              el:n.tagName.toLowerCase(),
              id:n.id,
              cls:Array.from(n.classList),
              content:n.innerText?.substring(0,100)
            });
          });
        });
      }).observe(document.body,{childList:true,subtree:true});
      
      return {
        routes:Array.from(c.routes),
        state:c.state,
        dynamic:Array.from(c.dynamic)
      };
    }
  };

  // Download utilities
  const D={
    async video(url,filename){
      try{
        const a=document.createElement('a');
        a.href=url;
        a.download=filename||'video.mp4';
        a.target='_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }catch(e){
        console.error('Download error:',e);
      }
    },
    
    async hls(streams){
      const div=document.createElement('div');
      Object.assign(div.style,{
        position:'fixed',
        top:'50%',
        left:'50%',
        transform:'translate(-50%, -50%)',
        background:'white',
        padding:'20px',
        borderRadius:'5px',
        boxShadow:'0 2px 10px rgba(0,0,0,0.3)',
        zIndex:10000
      });
      
      div.innerHTML = `
        <h3>Available Video Streams</h3>
        <div id="stream-list"></div>
        <button onclick="this.parentElement.remove()" style="margin-top:10px">Close</button>
      `;
      
      const list = div.querySelector('#stream-list');
      
      streams.forEach(s => {
        const btn = document.createElement('button');
        Object.assign(btn.style, {
          display: 'block',
          margin: '10px 0',
          padding: '8px 16px',
          backgroundColor: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer'
        });
        
        const quality = s.quality || 'Unknown';
        const bandwidth = s.bandwidth ? ` (${s.bandwidth})` : '';
        btn.textContent = `Download ${quality}${bandwidth}`;
        btn.onclick = () => window.open(s.streamUrl || s.url, '_blank');
        list.appendChild(btn);
      });
      
      document.body.appendChild(div);
    },

    async createUI(content) {
      const div = document.createElement('div');
      Object.assign(div.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: '20px',
        borderRadius: '5px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        zIndex: 10000,
        maxHeight: '80vh',
        overflow: 'auto',
        minWidth: '300px',
        maxWidth: '800px'
      });

      const groupedContent = content.reduce((acc, item) => {
        const type = item.info?.type || 'OTHER';
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      }, {});

      let html = `
        <h3>Detected Content</h3>
        <div id="content-tabs">
          ${Object.keys(groupedContent).map(type => 
            `<button class="tab-btn" data-type="${type}">${type}</button>`
          ).join('')}
        </div>
        <div id="content-lists">
      `;

      for (const [type, items] of Object.entries(groupedContent)) {
        html += `
          <div class="content-list" data-type="${type}">
            <div class="list-container">
              ${items.map(item => {
                const filename = item.url.split('/').pop();
                const size = item.size ? `(${Math.round(item.size/1024)}KB)` : '';
                const quality = item.quality ? ` - ${item.quality}` : '';
                const accessible = item.accessible ? '✅' : '❌';
                
                return `
                  <div class="content-item">
                    <span class="status">${accessible}</span>
                    <a href="${item.url}" target="_blank" 
                       title="${item.url}">${filename}${quality} ${size}</a>
                    ${item.hlsData ? 
                      `<button class="hls-btn" data-url="${item.url}">Show Streams</button>` : 
                      ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      html += `
        </div>
        <button onclick="this.parentElement.remove()" style="margin-top:10px">Close</button>
      `;

      div.innerHTML = html;

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        #content-tabs { margin-bottom: 10px; }
        .tab-btn { 
          margin: 0 5px 5px 0; 
          padding: 5px 10px;
          border: 1px solid #ccc;
          background: #f0f0f0;
          cursor: pointer;
        }
        .tab-btn.active { 
          background: #007bff;
          color: white;
        }
        .content-list { display: none; }
        .content-list.active { display: block; }
        .content-item { 
          margin: 5px 0;
          padding: 5px;
          border-bottom: 1px solid #eee;
        }
        .status { margin-right: 10px; }
        .hls-btn {
          margin-left: 10px;
          padding: 2px 6px;
          font-size: 12px;
        }
      `;
      div.appendChild(style);

      // Add tab functionality
      document.body.appendChild(div);
      const tabs = div.querySelectorAll('.tab-btn');
      const lists = div.querySelectorAll('.content-list');
      
      tabs[0]?.classList.add('active');
      lists[0]?.classList.add('active');

      div.addEventListener('click', e => {
        if (e.target.classList.contains('tab-btn')) {
          const type = e.target.dataset.type;
          tabs.forEach(t => t.classList.remove('active'));
          lists.forEach(l => l.classList.remove('active'));
          e.target.classList.add('active');
          div.querySelector(`.content-list[data-type="${type}"]`).classList.add('active');
        }
        
        if (e.target.classList.contains('hls-btn')) {
          const url = e.target.dataset.url;
          const stream = content.find(i => i.url === url);
          if (stream?.hlsData) {
            D.hls(stream.hlsData);
          }
        }
      });
    }
  };

  // Main extraction function
  async function extract() {
    const t = Date.now();
    const status = document.getElementById('ext-status');
    
    try {
      status.textContent = 'Analyzing page structure...';
      const np = E.net();
      
      status.textContent = 'Extracting media content...';
      const sc = await E.media();
      
      status.textContent = 'Analyzing web app state...';
      const wp = E.app();
      
      // Wait for dynamic content
      status.textContent = 'Monitoring dynamic content...';
      await new Promise(r => setTimeout(r, 5000));
      
      const [nr, wc] = await Promise.all([np, wp]);
      
      const result = {
        meta: {
          url: location.href,
          title: document.title,
          timestamp: t,
          duration: Date.now() - t
        },
        static: sc,
        network: nr,
        application: wc
      };

      // Save full results
      U.dl('content-extract.json', result);
      
      // Show UI for detected content
      status.textContent = 'Creating content overview...';
      await D.createUI([...sc, ...nr.filter(r => 
        r.info?.type && ['VIDEO', 'IMAGE', 'AUDIO', 'DOC'].includes(r.info.type)
      )]);
      
      status.textContent = 'Extraction complete!';
      console.log('Extracted content:', result);
      
    } catch(e) {
      console.error('Extraction error:', e);
      status.textContent = `Error: ${e.message}`;
    }
  }

  // Create UI
  const d = document.createElement('div');
  Object.assign(d.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: '9999',
    background: 'white',
    border: '1px solid black',
    padding: '10px',
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    fontSize: '14px'
  });
  
  d.innerHTML = `
    <div style="margin-bottom:10px;font-weight:bold">Content Extractor</div>
    <button id="ext-start" style="padding:5px 10px">Extract Content</button>
    <div id="ext-status" style="margin-top:5px;font-size:12px"></div>
  `;
  
  document.body.appendChild(d);
  document.getElementById('ext-start').onclick = () => extract();
})();
