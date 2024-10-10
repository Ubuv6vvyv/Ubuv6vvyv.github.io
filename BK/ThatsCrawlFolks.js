(function() {
	"use strict";

	const version = "1.2.1";
	const emojis = {
		enjoy: ":)",
		happy: ":D",
		notHappy: "Fuck",
		what: "Huh",
		yesss: "🙂",
		ehmm: "😒)",
	};

	let isCrawling = false,
	allLinks = [],
	workerLinks = [],
	checkedLinks = [],
	allImages = [],
	errors = [],
	sources = [];

	// Initialize
	const createUI = () => {
		const container = document.createElement("div");
		container.id = "ThatsCrawlFolks-ui";
		container.style = `
		position: fixed; top: 0; left: 0; width: 100%;
		padding: 10px; background: #222; color: #fff;
		font-family: Arial, sans-serif; font-size: 12px;
		border-bottom: 2px solid #555; z-index: 9999;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);`;

		//
		const crawlBtn = createButton('Crawl Entire Website', startCrawling);
		const stopBtn = createButton('Stop Crawl', stopCrawling);
		const exportLinksBtn = createButton('Export Links', exportLinks);
		const clearLogsBtn = createButton('Clear Logs', clearLogs);
		const crawlCurrentLinksBtn = createButton('Crawl Current Links', crawlCurrentLinks);
		const crawlCurrentImagesBtn = createButton('Crawl Current Images', crawlCurrentImages);

		// Out
		const outputArea = document.createElement('div');
		outputArea.id = 'crawler-output';
		outputArea.style = `
		max-height: 300px; overflow-y: auto;
		margin-top: 10px; background: #333; padding: 10px;
		border-radius: 5px; font-size: 11px; word-wrap: break-word;
		color: #bfbfbf;`;

		container.append(crawlBtn, stopBtn, exportLinksBtn, clearLogsBtn, crawlCurrentLinksBtn, crawlCurrentImagesBtn, outputArea);
		document.body.appendChild(container);
	};

	const createButton = (label, callback) => {
		const btn = document.createElement("button");
		btn.textContent = label;
		btn.style = `
		background: #555; color: #fff; border: none;
		padding: 5px 10px; margin: 5px;
		cursor: pointer; border-radius: 3px; font-size: 12px;
		transition: background 0.3s;`;
		btn.onmouseover = () => btn.style.background = "#777";
		btn.onmouseout = () => btn.style.background = "#555";
		btn.onclick = callback;
		return btn;
	};

	const logOutput = (message, isError = false) => {
		const outputArea = document.getElementById('crawler-output');
		if (outputArea) {
			const msg = document.createElement('div');
			msg.textContent = message;
			msg.style.color = isError ? '#ff5555': '#bfbfbf';
			outputArea.appendChild(msg);
			outputArea.scrollTop = outputArea.scrollHeight; // Auto-scroll
		}
	};

	// Core Crawling Logic
	const startCrawling = () => {
		if (isCrawling) {
			logOutput(emojis.ehmm + " Already crawling!", true);
			return;
		}
		isCrawling = true;
		logOutput(emojis.happy + " Starting crawl...");
		allLinks = gatherLinks(document);
		workerLinks = [...allLinks];
		logOutput("Found " + allLinks.length + " links on this page.");
		processLinks();
	};

	const stopCrawling = () => {
		isCrawling = false;
		logOutput(emojis.ehmm + " Crawl stopped.");
	};

	const processLinks = () => {
		if (!isCrawling || workerLinks.length === 0) {
			logOutput(emojis.yesss + " Crawling complete!");
			return;
		}
		const link = workerLinks.shift();
		if (!link || checkedLinks.includes(link)) {
			processLinks();
			return;
		}
		logOutput("Checking link: " + link);
		fetchPage(link)
		.then(doc => {
			const newLinks = gatherLinks(doc);
			const newImages = gatherImages(doc);
			allLinks.push(...newLinks);
			allImages.push(...newImages);
			workerLinks.push(...newLinks.filter(l => !checkedLinks.includes(l)));
			checkedLinks.push(link);
			processLinks();
		})
		.catch(err => {
			errors.push(link);
			logOutput(emojis.notHappy + " Error fetching " + link + ": " + err, true);
			retryLink(link); // Retry failed link
			processLinks();
		});
	};

	const retryLink = (link) => {
		logOutput("Retrying link: " + link);
		setTimeout(() => {
			fetchPage(link)
			.then(doc => {
				const newLinks = gatherLinks(doc);
				const newImages = gatherImages(doc);
				allLinks.push(...newLinks);
				allImages.push(...newImages);
				logOutput("Successfully retried: " + link);
			})
			.catch(err => {
				logOutput(emojis.notHappy + " Retry failed for " + link + ": " + err, true);
			});
		}, 2000); // Retry after 2 seconds
	};

	const gatherLinks = (doc) => {
		const links = Array.from(doc.querySelectorAll("a"))
		.map(a => a.href)
		.filter(href => href && !checkedLinks.includes(href));
		return [...new Set(links)];
	};

	const gatherImages = (doc) => {
		const images = Array.from(doc.querySelectorAll("img"))
		.map(img => img.src)
		.filter(src => src && !allImages.includes(src));
		return [...new Set(images)];
	};

	const fetchPage = (url) => {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("GET", url, true);
			xhr.responseType = "document";
			xhr.onload = () => {
				if (xhr.status === 200) resolve(xhr.response);
				else reject("Failed to load " + url);
			};
			xhr.onerror = () => reject("Network error for " + url);
			xhr.send();
		});
	};

	const crawlCurrentLinks = () => {
		const currentLinks = gatherLinks(document);
		if (currentLinks.length === 0) {
			logOutput(emojis.ehmm + " No links found on this page.", true);
			return;
		}
		logOutput("Crawling current page links...");
		currentLinks.forEach(link => {
			logOutput("Found link: " + link);
		});
	};

	const crawlCurrentImages = () => {
		const currentImages = gatherImages(document);
		const outputArea = document.getElementById('crawler-output');
		if (currentImages.length === 0) {
			logOutput(emojis.ehmm + " No images found on this page.", true);
			return;
		}
		logOutput("Crawling current page images...");
		currentImages.forEach(src => {
			const imgAnchor = document.createElement('a');
			imgAnchor.href = src;
			imgAnchor.target = "_blank";
			imgAnchor.style.display = "inline-block";
			imgAnchor.style.margin = "5px";
			imgAnchor.innerHTML = `<img src="${src}" style="max-width: 50px; max-height: 50px; border-radius: 3px;" />`;
			outputArea.appendChild(imgAnchor);
		});
	};

	const exportLinks = () => {
		if (allLinks.length === 0) {
			logOutput(emojis.ehmm + " No links to export.", true);
			return;
		}
		const structuredData = {
			links: allLinks.map(link => ({
				url: link
			})),
			images: allImages.map(image => ({
				src: image
			})),
			errors: errors.map(error => ({
				error: error
			})),
			sources: sources
		};
		const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(structuredData, null, 2));
		const downloadAnchor = document.createElement("a");
		downloadAnchor.href = dataStr;
		downloadAnchor.download = "ThatsCrawlFolks_links.json";
		document.body.appendChild(downloadAnchor);
		downloadAnchor.click();
		downloadAnchor.remove();
		logOutput(emojis.yesss + " Links exported.");
	};

	const clearLogs = () => {
		allLinks = [];
		workerLinks = [];
		checkedLinks = [];
		allImages = [];
		errors = [];
		const outputArea = document.getElementById('crawler-output');
		if (outputArea) outputArea.innerHTML = "";
		logOutput(emojis.happy + " Logs cleared.");
	};

	// Initialization
	createUI();
	logOutput(emojis.enjoy + " ThatsCrawlFolks " + version + " ready!");
})();
