# EAS Keystore Setup Guide

## Retrieve Your Release Keystore from EAS

If you've used EAS Build before, your keystore is stored securely in EAS. Follow these steps to download it:

### Step 1: Login to EAS (if not already logged in)

```bash
eas login
```

### Step 2: Download Android Credentials

Run the interactive command:

```bash
eas credentials
```

When prompted:
1. **Select platform**: Choose `android`
2. **Select build profile**: Choose `production` (for Play Store releases)
3. **Select action**: Choose `Download existing credentials` or `Show credentials`

### Step 3: Download the Keystore

If you see the option to download, select it. The keystore file will be downloaded.

### Step 4: Configure Local Build

Once you have the keystore file:

1. **Place the keystore file** in `android/app/` directory:
   ```bash
   # Example: if downloaded as "release.keystore"
   mv ~/Downloads/release.keystore android/app/release.keystore
   ```

2. **Add signing configuration** to `android/gradle.properties`:
   ```properties
   MYAPP_RELEASE_STORE_FILE=release.keystore
   MYAPP_RELEASE_KEY_ALIAS=your-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=your-store-password
   MYAPP_RELEASE_KEY_PASSWORD=your-key-password
   ```

   **Important**: Replace the placeholder values with the actual values from EAS.

3. **Verify the keystore fingerprint** matches Play Store:
   ```bash
   keytool -list -v -keystore android/app/release.keystore -alias your-key-alias
   ```
   
   Look for: `SHA1: C8:2D:4F:ED:75:55:7A:E2:B8:97:86:93:1A:FA:80:FD:5B:94:9A:D9`

4. **Rebuild the AAB**:
   ```bash
   cd android && ./gradlew bundleRelease
   ```

## Alternative: Use EAS Build Directly

If you prefer not to download the keystore, you can build directly with EAS:

```bash
eas build --platform android --profile production
```

EAS will automatically use the correct signing key. The AAB will be available for download from the EAS dashboard.

## Troubleshooting

### "No credentials found"
- Make sure you've built with EAS before using the production profile
- Check that you're logged into the correct Expo account

### "Keystore password incorrect"
- Double-check the password from EAS credentials
- Try downloading credentials again

### "Fingerprint mismatch"
- Verify you downloaded the correct keystore (production profile)
- Check that you're using the correct key alias

## Security Notes

- **Never commit** `gradle.properties` with real passwords to git
- **Never commit** keystore files to git (already in `.gitignore`)
- **Backup** your keystore file securely
- **Store passwords** in a password manager
