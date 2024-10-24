javascript:(function(){if(window.DOMToolkit){window.DOMToolkit.toggleToolbar();return}class DOMToolkit{constructor(){this.selectedElements=new Set;this.isSelecting=!1;this.isManualMode=!1;this.lastSelector='';this.extractedData=[];this.originalState=new Map;this.init()}init(){this.createStyles();this.createToolbar();this.createPreviewPanel();this.initializeEventListeners();this.attachGlobalListeners()}createStyles(){const s=document.createElement('style');s.textContent=`.dom-toolkit-ui{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1a1a;font-size:14px}.dom-toolkit-button{padding:6px 12px;border:1px solid #2563eb;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;font-size:13px;transition:all .2s;min-width:100px}.dom-toolkit-button:hover{background:#2563eb}.dom-toolkit-button.active{background:#1d4ed8;box-shadow:inset 0 2px 4px rgba(0,0,0,.1)}.dom-toolkit-preview-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin:8px 0;padding:12px;position:relative}.dom-toolkit-preview-item:hover{background:#f1f5f9}.dom-toolkit-thumbnail{max-width:100px;max-height:100px;object-fit:contain;margin-right:10px}.dom-toolkit-attributes{font-size:12px;color:#64748b;margin-top:4px}.dom-toolkit-content{margin-top:4px;word-break:break-word}`;document.head.appendChild(s)}createToolbar(){const t=document.createElement('div');t.innerHTML=`<div id="dom-toolkit-toolbar" class="dom-toolkit-ui" style="position:fixed;top:10px;right:10px;z-index:999999;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);display:flex;gap:8px;flex-wrap:wrap;max-width:320px"><button id="toggle-select" class="dom-toolkit-button">Select Mode</button><button id="toggle-manual" class="dom-toolkit-button">Manual Mode</button><button id="remove-selected" class="dom-toolkit-button">Remove</button><button id="extract-selected" class="dom-toolkit-button">Extract</button><button id="restore-page" class="dom-toolkit-button">Restore Page</button><button id="clear-all" class="dom-toolkit-button">Clear All</button><button id="download-data" class="dom-toolkit-button">Download</button><button id="close-toolkit" class="dom-toolkit-button">Close</button></div>`;document.body.appendChild(t.firstElementChild)}createPreviewPanel(){const p=document.createElement('div');p.innerHTML=`<div id="dom-toolkit-preview" class="dom-toolkit-ui" style="position:fixed;bottom:10px;right:10px;z-index:999999;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);width:320px;max-height:400px;overflow-y:auto;display:none"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0;color:#1a1a1a">Extracted Content</h3><span id="preview-count" style="color:#64748b"></span></div><div id="preview-content"></div></div>`;document.body.appendChild(p.firstElementChild)}initializeEventListeners(){document.getElementById('toggle-select').addEventListener('click',()=>{this.isSelecting=!this.isSelecting;this.isManualMode=!1;this.updateButtonStates()});document.getElementById('toggle-manual').addEventListener('click',()=>{this.isManualMode=!this.isManualMode;this.isSelecting=!1;this.updateButtonStates()});document.getElementById('remove-selected').addEventListener('click',()=>this.removeSelected());document.getElementById('extract-selected').addEventListener('click',()=>this.extractSelected());document.getElementById('clear-all').addEventListener('click',()=>this.clearAll());document.getElementById('download-data').addEventListener('click',()=>this.downloadData());document.getElementById('close-toolkit').addEventListener('click',()=>this.destroy());document.getElementById('restore-page').addEventListener('click',()=>this.restorePage())}attachGlobalListeners(){document.addEventListener('click',e=>{if(!this.isSelecting&&!this.isManualMode)return;if(e.target.closest('#dom-toolkit-toolbar')||e.target.closest('#dom-toolkit-preview'))return;e.preventDefault();e.stopPropagation();this.isManualMode?this.showSelectorOptions(e.target):this.handleElementSelection(e.target)},!0)}handleElementSelection(e){try{this.findSimilarElements(e).forEach(el=>{this.originalState.has(el)||this.originalState.set(el,{outline:el.style.outline,parent:el.parentNode});el.style.outline='2px solid #3b82f6';this.selectedElements.add(el)});this.updatePreview()}catch(err){console.error('Selection error:',err);this.originalState.has(e)||this.originalState.set(e,{outline:e.style.outline,parent:e.parentNode});e.style.outline='2px solid #3b82f6';this.selectedElements.add(e)}}findSimilarElements(e){const r=new Set,s=[()=>e.className?Array.from(document.getElementsByClassName(Array.from(e.classList).join('.'))):[],()=>e.getAttribute('role')?Array.from(document.querySelectorAll(`[role="${e.getAttribute('role')}"]`)):[],()=>{const t=e.tagName.toLowerCase();return e.id?Array.from(document.querySelectorAll(`${t}[id="${e.id}"}`)):[]},()=>{const p=e.parentElement;return p?Array.from(p.children).filter(s=>s.tagName===e.tagName&&s.className===e.className):[]},()=>{const t=e.textContent?.trim();return t&&t.match(/^\$?\d+(\.\d{2})?$/)?Array.from(document.querySelectorAll('*')).filter(el=>el.textContent?.trim().match(/^\$?\d+(\.\d{2})?$/)):[]},];for(const strategy of s)try{const m=strategy();if(m.length>0){m.forEach(match=>r.add(match));break}}catch(err){continue}return r.size===0&&r.add(e),Array.from(r)}showSelectorOptions(e){const s=this.generateSelectors(e),p=document.getElementById('preview-content');p.innerHTML=`<h4>Available Selectors:</h4>${s.map(s=>`<div style="margin:5px 0;padding:5px;border:1px solid #eee"><button onclick="window.DOMToolkit.selectBySelector('${s}')" style="display:block;width:100%;text-align:left;padding:5px">${s}<small>(Matches:${document.querySelectorAll(s).length})</small></button></div>`).join('')}`;document.getElementById('dom-toolkit-preview').style.display='block'}generateSelectors(e){const s=new Set;try{e.id&&s.add(`#${e.id}`);e.className&&s.add(`.${Array.from(e.classList).join('.')}`);const t=e.tagName.toLowerCase();e.getAttribute('role')&&s.add(`${t}[role="${e.getAttribute('role')}"]`);const p=e.parentElement;if(p){const i=Array.from(p.children).indexOf(e);s.add(`${t}:nth-child(${i+1})`)}}catch(err){s.add(e.tagName.toLowerCase())}return Array.from(s)}selectBySelector(s){try{document.querySelectorAll(s).forEach(e=>{e.style.outline='2px solid #3b82f6';this.selectedElements.add(e)});this.updatePreview()}catch(err){alert('Error applying selector. Please try a different one.')}}removeSelected(){try{this.selectedElements.forEach(e=>e.remove());this.clearAll()}catch(err){alert('Error removing elements. Some elements may not have been removed.')}}extractContentPreview(e){let p={type:'',content:'',attributes:{}};const a=['href','src','alt','title','data-*'];for(let attr of e.attributes)a.some(p=>p===attr.name||p.endsWith('*')&&attr.name.startsWith(p.slice(0,-1)))&&(p.attributes[attr.name]=attr.value);if(e.tagName.toLowerCase()==='img'){p.type='image';p.content=e.src}else if(e.tagName.toLowerCase()==='a'){p.type='link';p.content=e.textContent.trim()}else if(e.tagName.toLowerCase()==='table'){p.type='table';const c=Array.from(e.querySelectorAll('td,th')).slice(0,5);p.content=c.map(c=>c.textContent.trim()).join('|')}else{p.type='text';p.content=e.textContent.trim()}return p}updatePreview(){const p=document.getElementById('dom-toolkit-preview'),c=document.getElementById('preview-content'),n=document.getElementById('preview-count');this.extractedData.length>0?(n.textContent=`${this.extractedData.length} items`,c.innerHTML=this.extractedData.map(d=>{let h='<div class="dom-toolkit-preview-item">';return d.type==='image'&&(h+=`<img src="${d.content}" alt="${d.attributes.alt||''}" class="dom-toolkit-thumbnail">`),h+='<div class="dom-toolkit-content">',d.type==='link'?h+=`<a href="${d.attributes.href}">${d.content}</a>`:d.type==='table'?h+=`<div style="overflow-x:auto">${d.content}</div>`:h+=d.content,Object.keys(d.attributes).length>0&&(h+=`<div class="dom-toolkit-attributes">${Object.entries(d.attributes).map(([k,v])=>`${k}:${v}`).join('|')}</div>`),h+'</div></div>'}).join(''),p.style.display='block'):p.style.display='none'}extractSelected(){try{this.selectedElements.forEach(e=>{const p=this.extractContentPreview(e);this.extractedData.push(p)});this.updatePreview()}catch(err){alert('Error extracting data. Some data may be incomplete.')}}restorePage(){try{this.originalState.forEach((s,e)=>{e.style.outline=s.outline;e.parentNode!==s.parent&&s.parent&&s.parent.appendChild(e)});this.originalState.clear();this.selectedElements.clear();this.extractedData=[];this.updatePreview()}catch(err){alert('Error restoring page. Some elements may not have been restored correctly.')}}clearAll(){this.selectedElements.forEach(e=>e.style.outline='');this.selectedElements.clear();this.extractedData=[];this.updatePreview()}updateButtonStates(){const s=document.getElementById('toggle-select'),m=document.getElementById('toggle-manual');s.style.background=this.isSelecting?'#e0e0e0':'#f0f0f0';m.style.background=this.isManualMode?'#e0e0e0':'#f0f0f0'}destroy(){this.clearAll();document.getElementById('dom-toolkit-toolbar').remove();document.getElementById('dom-toolkit-preview').remove();delete window.DOMToolkit}toggleToolbar(){const t=document.getElementById('dom-toolkit-toolbar');t.style.display=t.style.display==='none'?'flex':'none'}downloadData(){try{const d=JSON.stringify(this.extractedData,null,2),b=new Blob([d],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='extracted-data.json';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)}catch(err){alert('Error downloading data. Please try again.')}}}window.DOMToolkit=new DOMToolkit})();

//readable version below


javascript: (function() {
  if(window.DOMToolkit) {
    window.DOMToolkit.toggleToolbar();
    return
  }
  class DOMToolkit {
    constructor() {
      this.selectedElements = new Set;
      this.isSelecting = !1;
      this.isManualMode = !1;
      this.lastSelector = '';
      this.extractedData = [];
      this.originalState = new Map;
      this.init()
    }
    init() {
      this.createStyles();
      this.createToolbar();
      this.createPreviewPanel();
      this.initializeEventListeners();
      this.attachGlobalListeners()
    }
    createStyles() {
      const s = document.createElement('style');
      s.textContent = `.dom-toolkit-ui{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1a1a1a;font-size:14px}.dom-toolkit-button{padding:6px 12px;border:1px solid #2563eb;border-radius:6px;background:#3b82f6;color:#fff;cursor:pointer;font-size:13px;transition:all .2s;min-width:100px}.dom-toolkit-button:hover{background:#2563eb}.dom-toolkit-button.active{background:#1d4ed8;box-shadow:inset 0 2px 4px rgba(0,0,0,.1)}.dom-toolkit-preview-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin:8px 0;padding:12px;position:relative}.dom-toolkit-preview-item:hover{background:#f1f5f9}.dom-toolkit-thumbnail{max-width:100px;max-height:100px;object-fit:contain;margin-right:10px}.dom-toolkit-attributes{font-size:12px;color:#64748b;margin-top:4px}.dom-toolkit-content{margin-top:4px;word-break:break-word}`;
      document.head.appendChild(s)
    }
    createToolbar() {
      const t = document.createElement('div');
      t.innerHTML = `<div id="dom-toolkit-toolbar" class="dom-toolkit-ui" style="position:fixed;top:10px;right:10px;z-index:999999;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);display:flex;gap:8px;flex-wrap:wrap;max-width:320px"><button id="toggle-select" class="dom-toolkit-button">Select Mode</button><button id="toggle-manual" class="dom-toolkit-button">Manual Mode</button><button id="remove-selected" class="dom-toolkit-button">Remove</button><button id="extract-selected" class="dom-toolkit-button">Extract</button><button id="restore-page" class="dom-toolkit-button">Restore Page</button><button id="clear-all" class="dom-toolkit-button">Clear All</button><button id="download-data" class="dom-toolkit-button">Download</button><button id="close-toolkit" class="dom-toolkit-button">Close</button></div>`;
      document.body.appendChild(t.firstElementChild)
    }
    createPreviewPanel() {
      const p = document.createElement('div');
      p.innerHTML = `<div id="dom-toolkit-preview" class="dom-toolkit-ui" style="position:fixed;bottom:10px;right:10px;z-index:999999;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);width:320px;max-height:400px;overflow-y:auto;display:none"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0;color:#1a1a1a">Extracted Content</h3><span id="preview-count" style="color:#64748b"></span></div><div id="preview-content"></div></div>`;
      document.body.appendChild(p.firstElementChild)
    }
    initializeEventListeners() {
      document.getElementById('toggle-select').addEventListener('click', () => {
        this.isSelecting = !this.isSelecting;
        this.isManualMode = !1;
        this.updateButtonStates()
      });
      document.getElementById('toggle-manual').addEventListener('click', () => {
        this.isManualMode = !this.isManualMode;
        this.isSelecting = !1;
        this.updateButtonStates()
      });
      document.getElementById('remove-selected').addEventListener('click', () => this.removeSelected());
      document.getElementById('extract-selected').addEventListener('click', () => this.extractSelected());
      document.getElementById('clear-all').addEventListener('click', () => this.clearAll());
      document.getElementById('download-data').addEventListener('click', () => this.downloadData());
      document.getElementById('close-toolkit').addEventListener('click', () => this.destroy());
      document.getElementById('restore-page').addEventListener('click', () => this.restorePage())
    }
    attachGlobalListeners() {
      document.addEventListener('click', e => {
        if(!this.isSelecting && !this.isManualMode) return;
        if(e.target.closest('#dom-toolkit-toolbar') || e.target.closest('#dom-toolkit-preview')) return;
        e.preventDefault();
        e.stopPropagation();
        this.isManualMode ? this.showSelectorOptions(e.target) : this.handleElementSelection(e.target)
      }, !0)
    }
    handleElementSelection(e) {
      try {
        this.findSimilarElements(e).forEach(el => {
          this.originalState.has(el) || this.originalState.set(el, {
            outline: el.style.outline,
            parent: el.parentNode
          });
          el.style.outline = '2px solid #3b82f6';
          this.selectedElements.add(el)
        });
        this.updatePreview()
      }
      catch (err) {
        console.error('Selection error:', err);
        this.originalState.has(e) || this.originalState.set(e, {
          outline: e.style.outline,
          parent: e.parentNode
        });
        e.style.outline = '2px solid #3b82f6';
        this.selectedElements.add(e)
      }
    }
    findSimilarElements(e) {
      const r = new Set,
        s = [() => e.className ? Array.from(document.getElementsByClassName(Array.from(e.classList).join('.'))) : [], () => e.getAttribute('role') ? Array.from(document.querySelectorAll(`[role="${e.getAttribute('role')}"]`)) : [], () => {
          const t = e.tagName.toLowerCase();
          return e.id ? Array.from(document.querySelectorAll(`${t}[id="${e.id}"}`)) : []
        }, () => {
          const p = e.parentElement;
          return p ? Array.from(p.children).filter(s => s.tagName === e.tagName && s.className === e.className) : []
        }, () => {
          const t = e.textContent?.trim();
          return t && t.match(/^\$?\d+(\.\d{2})?$/) ? Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.trim().match(/^\$?\d+(\.\d{2})?$/)) : []
        }, ];
      for(const strategy of s) try {
        const m = strategy();
        if(m.length > 0) {
          m.forEach(match => r.add(match));
          break
        }
      }
      catch (err) {
        continue
      }
      return r.size === 0 && r.add(e), Array.from(r)
    }
    showSelectorOptions(e) {
      const s = this.generateSelectors(e),
        p = document.getElementById('preview-content');
      p.innerHTML = `<h4>Available Selectors:</h4>${s.map(s=>`<div style="margin:5px 0;padding:5px;border:1px solid #eee"><button onclick="window.DOMToolkit.selectBySelector('${s}')" style="display:block;width:100%;text-align:left;padding:5px">${s}<small>(Matches:${document.querySelectorAll(s).length})</small></button></div>`).join('')}`;
      document.getElementById('dom-toolkit-preview').style.display = 'block'
    }
    generateSelectors(e) {
      const s = new Set;
      try {
        e.id && s.add(`#${e.id}`);
        e.className && s.add(`.${Array.from(e.classList).join('.')}`);
        const t = e.tagName.toLowerCase();
        e.getAttribute('role') && s.add(`${t}[role="${e.getAttribute('role')}"]`);
        const p = e.parentElement;
        if(p) {
          const i = Array.from(p.children).indexOf(e);
          s.add(`${t}:nth-child(${i+1})`)
        }
      }
      catch (err) {
        s.add(e.tagName.toLowerCase())
      }
      return Array.from(s)
    }
    selectBySelector(s) {
      try {
        document.querySelectorAll(s).forEach(e => {
          e.style.outline = '2px solid #3b82f6';
          this.selectedElements.add(e)
        });
        this.updatePreview()
      }
      catch (err) {
        alert('Error applying selector. Please try a different one.')
      }
    }
    removeSelected() {
      try {
        this.selectedElements.forEach(e => e.remove());
        this.clearAll()
      }
      catch (err) {
        alert('Error removing elements. Some elements may not have been removed.')
      }
    }
    extractContentPreview(e) {
      let p = {
        type: '',
        content: '',
        attributes: {}
      };
      const a = ['href', 'src', 'alt', 'title', 'data-*'];
      for(let attr of e.attributes) a.some(p => p === attr.name || p.endsWith('*') && attr.name.startsWith(p.slice(0, -1))) && (p.attributes[attr.name] = attr.value);
      if(e.tagName.toLowerCase() === 'img') {
        p.type = 'image';
        p.content = e.src
      }
      else if(e.tagName.toLowerCase() === 'a') {
        p.type = 'link';
        p.content = e.textContent.trim()
      }
      else if(e.tagName.toLowerCase() === 'table') {
        p.type = 'table';
        const c = Array.from(e.querySelectorAll('td,th')).slice(0, 5);
        p.content = c.map(c => c.textContent.trim()).join('|')
      }
      else {
        p.type = 'text';
        p.content = e.textContent.trim()
      }
      return p
    }
    updatePreview() {
      const p = document.getElementById('dom-toolkit-preview'),
        c = document.getElementById('preview-content'),
        n = document.getElementById('preview-count');
      this.extractedData.length > 0 ? (n.textContent = `${this.extractedData.length} items`, c.innerHTML = this.extractedData.map(d => {
        let h = '<div class="dom-toolkit-preview-item">';
        return d.type === 'image' && (h += `<img src="${d.content}" alt="${d.attributes.alt||''}" class="dom-toolkit-thumbnail">`), h += '<div class="dom-toolkit-content">', d.type === 'link' ? h += `<a href="${d.attributes.href}">${d.content}</a>` : d.type === 'table' ? h += `<div style="overflow-x:auto">${d.content}</div>` : h += d.content, Object.keys(d.attributes).length > 0 && (h += `<div class="dom-toolkit-attributes">${Object.entries(d.attributes).map(([k,v])=>`${k}:${v}`).join('|')}</div>`), h + '</div></div>'
      }).join(''), p.style.display = 'block') : p.style.display = 'none'
    }
    extractSelected() {
      try {
        this.selectedElements.forEach(e => {
          const p = this.extractContentPreview(e);
          this.extractedData.push(p)
        });
        this.updatePreview()
      }
      catch (err) {
        alert('Error extracting data. Some data may be incomplete.')
      }
    }
    restorePage() {
      try {
        this.originalState.forEach((s, e) => {
          e.style.outline = s.outline;
          e.parentNode !== s.parent && s.parent && s.parent.appendChild(e)
        });
        this.originalState.clear();
        this.selectedElements.clear();
        this.extractedData = [];
        this.updatePreview()
      }
      catch (err) {
        alert('Error restoring page. Some elements may not have been restored correctly.')
      }
    }
    clearAll() {
      this.selectedElements.forEach(e => e.style.outline = '');
      this.selectedElements.clear();
      this.extractedData = [];
      this.updatePreview()
    }
    updateButtonStates() {
      const s = document.getElementById('toggle-select'),
        m = document.getElementById('toggle-manual');
      s.style.background = this.isSelecting ? '#e0e0e0' : '#f0f0f0';
      m.style.background = this.isManualMode ? '#e0e0e0' : '#f0f0f0'
    }
    destroy() {
      this.clearAll();
      document.getElementById('dom-toolkit-toolbar').remove();
      document.getElementById('dom-toolkit-preview').remove();
      delete window.DOMToolkit
    }
    toggleToolbar() {
      const t = document.getElementById('dom-toolkit-toolbar');
      t.style.display = t.style.display === 'none' ? 'flex' : 'none'
    }
    downloadData() {
      try {
        const d = JSON.stringify(this.extractedData, null, 2),
          b = new Blob([d], {
            type: 'application/json'
          }),
          u = URL.createObjectURL(b),
          a = document.createElement('a');
        a.href = u;
        a.download = 'extracted-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(u)
      }
      catch (err) {
        alert('Error downloading data. Please try again.')
      }
    }
  }
  window.DOMToolkit = new DOMToolkit
})(); //
