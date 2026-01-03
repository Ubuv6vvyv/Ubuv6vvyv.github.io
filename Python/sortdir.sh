#!/bin/bash

# 1. Setup
echo "=========================================="
echo "   STARTING ROBUST ORGANISER"
echo "=========================================="

# Ensure we have permission to see files
chmod u+rwx * 2>/dev/null

# --- PDFs ---
if [ ! -d "PDFs" ]; then mkdir -p "PDFs"; fi
echo "-> Moving PDFs..."
# We explicitly list every file extension to avoid variable errors
find . -maxdepth 1 -type f -iname "*.pdf" -exec mv -v -t "PDFs/" {} +

# --- Docs ---
if [ ! -d "Docs" ]; then mkdir -p "Docs"; fi
echo "-> Moving Docs..."
find . -maxdepth 1 -type f \( -iname "*.doc" -o -iname "*.docx" -o -iname "*.xls" -o -iname "*.xlsx" -o -iname "*.ppt" -o -iname "*.pptx" -o -iname "*.txt" -o -iname "*.md" -o -iname "*.rtf" -o -iname "*.odt" -o -iname "*.vtt" \) -exec mv -v -t "Docs/" {} +

# --- Images ---
if [ ! -d "images" ]; then mkdir -p "images"; fi
echo "-> Moving Images..."
find . -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.bmp" -o -iname "*.webp" -o -iname "*.svg" -o -iname "*.tiff" \) -exec mv -v -t "images/" {} +

# --- Videos ---
if [ ! -d "videos" ]; then mkdir -p "videos"; fi
echo "-> Moving Videos..."
find . -maxdepth 1 -type f \( -iname "*.mp4" -o -iname "*.mkv" -o -iname "*.mov" -o -iname "*.avi" -o -iname "*.wmv" -o -iname "*.flv" -o -iname "*.webm" \) -exec mv -v -t "videos/" {} +

# --- Archives ---
if [ ! -d "archives" ]; then mkdir -p "archives"; fi
echo "-> Moving Archives..."
find . -maxdepth 1 -type f \( -iname "*.zip" -o -iname "*.rar" -o -iname "*.7z" -o -iname "*.tar" -o -iname "*.gz" -o -iname "*.bz2" -o -iname "*.xz" -o -iname "*.tgz" \) -exec mv -v -t "archives/" {} +

# --- APKs ---
if [ ! -d "apks" ]; then mkdir -p "apks"; fi
echo "-> Moving APKs..."
find . -maxdepth 1 -type f -iname "*.apk" -exec mv -v -t "apks/" {} +

# --- Audio ---
if [ ! -d "audio" ]; then mkdir -p "audio"; fi
echo "-> Moving Audio..."
find . -maxdepth 1 -type f \( -iname "*.mp3" -o -iname "*.wav" -o -iname "*.aac" -o -iname "*.flac" -o -iname "*.ogg" -o -iname "*.m4a" \) -exec mv -v -t "audio/" {} +

# --- Web Files ---
if [ ! -d "Web" ]; then mkdir -p "Web"; fi
echo "-> Moving Web Files..."
find . -maxdepth 1 -type f \( -iname "*.html" -o -iname "*.htm" -o -iname "*.js" -o -iname "*.css" \) -exec mv -v -t "Web/" {} +

# --- Data Files ---
if [ ! -d "Data" ]; then mkdir -p "Data"; fi
echo "-> Moving Data Files..."
find . -maxdepth 1 -type f \( -iname "*.json" -o -iname "*.csv" -o -iname "*.kml" -o -iname "*.xml" \) -exec mv -v -t "Data/" {} +

# --- Scripts ---
if [ ! -d "Scripts" ]; then mkdir -p "Scripts"; fi
echo "-> Moving Scripts..."
# Moves .py and .sh, but NOT this script itself
find . -maxdepth 1 -type f \( -iname "*.py" -o -iname "*.sh" \) ! -name "sort.sh" -exec mv -v -t "Scripts/" {} +

echo "=========================================="
echo "   DONE"
echo "=========================================="

# Final check
echo "Files remaining:"
ls -p | grep -v / | grep -v "sort.sh"
