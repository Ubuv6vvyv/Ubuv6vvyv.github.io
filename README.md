# Ubuv6vvyv.github.io — Toolbox index

This repository is a personal collection of browser-first utilities, small web apps and offline scripts for working with images, audio, PDFs, web crawling, metadata forensics and quick developer helpers. The site is a grab-bag of interactive demos (HTML+JS) and a few Python scripts for heavier or offline processing.

Serve the repo with a static server and open any HTML file with a modern browser (or use GitHub Pages).

---

## Tools index — categorized

This index groups the repository's HTML/JS tools into categories so you can quickly find what you need. Descriptions are short; say which items you'd like expanded and I will add more details.

> Note: I scanned the repository and representative files (color-app/index.html, several Three.js demos, PDF tools, Python scripts under Python/, BK/webglAssetFinder.js, Markdown demos). The repository is large — I included obvious and named tools and the most useful/interesting ones. I can run a second pass to include every file and expand descriptions.


### Audio
Tools that generate, process, or analyze sound.

- AUDIO.html — browser-based audio utilities / toolbox.
- AUDIOMERGE.html — merge/combination audio UI.
- ChaosAudio1.html, ChaosAudio2.html, ChaosAudio3.html, ChaosAudio4.html — experimental/chaotic audio effect pages.
- audiomash.py — Python audio mashup processor (offline script).
- LovelySound.html — audio demo / pleasant sound generator.
- MosquitoMaker.html — high-frequency sound generator (annoyance tool).
- robot_voice_processor.html — vocal processing / vocoder-like UI.
- vocoddr.html — vocoder / voice manipulation demo.
- ringtone_generator_fixed.html — ringtone/sound generator.
- unhinged audio.html — experimental/harsh audio demo.
- sonic-disruptor-v3.html, worldsworstsound.html — intentionally disruptive audio demos.

### Video
Tools for working with/transforming video, animation, or animated assets.

- VideoShuffle.html — shuffle and mix video clips in the browser.
- Videotool.html — video utilities (trimming, processing UI).
- glb-animviewer-stable.html — 3D GLB animation viewer (also 3D but relevant to animated content).
- image-to-3d-converter.html, 3dImageMaker.html, enhanced-image-3d-converter.html — convert 2D images into 3D visualizations/meshes.
- tilevid.py, tilevid_optimizedJan.py — Python tools for tiling/processing video frames.

### 3D / WebGL
Three.js, GLTF/GLB viewers, panorama / sphere / shader demos.

- Glb.html — GLTF/GLB viewer and material/test harness.
- glb-animviewer-stable.html — stable GLB animation viewer with GUI controls.
- Bad3dpipes.html, pipe.html, tree3d.html — procedural pipe/tree 3D generators using Three.js.
- Lasers.html — laser beam/reflective scene demo (Three.js + raycasting).
- Perspectix.html, Persp.html, Pan.html — projection / panoramic shader demos.
- 360TinyPlanet.html, Tinyplanet.html, Tinyworld.html — tiny-planet / projection utilities (panorama transforms).
- glb-related tools: glb-animviewer-stable.html, Glb.html, visual-engine-v5.html — 3D viewers and engines.
- enhanced WebGL helpers: BK/webglAssetFinder.js — utility to detect WebGL / krpano / three.js elements on a page.

### Image / Canvas / Color
Image processing, color extraction, collage, filters, and canvas utilities.

- color-app/index.html — AI Color & Style Analyzer (sample image, pick colors; skin/hair/eye analysis UI).
- ExtractColourFromImage.html, ExtractColoursFromImage.html — extract colors / palettes from images.
- OverlayRainbowOnImage.html — overlay effects on images.
- CollageImage.html, Image2CollageNumbered.html, JoinImage.html — collage / join multiple images.
- RemoveBackground.html — background removal demo.
- Imagefx.html, REPLACECOLOR.HTML, MirrorFlip.html, Flip.html — image effects/filters and color replacement.
- LineArtASCII.html, LineArtTimePass.html — convert image to line art / ASCII.
- Kaleidoscope.html, kaleidoscope_draw.html — generative kaleidoscope effects.
- JsonFLAT.html, jsonflatter.html — JSON flatteners (useful for image metadata workflows).

### PDF
Tools to inspect, extract, convert, and manipulate PDF files.

- Pdflooklook.html, Pdflooklook2.html — PDF Look/Analyzer UI (metadata, page render, text & image extraction using pdf.js).
- Pdf2easyripper.html, Pdfcontrast.html, pdf to text.html — PDF-specific extract/transform tools.
- pdf-to-markdown-master.zip — offline tool/archive for converting PDF to Markdown.
- SimplePDF - PDF editor.html — full in-browser PDF editor app (large single-file app).
- RenamePdf2.py, Renamer.html, propdf.py — PDF renaming and processing scripts.

### Map / Panorama / Street View
Map scraping, panorama repair, streetview manipulation, coordinate helpers.

- MAPSCRAPE.HTML — map scraping helper (scrape map tiles / data).
- MapFineLiner.html, MapLine.html — map drawing and line overlay utilities.
- PanoramaLensFix.html, PanoramaPoleFix.html — panorama repair helpers (pole removal and lens correction).
- StreetviewPano.html, StreetviewPano_v2.html — Street View panorama viewers/utilities.
- Pan.html, Panofinder.js — pano projection & finder utilities.
- CoordinatesToAddress.html, locateme.html — geolocation and reverse-geocoding helpers.

### Scrapers / Crawlers / Automation
Web scraping, crawlers, sitemap or page-parsing utilities.

- Crawl.html — simple crawler demo.
- CrawlToDeath.js, CrawlWithImageTableBugged.js, CrawlXInXHell.js, enhanced_webcrawler.html — progressively more advanced/experimental crawlers.
- PagePirate.js — page content extractor / scraper helper.
- GITHUBsitemap.js, GithubMapper.js — GitHub mapping / sitemap utilities.
- AutoShopify.js — automation helper for Shopify flows.
- DomainYoink.sh, DomainYoink2.sh — domain/scraping shell scripts.

### Utilities / Dev / Productivity
Files that help with text, JSON, renaming, buildless utilities and small developer helpers.

- Renamer.html, RenameCourt.html, RenamePdf2.py — bulk renaming utilities.
- ZipFlattener.html, ZipToHTML2.html, ZiptoHTMLinline.html — ZIP extraction / HTML generation from archives.
- table-converter.tsx, tablesmacker.html — table transformation utilities.
- EXIFRENAME.html — EXIF-based renamer.
- Meta.html, MetaSniffler.html, advanced_meta_analyzer (1).html — metadata inspection helpers (HTML/meta/XMP).
- BestRegex.html — regex helper interface.
- Unl0ck.js / PageUnlocker.js — page unlocker utility (remove overlays / un-hide page content).
- JsonFLAT.html / jsonflatter.html — JSON flattening & mapping helpers.

### Experimental / Nuisance / Visual & Audio Stimulation
High-contrast / intentionally disruptive demos (use carefully).

- HarmonicNightmare.html and harmonic_lab variants — strong visual/auditory experiments.
- MosquitoMaker.html, sonic-disruptor-v3.html — intentional annoyance/high-frequency sound tools.
- Disturb.html, worldsworstsound.html — disruptive demos; use with caution.

### Large aggregated / index / link pages
- github-pages-links (many large numbered variants) — large HTML index pages of site links (heavy).
- Ubuv6vvyv.github.io-pages-links (1/2) — more aggregated link/index pages.

### Python scripts (folder: Python/)
- timelapse_studio_v20.py, timelapse_effects (1).py — timelapse frame processing and effects.
- tile.py, tilevid.py — tiling utilities for images/video.
- supertoolJan.py — multi-purpose script (various utilities).
- propdf.py, propdf-related scripts — PDF processing.
- audiomash.py — audio mashup script.


### Notes & next steps
- This list focuses on clearly named HTML/JS/Python tools. Several files are large or duplicated (multiple index pages) and there are a few directories with many files; I can do a second pass to include every file and pick up less-obvious tools.
- I can also generate a browsable HTML landing page that links to each tool with the description and tags.

---

## How to use
- Run a simple static server and open index.html or any tool, for example:

```bash
python3 -m http.server 8000
# open http://localhost:8000/index.html
```

- For ML pages (TFJS) open via HTTP(s) so models can be loaded from CDNs.
- Python utilities run locally with Python 3.8+; inspect the top of each script for required pip packages.

## Safety & notes
- Many tools are experimental. Use caution with file uploads and scraping — obey robots.txt and site terms.
- Several demos intentionally produce irritating audio/visual output (sonic-disruptor, mosquito maker, harmonic nightmares). Use headphones/volume controls or avoid them.

---

If you're ready I will commit this README.md into the repository (I will replace the existing README.md).