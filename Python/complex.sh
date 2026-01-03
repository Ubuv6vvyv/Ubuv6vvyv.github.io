#!/bin/bash
mkdir -p ./thumbs
for f in *.{jpg,jpeg,png,tif,tiff,webp}; do
    [ -e "$f" ] || continue
    val=$(magick "$f" -background white -alpha remove -thumbnail 300x -write "./thumbs/$f.jpg" -edge 1 -colorspace Gray -format "%[fx:mean]" info:)
    echo "$val|$f|./thumbs/$f.jpg"
done > raw_data.txt
sort -t "|" -k1 -n raw_data.txt > sorted_data.txt
thumbs=(); while IFS='|' read -r val original thumb; do thumbs+=("$thumb"); done < sorted_data.txt
montage "${thumbs[@]}" -geometry +10+10 -border 1 -label "%t" "montage_complexity.jpg"
rm -rf ./thumbs raw_data.txt sorted_data.txt
