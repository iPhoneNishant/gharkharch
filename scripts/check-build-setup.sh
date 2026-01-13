#!/bin/bash

# Script to check local Android build setup status
# Usage: ./check-build-setup.sh

echo "🔍 Checking Local Android Build Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track status
ALL_GOOD=true

# Check Java
echo "1. Checking Java..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -1)
    if echo "$JAVA_VERSION" | grep -q "17"; then
        echo -e "   ${GREEN}✅ Java 17 installed${NC}"
        echo "   Version: $JAVA_VERSION"
    else
        echo -e "   ${YELLOW}⚠️  Java found but not version 17${NC}"
        echo "   Version: $JAVA_VERSION"
        echo "   Recommended: brew install openjdk@17"
        ALL_GOOD=false
    fi
else
    echo -e "   ${RED}❌ Java not found${NC}"
    echo "   Install: brew install openjdk@17"
    ALL_GOOD=false
fi
echo ""

# Check JAVA_HOME
echo "2. Checking JAVA_HOME..."
if [ -n "$JAVA_HOME" ]; then
    if [ -d "$JAVA_HOME" ]; then
        echo -e "   ${GREEN}✅ JAVA_HOME is set${NC}"
        echo "   Path: $JAVA_HOME"
    else
        echo -e "   ${RED}❌ JAVA_HOME points to invalid directory${NC}"
        ALL_GOOD=false
    fi
else
    # Try to set it
    if [ -d "/opt/homebrew/opt/openjdk@17" ]; then
        export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
        echo -e "   ${YELLOW}⚠️  JAVA_HOME not set, but found Java at: $JAVA_HOME${NC}"
        echo "   Add to ~/.zshrc: export JAVA_HOME=\$(/usr/libexec/java_home)"
    else
        echo -e "   ${RED}❌ JAVA_HOME not set${NC}"
        echo "   Add to ~/.zshrc: export JAVA_HOME=\$(/usr/libexec/java_home)"
        ALL_GOOD=false
    fi
fi
echo ""

# Check Android SDK
echo "3. Checking Android SDK..."
if [ -n "$ANDROID_HOME" ]; then
    if [ -d "$ANDROID_HOME" ]; then
        echo -e "   ${GREEN}✅ ANDROID_HOME is set${NC}"
        echo "   Path: $ANDROID_HOME"
    else
        echo -e "   ${RED}❌ ANDROID_HOME points to invalid directory${NC}"
        ALL_GOOD=false
    fi
else
    # Check default location
    DEFAULT_SDK="$HOME/Library/Android/sdk"
    if [ -d "$DEFAULT_SDK" ]; then
        echo -e "   ${YELLOW}⚠️  ANDROID_HOME not set, but SDK found at: $DEFAULT_SDK${NC}"
        echo "   Add to ~/.zshrc: export ANDROID_HOME=\$HOME/Library/Android/sdk"
        ALL_GOOD=false
    else
        echo -e "   ${RED}❌ Android SDK not found${NC}"
        echo "   Install Android Studio and set ANDROID_HOME"
        echo "   Expected location: $DEFAULT_SDK"
        ALL_GOOD=false
    fi
fi
echo ""

# Check ADB
echo "4. Checking ADB (Android Debug Bridge)..."
if command -v adb &> /dev/null; then
    ADB_VERSION=$(adb version 2>&1 | head -1)
    echo -e "   ${GREEN}✅ ADB installed${NC}"
    echo "   $ADB_VERSION"
else
    echo -e "   ${YELLOW}⚠️  ADB not found in PATH${NC}"
    echo "   This is OK if you only want to build APKs (not install on device)"
    echo "   To fix: Add Android SDK platform-tools to PATH"
fi
echo ""

# Check local.properties
echo "5. Checking android/local.properties..."
if [ -f "android/local.properties" ]; then
    SDK_DIR=$(grep "sdk.dir" android/local.properties | cut -d'=' -f2)
    if [ -d "$SDK_DIR" ]; then
        echo -e "   ${GREEN}✅ local.properties exists and points to valid SDK${NC}"
    else
        echo -e "   ${RED}❌ local.properties points to invalid SDK directory${NC}"
        ALL_GOOD=false
    fi
else
    echo -e "   ${YELLOW}⚠️  local.properties not found${NC}"
    echo "   This is OK if ANDROID_HOME is set correctly"
fi
echo ""

# Check .env file
echo "6. Checking Firebase .env file..."
if [ -f ".env" ]; then
    if grep -q "EXPO_PUBLIC_FIREBASE_API_KEY" .env && grep -q "EXPO_PUBLIC_FIREBASE_PROJECT_ID" .env; then
        echo -e "   ${GREEN}✅ .env file exists with Firebase config${NC}"
    else
        echo -e "   ${RED}❌ .env file exists but Firebase config is missing${NC}"
        echo "   Add Firebase credentials to .env file"
        ALL_GOOD=false
    fi
else
    echo -e "   ${RED}❌ .env file not found${NC}"
    echo "   Create from .env.example: cp .env.example .env"
    echo "   Then add your Firebase credentials"
    ALL_GOOD=false
fi
echo ""

# Check Gradle
echo "7. Checking Gradle wrapper..."
if [ -f "android/gradlew" ]; then
    if [ -x "android/gradlew" ]; then
        echo -e "   ${GREEN}✅ Gradle wrapper exists and is executable${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Gradle wrapper exists but not executable${NC}"
        echo "   Fix: chmod +x android/gradlew"
    fi
else
    echo -e "   ${RED}❌ Gradle wrapper not found${NC}"
    ALL_GOOD=false
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ Setup looks good! You should be able to build the APK.${NC}"
    echo ""
    echo "To build:"
    echo "  ./build-android.sh"
    echo ""
    echo "Or manually:"
    echo "  cd android && ./gradlew assembleRelease"
else
    echo -e "${YELLOW}⚠️  Some issues found. Please fix them before building.${NC}"
    echo ""
    echo "See LOCAL_BUILD_GUIDE.md for detailed setup instructions."
    echo ""
    echo "Quick fixes:"
    echo "  1. Install Java 17: brew install openjdk@17"
    echo "  2. Install Android Studio and SDK"
    echo "  3. Set environment variables in ~/.zshrc"
    echo "  4. Create .env file with Firebase config"
fi
echo ""
