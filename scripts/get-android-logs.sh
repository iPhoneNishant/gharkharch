#!/bin/bash

# Script to get Android app crash logs
# Usage: ./get-android-logs.sh

echo "📱 Getting Android app logs..."
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ adb (Android Debug Bridge) not found!"
    echo ""
    echo "Please install Android SDK platform-tools:"
    echo "1. Install Android Studio"
    echo "2. Tools → SDK Manager → SDK Tools → Android SDK Platform-Tools"
    echo ""
    echo "Or set up ANDROID_HOME and add platform-tools to PATH"
    exit 1
fi

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ No Android device connected!"
    echo ""
    echo "Please:"
    echo "1. Connect your Android device via USB"
    echo "2. Enable USB Debugging: Settings → Developer Options → USB Debugging"
    echo "3. Run: adb devices"
    exit 1
fi

echo "✅ Device connected"
echo ""

# Get app package name
PACKAGE_NAME="com.anonymous.dailymunim"

echo "📋 Getting logs for: $PACKAGE_NAME"
echo ""

# Clear old logs and get new ones
echo "Clearing logcat buffer..."
adb logcat -c

echo ""
echo "🔍 Monitoring logs (Ctrl+C to stop)..."
echo "Filtering for app crashes and errors..."
echo ""

# Show logs filtered for the app
adb logcat | grep -E "($PACKAGE_NAME|AndroidRuntime|FATAL)" --line-buffered
