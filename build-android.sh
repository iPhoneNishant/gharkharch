#!/bin/bash

# Android Build Script for Gharkharch

echo "🔨 Building Android APK..."

# Check for Android SDK
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        export ANDROID_SDK_ROOT="$ANDROID_HOME"
        echo "✅ Found Android SDK at: $ANDROID_HOME"
    else
        echo "❌ Android SDK not found!"
        echo "Please install Android Studio and set ANDROID_HOME"
        echo "Or run: export ANDROID_HOME=\$HOME/Library/Android/sdk"
        exit 1
    fi
fi

# Check for Java
if ! command -v java &> /dev/null; then
    echo "❌ Java not found!"
    echo "Please install JDK 17: brew install openjdk@17"
    exit 1
fi

# Set Java Home
if [ -d "/opt/homebrew/opt/openjdk@17" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
    export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
elif [ -d "/Library/Java/JavaVirtualMachines/openjdk-17.jdk" ]; then
    export JAVA_HOME="/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home"
else
    export JAVA_HOME=$(/usr/libexec/java_home 2>/dev/null)
fi

if [ -z "$JAVA_HOME" ] || [ ! -d "$JAVA_HOME" ]; then
    echo "❌ JAVA_HOME not set!"
    echo "Please run: sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk"
    exit 1
fi

echo "✅ Java found at: $JAVA_HOME"

# Build
cd android
echo "📦 Building release APK..."
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo "📱 APK location: android/app/build/outputs/apk/release/app-release.apk"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi
