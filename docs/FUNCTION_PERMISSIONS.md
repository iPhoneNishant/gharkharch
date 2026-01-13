# Setting Cloud Functions Permissions for React Native

## Problem

React Native's `httpsCallable` doesn't automatically pass auth tokens to Cloud Functions v2 `onCall` functions, causing `functions/unauthenticated` errors.

## Solution

We need to allow unauthenticated invocations at the IAM level, then verify tokens manually in the function code (which we've already implemented).

## Method 1: Using Google Cloud Console (Recommended)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/functions
   - Select project: **gharkharch-d36dc**

2. **For each function** (`createAccount`, `updateAccount`, `deleteAccount`, `createTransaction`, `updateTransaction`, `deleteTransaction`):
   - Click on the function name
   - Go to **"Permissions"** tab
   - Click **"Add Principal"**
   - Enter: `allUsers`
   - Select role: **"Cloud Functions Invoker"**
   - Click **"Save"**

## Method 2: Using gcloud CLI

If you have `gcloud` installed:

```bash
# Install gcloud if needed
# macOS: brew install google-cloud-sdk

# Login
gcloud auth login

# Set project
gcloud config set project gharkharch-d36dc

# Set permissions for each function
gcloud functions add-iam-policy-binding createAccount \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker

# Repeat for other functions:
# updateAccount, deleteAccount, createTransaction, updateTransaction, deleteTransaction
```

Or use the script:
```bash
./set-function-permissions.sh
```

## Method 3: Using Firebase CLI (if supported)

```bash
# This might not work for v2 functions, but worth trying
firebase functions:config:set functions.invoker=allUsers
```

## Security Note

⚠️ **Important**: Even though we're allowing unauthenticated invocations, the functions still verify auth tokens manually in the code. This is secure because:

1. Functions check for `idToken` in the request data
2. Tokens are verified using `admin.auth().verifyIdToken()`
3. Only valid, non-expired tokens are accepted
4. Invalid tokens result in `unauthenticated` errors

This is a workaround for React Native's auth token passing issue, not a security compromise.

## Verify It's Working

After setting permissions, try creating an account again. You should see:
- Function receives the request (no `functions/unauthenticated` error)
- Token is verified manually
- Account is created successfully

## Troubleshooting

If you still get errors:
1. Wait a few minutes for IAM changes to propagate
2. Check function logs in Firebase Console
3. Verify the token is being passed in the data
4. Check that the function code is deployed with the manual token verification
