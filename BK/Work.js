javascript:(() => { 
  const s = document.createElement('style'); 
  s.textContent = `.i{position:fixed;top:20px;left:20px;width:380px;background:#1a1a1a;color:#fff;border-radius:8px;box-shadow:0 4px 12px #0008;font-family:-apple-system,system-ui,sans-serif;z-index:999999}.i *{box-sizing:border-box}.h{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#2a2a2a;border-radius:8px 8px 0 0;border-bottom:1px solid #3a3a3a}.t{font-size:16px;font-weight:700;margin:0;color:#fff}.c{padding:16px}.i textarea{width:100%;height:120px;padding:8px;margin-bottom:12px;background:#2a2a2a;border:1px solid #3a3a3a;border-radius:4px;color:#fff;font-family:monospace;font-size:13px;resize:vertical}.b{display:grid;grid-template-columns:1fr 1fr;gap:8px}.i button{padding:8px 12px;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;transition:all .2s;white-space:nowrap}.i button:active{transform:translateY(1px)}.p{background:#2563eb;color:#fff}.p:hover{background:#1d4ed8}.s{background:#059669;color:#fff}.s:hover{background:#047857}.d{background:#dc2626;color:#fff}.d:hover{background:#b91c1c}.w{background:#d97706;color:#fff}.w:hover{background:#b45309}.n{background:#7c3aed;color:#fff}.n:hover{background:#6d28d9}.y{background:#4b5563;color:#fff}.y:hover{background:#374151}.f{grid-column:span 2}.m{position:fixed;bottom:20px;right:20px;padding:12px 20px;background:#2a2a2a;color:#fff;border-radius:4px;box-shadow:0 2px 8px #0003;display:none;animation:a .3s}@keyframes a{from{transform:translateY(100px);opacity:0}to{transform:translateY(0);opacity:1}}`;
  const scriptContent = `(${document.currentScript?.innerHTML || ''})()`;

  const showNotification = msg => {
    const notification = document.createElement('div');
    notification.className = 'm';
    notification.textContent = msg;
    document.body.appendChild(notification);
    notification.style.display = 'block';
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  };

  const addExternalResource = (type, url) => {
    const element = document.createElement(type === 'css' ? 'link' : 'script');
    if (type === 'css') {
      element.rel = 'stylesheet';
      element.href = url;
    } else {
      element.src = url;
    }
    document.head.appendChild(element);
    showNotification(`${type.toUpperCase()} resource added`);
  };

  const toggleElementBorders = () => {
    const style = document.getElementById('debug-borders');
    if (style) {
      style.remove();
      showNotification('Borders removed');
    } else {
      const borderStyle = document.createElement('style');
      borderStyle.id = 'debug-borders';
      borderStyle.textContent = '* { outline: 1px solid rgba(255,0,0,0.2) !important; }';
      document.head.appendChild(borderStyle);
      showNotification('Borders added');
    }
  };

  const simplifyCSS = e => {
    e.preventDefault();
    try {
      [...document.styleSheets].forEach(sheet => {
        try {
          if (sheet.cssRules) {
            [...sheet.cssRules].forEach(rule => {
              if (rule.style) {
                const keepProps = ['display', 'position', 'width', 'height', 'margin', 'padding', 'color', 'background', 'font-size', 'font-family', 'border'];
                for (let i = rule.style.length - 1; i >= 0; i--) {
                  const prop = rule.style[i];
                  if (!keepProps.some(p => prop.startsWith(p))) {
                    rule.style.removeProperty(prop);
                  }
                }
              }
            });
          }
        } catch (err) {
          console.log(err);
        }
      });
      showNotification('CSS simplified');
    } catch (err) {
      showNotification('Error: ' + err.message);
    }
  };

  const createInjector = () => {
    document.head.appendChild(s);
    const injector = document.createElement('div');
    injector.className = 'i';
    const header = document.createElement('div');
    header.className = 'h';
    header.innerHTML = '<h3 class="t">⚡ Code Injector</h3><button class="d" style="padding:4px 8px" onclick="this.closest(\'.i\').remove()">×</button>';
    const content = document.createElement('div');
    content.className = 'c';
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Paste your HTML/CSS/JS code or links here...';
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'b';
    const injectedElements = [];
    const buttons = [
      {
        text: '📄 Inject Current',
        class: 's',
        action: (e) => {
          e.preventDefault();
          try {
            const div = document.createElement('div');
            div.innerHTML = textarea.value;
            document.body.appendChild(div);
            injectedElements.push(div);
            showNotification('Code injected');
          } catch (err) {
            showNotification('Error: ' + err.message);
          }
        },
      },
      {
        text: '🔄 New Page',
        class: 'p',
        action: (e) => {
          e.preventDefault();
          try {
            const win = window.open();
            win.document.write(textarea.value);
            win.document.close();
            showNotification('Page created');
          } catch (err) {
            showNotification('Error: ' + err.message);
          }
        },
      },
      {
        text: '🔌 New Page + Script',
        class: 'n',
        action: (e) => {
          e.preventDefault();
          try {
            const win = window.open();
            win.document.write(`${textarea.value}<script type="text/javascript">${scriptContent}</script>`);
            win.document.close();
            showNotification('Page created with script');
          } catch (err) {
            showNotification('Error: ' + err.message);
          }
        },
      },
      {
        text: '🗑️ Remove Inline CSS',
        class: 'w',
        action: (e) => {
          e.preventDefault();
          try {
            document.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
            showNotification('Styles removed');
          } catch (err) {
            showNotification('Error: ' + err.message);
          }
        },
      },
      {
        text: '📝 Simplify CSS',
        class: 'y',
        action: simplifyCSS,
      },
      {
        text: '↩️ Undo Last',
        class: 'd',
        action: (e) => {
          e.preventDefault();
          if (injectedElements.length) {
            injectedElements.pop().remove();
            showNotification('Undone');
          } else {
            showNotification('Nothing to undo');
          }
        },
      },
      {
        text: '🎯 Toggle Borders',
        class: 'p',
        action: (e) => {
          e.preventDefault();
          toggleElementBorders();
        },
      },
      {
        text: '🔗 Add CDN Resource',
        class: 'n',
        action: (e) => {
          e.preventDefault();
          const url = textarea.value.trim();
          if (!url) {
            showNotification('Please enter a URL');
            return;
          }
          const type = url.endsWith('.css') ? 'css' : 'js';
          addExternalResource(type, url);
        },
      },
      {
        text: '🎨 Random Colors',
        class: 'y',
        action: (e) => {
          e.preventDefault();
          document.querySelectorAll('*').forEach(el => {
            el.style.backgroundColor = `hsla(${Math.random() * 360},50%,50%,0.2)`;
          });
          showNotification('Colors applied');
        },
      },
      {
        text: '🔍 Element Info',
        class: 'w',
        action: (e) => {
          e.preventDefault();
          const style = document.createElement('style');
          style.textContent = `*:hover{outline:2px solid red!important;cursor:crosshair!important}.element-info-active a{pointer-events:none!important}`;
          document.head.appendChild(style);
          showNotification('Element Info mode activated');
        },
      },
    ];
    buttons.forEach(({ text, class: btnClass, action }) => {
      const button = document.createElement('button');
      button.className = btnClass;
      button.textContent = text;
      button.addEventListener('click', action);
      buttonContainer.appendChild(button);
    });
    content.appendChild(textarea);
    content.appendChild(buttonContainer);
    injector.appendChild(header);
    injector.appendChild(content);
    document.body.appendChild(injector);
  };

  if (!document.querySelector('.i')) {
    createInjector();
  }
})();
