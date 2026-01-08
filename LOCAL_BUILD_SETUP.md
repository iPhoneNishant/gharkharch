# Local Android Build Setup Guide

## Prerequisites

To build Android APK locally, you need:

1. **Java Development Kit (JDK)**
2. **Android SDK**
3. **Environment Variables**

## Step 1: Install Java JDK

### Option A: Using Homebrew (Recommended)
```bash
brew install openjdk@17
```

### Option B: Download from Oracle
- Visit: https://www.oracle.com/java/technologies/downloads/#java17
- Download and install JDK 17 for macOS

### Verify Installation
```bash
java -version
```

## Step 2: Install Android Studio

1. Download Android Studio: https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio and complete the setup wizard
4. Install Android SDK through SDK Manager:
   - Tools → SDK Manager
   - Install Android SDK Platform 34 (or latest)
   - Install Android SDK Build-Tools
   - Install Android SDK Command-line Tools

## Step 3: Set Environment Variables

Add these to your `~/.zshrc` or `~/.bash_profile`:

```bash
# Java
export JAVA_HOME=$(/usr/libexec/java_home)

# Android SDK (adjust path if different)
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc
```

## Step 4: Build the APK

Once everything is set up:

```bash
cd android
./gradlew assembleRelease
```

The APK will be at:
`android/app/build/outputs/apk/release/app-release.apk`

## Quick Build (If Android Studio is installed)

If Android Studio is already installed, you can try:

```bash
# Set Android SDK path (adjust if different)
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Build
cd android
./gradlew assembleRelease
```

## Troubleshooting

### "SDK location not found"
- Make sure ANDROID_HOME is set correctly
- Check that Android SDK is installed at that location

### "Java not found"
- Install JDK 17
- Set JAVA_HOME environment variable

### Build fails
- Make sure all Android SDK components are installed
- Check that you have enough disk space
- Try: `./gradlew clean` then `./gradlew assembleRelease`
