javascript:(function(){var t=document.createElement('div');t.style="position:fixed;top:0;left:0;background:rgba(0,0,0,0.85);color:#fff;padding:5px;border-radius:0 0 5px 0;z-index:2147483647;font-family:system-ui,sans-serif;font-size:11px;opacity:0.9;max-height:90vh;overflow:auto;box-shadow:0 0 10px rgba(0,0,0,0.5);touch-action:none;max-width:100vw;transform-origin:top left;transform:scale(1);transition:opacity 0.3s";t.onmousedown=function(e){if(e.target===t){var sx=e.clientX,sy=e.clientY,l=t.offsetLeft,t_=t.offsetTop;document.onmousemove=function(e){t.style.left=(l+e.clientX-sx)+'px';t.style.top=(t_+e.clientY-sy)+'px'};document.onmouseup=function(){document.onmousemove=document.onmouseup=null};e.preventDefault()}};t.ontouchstart=function(e){if(e.target===t){var touch=e.touches[0],sx=touch.clientX,sy=touch.clientY,l=t.offsetLeft,t_=t.offsetTop;document.ontouchmove=function(e){var touch=e.touches[0];t.style.left=(l+touch.clientX-sx)+'px';t.style.top=(t_+touch.clientY-sy)+'px';e.preventDefault()};document.ontouchend=function(){document.ontouchmove=document.ontouchend=null};e.preventDefault()}};document.body.appendChild(t);function s(e,s){Object.assign(e.style,s)}function b(n,f,tooltip=""){var c=document.createElement('button');c.textContent=n;s(c,{margin:"2px",padding:"3px 5px",background:"#333",color:"#fff",border:"none",borderRadius:"3px",cursor:"pointer",fontSize:"11px",minWidth:"35px",userSelect:"none"});c.onmouseover=function(){s(c,{background:"#555"})};c.onmouseout=function(){s(c,{background:"#333"})};c.onclick=f;if(tooltip)c.title=tooltip;return c}function v(f){return document.querySelectorAll("video").forEach(f)}function r(){var row=document.createElement('div');s(row,{display:"flex",flexWrap:"wrap",justifyContent:"center",marginBottom:"3px",gap:"2px"});t.appendChild(row);return row}function findVideoSources(){
  var sources=[];
  
  // Known video streaming domains to look for
  var videoDomains=[
    "canva.com","video-public.canva.com","vimeo.com","player.vimeo.com",
    "youtube.com","youtube-nocookie.com","youtu.be","dailymotion.com",
    "dai.ly","facebook.com","fbcdn.net","instagram.com","twitter.com",
    "twimg.com","linkedin.com","tiktok.com","pinterest.com","reddit.com",
    "redd.it","tumblr.com","vk.com","streamable.com","wistia.com",
    "wistia.net","brightcove.com","jwplayer.com","jwpsrv.com",
    "vidyard.com","kaltura.com","vidible.tv","cbsistatic.com","cnn.com",
    "mux.com","flowplayer.com","ted.com","soundcloud.com","twitch.tv",
    "teachable.com","hubspot.com","vidazoo.com","rumble.com"
  ];
  
  // Common video extensions to detect
  var videoExtensions=[".mp4",".webm",".mov",".m4v",".ogv",".ogg",".avi",".wmv",".flv",".3gp",".mkv"];
  
  // Common streaming formats
  var streamingFormats=[".m3u8",".mpd",".f4m",".ism"];
  
  // Check direct video elements
  document.querySelectorAll("video").forEach(e=>{
    if(e.src)sources.push({url:e.src,type:"Direct video src"});
    if(e.currentSrc)sources.push({url:e.currentSrc,type:"Current source"});
  });
  
  // Check source elements
  document.querySelectorAll("video source").forEach(e=>{
    if(e.src)sources.push({url:e.src,type:"Video source"});
  });
  
  // Check common video links
  videoExtensions.forEach(ext=>{
    document.querySelectorAll(`a[href$='${ext}']`).forEach(e=>{
      if(e.href)sources.push({url:e.href,type:"Link source"});
    });
  });
  
  // Check data attributes that might contain video URLs
  document.querySelectorAll("[data-video-url],[data-video-src],[data-src],[data-video],[data-stream],[data-playlist]").forEach(e=>{
    ["data-video-url","data-video-src","data-src","data-video","data-stream","data-playlist"].forEach(attr=>{
      if(e.getAttribute(attr)){
        let url=e.getAttribute(attr);
        if(videoExtensions.some(ext=>url.includes(ext))||streamingFormats.some(ext=>url.includes(ext))){
          sources.push({url,type:"Data attribute"});
        }
      }
    });
  });
  
  // Check for video sources in JSON data
  try{
    document.querySelectorAll("script[type='application/json'],script[type='text/json']").forEach(e=>{
      try{
        const jsonData=JSON.parse(e.textContent);
        const extractUrls=(obj,path="")=>{
          if(!obj)return;
          if(typeof obj==="string"){
            if(videoExtensions.some(ext=>obj.includes(ext))||streamingFormats.some(ext=>obj.includes(ext))||videoDomains.some(d=>obj.includes(d))){
              if(obj.startsWith("http")||obj.startsWith("//")){
                sources.push({url:obj,type:"JSON data"+(path?" ("+path+")":"")});
              }
            }
            return;
          }
          if(Array.isArray(obj)){
            obj.forEach((item,i)=>extractUrls(item,`${path}[${i}]`));
            return;
          }
          if(typeof obj==="object"){
            for(const key in obj){
              if(["video","src","source","url","file","stream","hls","dash","mp4","webm","playlist"].includes(key.toLowerCase())){
                extractUrls(obj[key],path?`${path}.${key}`:key);
              }else{
                extractUrls(obj[key]);
              }
            }
          }
        };
        extractUrls(jsonData);
      }catch(e){}
    });
  }catch(e){}
  
  // Check for iframe sources that might contain videos
  document.querySelectorAll("iframe").forEach(frame=>{
    if(frame.src){
      let src=frame.src;
      if(videoDomains.some(d=>src.includes(d))){
        sources.push({url:src,type:"Iframe source"});
      }
    }
  });
  
  // Check network resources
  try{
    performance.getEntriesByType("resource").forEach(r=>{
      if(r.name){
        if(videoExtensions.some(ext=>r.name.includes(ext))||
           streamingFormats.some(ext=>r.name.includes(ext))||
           videoDomains.some(d=>r.name.includes(d))){
          sources.push({url:r.name,type:"Network resource"});
        }
      }
    });
  }catch(e){}
  
  // Extract video URLs from scripts
  try{
    document.querySelectorAll("script").forEach(e=>{
      const text=e.textContent;
      
      // Known video extensions
      videoExtensions.forEach(ext=>{
        const regex=new RegExp(`https?:\\/\\/[^"'\\s]+\\${ext}[^"'\\s]*`,"g");
        const matches=text.match(regex);
        if(matches)matches.forEach(url=>sources.push({url,type:`Script ${ext.toUpperCase()}`}));
      });
      
      // Streaming formats
      streamingFormats.forEach(format=>{
        const regex=new RegExp(`https?:\\/\\/[^"'\\s]+\\${format}[^"'\\s]*`,"g");
        const matches=text.match(regex);
        if(matches)matches.forEach(url=>sources.push({url,type:format===".m3u8"?"HLS Stream":format===".mpd"?"DASH Stream":"Streaming URL"}));
      });
      
      // Platform-specific detection
      videoDomains.forEach(d=>{
        const domainMatch=text.match(new RegExp(`https?:\\/\\/[^"'\\s]*${d.replace('.','\\.').replace('/','\\/')}[^"'\\s]*\\/[^"'\\s]*`,'g'));
        if(domainMatch)domainMatch.forEach(url=>{
          if(videoExtensions.some(ext=>url.includes(ext))||streamingFormats.some(ext=>url.includes(ext))){
            sources.push({url,type:`${d.split('.')[0].charAt(0).toUpperCase()+d.split('.')[0].slice(1)} video`});
          }
        });
      });
      
      // Parse possible JSON configs within scripts
      try{
        // JW Player pattern
        const jwMatch=text.match(/jwplayer\([^)]+\).setup\((\{[^;]+\})\)/);
        if(jwMatch&&jwMatch[1]){
          try{
            const cleanJSON=jwMatch[1].replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g,'$1"$2":').replace(/'/g,'"');
            const jwConfig=JSON.parse(cleanJSON);
            if(jwConfig.file)sources.push({url:jwConfig.file,type:"JW Player"});
            if(jwConfig.sources&&Array.isArray(jwConfig.sources)){
              jwConfig.sources.forEach(s=>{
                if(s.file)sources.push({url:s.file,type:"JW Player source"});
              });
            }
          }catch(e){}
        }
        
        // Brightcove pattern
        const bcMatch=text.match(/videojs\([^)]+\).src\((\{[^;]+\})\)/);
        if(bcMatch&&bcMatch[1]){
          try{
            const cleanJSON=bcMatch[1].replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g,'$1"$2":').replace(/'/g,'"');
            const bcConfig=JSON.parse(cleanJSON);
            if(bcConfig.src)sources.push({url:bcConfig.src,type:"Brightcove source"});
          }catch(e){}
        }
      }catch(e){}
    });
  }catch(e){}
  
  // Platform-specific detection
  
  // YouTube embed detection
  if(window.location.href.includes('youtube.com')||window.location.href.includes('youtu.be')){
    try{
      // Extract video ID
      let videoId='';
      if(window.location.href.includes('youtube.com/watch')){
        videoId=new URLSearchParams(window.location.search).get('v');
      }else if(window.location.href.includes('youtu.be/')){
        videoId=window.location.pathname.split('/')[1];
      }
      if(videoId){
        sources.push({
          url:`https://www.youtube.com/watch?v=${videoId}`,
          type:"YouTube video"
        });
      }
    }catch(e){}
  }
  
  // Vimeo embed detection
  if(window.location.href.includes('vimeo.com')){
    try{
      // Extract video ID
      let videoId=window.location.pathname.split('/')[1];
      if(videoId&&!isNaN(videoId)){
        sources.push({
          url:`https://vimeo.com/${videoId}`,
          type:"Vimeo video"
        });
      }
    }catch(e){}
  }
  
  // Canva specific detection (kept from original)
  if(window.location.href.includes('canva.com')){
    try{
      const scripts=document.querySelectorAll('script');
      scripts.forEach(script=>{
        const videoMatches=script.textContent.match(/https:\/\/video-public\.canva\.com\/[^"'\s]+/g);
        if(videoMatches)videoMatches.forEach(url=>sources.push({url,type:"Canva video"}));
      });
    }catch(e){}
  }
  
  // Detect metadata elements that might have video info
  document.querySelectorAll("meta[property='og:video'],meta[property='og:video:url'],meta[property='og:video:secure_url'],meta[name='twitter:player']").forEach(meta=>{
    if(meta.content)sources.push({url:meta.content,type:"Meta tag video"});
  });
  
  // Remove duplicates
  return sources.filter((s,i,self)=>self.findIndex(t=>t.url===s.url)===i);
}

var header=r();var title=document.createElement('span');title.textContent="Video Controls";s(title,{flex:"1",padding:"2px 5px",fontWeight:"bold",cursor:"move"});header.appendChild(title);var min=document.createElement('button');min.textContent="−";s(min,{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:"14px"});min.onclick=function(){var rows=Array.from(t.children).filter(c=>c!==header);var display=rows[0].style.display==="none"?"":"none";rows.forEach(r=>r.style.display=display);min.textContent=display==="none"?"+":'−'};header.appendChild(min);var close=document.createElement('button');close.textContent="×";s(close,{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:"14px"});close.onclick=function(){t.remove()};header.appendChild(close);var r1=r();[0.25,0.5,0.75,1,1.25,1.5,2].forEach(s=>{var btn=b(s+"×",()=>v(e=>e.playbackRate=s),"Set playback speed");r1.appendChild(btn);btn.style.flex="1"});var r2=r();["⏯️","🔇","+🔊","-🔊"].forEach((txt,i)=>{var fn=[()=>v(e=>e.paused?e.play():e.pause()),()=>v(e=>{e.muted=!e.muted}),()=>v(e=>e.volume=Math.min(e.volume+0.05,1)),()=>v(e=>e.volume=Math.max(e.volume-0.05,0))][i];var tip=["Play/Pause","Toggle Mute","Volume Up","Volume Down"][i];var btn=b(txt,fn,tip);r2.appendChild(btn);btn.style.flex="1"});var r3=r();["-30s","-10s","+10s","+30s"].forEach((txt,i)=>{var fn=[()=>v(e=>e.currentTime-=30),()=>v(e=>e.currentTime-=10),()=>v(e=>e.currentTime+=10),()=>v(e=>e.currentTime+=30)][i];var tip=["Rewind 30 seconds","Rewind 10 seconds","Forward 10 seconds","Forward 30 seconds"][i];var btn=b(txt,fn,tip);r3.appendChild(btn);btn.style.flex="1"});var r4=r();["🔆+","🔆-","📊+","📊-"].forEach((txt,i)=>{var fn=[()=>v(e=>{var c=parseFloat(e.style.filter.match(/brightness\(([^)]+)\)/)?.[1]||1);e.style.filter=`brightness(${Math.min(c+0.1,2)})`}),()=>v(e=>{var c=parseFloat(e.style.filter.match(/brightness\(([^)]+)\)/)?.[1]||1);e.style.filter=`brightness(${Math.max(c-0.1,0.5)})`}),()=>v(e=>{var c=parseFloat(e.style.filter.match(/contrast\(([^)]+)\)/)?.[1]||1);e.style.filter=`contrast(${Math.min(c+0.1,2)})`}),()=>v(e=>{var c=parseFloat(e.style.filter.match(/contrast\(([^)]+)\)/)?.[1]||1);e.style.filter=`contrast(${Math.max(c-0.1,0.5)})`;})][i];var tip=["Increase Brightness","Decrease Brightness","Increase Contrast","Decrease Contrast"][i];var btn=b(txt,fn,tip);r4.appendChild(btn);btn.style.flex="1"});var r5=r();["Reset","PiP","Loop","Full"].forEach((txt,i)=>{var fn=[()=>v(e=>e.style.filter=""),()=>v(e=>{if(document.pictureInPictureElement===e)document.exitPictureInPicture();else if(document.pictureInPictureEnabled)e.requestPictureInPicture()}),()=>v(e=>{e.loop=!e.loop;alert("Loop: "+(e.loop?"On":"Off"))}),()=>v(e=>{if(document.fullscreenElement)document.exitFullscreen();else e.requestFullscreen()})][i];var tip=["Reset Video Filters","Picture-in-Picture","Toggle Loop","Fullscreen"][i];var btn=b(txt,fn,tip);r5.appendChild(btn);btn.style.flex="1"});var r6=r();["Stats","Pop","Save","Load"].forEach((txt,i)=>{var fn=[()=>v(e=>{var s=document.querySelector('#video-stats');if(s){s.remove();return}s=document.createElement('div');s.id='video-stats';s.style="position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.8);color:white;padding:7px;z-index:10001;font-size:12px;border-radius:4px;";document.body.appendChild(s);function u(){if(!document.body.contains(s))return;s.innerHTML=`Time: ${e.currentTime.toFixed(1)}/${e.duration.toFixed(1)}<br>Speed: ${e.playbackRate}×<br>Volume: ${(e.volume*100).toFixed(0)}%`;requestAnimationFrame(u)}u()}),()=>v(e=>{var w=window.open('','_blank');if(!w)return alert("Pop-out blocked! Allow popups for this site.");w.document.write(`<!DOCTYPE html><html><head><title>Video Player</title><style>body{margin:0;overflow:hidden;background:#000}video{width:100%;height:100vh;}</style></head><body><video controls autoplay src="${e.currentSrc||e.src}" type="${e.getAttribute('type')||''}"></video><script>var v=document.querySelector('video');v.currentTime=${e.currentTime};v.playbackRate=${e.playbackRate};v.volume=${e.volume};v.muted=${e.muted};</script></body></html>`)}),()=>v(e=>{localStorage.setItem('videoTime_'+window.location.href,e.currentTime);alert('Current time saved!')}),()=>v(e=>{var t=localStorage.getItem('videoTime_'+window.location.href);if(t){e.currentTime=parseFloat(t);alert('Position restored!')}else{alert('No saved position found')}})][i];var tip=["Show/Hide Stats","Pop Out Video","Save Position","Load Position"][i];var btn=b(txt,fn,tip);r6.appendChild(btn);btn.style.flex="1"});var r7=r();["Sources","Restore","Screen","Info"].forEach((txt,i)=>{var fn=[()=>{var sources=findVideoSources();if(sources.length===0)return alert("No video sources found!");var popup=document.createElement('div');s(popup,{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#1a1a1a",padding:"10px",borderRadius:"5px",zIndex:"2147483648",maxWidth:"90vw",maxHeight:"80vh",overflow:"auto",boxShadow:"0 0 20px rgba(0,0,0,0.7)",color:"#fff"});popup.innerHTML=`<h3 style="margin:0 0 10px 0;text-align:center">Available Video Sources</h3>`;sources.forEach((source,i)=>{var div=document.createElement('div');s(div,{margin:"5px 0",padding:"5px",background:"#333",borderRadius:"3px"});var a=document.createElement('a');a.href=source.url;a.textContent=source.url.length>50?source.url.substring(0,47)+'...':source.url;a.target="_blank";s(a,{color:"#4af",textDecoration:"none",wordBreak:"break-all",display:"block",marginBottom:"3px"});var type=document.createElement('span');type.textContent=source.type;s(type,{color:"#aaa",fontSize:"11px"});var btns=document.createElement('div');s(btns,{display:"flex",marginTop:"5px",gap:"5px"});var copyBtn=document.createElement('button');copyBtn.textContent="Copy URL";s(copyBtn,{flex:"1",padding:"3px 0",background:"#444",border:"none",color:"#fff",borderRadius:"3px",cursor:"pointer"});copyBtn.onclick=function(){navigator.clipboard.writeText(source.url);copyBtn.textContent="Copied!";setTimeout(()=>copyBtn.textContent="Copy URL",1000)};var dlBtn=document.createElement('button');dlBtn.textContent="Download";s(dlBtn,{flex:"1",padding:"3px 0",background:"#444",border:"none",color:"#fff",borderRadius:"3px",cursor:"pointer"});dlBtn.onclick=function(){var a=document.createElement('a');a.href=source.url;a.download='video_'+Date.now();a.click()};btns.appendChild(copyBtn);btns.appendChild(dlBtn);div.appendChild(a);div.appendChild(type);div.appendChild(btns);popup.appendChild(div)});var closeBtn=document.createElement('button');closeBtn.textContent="Close";s(closeBtn,{display:"block",margin:"10px auto 0",padding:"5px 15px",background:"#444",border:"none",color:"#fff",borderRadius:"3px",cursor:"pointer"});closeBtn.onclick=function(){popup.remove()};popup.appendChild(closeBtn);document.body.appendChild(popup)},()=>{document.querySelectorAll("video").forEach(e=>{e.style.filter="";e.controls=true;if(e.style.display==="none")e.style.display="block";e.style.visibility="visible";e.style.opacity="1";var currentTime=e.currentTime;var src=e.src;if(src){e.src="";setTimeout(()=>{e.src=src;e.currentTime=currentTime;e.play()},100)}alert("Attempted to restore video player")})},()=>v(e=>{var c=document.createElement('canvas');c.width=e.videoWidth;c.height=e.videoHeight;c.getContext('2d').drawImage(e,0,0,c.width,c.height);try{var img=c.toDataURL('image/jpeg');var a=document.createElement('a');a.href=img;a.download='screenshot_'+Math.floor(Date.now()/1000)+'.jpg';a.click()}catch(err){alert('Cannot capture screenshot: '+err.message)}}),()=>v(e=>{var m={duration:e.duration.toFixed(2)+'s',currentTime:e.currentTime.toFixed(2)+'s',playbackRate:e.playbackRate+'x',volume:(e.volume*100).toFixed(0)+'%',muted:e.muted?'Yes':'No',paused:e.paused?'Yes':'No',resolution:e.videoWidth+'x'+e.videoHeight,aspectRatio:(e.videoWidth/e.videoHeight).toFixed(2)+':1',src:e.src||e.currentSrc||'Unknown'};var info='';for(var key in m)info+=key.charAt(0).toUpperCase()+key.slice(1)+': '+m[key]+'\n';alert(info)})][i];var tip=["Find Video Sources","Restore Player","Screenshot","Video Info"][i];var btn=b(txt,fn,tip);r7.appendChild(btn);btn.style.flex="1"});if(window.innerWidth<500)t.style.transform='scale(0.85)';var sizeRow=document.createElement('div');s(sizeRow,{display:"flex",justifyContent:"center",gap:"5px",marginTop:"2px"});var sizeDown=document.createElement('button');sizeDown.textContent="A-";s(sizeDown,{background:"none",border:"none",color:"#aaa",fontSize:"10px",cursor:"pointer"});sizeDown.onclick=function(){var scale=parseFloat(t.style.transform.match(/scale\(([^)]+)\)/)?.[1]||1);t.style.transform=`scale(${Math.max(scale-0.1,0.6)})`};var sizeUp=document.createElement('button');sizeUp.textContent="A+";s(sizeUp,{background:"none",border:"none",color:"#aaa",fontSize:"10px",cursor:"pointer"});sizeUp.onclick=function(){var scale=parseFloat(t.style.transform.match(/scale\(([^)]+)\)/)?.[1]||1);t.style.transform=`scale(${Math.min(scale+0.1,1.4)})`};sizeRow.appendChild(sizeDown);sizeRow.appendChild(sizeUp);header.appendChild(sizeRow)})();
