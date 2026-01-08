# Quick Android Build Setup

## ✅ Java is Installed!

Java JDK 17 has been installed via Homebrew.

## ⚠️ Next Steps Required

### 1. Complete Java Setup (requires password)

Run this command in your terminal:
```bash
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

### 2. Install Android Studio

1. **Download Android Studio**: https://developer.android.com/studio
2. **Install** the .dmg file
3. **Open Android Studio** and complete the setup wizard
4. **Install Android SDK**:
   - Go to: Tools → SDK Manager
   - Install "Android SDK Platform 34" (or latest)
   - Install "Android SDK Build-Tools"
   - Install "Android SDK Command-line Tools"
   - Click "Apply" to install

### 3. Set Environment Variables

Add to your `~/.zshrc`:
```bash
# Java
export JAVA_HOME=$(/usr/libexec/java_home)
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc
```

### 4. Build the APK

Once Android Studio and SDK are installed:

```bash
./build-android.sh
```

Or manually:
```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Alternative: Use EAS Build (No Local Setup Needed)

If you don't want to install Android Studio, use cloud build:

```bash
eas login
eas build --platform android --profile preview
```

This builds in the cloud and gives you a download link.
