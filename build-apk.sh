#!/bin/bash

# Zeflash Android APK Build Script
# This script builds a debug APK for the Zeflash app

echo "🚀 Zeflash Android APK Build Script"
echo "===================================="
echo ""

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set Java 17 environment
echo "📦 Setting up Java 17 environment..."
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

# Verify Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)
if [ "$JAVA_VERSION" -eq "17" ]; then
    echo -e "${GREEN}✓ Java 17 is active${NC}"
else
    echo -e "${RED}✗ Java 17 not found. Please install it with: brew install openjdk@17${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo -e "${RED}✗ Error: capacitor.config.ts not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Sync Capacitor
echo ""
echo "🔄 Syncing Capacitor files with Android project..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Capacitor sync failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Capacitor sync completed${NC}"

# Navigate to android directory
cd android

# Clean previous builds
echo ""
echo "🧹 Cleaning previous builds..."
./gradlew clean
echo -e "${GREEN}✓ Clean completed${NC}"

# Build debug APK
echo ""
echo "🔨 Building debug APK (this may take a few minutes)..."
./gradlew assembleDebug
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Make sure Android SDK is installed"
    echo "2. Check that Android SDK path is correct in android/local.properties"
    echo "3. Try opening the project in Android Studio and sync Gradle manually"
    exit 1
fi

# Check if APK was created
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo "📱 APK Location:"
    echo "   $(pwd)/$APK_PATH"
    echo ""
    echo "📊 APK Size: $(du -h $APK_PATH | cut -f1)"
    echo ""
    echo "Next steps:"
    echo "1. Transfer the APK to your Android device"
    echo "2. Enable 'Install from Unknown Sources' in Settings"
    echo "3. Install the APK"
    echo ""
    echo "Or install via ADB:"
    echo "   adb install -r $APK_PATH"
    echo ""
else
    echo -e "${RED}✗ APK not found at expected location${NC}"
    exit 1
fi