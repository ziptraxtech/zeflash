#!/bin/bash

# Source icon should be 1024x1024 or larger
SOURCE="/Users/ritvik/Desktop/zeflash/resources/icon.png"
ANDROID_RES="/Users/ritvik/Desktop/zeflash/android/app/src/main/res"

# Android mipmap sizes
declare -A SIZES=(
  ["mdpi"]="48"
  ["hdpi"]="72"
  ["xhdpi"]="96"
  ["xxhdpi"]="144"
  ["xxxhdpi"]="192"
)

echo "Generating Android icons..."

for density in "${!SIZES[@]}"; do
  size="${SIZES[$density]}"
  dir="$ANDROID_RES/mipmap-$density"
  
  echo "Creating ${size}x${size} icon for $density..."
  
  # ic_launcher.png
  sips -z $size $size "$SOURCE" --out "$dir/ic_launcher.png" > /dev/null 2>&1
  
  # ic_launcher_round.png (same as launcher for now)
  sips -z $size $size "$SOURCE" --out "$dir/ic_launcher_round.png" > /dev/null 2>&1
  
  # ic_launcher_foreground.png (slightly larger for adaptive icons)
  foreground_size=$((size * 3 / 2))
  sips -z $foreground_size $foreground_size "$SOURCE" --out "$dir/ic_launcher_foreground.png" > /dev/null 2>&1
done

echo "✅ Icons generated successfully!"
