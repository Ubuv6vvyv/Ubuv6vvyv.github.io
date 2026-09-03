# Ubuv6vvyv.github.io — Toolbox index

This repository is a personal collection of browser-first utilities, small web apps and offline scripts for working with images, audio, PDFs, web crawling, metadata forensics and quick developer helpers. Most tools are single-file HTML/JS pages you can open directly in a browser; a handful are Python scripts for offline processing.

If you want a quick tour, open any HTML file in a modern browser (or view it via GitHub Pages). Python scripts live in the `Python/` folder and need a local Python environment.

---

## Contents (grouped)

### 1) Image & Photo tools — transforms, collages, panorama fixes
Small browser tools for image transforms, panoramas, tiny-planet effects and simple edits.
- [Tinyplanet.html](Tinyplanet.html) — stereographic "tiny planet" transform.
- [360TinyPlanet.html](360TinyPlanet.html) — alternate tiny-planet panorama tool.
- [PanoramaLensFix.html](PanoramaLensFix.html), [PanoramaPoleFix.html](PanoramaPoleFix.html), [Best pano fix.html](Best%20pano%20fix.html) — panorama correction helpers.
- [CollageImage.html](CollageImage.html), [Image2CollageNumbered.html](Image2CollageNumbered.html) — collage maker tools.
- [RemoveBackground.html](RemoveBackground.html), [Watermarkremover.html](Watermarkremover.html) — background / watermark helpers.
- [image-to-3d-converter.html](image-to-3d-converter.html), [3dImageMaker.html](3dImageMaker.html), [glb-animviewer-stable.html](glb-animviewer-stable.html) — simple image→3D and GLB viewer utilities.

### 2) Image analysis & ML helpers
Client-side ML and image-processing helpers (TFJS models, thresholding, object detection).
- [Markdown/enhanced-tfjs-processor.html](Markdown/enhanced-tfjs-processor.html) — TFJS-based processors (bodyPix, cocoSsd, mobilenet, face detector).
- [IMG OR PDF/Detect Object and Human ML.html](IMG%20OR%20PDF/Detect%20Object%20and%20Human%20ML.html) — object/human detection demo.
- [Thresholding.html](Thresholding.html), [ExtractColourFromImage.html](ExtractColourFromImage.html) — threshold and color extraction helpers.
- [EXIFRENAME.html](EXIFRENAME.html), [MetaSniffler.html](MetaSniffler.html) — EXIF/meta utilities.

### 3) Audio & sound experiments
Generators, synth-like demos and audio processors.
- [AUDIO.html](AUDIO.html), [AUDIOMERGE.html](AUDIOMERGE.html) — basic audio pages.
- [Ringmodder.html](Ringmodder.html), [Ringr.html](Ringr.html) — ring modulation / audio effects.
- [harmonic_lab_enhancedJan.html](harmonic_lab_enhancedJan.html), [ChaosAudio1.html](ChaosAudio1.html) — synth / chaotic audio experiments.
- [robot_voice_processor.html](robot_voice_processor.html), [vocoddr.html](vocoddr.html) — voice effects.

### 4) Web crawling, scraping & automation
Scripts and bookmarklets for extracting links/data and mapping site structure.
- [Crawl.html](Crawl.html), [enhanced_webcrawler.html](enhanced_webcrawler.html) — crawler frontends.
- [BK/Click2ScrapeV4.js](BK/Click2ScrapeV4.js), [BK/StructureScrape.js](BK/StructureScrape.js), [BK/SPIDER.JS](BK/SPIDER.JS) — bookmarklet / in-browser scrapers.
- [GITHUBsitemap.js](GITHUBsitemap.js), [GithubMapper.js](GithubMapper.js), [robotsTXTlink.js](robotsTXTlink.js) — site-mapping helpers.

### 5) PDF, document & text tools
Browser-based PDF explorers, converters and document templates.
- [pdf-curiosity-explorer.html](IMG%20OR%20PDF/pdf-curiosity-explorer.html), [pdf to text.html](pdf%20to%20text.html) — PDF inspection and text extraction.
- [SimplePDF - PDF editor.html](SimplePDF%20-%20PDF%20editor.html) — lightweight in-browser editor.
- `Bill of Laden Generator.html`, packing list templates and many Markdown/ entries with document outputs — templates and converted docs.
- [ZipToHTML2.html](ZipToHTML2.html), [ZiptoHTMLinline.html](ZiptoHTMLinline.html) — convert zipped HTML/PDF bundles to viewable pages.

### 6) Forensics, metadata & fingerprinting
Utilities for metadata extraction, device/browser fingerprinting and redaction checks.
- [MetaSniffler.html](MetaSniffler.html), [advanced_meta_analyzer (1).html](advanced_meta_analyzer%20(1).html) — metadata analysis.
- [WeKnowWhoYouAre.html](WeKnowWhoYouAre.html), [device-fingerprint pages in Markdown/](Markdown/device-fingerprint.html) — fingerprint demos.
- [unredacter_fixed.html](unredacter_fixed.html), [forensicpro.py](forensicpro.py) — redaction recovery / forensic scripts.

### 7) Color, styling & small apps
A more complete mini-app for color analysis and styling recommendations.
- [color-app/index.html](color-app/index.html) — AI Color & Style Analyzer (modular app; see `color-app/modules/` for sources).
- [colour assistant and guides: ColourAssistant.html, color-guide.html, masterStylist.html].

### 8) 3D, WebGL & panorama viewers
Three.js-powered viewers, GLB loaders and panorama helpers.
- [Glb.html](Glb.html), [glb-animviewer-stable.html](glb-animviewer-stable.html) — 3D viewer and GLTF/GLB support.
- [Perspectix.html](Perspectix.html), [Bad3dpipes.html](Bad3dpipes.html) — custom shaders, sphere mapping and WebGL experiments.
- [BK/webglAssetFinder.js](BK/webglAssetFinder.js) — detector for WebGL/Three.js/krpano assets on pages.

### 9) Developer & productivity helpers
Bookmarklets, small dev UIs and utilities for quick tasks.
- [Chrome Extension Maker.html](Chrome%20Extension%20Maker.html), [code-tool.html](code-tool.html), [code-playground.html](code-playground.html) — code helpers.
- [BK/JsonToTable.js](BK/JsonToTable.js), [BK/InjectHtml.js](BK/InjectHtml.js), [Showme.js](Showme.js) — DOM and data helpers.
- [GITHUBsitemap.js](GITHUBsitemap.js), [PagePirate.js](PagePirate.js) — repo/site mapping and scraping tools.

### 10) Python scripts & offline utilities
Scripts for PDF generation, file organisation, timelapse and video tiling.
- `Python/MakeComplexPdf.py`, `Python/stresspdf.py` — PDF generation & pattern scripts.
- `Python/gallery.py`, `timelapse_studio_v20.py`, `tilevid.py` — gallery generation and timelapse/video utilities.
- `Python/organise.py`, `Python/mining.py` — filesystem and mining helpers.

### 11) Fun / UI / visual experiments
Art, UI demos and playful pages.
- `kaleidoscope.html`, `confetti-demo.html`, `LightningMaker.html`, `tree3d.html`, `UIWHY/` experiments.

---

## How to use
- Open any `*.html` file in a modern desktop browser (Chrome/Firefox/Edge) to run the tool locally.
- For TFJS/ML pages: some require network access to load models (e.g. mobilenet, cocoSsd). Opening them from GitHub pages or a local http server is recommended.
  - To run a quick local server: `python -m http.server` in the repo root and visit `http://localhost:8000/color-app/index.html`.
- Python scripts: run with Python 3.9+ as appropriate. Example:

  ```bash
  # run a Python utility
  python3 Python/gallery.py
  ```

## Notes & safety
- Many tools are experimental demos. Use caution with file uploads (local use is best) and with scraping/crawling — obey robots.txt and site terms.
- The repo is a personal toolbox — not a polished product. If you want, I can:
  - create a categorized index page on the site linking all entries,
  - add short README sections per subfolder (e.g. BK/, color-app/, Python/),
  - or open and document any specific tool in detail.

---

If you'd like, I can commit this README into the repository (I can also split it into a landing index page and a README per folder). Tell me which layout you prefer and I’ll create the files.
