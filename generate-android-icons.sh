#!/bin/bash

SOURCE_IMAGE="public/logo.png"
RES_DIR="android/app/src/main/res"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: $SOURCE_IMAGE not found"
    exit 1
fi

# Define icon sizes for different densities
declare -A sizes
sizes[mdpi]=48
sizes[hdpi]=72
sizes[xhdpi]=96
sizes[xxhdpi]=144
sizes[xxxhdpi]=192

echo "Generating Android app icons..."

# Generate launcher icons for each density
for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    size=${sizes[$density]}
    output_dir="$RES_DIR/mipmap-$density"
    
    mkdir -p "$output_dir"
    
    # Generate ic_launcher.png
    sips -z $size $size "$SOURCE_IMAGE" --out "$output_dir/ic_launcher.png" 2>/dev/null
    
    # Generate ic_launcher_foreground.png (same as launcher)
    sips -z $size $size "$SOURCE_IMAGE" --out "$output_dir/ic_launcher_foreground.png" 2>/dev/null
    
    # Generate ic_launcher_round.png (same as launcher)
    sips -z $size $size "$SOURCE_IMAGE" --out "$output_dir/ic_launcher_round.png" 2>/dev/null
    
    echo "✓ Generated icons for $density ($size x $size)"
done

echo "Android app icons generated successfully!"
