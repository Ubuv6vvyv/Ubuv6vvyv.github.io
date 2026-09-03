# Tools index — categorized

This index groups the repository's HTML/JS tools into categories so you can quickly find what you need. Descriptions are short, based on file names and repository inspection. If you want, I can expand descriptions for any item or move files between categories.

Note: I scanned the repo contents and representative files (color-app/index.html, several Three.js demos, PDF tools, Python scripts under Python/, BK/webglAssetFinder.js, Markdown demos). The repository contains many single-file demos — I included the most obviously named HTML/JS tools and scripts. If you want a fully exhaustive index (there are many files and some long/duplicated index pages), I can run a second pass to include every file.

---

## Audio
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

## Video
Tools for working with/transforming video, animation, or animated assets.

- VideoShuffle.html — shuffle and mix video clips in the browser.
- Videotool.html — video utilities (trimming, processing UI).
- glb-animviewer-stable.html — 3D GLB animation viewer (also 3D but relevant to animated content).
- image-to-3d-converter.html, 3dImageMaker.html, enhanced-image-3d-converter.html — convert 2D images into 3D visualizations/meshes.
- tilevid.py, tilevid_optimizedJan.py — Python tools for tiling/processing video frames.

## 3D / WebGL
Three.js, GLTF/GLB viewers, panorama / sphere / shader demos.

- Glb.html — GLTF/GLB viewer and material/test harness.
- glb-animviewer-stable.html — stable GLB animation viewer with GUI controls.
- Bad3dpipes.html, pipe.html, tree3d.html, Bad3dpipes.html — procedural pipe/tree 3D generators using Three.js.
- Lasers.html — laser beam/reflective scene demo (Three.js + raycasting).
- Perspectix.html, Persp.html, Pan.html — projection / panoramic shader demos.
- 360TinyPlanet.html, Tinyplanet.html, Tinyworld.html — tiny-planet / projection utilities (panorama transforms).
- glb-related tools: glb-animviewer-stable.html, Glb.html, visual-engine-v5.html — 3D viewers and engines.
- enhanced WebGL helpers: BK/webglAssetFinder.js — utility to detect WebGL / krpano / three.js elements on a page.

## Image
Image processing, color extraction, collage, filters, and canvas utilities.

- color-app/index.html — AI Color & Style Analyzer (sample image, pick colors; skin/hair/eye analysis UI).
- ExtractColourFromImage.html, ExtractColoursFromImage.html — extract colors / palettes from images.
- OverlayRainbowOnImage.html — overlay effects on images.
- CollageImage.html, Image2CollageNumbered.html, JoinImage.html — collage / join multiple images.
- RemoveBackground.html — background removal demo.
- Imagefx.html, REPLACECOLOR.HTML, MirrorFlip.html, Flip.html — image effects/filters and color replacement.
- JsonFLAT.html, Jsonflatter.html — JSON flatteners (useful for image metadata workflows).
- LineArtASCII.html, LineArtTimePass.html — convert image to line art / ASCII.
- Kaleidoscope.html, kaleidoscope_draw.html — generative kaleidoscope effects.
- ExtractColoursFromImage.html — palette extraction (color clustering).

## PDF
Tools to inspect, extract, convert, and manipulate PDF files.

- Pdflooklook.html, Pdflooklook2.html — PDF Look/Analyzer UI (metadata, render pages, extract images/text using pdf.js).
- Pdf2easyripper.html, Pdfcontrast.html, pdf to text.html — PDF-specific extract/transform tools.
- pdf-to-markdown-master.zip — offline tool/archive for converting PDF to Markdown.
- SimplePDF - PDF editor.html — full in-browser PDF editor (large single-file app).
- RenamePdf2.py, Renamer.html, propdf.py — PDF renaming and processing scripts.
- Pdf2easyripper.html — helper for ripping PDFs to resources.

## Map / Panorama / Streetview
Map scraping, panorama repair, streetview manipulation, coordinate helpers.

- MAPSCRAPE.HTML — map scraping helper (scrape map tiles / data).
- MapFineLiner.html, MapLine.html — map drawing helpers / stylers.
- Pan.html, PanoramaLensFix.html, PanoramaPoleFix.html, StreetviewPano.html, StreetviewPano_v2.html — panorama and Street View tools (pole removal, lens fixes, reprojection).
- Panofinder.js, Pan.html — panorama finder/utilities.
- CoordinatesToAddress.html, locateme.html — geolocation / reverse geocoding helpers.

## Scrapers / Crawlers / Automation
Web scraping, crawlers, sitemap or page-parsing utilities.

- Crawl.html — simple crawler demo.
- CrawlToDeath.js, CrawlWithImageTableBugged.js, CrawlXInXHell.js, enhanced_webcrawler.html — progressively more advanced/experimental crawlers.
- PagePirate.js, PagePirate.js — page content extraction / scraping helper.
- GITHUBsitemap.js, GithubMapper.js, GITHUBsitemap.js — GitHub-related mapping / sitemap tools.
- AutoShopify.js — automation helper targeted at Shopify flows.
- DomainYoink.sh, DomainYoink2.sh — domain/scraping shell scripts.
- PagePirate.js, Panofinder.js, Panofinder.js — page/pano discovery helpers.

## Utilities / Dev / Misc
Files that help with text, JSON, renaming, buildless utilities and small developer helpers.

- Renamer.html, RenameCourt.html, RenamePdf2.py — bulk renaming utilities.
- ZipFlattener.html, ZipToHTML2.html, ZiptoHTMLinline.html — ZIP extraction / HTML generation from archives.
- JsonFLAT.html, jsonflatter.html, jsonflatter tools — JSON flatteners.
- table-converter.tsx, tablesmacker.html — table transformation utilities.
- EXIFRENAME.html — EXIF-based renamer.
- Unl0ck.js / PageUnlocker.js — page unlocker utility (remove overlays / un-hide page content).
- Meta.html, MetaSniffler.html, advanced_meta_analyzer (1).html — metadata inspection helpers for pages/docs.
- BestRegex.html, BestRegex tools — regex helpers.

## Nuisance / Experimental / Annoyance
High-contrast / intentionally disruptive demos (use carefully).

- worldsworstsound.html, sonic-disruptor-v3.html, HarmonicNightmare.html, HarmonicLab variants — audio/visual stimuli experiments.
- MosquitoMaker.html — high-frequency sound.
- Disturb.html, Disturbing visual pages and pattern generators.

---

How I built this index
- I scanned the repository's top-level content list and opened representative files in color-app/, BK/, Markdown/, Python/ and several single-file demos to verify their purpose before writing descriptions.

Next steps I can do for you
- Expand this index into a README.md in the repository (I can create TOOLS_INDEX.md or update README.md directly).
- Produce a browsable HTML index page that links to each tool and shows the short description and tags.
- Run a second pass to ensure every single file (including large lists like github-pages-links and inline-page variants) is categorized.

Would you like me to create TOOLS_INDEX.md in the repo now with this content? I can commit it as a new file or update README.md if you prefer.