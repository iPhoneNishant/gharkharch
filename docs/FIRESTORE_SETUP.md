# Firestore Database Setup Guide for Gharkharch

This guide will walk you through setting up Firestore database in Firebase Console for your Gharkharch app.

## 📋 Prerequisites

- Firebase project already created (you have the config in `src/config/firebase.ts`)
- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged into Firebase CLI (`firebase login`)

## 🚀 Step-by-Step Setup

### Step 1: Create Firestore Database in Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project: **gharkharch-d36dc**

2. **Navigate to Firestore Database**
   - In the left sidebar, click **"Build"** → **"Firestore Database"**
   - If you see "Get started" or "Create database", click it

3. **Choose Database Mode**
   - Select **"Start in production mode"** (we'll configure rules separately)
   - OR **"Start in test mode"** if you want to test first (⚠️ less secure)

4. **Select Location**
   - Choose a location closest to your users (e.g., `asia-south1` for India)
   - Click **"Enable"**

5. **Wait for Database Creation**
   - This takes 1-2 minutes
   - You'll see "Cloud Firestore" dashboard when ready

### Step 2: Deploy Security Rules

Your app uses security rules that enforce:
- Users can only read their own data
- All writes must go through Cloud Functions (client is read-only)

**Option A: Using Setup Script (Easiest)**

```bash
# Run the setup script
./setup-firestore.sh
```

**Option B: Using Firebase CLI (Manual)**

```bash
# Make sure you're in the project root
cd /Users/nishantgupta/gharkharch

# Login to Firebase (opens browser)
npx firebase login

# Link your project
npx firebase use --add
# Select: gharkharch-d36dc

# Deploy Firestore rules and indexes
npx firebase deploy --only firestore
```

**Note**: If `firebase` command is not found, use `npx firebase` instead.

**Option B: Manual Setup in Console**

1. Go to **Firestore Database** → **Rules** tab
2. Copy the contents of `firestore.rules` file
3. Paste into the rules editor
4. Click **"Publish"**

### Step 3: Deploy Database Indexes

Your app requires indexes for efficient queries. These are defined in `firestore.indexes.json`.

**Option A: Using Firebase CLI (Recommended)**

```bash
# This is included in the command above
firebase deploy --only firestore
```

**Option B: Manual Setup in Console**

1. Go to **Firestore Database** → **Indexes** tab
2. Click **"Add Index"**
3. For each index in `firestore.indexes.json`:
   - Collection ID: `accounts` or `transactions`
   - Fields: Add each field with ascending/descending order
   - Query scope: Collection
   - Click **"Create"**

**Required Indexes:**

1. **accounts** collection:
   - `userId` (Ascending) + `createdAt` (Descending)
   - `userId` (Ascending) + `accountType` (Ascending) + `createdAt` (Descending)

2. **transactions** collection:
   - `userId` (Ascending) + `date` (Descending)
   - `userId` (Ascending) + `debitAccountId` (Ascending) + `date` (Descending)
   - `userId` (Ascending) + `creditAccountId` (Ascending) + `date` (Descending)

### Step 4: Verify Setup

1. **Check Rules**
   - Go to **Firestore Database** → **Rules**
   - Verify rules are published (should match `firestore.rules`)

2. **Check Indexes**
   - Go to **Firestore Database** → **Indexes**
   - Verify all 5 indexes are created and status is "Enabled"

3. **Test Database Connection**
   - Run your app: `npm start`
   - Try signing up a new user
   - Check Firestore Console → **Data** tab
   - You should see a `users` collection with a new document

## 📊 Database Structure

Your app uses 3 main collections:

### 1. `users` Collection
- **Document ID**: User's Firebase Auth UID
- **Fields**:
  - `email` (string)
  - `displayName` (string, optional)
  - `currency` (string, default: "INR")
  - `onboardingComplete` (boolean)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

### 2. `accounts` Collection
- **Document ID**: Auto-generated
- **Fields**:
  - `userId` (string) - Owner's UID
  - `name` (string)
  - `accountType` (string: "asset" | "liability" | "income" | "expense")
  - `parentCategory` (string)
  - `subCategory` (string)
  - `balance` (number)
  - `currency` (string)
  - `icon` (string, optional)
  - `color` (string, optional)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

### 3. `transactions` Collection
- **Document ID**: Auto-generated
- **Fields**:
  - `userId` (string) - Owner's UID
  - `debitAccountId` (string) - Reference to account
  - `creditAccountId` (string) - Reference to account
  - `amount` (number)
  - `date` (timestamp)
  - `description` (string, optional)
  - `tags` (array of strings, optional)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)

## 🔒 Security Model

- **Client (React Native App)**: Read-only access
- **Cloud Functions**: All write operations
- **Security Rules**: Enforce user ownership

This ensures:
- ✅ Users can only access their own data
- ✅ Accounting rules are enforced server-side
- ✅ Balance calculations are atomic and consistent

## 🛠 Troubleshooting

### Issue: "Missing or insufficient permissions"
- **Solution**: Verify security rules are deployed correctly
- Check that user is authenticated in your app

### Issue: "The query requires an index"
- **Solution**: Deploy indexes using `firebase deploy --only firestore`
- Or create the missing index manually in Console

### Issue: "Firestore not initialized"
- **Solution**: Make sure Firestore is enabled in Firebase Console
- Verify your Firebase config in `src/config/firebase.ts`

### Issue: "Cannot write to Firestore"
- **Solution**: This is expected! All writes go through Cloud Functions
- Deploy your Cloud Functions: `cd functions && npm run deploy`

## 📝 Next Steps

1. **Deploy Cloud Functions** (for write operations):
   ```bash
   cd functions
   npm install
   npm run deploy
   ```

2. **Test the App**:
   - Sign up a new user
   - Create an account
   - Add a transaction
   - Verify data appears in Firestore Console

3. **Monitor Usage**:
   - Check **Firestore Database** → **Usage** tab
   - Monitor read/write operations
   - Set up billing alerts if needed

## 🔗 Useful Links

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Indexes Guide](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase Console](https://console.firebase.google.com)

---

**Note**: The database will be created automatically when you deploy rules/indexes or when your app first tries to write data (if using test mode). The collections (`users`, `accounts`, `transactions`) will be created automatically when the first document is added.
