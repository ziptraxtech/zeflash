#!/bin/bash

# Zeflash Android App Bundle (AAB) Build Script
# This script builds a signed Android App Bundle for Google Play Store submission

echo "🚀 Zeflash App Bundle (AAB) Build Script"
echo "========================================="
echo ""

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set Java 17 environment (required for Android Gradle Plugin)
echo "📦 Setting up Java 17 environment..."
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

# Verify Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)
if [ "$JAVA_VERSION" -eq "17" ]; then
    echo -e "${GREEN}✓ Java 17 is active${NC}"
else
    echo -e "${RED}✗ Java 17 not properly set${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo -e "${RED}✗ Error: capacitor.config.ts not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if key.properties exists
KEY_PROPERTIES="android/key.properties"
if [ ! -f "$KEY_PROPERTIES" ]; then
    echo -e "${RED}✗ key.properties file not found!${NC}"
    echo -e "${YELLOW}Please run build-release-apk.sh first to set up signing configuration.${NC}"
    exit 1
fi

# Build the web app first
echo ""
echo "🌐 Building web application..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Web build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Web build completed${NC}"

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

# Build release AAB
echo ""
echo "🔨 Building signed release App Bundle (AAB)..."
echo -e "${YELLOW}This may take a few minutes...${NC}"
./gradlew bundleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS! Release AAB built successfully!${NC}"
    echo ""
    echo "📱 Release AAB location:"
    echo -e "${GREEN}   android/app/build/outputs/bundle/release/app-release.aab${NC}"
    echo ""
    
    # Get file size
    AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
    if [ -f "$AAB_PATH" ]; then
        AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
        echo "📊 AAB Size: $AAB_SIZE"
        echo ""
        
        # Copy to root directory
        echo "📦 Copying AAB to project root..."
        cp "$AAB_PATH" ../zeflash-release.aab
        echo -e "${GREEN}✓ AAB copied to: zeflash-release.aab${NC}"
        echo ""
    fi
    
    echo -e "${BLUE}📋 Next steps for Google Play Store:${NC}"
    echo ""
    echo "1. Go to Google Play Console: https://play.google.com/console"
    echo "2. Create a new app or select existing app"
    echo "3. Navigate to Production > Create new release"
    echo "4. Upload the AAB file: zeflash-release.aab"
    echo "5. Fill in release notes and submit for review"
    echo ""
    echo -e "${YELLOW}⚠ Before submitting:${NC}"
    echo "  - Test thoroughly on multiple devices"
    echo "  - Prepare app listing materials (screenshots, description, etc.)"
    echo "  - Set up app privacy policy URL"
    echo "  - Configure content rating"
    echo "  - Set pricing and distribution"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Build failed!${NC}"
    echo "Please check the error messages above."
    exit 1
fi

cd ..
