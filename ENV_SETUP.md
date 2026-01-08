# Environment Variables Setup

## Firebase Configuration

This project uses environment variables for Firebase configuration to keep sensitive credentials out of the codebase.

### Setup Steps

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your Firebase credentials:**
   - Open `.env` file
   - Replace all placeholder values with your actual Firebase config
   - Get your Firebase config from: https://console.firebase.google.com
     - Go to Project Settings > Your apps > Web app

3. **Required Variables:**
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-your-measurement-id
   ```

### Important Notes

- ✅ `.env` file is gitignored - your credentials will NOT be committed
- ✅ `.env.example` is committed as a template
- ✅ Expo automatically loads `EXPO_PUBLIC_*` variables
- ⚠️ Never commit your `.env` file
- ⚠️ Never share your Firebase credentials publicly

### Troubleshooting

If you see "Firebase configuration is missing!" error:
1. Make sure `.env` file exists in the root directory
2. Check that all variables start with `EXPO_PUBLIC_`
3. Restart the Expo development server after creating/updating `.env`
