javascript: (function() {
	// Create toolbar container with improved styling
	const toolbar = document.createElement('div');
	toolbar.id = 'mega-tools';
	toolbar.style.cssText = `
	position:fixed;
	top:0;
	left:0;
	width:100%;
	background:#1a1a1a;
	color:#fff;
	z-index:999999;
	font-size:12px;
	padding:5px;
	box-shadow:0 2px 10px rgba(0,0,0,0.3);
	user-select:none;
	display:flex;
	flex-wrap:wrap;
	gap:3px;
	max-height:40vh;
	overflow-y:auto;
	`;

	// Enhanced output handling
	const outputManager = {
		resultWindow: null,

		createWindow: () => {
			const win = document.createElement('div');
			win.style.cssText = `
			position:fixed;
			bottom:0;
			left:0;
			width:100%;
			height:30vh;
			background:#1a1a1a;
			color:#fff;
			z-index:999998;
			font-size:12px;
			padding:10px;
			overflow:auto;
			box-shadow:0 -2px 10px rgba(0,0,0,0.3);
			`;
			const closeBtn = document.createElement('button');
			closeBtn.textContent = 'Close';
			closeBtn.style.cssText = 'position:absolute;right:5px;top:5px;background:#ff4444;border:none;color:#fff;padding:2px 6px;border-radius:3px;';
			closeBtn.onclick = () => win.remove();
			win.appendChild(closeBtn);
			return win;
		},

		show: (content, title) => {
			if (outputManager.resultWindow) {
				outputManager.resultWindow.remove();
			}
			outputManager.resultWindow = outputManager.createWindow();
			const titleEl = document.createElement('h3');
			titleEl.textContent = title;
			titleEl.style.marginBottom = '10px';
			outputManager.resultWindow.appendChild(titleEl);

			if (typeof content === 'object') {
				const pre = document.createElement('pre');
				pre.textContent = JSON.stringify(content, null, 2);
				outputManager.resultWindow.appendChild(pre);
			} else {
				outputManager.resultWindow.appendChild(document.createTextNode(content));
			}

			document.body.appendChild(outputManager.resultWindow);
		}
	};

	// Enhanced tools object with improved functionality
	const tools = {
		extract: {
			getAllHTML: () => {
				const html = document.documentElement.outerHTML;
				const beautified = html.replace(/></g, '>\n<')
				.replace(/^/gm, '  ')
				.replace(/>(\s*)</g, '>\n<');
				return {
					raw: html,
					beautified: beautified,
					length: html.length,
					elements: document.getElementsByTagName('*').length
				};
			},

			getText: () => {
				const textNodes = [];
				const walker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					null,
					false
				);
				let node;
				while (node = walker.nextNode()) {
					const trimmed = node.textContent.trim();
					if (trimmed) {
						textNodes.push({
							text: trimmed,
							path: getNodePath(node),
							parentTag: node.parentElement?.tagName
						});
					}
				}
				return textNodes;
			},

			getImages: () => {
				return Array.from(document.images).map(img => ({
					src: img.src,
					alt: img.alt,
					dimensions: `${img.naturalWidth}x${img.naturalHeight}`,
					size: `${Math.round(img.naturalWidth * img.naturalHeight / 1024)}KB (estimated)`,
					loading: img.loading,
					path: getNodePath(img)
				}));
			},

			getVideos: () => {
				return Array.from(document.getElementsByTagName('video')).map(v => ({
					src: v.src,
					sources: Array.from(v.getElementsByTagName('source')).map(s => ({
						src: s.src,
						type: s.type
					})),
					duration: v.duration,
					controls: v.hasAttribute('controls'),
					autoplay: v.autoplay,
					path: getNodePath(v)
				}));
			},

			getLinks: () => {
				const links = Array.from(document.links).map(link => ({
					href: link.href,
					text: link.textContent.trim(),
					isExternal: link.hostname !== window.location.hostname,
					hasTarget: link.hasAttribute('target'),
					target: link.target,
					path: getNodePath(link)
				}));

				// Group by domain for analysis
				const domains = {};
				links.forEach(link => {
					try {
						const url = new URL(link.href);
						domains[url.hostname] = (domains[url.hostname] || 0) + 1;
					} catch(e) {}
				});

				return {
					links,
					summary: {
						total: links.length,
						external: links.filter(l => l.isExternal).length,
						domains
					}
				};
			},

			getXHR: () => {
				const xhrLogs = [];
				const originalXHR = window.XMLHttpRequest;
				const originalFetch = window.fetch;

				// Intercept XHR
				window.XMLHttpRequest = function() {
					const xhr = new originalXHR();
					const send = xhr.send;
					xhr.send = function() {
						const startTime = Date.now();
						xhr.addEventListener('load', function() {
							try {
								xhrLogs.push({
									type: 'XHR',
									url: xhr.responseURL,
									method: xhr._method || 'GET',
									status: xhr.status,
									duration: Date.now() - startTime,
									response: JSON.parse(xhr.responseText),
									timestamp: new Date().toISOString()
								});
							} catch(e) {}
						});
						send.apply(xhr, arguments);
					};
					return xhr;
				};

				// Intercept Fetch
				window.fetch = async function() {
					const startTime = Date.now();
					try {
						const response = await originalFetch.apply(this, arguments);
						const clone = response.clone();
						const json = await clone.json();
						xhrLogs.push({
							type: 'Fetch',
							url: response.url,
							method: arguments[1]?.method || 'GET',
							status: response.status,
							duration: Date.now() - startTime,
							response: json,
							timestamp: new Date().toISOString()
						});
						return response;
					} catch(e) {
						return originalFetch.apply(this, arguments);
					}
				};

				return xhrLogs;
			},

			getTableData: () => {
				return Array.from(document.getElementsByTagName('table')).map((table, idx) => {
					const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
					const rows = Array.from(table.querySelectorAll('tr')).map(row =>
						Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim())
					).filter(row => row.length > 0);

					return {
						tableIndex: idx,
						headers,
						rows,
						summary: {
							rowCount: rows.length,
							columnCount: headers.length || (rows[0] || []).length,
							path: getNodePath(table)
						}
					};
				});
			}
		},

		modify: {
			replaceText: (find, replace, options = {}) => {
				const defaults = {
					matchCase: false,
					wholeWord: false,
					regex: false
				};
				const opts = {
					...defaults,
					...options
				};

				let regex;
				if (opts.regex) {
					regex = new RegExp(find, opts.matchCase ? 'g': 'gi');
				} else {
					const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					const pattern = opts.wholeWord ? `\\b${escapedFind}\\b`: escapedFind;
					regex = new RegExp(pattern, opts.matchCase ? 'g': 'gi');
				}

				const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
				const changes = [];
				let node;

				while (node = walker.nextNode()) {
					const original = node.textContent;
					const modified = original.replace(regex, replace);
					if (original !== modified) {
						changes.push({
							original,
							modified,
							path: getNodePath(node)
						});
						node.textContent = modified;
					}
				}

				return {
					pattern: find,
					replacement: replace,
					options: opts,
					changesCount: changes.length,
					changes
				};
			},

			injectHTML: (html, position = 'beforeend') => {
				const temp = document.createElement('div');
				temp.innerHTML = html;
				const validPositions = ['beforebegin',
					'afterbegin',
					'beforeend',
					'afterend'];

				if (!validPositions.includes(position)) {
					position = 'beforeend';
				}

				const elements = Array.from(temp.children);
				document.body.insertAdjacentHTML(position, html);

				return {
					injected: html,
					position,
					elementsCount: elements.length,
					elements: elements.map(el => ({
						tag: el.tagName.toLowerCase(),
						id: el.id,
						classes: Array.from(el.classList)
					}))
				};
			},

			deleteElement: (selector) => {
				const elements = Array.from(document.querySelectorAll(selector));
				const deleted = elements.map(el => ({
					tag: el.tagName.toLowerCase(),
					id: el.id,
					classes: Array.from(el.classList),
					path: getNodePath(el),
					content: el.innerHTML
				}));

				elements.forEach(el => el.remove());

				return {
					selector,
					deletedCount: deleted.length,
					deleted
				};
			}
		},

		security: {
			generatePassword: (options = {}) => {
				const defaults = {
					length: 16,
					numbers: true,
					symbols: true,
					uppercase: true,
					lowercase: true,
					excludeSimilar: true
				};
				const opts = {
					...defaults,
					...options
				};

				const sets = {
					lowercase: 'abcdefghijklmnopqrstuvwxyz',
					uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
					numbers: '0123456789',
					symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
				};

				if (opts.excludeSimilar) {
					sets.lowercase = sets.lowercase.replace(/[il1]/g, '');
					sets.uppercase = sets.uppercase.replace(/[IO0]/g, '');
					sets.numbers = sets.numbers.replace(/[10]/g, '');
				}

				let chars = '';
				if (opts.lowercase) chars += sets.lowercase;
				if (opts.uppercase) chars += sets.uppercase;
				if (opts.numbers) chars += sets.numbers;
				if (opts.symbols) chars += sets.symbols;

				const password = Array.from(crypto.getRandomValues(new Uint32Array(opts.length)))
				.map(x => chars[x % chars.length])
				.join('');

				return {
					password,
					length: password.length,
					options: opts,
					entropy: Math.log2(Math.pow(chars.length, password.length))
				};
			},

			findSensitiveData: () => {
				const patterns = {
					email: /[\w.-]+@[\w.-]+\.\w+/g,
					phone: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
					ssn: /\d{3}[-.]?\d{2}[-.]?\d{4}/g,
					creditCard: /\d{4}[-.]?\d{4}[-.]?\d{4}[-.]?\d{4}/g,
					apiKey: /['"][a-zA-Z0-9]{32,}['"]/g
				};

				const results = {};
				const text = document.body.innerText;

				Object.entries(patterns).forEach(([key, pattern]) => {
					const matches = text.match(pattern) || [];
					results[key] = matches.length;
				});

				return {
					found: results,
					recommendation: 'Review and remove sensitive data if unintended'
				};
			},

			findExposedPasswords: () => {
				const exposedInputs = Array.from(document.querySelectorAll('input[type="password"]'))
				.filter(input => input.value.length > 0)
				.map(input => ({
					id: input.id,
					name: input.name,
					formId: input.form?.id,
					path: getNodePath(input)
				}));

				return {
					count: exposedInputs.length,
					inputs: exposedInputs
				};
			},

			findMixedContent: () => {
				const insecure = [];
				['img',
					'script',
					'link',
					'iframe'].forEach(tag => {
						document.querySelectorAll(tag).forEach(el => {
							const src = el.src || el.href;
							if (src && src.startsWith('http:')) {
								insecure.push({
									element: el.tagName,
									source: src,
									path: getNodePath(el)
								});
							}
						});
					});
				return {
					insecureElements: insecure
				};
			},

			checkThirdPartyScripts: () => {
				const scripts = Array.from(document.scripts)
				.filter(script => script.src)
				.map(script => ({
					src: script.src,
					async: script.async,
					defer: script.defer,
					type: script.type,
					integrity: script.integrity,
					domain: new URL(script.src).hostname
				}));

				return {
					total: scripts.length,
					thirdParty: scripts.filter(s => s.domain !== window.location.hostname),
					unprotected: scripts.filter(s => !s.integrity)
				};
			},

			findEventListeners: () => {
				const elements = document.querySelectorAll('*');
				const listeners = [];

				elements.forEach(el => {
					const attrs = Array.from(el.attributes);
					attrs.forEach(attr => {
						if (attr.name.startsWith('on')) {
							listeners.push({
								element: el.tagName,
								event: attr.name,
								handler: attr.value,
								path: getNodePath(el)
							});
						}
					});
				});

				return {
					listeners
				};
			},
			bypassForm: () => {
				const forms = Array.from(document.forms);
				const modifications = [];

				forms.forEach(form => {
					const fields = Array.from(form.elements);
					const original = {
						action: form.action,
						method: form.method,
						target: form.target,
						required: fields.filter(f => f.required).length
					};

					// Remove validations
					form.setAttribute('novalidate',
						'true');
					fields.forEach(field => {
						if (field.required) {
							field.required = false;
						}
						if (field.pattern) {
							field.pattern = '.*';
						}
						if (field.type === 'email') {
							field.type = 'text';
						}
					});

					modifications.push({
						formId: form.id || '[No ID]',
						original,
						modified: {
							novalidate: true,
							fieldsModified: fields.length
						},
						fields: fields.map(f => ({
							name: f.name,
							type: f.type,
							wasRequired: original.required
						}))
					});
				});

				return {
					formsModified: modifications.length,
					modifications
				};
			}
		},

		domTools: {
			makeAllLinksClickable: () => {
				const urlPattern = /(?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,6}(?:\/[^\s]*)?/gi;
				const textNodes = [];
				const walker = document.createTreeWalker(
					document.body,
					NodeFilter.SHOW_TEXT,
					null,
					false
				);

				let node;
				while (node = walker.nextNode()) {
					if (urlPattern.test(node.textContent)) {
						textNodes.push(node);
					}
				}

				let count = 0;
				textNodes.forEach(node => {
					const parent = node.parentNode;
					if (parent.tagName !== 'A') {
						const text = node.textContent;
						const fragment = document.createDocumentFragment();
						let lastIndex = 0;
						let match;

						urlPattern.lastIndex = 0;
						while ((match = urlPattern.exec(text)) !== null) {
							const url = match[0];
							fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));

							const link = document.createElement('a');
							link.href = url.startsWith('http') ? url: 'https://' + url;
							link.textContent = url;
							link.target = '_blank';
							link.rel = 'noopener noreferrer';
							fragment.appendChild(link);

							lastIndex = match.index + url.length;
							count++;
						}

						fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
						parent.replaceChild(fragment, node);
					}
				});

				return {
					linksCreated: count
				};
			},

			extractStructuredData: () => {
				const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
				.map(script => {
					try {
						return JSON.parse(script.textContent);
					} catch (e) {
						return null;
					}
				})
				.filter(Boolean);

				const microdata = Array.from(document.querySelectorAll('[itemscope]'))
				.map(element => {
					const props = {};
					element.querySelectorAll('[itemprop]').forEach(prop => {
						props[prop.getAttribute('itemprop')] = prop.textContent.trim();
					});
					return {
						type: element.getAttribute('itemtype'),
						properties: props
					};
				});

				return {
					jsonLd: jsonLdScripts,
					microdata: microdata
				};
			},

			findDuplicateElements: () => {
				const duplicates = {};

				['id', 'name'].forEach(attr => {
					const elements = document.querySelectorAll(`[${attr}]`);
					const values = {};

					elements.forEach(el => {
						const value = el.getAttribute(attr);
						if (!values[value]) values[value] = [];
						values[value].push(getNodePath(el));
					});

					duplicates[attr] = Object.entries(values)
					.filter(([_, elements]) => elements.length > 1)
					.reduce((acc, [value, elements]) => {
						acc[value] = elements;
						return acc;
					},
						{});
				});

				return duplicates;
			},

			cleanDOM: () => {
				const removed = {
					comments: 0,
					empty: 0,
					whitespace: 0
				};

				// Remove comments
				const commentIterator = document.createNodeIterator(
					document.documentElement,
					NodeFilter.SHOW_COMMENT
				);
				let comment;
				while (comment = commentIterator.nextNode()) {
					comment.remove();
					removed.comments++;
				}

				// Remove empty elements
				document.querySelectorAll('*').forEach(el => {
					if (!el.children.length && !el.textContent.trim()) {
						el.remove();
						removed.empty++;
					}
				});

				// Normalize whitespace
				const textIterator = document.createNodeIterator(
					document.documentElement,
					NodeFilter.SHOW_TEXT
				);
				let textNode;
				while (textNode = textIterator.nextNode()) {
					if (textNode.textContent.trim() === '') {
						textNode.remove();
						removed.whitespace++;
					}
				}

				return removed;
			},

			selectiveScrape: (config = {}) => {
				const defaults = {
					headings: true,
					paragraphs: true,
					lists: true,
					tables: true,
					images: true,
					links: true
				};

				const options = {
					...defaults,
					...config
				};
				const data = {};

				if (options.headings) {
					data.headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
					.map(h => ({
						level: parseInt(h.tagName[1]),
						text: h.textContent.trim(),
						path: getNodePath(h)
					}));
				}

				if (options.paragraphs) {
					data.paragraphs = Array.from(document.querySelectorAll('p'))
					.map(p => ({
						text: p.textContent.trim(),
						length: p.textContent.length,
						path: getNodePath(p)
					}))
					.filter(p => p.length > 0);
				}

				if (options.lists) {
					data.lists = Array.from(document.querySelectorAll('ul, ol'))
					.map(list => ({
						type: list.tagName.toLowerCase(),
						items: Array.from(list.querySelectorAll('li'))
						.map(li => li.textContent.trim()),
						path: getNodePath(list)
					}));
				}

				if (options.tables) {
					data.tables = Array.from(document.querySelectorAll('table'))
					.map(table => ({
						headers: Array.from(table.querySelectorAll('th'))
						.map(th => th.textContent.trim()),
						rows: Array.from(table.querySelectorAll('tr'))
						.map(tr => Array.from(tr.querySelectorAll('td'))
							.map(td => td.textContent.trim())),
						path: getNodePath(table)
					}));
				}

				if (options.images) {
					data.images = Array.from(document.querySelectorAll('img'))
					.map(img => ({
						src: img.src,
						alt: img.alt,
						dimensions: `${img.width}x${img.height}`,
						path: getNodePath(img)
					}));
				}

				if (options.links) {
					data.links = Array.from(document.querySelectorAll('a[href]'))
					.map(a => ({
						href: a.href,
						text: a.textContent.trim(),
						isExternal: a.hostname !== window.location.hostname,
						path: getNodePath(a)
					}));
				}

				return data;
			},

			isolateElement: (selector) => {
				const element = document.querySelector(selector);
				if (!element) return {
					success: false,
					error: 'Element not found'
				};

				const original = document.body.innerHTML;
				const wrapper = document.createElement('div');
				wrapper.style.cssText = 'padding: 20px; background: white;';
				wrapper.appendChild(element.cloneNode(true));
				document.body.innerHTML = '';
				document.body.appendChild(wrapper);

				const restoreBtn = document.createElement('button');
				restoreBtn.textContent = 'Restore Page';
				restoreBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:999999;';
				restoreBtn.onclick = () => {
					document.body.innerHTML = original;
				};
				document.body.appendChild(restoreBtn);

				return {
					success: true,
					selector
				};
			}
		},

		utils: {
			generateQR: (text, options = {}) => {
				const defaults = {
					size: 200,
					margin: 4,
					color: '000000',
					format: 'svg'
				};
				const opts = {
					...defaults,
					...options
				};

				const url = `https://api.qrserver.com/v1/create-qr-code/?size=${opts.size}x${opts.size}&margin=${opts.margin}&color=${opts.color}&format=${opts.format}&data=${encodeURIComponent(text)}`;

				// Create modal for QR display
				const modal = document.createElement('div');
				modal.style.cssText = `
				position:fixed;
				top:50%;
				left:50%;
				transform:translate(-50%, -50%);
				background:white;
				padding:20px;
				border-radius:10px;
				box-shadow:0 0 20px rgba(0,0,0,0.3);
				z-index:1000000;
				text-align:center;
				`;

				const img = document.createElement('img');
				img.src = url;
				img.style.maxWidth = '100%';

				const downloadBtn = document.createElement('button');
				downloadBtn.textContent = 'Download QR';
				downloadBtn.style.cssText = 'margin-top:10px;padding:5px 10px;background:#4CAF50;color:white;border:none;border-radius:3px;';
				downloadBtn.onclick = () => {
					const a = document.createElement('a');
					a.href = url;
					a.download = 'qr-code.' + opts.format;
					a.click();
				};

				const closeBtn = document.createElement('button');
				closeBtn.textContent = '×';
				closeBtn.style.cssText = 'position:absolute;right:10px;top:10px;background:none;border:none;font-size:20px;cursor:pointer;';
				closeBtn.onclick = () => modal.remove();

				modal.appendChild(closeBtn);
				modal.appendChild(img);
				modal.appendChild(downloadBtn);
				document.body.appendChild(modal);

				return {
					url,
					options: opts,
					text: text
				};
			},

			formatJSON: (json) => {
				try {
					const parsed = typeof json === 'string' ? JSON.parse(json): json;
					const formatted = JSON.stringify(parsed, null, 2);

					// Create syntax-highlighted view
					const highlighted = formatted.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
						match => {
							let cls = 'number';
							if (/^"/.test(match)) {
								cls = /:$/.test(match) ? 'key': 'string';
							} else if (/true|false/.test(match)) {
								cls = 'boolean';
							} else if (/null/.test(match)) {
								cls = 'null';
							}
							return `<span class="json-${cls}">${match}</span>`;
						}
					);

					const viewer = document.createElement('div');
					viewer.style.cssText = `
					position:fixed;
					top:10%;
					left:10%;
					width:80%;
					height:80%;
					background:#1e1e1e;
					color:#d4d4d4;
					padding:20px;
					border-radius:10px;
					box-shadow:0 0 20px rgba(0,0,0,0.3);
					z-index:1000000;
					overflow:auto;
					font-family:monospace;
					`;

					const style = document.createElement('style');
					style.textContent = `
					.json-string { color: #ce9178; }
					.json-number { color: #b5cea8; }
					.json-boolean { color: #569cd6; }
					.json-null { color: #569cd6; }
					.json-key { color: #9cdcfe; }
					`;

					viewer.innerHTML = `<pre>${highlighted}</pre>`;
					const closeBtn = document.createElement('button');
					closeBtn.textContent = '×';
					closeBtn.style.cssText = 'position:absolute;right:10px;top:10px;background:none;border:none;color:white;font-size:20px;cursor:pointer;';
					closeBtn.onclick = () => {
						viewer.remove();
						style.remove();
					};

					viewer.appendChild(closeBtn);
					document.head.appendChild(style);
					document.body.appendChild(viewer);

					return {
						formatted,
						valid: true,
						length: formatted.length,
						type: typeof parsed
					};
				} catch (e) {
					return {
						error: e.message,
						valid: false
					};
				}
			},

			downloadTxt: (content,
				filename = 'download.txt') => {
				const blob = new Blob([content],
					{
						type: 'text/plain;charset=utf-8'
					});
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				return {
					filename,
					size: blob.size,
					type: blob.type
				};
			}
		}
	};

	// Helper function to get DOM path
	function getNodePath(node) {
		const path = [];
		while (node && node.nodeType === Node.ELEMENT_NODE) {
			let selector = node.nodeName.toLowerCase();
			if (node.id) {
				selector += '#' + node.id;
			} else {
				let sibling = node;
				let siblingIndex = 1;
				while (sibling = sibling.previousElementSibling) {
					if (sibling.nodeName === node.nodeName) siblingIndex++;
				}
				selector += `:nth-of-type(${siblingIndex})`;
			}
			path.unshift(selector);
			node = node.parentNode;
		}
		return path.join(' > ');
	}

	// Create category containers for better organization
	const categories = {
		'Extract': [
			'getAllHTML',
			'getText',
			'getImages',
			'getVideos',
			'getLinks',
			'getXHR',
			'getTableData'
		],
		'Modify': [
			'replaceText',
			'injectHTML',
			'deleteElement'
		],
		'Security': [
			'generatePassword',
			'bypassForm'
		],
		'Utils': [
			'generateQR',
			'formatJSON',
			'downloadTxt'
		],
		'DOM Tools': [
			'makeAllLinksClickable',
			'extractStructuredData',
			'findDuplicateElements',
			'cleanDOM',
			'selectiveScrape',
			'isolateElement'
		]
	};

	// Create tabbed interface
	const tabContainer = document.createElement('div');
	tabContainer.style.cssText = 'display:flex;gap:5px;margin-bottom:5px;';

	Object.keys(categories).forEach(category => {
		const tab = document.createElement('button');
		tab.textContent = category;
		tab.style.cssText = `
		padding:3px 8px;
		background:#333;
		border:none;
		color:#fff;
		border-radius:3px;
		cursor:pointer;
		`;
		tab.onclick = () => showCategory(category);
		tabContainer.appendChild(tab);
	});

	toolbar.appendChild(tabContainer);

	// Container for tool buttons
	const buttonContainer = document.createElement('div');
	buttonContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;';
	toolbar.appendChild(buttonContainer);

	function showCategory(category) {
		buttonContainer.innerHTML = '';
		categories[category].forEach(toolName => {
			const btn = document.createElement('button');
			btn.textContent = toolName;
			btn.style.cssText = `
			padding:3px 6px;
			background:#444;
			border:none;
			color:#fff;
			border-radius:3px;
			font-size:11px;
			cursor:pointer;
			`;
			btn.onclick = async () => {
				try {
					let result;
					switch (toolName) {
						case 'replaceText':
							const find = prompt('Enter text to find:');
							const replace = prompt('Enter replacement text:');
							if (find) result = tools.modify.replaceText(find, replace);
							break;
						case 'generatePassword':
							result = tools.security.generatePassword();
							break;
						case 'generateQR':
							const text = prompt('Enter text for QR code:');
							if (text) result = tools.utils.generateQR(text);
							break;
						default:
							result = await tools[category.toLowerCase()][toolName]();
						}

						if (result) {
							console.log(`=== ${toolName} Results ===`);
							console.table(result);
							outputManager.show(result, toolName);
						}
					} catch(e) {
						console.error(`Error in ${toolName}:`, e);
						alert(`Error: ${e.message}`);
					}
				};
				buttonContainer.appendChild(btn);
			});
		}

		// Show initial category
		showCategory('Extract');

		// Add close button
		const closeBtn = document.createElement('button');
		closeBtn.textContent = '×';
		closeBtn.style.cssText = 'position:absolute;right:5px;top:5px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;';
		closeBtn.onclick = () => toolbar.remove();
		toolbar.appendChild(closeBtn);

		document.body.appendChild(toolbar);

		// Make toolbar draggable
		let isDragging = false;
		let currentX;
		let currentY;
		let initialX;
		let initialY;

		toolbar.addEventListener('mousedown',
			e => {
				if (e.target === toolbar) {
					isDragging = true;
					initialX = e.clientX - currentX;
					initialY = e.clientY - currentY;
				}
			});

		document.addEventListener('mousemove',
			e => {
				if (isDragging) {
					e.preventDefault();
					currentX = e.clientX - initialX;
					currentY = e.clientY - initialY;
					toolbar.style.transform = `translate(${currentX}px, ${currentY}px)`;
				}
			});

		document.addEventListener('mouseup',
			() => {
				isDragging = false;
			});

		// Export tools globally for console access
		window.megaTools = tools;
	})();
