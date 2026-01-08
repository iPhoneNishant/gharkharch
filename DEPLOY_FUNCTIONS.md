# Deploy Cloud Functions for Gharkharch

Cloud Functions are required for all write operations (creating accounts, transactions, etc.). The app is read-only from the client side for security.

## 🚀 Quick Deploy

```bash
# Make sure you're using Node v24.12.0
nvm use 24.12.0

# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy functions
npm run deploy

# Or from project root:
cd ..
npm run firebase deploy --only functions
```

## 📋 Prerequisites

1. **Firebase CLI installed and logged in**
   ```bash
   npm run firebase login
   ```

2. **Project linked**
   ```bash
   npm run firebase use --add
   # Select: gharkharch-d36dc
   ```

3. **Node.js v20+** (functions require Node 20)
   ```bash
   nvm use 24.12.0
   ```

## 🔧 Step-by-Step

### 1. Install Function Dependencies

```bash
cd functions
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

This compiles `src/index.ts` to `lib/index.js`.

### 3. Deploy Functions

```bash
npm run deploy
```

Or from project root:
```bash
npm run firebase deploy --only functions
```

### 4. Verify Deployment

After deployment, you should see:
```
✔  functions[createAccount(us-central1)] Successful create operation.
✔  functions[updateAccount(us-central1)] Successful create operation.
✔  functions[deleteAccount(us-central1)] Successful create operation.
✔  functions[createTransaction(us-central1)] Successful create operation.
✔  functions[updateTransaction(us-central1)] Successful create operation.
✔  functions[deleteTransaction(us-central1)] Successful create operation.
```

## 📍 Function Region

Functions are deployed to `us-central1` by default. If you want to change the region:

1. Edit `functions/src/index.ts` and add region to each function:
   ```typescript
   export const createAccount = onCall(
     { region: 'asia-south1' }, // Add this
     async (request: CallableRequest<CreateAccountRequest>) => {
       // ...
     }
   );
   ```

2. Update `src/config/firebase.ts`:
   ```typescript
   functions = getFunctions(app, 'asia-south1');
   ```

3. Redeploy functions.

## 🐛 Troubleshooting

### Error: "Cloud Function not found"

**Solution**: Functions are not deployed. Deploy them using the steps above.

### Error: "Permission denied"

**Solution**: 
- Make sure user is authenticated
- Check Firestore security rules are deployed
- Verify Cloud Functions IAM permissions in Firebase Console

### Error: "Functions unavailable"

**Solution**:
- Check your internet connection
- Verify Firebase project is active
- Check Firebase Console → Functions for deployment status

### Build Errors

If you get TypeScript errors:
```bash
cd functions
npm install
npm run build
```

Check for any missing dependencies or type errors.

## 📊 Available Functions

- `createAccount` - Create a new account
- `updateAccount` - Update account details
- `deleteAccount` - Delete an account
- `createTransaction` - Create a transaction (with balance updates)
- `updateTransaction` - Update a transaction
- `deleteTransaction` - Delete a transaction

## 🔍 View Logs

```bash
cd functions
npm run logs
```

Or in Firebase Console:
- Go to **Functions** → Select a function → **Logs** tab

## ⚡ Quick Commands

```bash
# Deploy all functions
npm run firebase deploy --only functions

# Deploy specific function
npm run firebase deploy --only functions:createAccount

# View logs
npm run firebase functions:log

# Test locally (requires emulator)
cd functions
npm run serve
```

---

**Important**: All write operations (create, update, delete) must go through Cloud Functions. The client app is read-only for security and data integrity.
