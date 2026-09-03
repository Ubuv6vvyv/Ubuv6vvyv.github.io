(function(){
if (window.__qaModeActive) { window.__qaTogglePanel && window.__qaTogglePanel(); return; }
window.__qaModeActive = true;

const S = { forceInteract:false, timersPaused:false, hoverProbe:false, inspecting:false, unhideOn:false, maskOn:false,
  neutralized:[], netCount:0, errCount:0, log:[] };

function pushLog(msg){const t=new Date().toTimeString().slice(0,8);S.log.push(`[${t}] ${msg}`);if(S.log.length>500)S.log.shift();}

/* ---------- timer override ---------- */
const _sto=window.setTimeout,_sti=window.setInterval,_raf=window.requestAnimationFrame;
window.setTimeout=(fn,t,...a)=>S.timersPaused?0:_sto(fn,t,...a);
window.setInterval=(fn,t,...a)=>S.timersPaused?0:_sti(fn,t,...a);
window.requestAnimationFrame=(fn)=>S.timersPaused?0:_raf(fn);
function sweepKillTimers(){let id=_sto(()=>{},0);while(id--){clearTimeout(id);clearInterval(id);}}

/* ---------- event guard override ---------- */
const _pd=Event.prototype.preventDefault,_sp=Event.prototype.stopPropagation,_sip=Event.prototype.stopImmediatePropagation;
Event.prototype.preventDefault=function(){if(!S.forceInteract)_pd.call(this);};
Event.prototype.stopPropagation=function(){if(!S.forceInteract)_sp.call(this);};
Event.prototype.stopImmediatePropagation=function(){if(!S.forceInteract)_sip.call(this);};

/* ---------- network logger ---------- */
let netLogOn=true;
const _fetch=window.fetch;
window.fetch=function(...a){
  const url=(a[0]&&a[0].url)||a[0],method=(a[1]&&a[1].method)||'GET',t0=performance.now();
  return _fetch.apply(this,a).then(r=>{S.netCount++;pushLog(`FETCH ${method} ${r.status} ${url} (${(performance.now()-t0)|0}ms)`);if(netLogOn)say(`${method} ${r.status} ${String(url).slice(0,36)}`);return r;})
    .catch(e=>{S.netCount++;pushLog(`FETCH ${method} ERR ${url} ${e.message}`);if(netLogOn)say(`FETCH ERR ${String(url).slice(0,36)}`);throw e;});
};
const _open=XMLHttpRequest.prototype.open,_send=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url,...rest){this.__qa={method,url,t0:performance.now()};return _open.call(this,method,url,...rest);};
XMLHttpRequest.prototype.send=function(...a){
  this.addEventListener('loadend',()=>{const m=this.__qa||{};S.netCount++;pushLog(`XHR ${m.method} ${this.status} ${m.url} (${(performance.now()-(m.t0||0))|0}ms)`);if(netLogOn)say(`${m.method} ${this.status} ${String(m.url).slice(0,36)}`);});
  return _send.apply(this,a);
};

/* ---------- console/error capture ---------- */
const _cerr=console.error,_cwarn=console.warn;
console.error=function(...a){S.errCount++;pushLog(`console.error: ${a.map(String).join(' ').slice(0,200)}`);return _cerr.apply(this,a);};
console.warn=function(...a){pushLog(`console.warn: ${a.map(String).join(' ').slice(0,200)}`);return _cwarn.apply(this,a);};
window.addEventListener('error',e=>{S.errCount++;pushLog(`JS ERROR: ${e.message} @ ${e.filename}:${e.lineno}`);say(`JS error: ${String(e.message).slice(0,44)}`);});
window.addEventListener('unhandledrejection',e=>{S.errCount++;pushLog(`Unhandled rejection: ${e.reason}`);say('Unhandled promise rejection');});

/* ---------- stylesheet ---------- */
const style=document.createElement('style');
style.textContent=`
  *[data-unhidden]{display:block!important;visibility:visible!important;opacity:1!important;clip:auto!important;clip-path:none!important;max-height:none!important;max-width:none!important;height:auto!important;width:auto!important;overflow:visible!important;outline:1px solid #e74c3c!important;box-sizing:border-box!important;pointer-events:auto!important;z-index:999999!important}
  .qa-scroll-unlock,.qa-scroll-unlock body{overflow:visible!important;position:static!important}
  .qa-anim-pause *{animation-play-state:paused!important;transition:none!important}
  .qa-select-force,.qa-select-force *{user-select:text!important;-webkit-user-select:text!important}
  .qa-inspect-hl{outline:2px solid #4da8ff!important;outline-offset:-1px!important}
  #qaPanel{position:fixed;bottom:10px;right:10px;z-index:2147483647;font:10px/1.25 -apple-system,system-ui,sans-serif;color:#ddd}
  #qaBtn{width:38px;height:38px;border-radius:50%;background:#1c1c1e;border:1px solid #444;color:#ccc;font-weight:600;font-size:10px;box-shadow:0 1px 6px rgba(0,0,0,.5)}
  #qaBox{display:none;background:#161617;border:1px solid #333;border-radius:8px;padding:6px;width:196px;position:absolute;bottom:46px;right:0;max-height:64vh;overflow-y:auto;grid-template-columns:1fr 1fr;gap:3px}
  #qaBox.open{display:grid}
  #qaBox button{all:unset;cursor:pointer;background:#232325;padding:5px 6px;border-radius:4px;font-size:10px;line-height:1.15;text-align:left;border:1px solid #303032;color:#ccc}
  #qaBox button.on{background:#4da8ff;color:#0b1622;border-color:#4da8ff;font-weight:600}
  #qaSec{grid-column:1/-1;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#666;margin:3px 0 0 1px}
  #qaLog{grid-column:1/-1;font-size:9px;color:#8fbf8f;min-height:12px;word-break:break-word;padding-top:3px;border-top:1px solid #2a2a2a;margin-top:2px}
  #qaDrag{grid-column:1/-1;cursor:grab;text-align:center;color:#555;font-size:11px;padding:0 0 1px}
`;
document.documentElement.appendChild(style);

/* ---------- panel ---------- */
const panel=document.createElement('div');panel.id='qaPanel';
panel.innerHTML=`<div id="qaBox">
  <div id="qaDrag">···</div>
  <div id="qaSec">Visibility</div>
  <button data-a="unhide">Unhide</button>
  <button data-a="lazy">Lazy Load</button>
  <div id="qaSec">Forms</div>
  <button data-a="interact">Force Interact</button>
  <button data-a="mask">Auto-Strip Valid.</button>
  <button data-a="pw">Show Passwords</button>
  <button data-a="file">File Inputs</button>
  <button data-a="get">POST&#8594;GET</button>
  <div id="qaSec">Overlays / Time</div>
  <button data-a="modal">Remove Modals</button>
  <button data-a="scroll">Unlock Scroll</button>
  <button data-a="timer">Pause Timers</button>
  <button data-a="video">Fix Video</button>
  <div id="qaSec">Hover / Copy</div>
  <button data-a="hoverall">Hover Pulse</button>
  <button data-a="hoverprobe">Hover Probe</button>
  <button data-a="copy">Unlock Copy</button>
  <div id="qaSec">Diagnostics</div>
  <button data-a="inspect">Inspect</button>
  <button data-a="netlog">Net Log</button>
  <button data-a="savelog">Copy Log</button>
  <button data-a="reset">Reset</button>
  <div id="qaLog">QA mode ready.</div>
</div>
<button id="qaBtn">QA</button>`;
document.documentElement.appendChild(panel);
const box=panel.querySelector('#qaBox'),logEl=panel.querySelector('#qaLog');
function toggle(){box.classList.toggle('open');}
panel.querySelector('#qaBtn').onclick=()=>{if(!panel.dataset.dragged)toggle();panel.dataset.dragged='';};
window.__qaTogglePanel=toggle;
function say(msg){logEl.textContent=msg;pushLog(msg);}
function setOn(el,on){el.classList.toggle('on',on);}

/* ---------- draggable panel ---------- */
(function makeDraggable(){
  const handle=panel.querySelector('#qaDrag');let sx,sy,ox,oy,dragging=false;
  function start(x,y){dragging=true;sx=x;sy=y;const r=panel.getBoundingClientRect();ox=r.left;oy=r.top;}
  function move(x,y){if(!dragging)return;const dx=x-sx,dy=y-sy;panel.style.left=(ox+dx)+'px';panel.style.top=(oy+dy)+'px';panel.style.right='auto';panel.style.bottom='auto';panel.dataset.dragged='1';}
  function end(){dragging=false;}
  handle.addEventListener('touchstart',e=>{const t=e.touches[0];start(t.clientX,t.clientY);},{passive:true});
  handle.addEventListener('touchmove',e=>{const t=e.touches[0];move(t.clientX,t.clientY);},{passive:true});
  handle.addEventListener('touchend',end);
  handle.addEventListener('mousedown',e=>{start(e.clientX,e.clientY);const mm=ev=>move(ev.clientX,ev.clientY),mu=()=>{end();document.removeEventListener('mousemove',mm);document.removeEventListener('mouseup',mu);};document.addEventListener('mousemove',mm);document.addEventListener('mouseup',mu);});
})();

function eachDoc(fn,doc=document,depth=0){if(depth>5)return;fn(doc);doc.querySelectorAll('iframe,frame').forEach(f=>{try{const d=f.contentDocument;if(d)eachDoc(fn,d,depth+1);}catch(e){}});}

/* ---------- 1. unhide (now reversible) ---------- */
let unhideSnaps=[];
function isHiddenEl(el,cs){
  const hasTextContent=el.textContent&&el.textContent.trim().length>0;
  const hasChildren=el.children&&el.children.length>0;
  return cs.display==='none'||cs.visibility==='hidden'||cs.visibility==='collapse'||parseFloat(cs.opacity)===0||el.hidden||el.hasAttribute('hidden')||(el.offsetWidth===0&&el.offsetHeight===0&&!['BR','HR'].includes(el.tagName)&&(hasTextContent||hasChildren))||cs.clip==='rect(0px, 0px, 0px, 0px)'||cs.clip==='rect(0, 0, 0, 0)'||cs.clip==='rect(1px, 1px, 1px, 1px)'||cs.clipPath==='inset(100%)'||cs.clipPath==='inset(50%)'||cs.clipPath==='circle(0%)'||parseFloat(cs.maxHeight)===0||parseFloat(cs.maxWidth)===0||cs.transform.includes('scale(0')||cs.transform.includes('scaleX(0')||cs.transform.includes('scaleY(0')||cs.transform.includes('translateX(-9999')||cs.transform.includes('translateY(-9999')||(cs.position==='absolute'&&(parseFloat(cs.left)<-5000||parseFloat(cs.top)<-5000))||(cs.position==='fixed'&&(parseFloat(cs.left)<-5000||parseFloat(cs.top)<-5000))||(cs.overflow==='hidden'&&parseFloat(cs.textIndent)<-9000);
}
function doUnhide(){
  let count=0;unhideSnaps=[];
  eachDoc(doc=>{
    try{const s=doc.styleSheets[0];s.insertRule('*[data-unhidden]{display:block!important}',s.cssRules.length);}catch(e){}
    doc.querySelectorAll('*').forEach(el=>{
      if(['SCRIPT','STYLE','NOSCRIPT','META','LINK','HEAD','TEMPLATE'].includes(el.tagName))return;
      const cs=getComputedStyle(el);
      if(isHiddenEl(el,cs)){
        if(el.textContent.includes('{')&&el.textContent.includes('}')&&el.textContent.includes(';')&&el.textContent.length>200)return;
        if(el.textContent.includes('function')&&el.textContent.includes('(')&&el.textContent.includes(')')&&el.textContent.length>100)return;
        unhideSnaps.push({el,clone:el.cloneNode(true)});
        el.setAttribute('data-unhidden','1');count++;
      }
      if(el.classList){
        const hc=Array.from(el.classList).filter(c=>{const l=c.toLowerCase();return l==='hidden'||l==='hide'||l==='invisible'||l==='d-none'||l==='sr-only'||l==='visually-hidden'||l.startsWith('hidden-')||l.endsWith('-hidden')||l.includes('hide-')||l==='collapsed';});
        if(hc.length){unhideSnaps.push({el,clone:el.cloneNode(true)});hc.forEach(c=>el.classList.remove(c));count++;}
      }
    });
  });
  S.unhideOn=true;setOn(box.querySelector('[data-a="unhide"]'),true);
  say(`Unhid ${count} elements. Tap again to revert.`);
}
function undoUnhide(){
  let n=0;
  unhideSnaps.slice().reverse().forEach(s=>{if(s.el.isConnected){s.el.replaceWith(s.clone);n++;}});
  unhideSnaps=[];S.unhideOn=false;setOn(box.querySelector('[data-a="unhide"]'),false);
  say(`Reverted ${n} unhidden element(s) to original markup.`);
}
function toggleUnhide(){S.unhideOn?undoUnhide():doUnhide();}

/* ---------- force-load lazy content ---------- */
function forceLazy(){
  let n=0;
  eachDoc(doc=>doc.querySelectorAll('img,iframe,source').forEach(el=>{
    let changed=false;
    if(el.loading==='lazy'){el.loading='eager';changed=true;}
    if(el.dataset.src){el.src=el.dataset.src;changed=true;}
    if(el.dataset.srcset){el.srcset=el.dataset.srcset;changed=true;}
    if(el.hasAttribute('data-lazy-src')){el.src=el.getAttribute('data-lazy-src');changed=true;}
    if(changed)n++;
  }));
  say(`Force-loaded ${n} lazy element(s).`);
}

/* ---------- 2. force interactions ---------- */
function forceInteract(){
  S.forceInteract=!S.forceInteract;
  setOn(box.querySelector('[data-a="interact"]'),S.forceInteract);
  say(S.forceInteract?'preventDefault/stopPropagation neutralized.':'Interaction guards restored.');
}

/* ---------- live validation/mask stripper (survives re-renders) ---------- */
let maskObserver=null,maskPending=false;
function stripSweep(){
  let n=0;
  eachDoc(doc=>{
    doc.querySelectorAll('form').forEach(f=>{if(!f.hasAttribute('novalidate')){f.setAttribute('novalidate','');n++;}f.checkValidity=()=>true;f.reportValidity=()=>true;});
    doc.querySelectorAll('input,select,textarea').forEach(el=>{
      ['required','pattern','minlength','maxlength','min','max','step'].forEach(a=>{if(el.hasAttribute(a)){el.removeAttribute(a);n++;}});
      el.checkValidity=()=>true;el.setCustomValidity=()=>{};
      if(el.style.pointerEvents==='none'){el.style.pointerEvents='auto';n++;}
      if(el.disabled){el.disabled=false;n++;}
      if(el.readOnly){el.readOnly=false;n++;}
    });
    doc.querySelectorAll('button,[disabled],[aria-disabled="true"]').forEach(el=>{
      if(el.disabled){el.disabled=false;n++;}
      if(el.getAttribute('aria-disabled')==='true'){el.setAttribute('aria-disabled','false');n++;}
      if(el.style.pointerEvents==='none'){el.style.pointerEvents='auto';n++;}
    });
  });
  if(n)pushLog(`auto-strip: cleared ${n} validation/disabled attrs`);
  return n;
}
function scheduleSweep(){if(maskPending)return;maskPending=true;queueMicrotask(()=>{maskPending=false;stripSweep();});}
function toggleMask(){
  S.maskOn=!S.maskOn;
  setOn(box.querySelector('[data-a="mask"]'),S.maskOn);
  if(S.maskOn){
    const n=stripSweep();
    maskObserver=new MutationObserver(scheduleSweep);
    maskObserver.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['disabled','required','pattern','minlength','maxlength','readonly','aria-disabled','style']});
    say(`Auto-strip on: cleared ${n} now, will keep re-clearing on re-render.`);
  }else{
    if(maskObserver){maskObserver.disconnect();maskObserver=null;}
    say('Auto-strip off. (Already-cleared fields stay cleared.)');
  }
}
function revealPasswords(){let n=0;eachDoc(doc=>doc.querySelectorAll('input[type=password]').forEach(el=>{el.type='text';n++;}));say(`Revealed ${n} password field(s).`);}
function exposeFiles(){let n=0;eachDoc(doc=>doc.querySelectorAll('input[type=file]').forEach(el=>{Object.assign(el.style,{display:'block',visibility:'visible',opacity:1,position:'static',width:'auto',height:'auto'});el.removeAttribute('hidden');n++;}));say(`Exposed ${n} file input(s).`);}
function formsToGet(){let n=0;eachDoc(doc=>doc.querySelectorAll('form').forEach(f=>{f.method='get';n++;}));say(`Set ${n} form(s) to GET.`);}

/* ---------- 3. overlays / modals / scroll ---------- */
function removeModals(){
  let n=0;
  const sel='[role=dialog],[aria-modal="true"],.modal,.modal-backdrop,.backdrop,.overlay,.modal-open .modal';
  eachDoc(doc=>doc.querySelectorAll(sel).forEach(el=>{el.remove();n++;}));
  document.documentElement.classList.add('qa-scroll-unlock');
  say(`Removed ${n} modal/backdrop element(s).`);
}
function neutralizeFixed(){
  let n=0;
  eachDoc(doc=>doc.querySelectorAll('*').forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.position==='fixed'||cs.position==='sticky'){
      const r=el.getBoundingClientRect();
      const cover=(r.width*r.height)/(innerWidth*innerHeight);
      if(cover>0.08&&el!==panel&&!panel.contains(el)){el.style.pointerEvents='none';S.neutralized.push(el);n++;}
    }
  }));
  say(`Made ${n} fixed/sticky overlay(s) click-through.`);
}
function unlockScroll(){document.documentElement.classList.toggle('qa-scroll-unlock');document.documentElement.style.overflow='';document.body.style.overflow='';say('Body/html scroll lock toggled.');}

/* ---------- 4. timers / video ---------- */
function toggleTimers(){
  S.timersPaused=!S.timersPaused;
  setOn(box.querySelector('[data-a="timer"]'),S.timersPaused);
  document.documentElement.classList.toggle('qa-anim-pause',S.timersPaused);
  if(S.timersPaused){sweepKillTimers();say('Timers & animations paused.');}
  else say('Timers & animations resumed (new calls only).');
}
function fixVideo(){
  let n=0;
  eachDoc(doc=>doc.querySelectorAll('video').forEach(v=>{v.controls=true;v.style.pointerEvents='auto';v.style.zIndex=999999;n++;}));
  neutralizeFixed();
  say(`Enabled controls on ${n} video(s), cleared overlays.`);
}

/* ---------- 5. hover / copy ---------- */
function pulseHover(){
  let n=0;
  eachDoc(doc=>doc.querySelectorAll('a,button,[role=button],li,.nav-item,.menu-item,.dropdown,.tooltip-trigger').forEach(el=>{
    ['mouseenter','mouseover'].forEach(t=>el.dispatchEvent(new MouseEvent(t,{bubbles:true})));
    el.dispatchEvent(new FocusEvent('focus',{bubbles:true}));
    n++;
    setTimeout(()=>['mouseleave','mouseout'].forEach(t=>el.dispatchEvent(new MouseEvent(t,{bubbles:true}))),3000);
  }));
  say(`Pulsed hover/focus on ${n} element(s). CSS-only :hover needs DevTools "Force state".`);
}
function hoverProbe(){
  S.hoverProbe=!S.hoverProbe;
  setOn(box.querySelector('[data-a="hoverprobe"]'),S.hoverProbe);
  if(S.hoverProbe){
    document.addEventListener('touchstart',window.__qaProbeFn=(e)=>{const el=e.target;el.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));el.dispatchEvent(new FocusEvent('focus',{bubbles:true}));},{passive:true});
    say('Live hover probe on.');
  }else{document.removeEventListener('touchstart',window.__qaProbeFn);say('Live hover probe off.');}
}
function unlockCopy(){
  document.oncontextmenu=null;document.onselectstart=null;document.ondragstart=null;
  let n=0;eachDoc(doc=>doc.querySelectorAll('[oncontextmenu],[onselectstart],[ondragstart]').forEach(el=>{['oncontextmenu','onselectstart','ondragstart'].forEach(a=>el.removeAttribute(a));n++;}));
  document.documentElement.classList.add('qa-select-force');
  S.forceInteract=true;setOn(box.querySelector('[data-a="interact"]'),true);
  say(`Unlocked copy/right-click (${n} inline blockers cleared, force-mode on).`);
}

/* ---------- 6. diagnostics ---------- */
function toggleNetLog(){
  netLogOn=!netLogOn;
  setOn(box.querySelector('[data-a="netlog"]'),netLogOn);
  say(netLogOn?'Network logging resumed.':'Network logging paused (still recorded to session log).');
}
let lastHL=null;
function inspectHandler(e){
  if(panel.contains(e.target))return; // never intercept clicks on our own panel
  _pd.call(e);_sp.call(e);
  const el=e.target;
  if(lastHL)lastHL.classList.remove('qa-inspect-hl');
  el.classList.add('qa-inspect-hl');lastHL=el;
  const cs=getComputedStyle(el);
  const attrs=Array.from(el.attributes||[]).map(a=>`${a.name}="${a.value}"`).join(' ');
  const info=`<${el.tagName.toLowerCase()}> id=${el.id||'-'} class=${el.className||'-'} pos=${cs.position} z=${cs.zIndex} disp=${cs.display} disabled=${!!el.disabled}`;
  say(info.slice(0,60));
  pushLog(`INSPECT: ${info} | ${attrs.slice(0,300)}`);
}
function toggleInspect(){
  S.inspecting=!S.inspecting;
  setOn(box.querySelector('[data-a="inspect"]'),S.inspecting);
  if(S.inspecting){document.addEventListener('click',inspectHandler,true);say('Inspect on: tap any element on the page.');}
  else{document.removeEventListener('click',inspectHandler,true);if(lastHL)lastHL.classList.remove('qa-inspect-hl');say('Inspect off.');}
}
function saveLog(){
  const text=`QA SESSION LOG - ${location.href}\n${new Date().toString()}\n${'-'.repeat(40)}\n`+S.log.join('\n');
  function fallbackCopy(t){
    const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');say(`Copied ${S.log.length} log lines (fallback).`);}catch(e){say('Clipboard copy failed.');}
    ta.remove();
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>say(`Copied ${S.log.length} log lines to clipboard.`)).catch(()=>fallbackCopy(text));
  }else fallbackCopy(text);
}
function resetNonDestructive(){
  S.neutralized.forEach(el=>{try{el.style.pointerEvents='';}catch(e){}});
  S.neutralized=[];
  S.timersPaused=false;setOn(box.querySelector('[data-a="timer"]'),false);
  document.documentElement.classList.remove('qa-anim-pause');
  S.forceInteract=false;setOn(box.querySelector('[data-a="interact"]'),false);
  document.documentElement.classList.remove('qa-scroll-unlock','qa-select-force');
  if(maskObserver){maskObserver.disconnect();maskObserver=null;}
  S.maskOn=false;setOn(box.querySelector('[data-a="mask"]'),false);
  say('Reverted overlay/timer/interact/scroll/mask-watcher state. Unhide has its own toggle; removed modals need a reload.');
}

const actions={unhide:toggleUnhide,lazy:forceLazy,interact:forceInteract,mask:toggleMask,pw:revealPasswords,file:exposeFiles,get:formsToGet,
  modal:()=>{removeModals();neutralizeFixed();},scroll:unlockScroll,timer:toggleTimers,video:fixVideo,
  hoverall:pulseHover,hoverprobe:hoverProbe,copy:unlockCopy,
  inspect:toggleInspect,netlog:toggleNetLog,savelog:saveLog,reset:resetNonDestructive};
box.querySelectorAll('button[data-a]').forEach(btn=>btn.onclick=()=>actions[btn.dataset.a]());
setOn(box.querySelector('[data-a="netlog"]'),true);

toggle();
say('QA mode loaded.');
})();
