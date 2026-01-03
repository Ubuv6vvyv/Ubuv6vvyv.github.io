#!/bin/bash

# Define folders to clean
TARGET_DIRS=("images" "PDFs" "Docs" "videos" "archives" "apks" "audio" "Web" "Data" "Scripts" "Misc")

echo "Starting Extension Normalization..."
echo "Ignoring backup files (ending in .~1~, etc)"
echo "-------------------------------------------------"

for dir in "${TARGET_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Scanning folder: $dir"
    
    # We added ! -name '*~*' to explicitly SKIP those numbered backup files
    find "$dir" -maxdepth 1 -type f -name '*.*' ! -name '*~*' -print0 | while IFS= read -r -d '' file; do
        
        # 1. Break down the filename
        filepath=$(dirname "$file")
        filename=$(basename "$file")
        extension="${filename##*.}"
        nameonly="${filename%.*}"
        
        # 2. Convert extension to lowercase
        lower_ext=$(echo "$extension" | tr '[:upper:]' '[:lower:]')
        
        # 3. Rename ONLY if there is a change
        if [ "$extension" != "$lower_ext" ]; then
            new_path="$filepath/$nameonly.$lower_ext"
            
            # 4. Check for collision
            if [ -e "$new_path" ]; then
                echo "  [!] Skipped '$filename': Lowercase version already exists."
            else
                mv -v "$file" "$new_path"
            fi
        fi
    done
  fi
done

echo "-------------------------------------------------"
echo "Normalization complete."

# Refresh Gallery
if command -v termux-media-scan &> /dev/null; then
    termux-media-scan -r . &
fi
