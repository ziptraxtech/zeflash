#!/bin/bash
# Quick APK installer script

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

echo "📱 Zeflash APK Installer"
echo "======================="
echo ""

# Check if APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at: $APK_PATH"
    echo ""
    echo "Please build the APK first:"
    echo "  ./build-apk.sh"
    exit 1
fi

echo "✓ APK found: $APK_PATH"
echo "Size: $(du -h $APK_PATH | cut -f1)"
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Please install Android Platform Tools:"
    echo "  brew install android-platform-tools"
    echo ""
    echo "Or manually transfer the APK to your device:"
    echo "  $APK_PATH"
    exit 1
fi

# Check for connected devices
echo "Checking for connected Android devices..."
DEVICES=$(adb devices | grep -w "device" | wc -l)

if [ $DEVICES -eq 0 ]; then
    echo "❌ No Android devices connected"
    echo ""
    echo "Please:"
    echo "1. Connect your Android device via USB"
    echo "2. Enable USB Debugging on your device"
    echo "3. Run this script again"
    exit 1
fi

echo "✓ Device connected"
echo ""
echo "Installing Zeflash APK..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation successful!"
    echo ""
    echo "You can now open the Zeflash app on your device."
else
    echo ""
    echo "❌ Installation failed"
    echo ""
    echo "Try manually:"
    echo "1. Copy APK to your device"
    echo "2. Enable 'Install from Unknown Sources'"
    echo "3. Open the APK file to install"
fi