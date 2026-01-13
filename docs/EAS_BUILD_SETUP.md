# EAS Build Environment Variables Setup

This guide explains how to pass environment variables (especially Firebase config) to EAS Build.

## Method 1: EAS Secrets (Recommended for Firebase Config)

**EAS Secrets** is the recommended method for sensitive data like Firebase credentials. Secrets are encrypted and stored securely.

### Setup Steps:

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to EAS**:
   ```bash
   eas login
   ```

3. **Set each Firebase secret**:
   ```bash
   # Set Firebase API Key
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your-api-key-here"
   
   # Set Firebase Auth Domain
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project.firebaseapp.com"
   
   # Set Firebase Project ID
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
   
   # Set Firebase Storage Bucket
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your-project.appspot.com"
   
   # Set Firebase Messaging Sender ID
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your-sender-id"
   
   # Set Firebase App ID
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your-app-id"
   
   # Set Firebase Measurement ID (optional)
   eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "G-your-measurement-id"
   ```

4. **Verify secrets are set**:
   ```bash
   eas secret:list
   ```

### Quick Setup Script:

If you have a `.env` file, you can use this script to set all secrets at once:

```bash
# Make sure you're in the project root directory
source .env

eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "$EXPO_PUBLIC_FIREBASE_API_KEY"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "$EXPO_PUBLIC_FIREBASE_PROJECT_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "$EXPO_PUBLIC_FIREBASE_APP_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
```

## Method 2: eas.json env Field (For Non-Sensitive Variables)

You can also add environment variables directly in `eas.json`. **Note: This is NOT recommended for sensitive data** as `eas.json` is typically committed to git.

Example `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SOME_PUBLIC_VAR": "value"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_SOME_PUBLIC_VAR": "preview-value"
      }
    }
  }
}
```

## Using Environment Variables in Your Code

Once set up via either method, access variables in your code using `process.env`:

```typescript
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
```

## Building with EAS

After setting up secrets, build your app:

```bash
# Preview build (APK)
eas build --platform android --profile preview

# Production build (App Bundle)
eas build --platform android --profile production
```

## Managing Secrets

- **List all secrets**: `eas secret:list`
- **Delete a secret**: `eas secret:delete --name EXPO_PUBLIC_FIREBASE_API_KEY`
- **Update a secret**: Delete the old one and create a new one with the same name

## Important Notes

- ✅ **EAS Secrets** are encrypted and stored securely
- ✅ Secrets are scoped to your project (not shared across projects)
- ✅ Use `EXPO_PUBLIC_` prefix for variables that should be accessible in your app code
- ⚠️ **Never commit** `.env` files or sensitive credentials to git
- ⚠️ Variables without `EXPO_PUBLIC_` prefix are only available at build time, not runtime

## Troubleshooting

### Variables not available in app:

1. Make sure variables start with `EXPO_PUBLIC_` prefix
2. Verify secrets are set: `eas secret:list`
3. Clean build cache: `eas build --clear-cache`
4. Check that you're using `process.env.EXPO_PUBLIC_*` in your code

### "Firebase configuration is missing" error:

1. Verify all required secrets are set
2. Check secret names match exactly (including `EXPO_PUBLIC_` prefix)
3. Rebuild the app after setting secrets
4. Check build logs for environment variable errors
