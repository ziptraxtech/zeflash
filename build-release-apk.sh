#!/bin/bash

# Zeflash Release APK Build Script
# This script generates a keystore and builds a signed release APK

echo "🚀 Zeflash Release APK Build Script"
echo "===================================="
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

# Keystore configuration
KEYSTORE_PATH="android/app/zeflash-release-key.keystore"
KEYSTORE_ALIAS="zeflash"
KEY_PROPERTIES="android/key.properties"

# Check if keystore already exists
if [ -f "$KEYSTORE_PATH" ]; then
    echo -e "${YELLOW}⚠ Keystore already exists at: $KEYSTORE_PATH${NC}"
    read -p "Do you want to use the existing keystore? (y/n): " use_existing
    if [ "$use_existing" != "y" ]; then
        echo -e "${BLUE}Please enter keystore details to create a new one:${NC}"
        CREATE_NEW_KEYSTORE=true
    else
        CREATE_NEW_KEYSTORE=false
    fi
else
    echo -e "${BLUE}No keystore found. Creating a new one...${NC}"
    CREATE_NEW_KEYSTORE=true
fi

# Create keystore if needed
if [ "$CREATE_NEW_KEYSTORE" = true ]; then
    echo ""
    echo -e "${BLUE}📝 Please provide the following information for your keystore:${NC}"
    echo -e "${YELLOW}(Keep this information secure - you'll need it for future updates!)${NC}"
    echo ""
    
    read -sp "Enter keystore password (min 6 characters): " KEYSTORE_PASSWORD
    echo ""
    read -sp "Confirm keystore password: " KEYSTORE_PASSWORD_CONFIRM
    echo ""
    
    if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
        echo -e "${RED}✗ Passwords don't match!${NC}"
        exit 1
    fi
    
    if [ ${#KEYSTORE_PASSWORD} -lt 6 ]; then
        echo -e "${RED}✗ Password must be at least 6 characters!${NC}"
        exit 1
    fi
    
    echo ""
    read -p "Enter your name (First and Last): " KEY_NAME
    read -p "Enter your organization: " KEY_ORG
    read -p "Enter your city: " KEY_CITY
    read -p "Enter your state/province: " KEY_STATE
    read -p "Enter your country code (e.g., IN, US): " KEY_COUNTRY
    
    echo ""
    echo -e "${YELLOW}🔑 Generating keystore...${NC}"
    
    keytool -genkeypair \
        -v \
        -storetype PKCS12 \
        -keystore "$KEYSTORE_PATH" \
        -alias "$KEYSTORE_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass "$KEYSTORE_PASSWORD" \
        -keypass "$KEYSTORE_PASSWORD" \
        -dname "CN=$KEY_NAME, OU=$KEY_ORG, O=$KEY_ORG, L=$KEY_CITY, ST=$KEY_STATE, C=$KEY_COUNTRY"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Keystore created successfully!${NC}"
        echo ""
        
        # Create key.properties file
        echo "# Android signing configuration" > "$KEY_PROPERTIES"
        echo "# This file contains sensitive information - DO NOT commit to version control!" >> "$KEY_PROPERTIES"
        echo "" >> "$KEY_PROPERTIES"
        echo "storePassword=$KEYSTORE_PASSWORD" >> "$KEY_PROPERTIES"
        echo "keyPassword=$KEYSTORE_PASSWORD" >> "$KEY_PROPERTIES"
        echo "keyAlias=$KEYSTORE_ALIAS" >> "$KEY_PROPERTIES"
        echo "storeFile=zeflash-release-key.keystore" >> "$KEY_PROPERTIES"
        
        echo -e "${GREEN}✓ key.properties file created${NC}"
        echo -e "${YELLOW}⚠ IMPORTANT: Backup your keystore and password securely!${NC}"
        echo -e "${YELLOW}⚠ Location: $KEYSTORE_PATH${NC}"
        echo ""
    else
        echo -e "${RED}✗ Failed to create keystore${NC}"
        exit 1
    fi
else
    # Check if key.properties exists
    if [ ! -f "$KEY_PROPERTIES" ]; then
        echo -e "${RED}✗ key.properties file not found!${NC}"
        echo -e "${YELLOW}Please create it manually or delete the keystore and run this script again.${NC}"
        exit 1
    fi
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
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ Clean failed, but continuing...${NC}"
fi

# Build release APK
echo ""
echo "🔨 Building signed release APK..."
echo -e "${YELLOW}This may take a few minutes...${NC}"
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS! Release APK built successfully!${NC}"
    echo ""
    echo "📱 Release APK location:"
    echo -e "${GREEN}   android/app/build/outputs/apk/release/app-release.apk${NC}"
    echo ""
    
    # Get file size
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo "📊 APK Size: $APK_SIZE"
        echo ""
        
        # Copy to root public/apk directory
        echo "📦 Copying APK to public/apk directory..."
        mkdir -p ../public/apk
        cp "$APK_PATH" ../public/apk/zeflash-release.apk
        echo -e "${GREEN}✓ APK copied to: public/apk/zeflash-release.apk${NC}"
        echo ""
    fi
    
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Test the release APK on actual devices"
    echo "2. Create an Android App Bundle (AAB) for Play Store:"
    echo -e "   ${YELLOW}./gradlew bundleRelease${NC}"
    echo "3. Upload to Google Play Console"
    echo ""
    echo -e "${YELLOW}⚠ Remember to:${NC}"
    echo "  - Test the APK thoroughly before publishing"
    echo "  - Keep your keystore and passwords secure"
    echo "  - Never commit key.properties to git"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Build failed!${NC}"
    echo "Please check the error messages above."
    exit 1
fi

cd ..
