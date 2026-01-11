# Local Android Build Setup Guide

This guide will help you set up your local environment to build Android APKs on macOS.

## Quick Status Check

Run this to check your current setup:
```bash
./check-build-setup.sh
```

## Prerequisites Checklist

- [ ] Java JDK 17
- [ ] Android Studio
- [ ] Android SDK
- [ ] Environment Variables
- [ ] `.env` file with Firebase config

## Step-by-Step Setup

### Step 1: Verify Java Installation

Java should already be installed. Verify:
```bash
java -version
```

Expected output: `openjdk version "17.x.x"`

If Java is not installed:
```bash
brew install openjdk@17
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

### Step 2: Install Android Studio

1. **Download**: https://developer.android.com/studio
2. **Install**: Open the .dmg file and drag Android Studio to Applications
3. **First Launch**: 
   - Open Android Studio
   - Complete the setup wizard
   - Let it download SDK components

### Step 3: Install Android SDK Components

1. In Android Studio: **Tools → SDK Manager**
2. **SDK Platforms** tab:
   - Install "Android 14.0 (API 34)" or latest
   - Install "Android SDK Platform 34"
3. **SDK Tools** tab:
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator (optional, for testing)
4. Click **Apply** to install

### Step 4: Set Environment Variables

Add these to your `~/.zshrc` file:

```bash
# Java
export JAVA_HOME=$(/usr/libexec/java_home)
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Apply the changes**:
```bash
source ~/.zshrc
```

**Verify**:
```bash
echo $ANDROID_HOME
echo $JAVA_HOME
adb version  # Should show adb version
```

### Step 5: Create local.properties (Optional)

If Android SDK is in a non-standard location, create `android/local.properties`:

```properties
sdk.dir=/Users/yourusername/Library/Android/sdk
```

Replace `yourusername` with your actual username.

### Step 6: Configure Firebase Environment Variables

For **local builds**, the `.env` file is automatically used. Make sure it exists:

```bash
# Check if .env exists
test -f .env && echo "✅ .env file exists" || echo "❌ .env file missing"

# Verify it has Firebase config
grep -q EXPO_PUBLIC_FIREBASE_API_KEY .env && echo "✅ Firebase config found" || echo "❌ Firebase config missing"
```

If missing, create `.env` from `.env.example`:
```bash
cp .env.example .env
# Then edit .env and add your Firebase credentials
```

## Building the APK

### Option 1: Using the Build Script (Recommended)

```bash
./build-android.sh
```

This script automatically:
- Checks for Java and Android SDK
- Sets environment variables
- Builds the release APK
- Shows the APK location

### Option 2: Using Gradle Directly

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Option 3: Using Expo CLI (Development Build)

For development/testing builds:
```bash
# Make sure .env file exists
npx expo run:android --variant release
```

## Verification

After building, verify the APK was created:
```bash
ls -lh android/app/build/outputs/apk/release/app-release.apk
```

You should see a file size (typically 20-50 MB).

## Installing on Device

### Using ADB (USB Debugging)

1. Enable USB Debugging on your Android device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
2. Connect device via USB
3. Verify connection:
   ```bash
   adb devices
   ```
4. Install APK:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

### Using File Transfer

1. Copy the APK to your device
2. Open the APK file on your device
3. Allow installation from unknown sources if prompted
4. Install the app

## Troubleshooting

### "SDK location not found"

**Solution**: Set ANDROID_HOME environment variable:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
```

Or create `android/local.properties`:
```properties
sdk.dir=/Users/yourusername/Library/Android/sdk
```

### "Java not found"

**Solution**: 
```bash
# Install Java
brew install openjdk@17

# Link Java
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Set JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home)
```

### "Build failed" or "Gradle error"

**Solutions**:
1. Clean build:
   ```bash
   cd android && ./gradlew clean
   ```
2. Check Android SDK is installed
3. Verify environment variables are set
4. Check disk space (need at least 5GB free)
5. Check build logs for specific errors:
   ```bash
   cd android && ./gradlew assembleRelease --stacktrace
   ```

### "Firebase configuration is missing" at runtime

**Solution**: Make sure `.env` file exists with all Firebase variables:
```bash
# Check .env file
cat .env | grep EXPO_PUBLIC_FIREBASE

# If missing, create from .env.example
cp .env.example .env
# Then edit .env with your Firebase credentials
```

Note: For local builds, `.env` file is automatically loaded. Unlike EAS Build, you don't need to set secrets separately.

### Build is successful but app crashes on launch

1. Check crash logs:
   ```bash
   ./get-android-logs.sh
   ```
2. Verify Firebase config is correct in `.env`
3. Check that all required Firebase services are enabled in Firebase Console
4. Try a clean build:
   ```bash
   cd android && ./gradlew clean && ./gradlew assembleRelease
   ```

## Differences: Local Build vs EAS Build

| Feature | Local Build | EAS Build |
|---------|-------------|-----------|
| **Setup Required** | Java, Android Studio, SDK | None (cloud-based) |
| **Environment Variables** | Uses `.env` file automatically | Uses EAS Secrets (see EAS_BUILD_SETUP.md) |
| **Build Time** | 5-15 minutes | 10-20 minutes (cloud) |
| **Internet Required** | No (after initial setup) | Yes |
| **APK Location** | `android/app/build/outputs/apk/release/` | Download from Expo dashboard |
| **Cost** | Free | Free tier available |

## Next Steps

- ✅ Build successfully completed
- 📱 Install APK on device for testing
- 🔄 For production builds, consider using EAS Build (see EAS_BUILD_SETUP.md)
- 📝 Sign your APK for Play Store (requires keystore configuration)

## Additional Resources

- [Android Studio Documentation](https://developer.android.com/studio)
- [Expo Local Development](https://docs.expo.dev/develop/development-builds/introduction/)
- [Gradle Build Configuration](https://developer.android.com/studio/build)
