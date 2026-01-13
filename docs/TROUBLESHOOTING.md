# Troubleshooting Guide for Gharkharch

## Common Issues and Solutions

### "Unauthorized" Error When Creating Account/Transaction

**Symptoms:**
- Error message: "Unauthorized" or "You must be signed in"
- Functions are deployed but calls fail

**Possible Causes & Solutions:**

1. **User Not Authenticated**
   - Make sure you're signed in to the app
   - Check that `firebaseAuth.currentUser` is not null
   - Try signing out and signing back in

2. **Auth Token Not Being Passed**
   - `httpsCallable` should automatically pass the auth token
   - Make sure `cloudFunctions` and `firebaseAuth` use the same Firebase app instance
   - Check console logs for "Calling createAccount with user: [uid]"

3. **Functions Not Deployed**
   ```bash
   cd functions
   npm run build
   npm run deploy
   ```

4. **Check Function Logs**
   ```bash
   cd functions
   npm run logs
   ```
   Or in Firebase Console → Functions → createAccount → Logs

5. **Verify Authentication State**
   - Open React Native debugger
   - Check `firebaseAuth.currentUser` is not null
   - Verify the user ID matches what you expect

### "Permission Denied" Error

**Symptoms:**
- Error: "Permission denied" when reading/writing data

**Solutions:**

1. **Check Firestore Security Rules**
   ```bash
   npm run firestore:deploy
   ```

2. **Verify User is Authenticated**
   - Make sure you're signed in
   - Check auth state in the app

3. **Check Rules Match Your Data Structure**
   - Users collection: Users can read their own profile
   - Accounts collection: Users can read their own accounts
   - Transactions collection: Users can read their own transactions

### "Cloud Function Not Found" Error

**Symptoms:**
- Error: "Cloud Function not found"

**Solutions:**

1. **Deploy Functions**
   ```bash
   cd functions
   npm run build
   npm run deploy
   ```

2. **Verify Functions Are Deployed**
   ```bash
   npm run firebase functions:list
   ```

3. **Check Function Name**
   - Make sure the function name matches exactly
   - Case-sensitive: `createAccount` not `createaccount`

### "Database Index Missing" Error

**Symptoms:**
- Error: "The query requires an index"

**Solutions:**

1. **Deploy Indexes**
   ```bash
   npm run firestore:deploy
   ```

2. **Create Missing Index**
   - Click the link in the error message
   - Or go to Firebase Console → Firestore → Indexes
   - Create the missing index

### Login/Signup Issues

**Symptoms:**
- Can't sign in or sign up
- Error messages during authentication

**Solutions:**

1. **Check Email/Password**
   - Verify email format is correct
   - Password must be at least 6 characters

2. **Check Firebase Auth Configuration**
   - Verify Firebase config in `src/config/firebase.ts`
   - Make sure Email/Password auth is enabled in Firebase Console

3. **Check Network Connection**
   - Make sure you have internet access
   - Try again after a few seconds

### User Profile Not Created on Signup

**Symptoms:**
- User can sign up but profile isn't created in Firestore

**Solutions:**

1. **Check Firestore Security Rules**
   - Users should be able to create their own profile
   - Rule: `allow create: if isAuthenticated() && request.auth.uid == userId`

2. **Deploy Updated Rules**
   ```bash
   npm run firestore:deploy
   ```

3. **Check Console for Errors**
   - Look for permission denied errors
   - Check if Firestore is enabled

## Debugging Steps

### 1. Check Console Logs

Open React Native debugger or check terminal for:
- Authentication state
- Function call logs
- Error messages

### 2. Verify Firebase Configuration

```typescript
// In src/config/firebase.ts
console.log('Firebase App:', app);
console.log('Auth:', auth);
console.log('Functions:', functions);
console.log('Current User:', firebaseAuth.currentUser);
```

### 3. Test Functions Directly

```bash
# View function logs
cd functions
npm run logs

# Or in Firebase Console
# Functions → createAccount → Logs
```

### 4. Check Firestore Data

1. Go to Firebase Console
2. Firestore Database → Data
3. Verify collections exist
4. Check if documents are being created

### 5. Verify Authentication

```typescript
// In your component or store
import { firebaseAuth } from '../config/firebase';

console.log('Current User:', firebaseAuth.currentUser);
console.log('User ID:', firebaseAuth.currentUser?.uid);
```

## Getting Help

If you're still experiencing issues:

1. **Check Error Messages**
   - Copy the exact error message
   - Check the error code (e.g., `functions/unauthenticated`)

2. **Check Logs**
   - React Native console
   - Firebase Functions logs
   - Firestore security rules logs

3. **Verify Setup**
   - Functions deployed ✓
   - Firestore rules deployed ✓
   - Indexes created ✓
   - User authenticated ✓

4. **Common Fixes**
   - Sign out and sign back in
   - Clear app cache
   - Restart the app
   - Redeploy functions and rules
