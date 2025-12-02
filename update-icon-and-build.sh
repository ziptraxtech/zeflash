#!/bin/bash
set -e

echo "🎨 Generating Android icons from resources/icon.png..."

SOURCE="/Users/ritvik/Desktop/zeflash/resources/icon.png"
ANDROID_RES="/Users/ritvik/Desktop/zeflash/android/app/src/main/res"

# Check if source icon exists
if [ ! -f "$SOURCE" ]; then
  echo "❌ Error: Icon not found at $SOURCE"
  echo "Please save your lightning bolt icon to resources/icon.png first"
  exit 1
fi

# Generate icons for each density
echo "  Creating 48x48 icons for mdpi..."
sips -z 48 48 "$SOURCE" --out "$ANDROID_RES/mipmap-mdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 48 48 "$SOURCE" --out "$ANDROID_RES/mipmap-mdpi/ic_launcher_round.png" >/dev/null 2>&1
sips -z 72 72 "$SOURCE" --out "$ANDROID_RES/mipmap-mdpi/ic_launcher_foreground.png" >/dev/null 2>&1

echo "  Creating 72x72 icons for hdpi..."
sips -z 72 72 "$SOURCE" --out "$ANDROID_RES/mipmap-hdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 72 72 "$SOURCE" --out "$ANDROID_RES/mipmap-hdpi/ic_launcher_round.png" >/dev/null 2>&1
sips -z 108 108 "$SOURCE" --out "$ANDROID_RES/mipmap-hdpi/ic_launcher_foreground.png" >/dev/null 2>&1

echo "  Creating 96x96 icons for xhdpi..."
sips -z 96 96 "$SOURCE" --out "$ANDROID_RES/mipmap-xhdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 96 96 "$SOURCE" --out "$ANDROID_RES/mipmap-xhdpi/ic_launcher_round.png" >/dev/null 2>&1
sips -z 144 144 "$SOURCE" --out "$ANDROID_RES/mipmap-xhdpi/ic_launcher_foreground.png" >/dev/null 2>&1

echo "  Creating 144x144 icons for xxhdpi..."
sips -z 144 144 "$SOURCE" --out "$ANDROID_RES/mipmap-xxhdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 144 144 "$SOURCE" --out "$ANDROID_RES/mipmap-xxhdpi/ic_launcher_round.png" >/dev/null 2>&1
sips -z 216 216 "$SOURCE" --out "$ANDROID_RES/mipmap-xxhdpi/ic_launcher_foreground.png" >/dev/null 2>&1

echo "  Creating 192x192 icons for xxxhdpi..."
sips -z 192 192 "$SOURCE" --out "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher.png" >/dev/null 2>&1
sips -z 192 192 "$SOURCE" --out "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher_round.png" >/dev/null 2>&1
sips -z 288 288 "$SOURCE" --out "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher_foreground.png" >/dev/null 2>&1

echo "✅ Icons generated successfully!"
echo ""
echo "📦 Building release APK..."

cd android
./gradlew assembleRelease

echo ""
echo "✅ APK built successfully!"
echo "📱 APK location: android/app/build/outputs/apk/release/app-release-unsigned.apk"
