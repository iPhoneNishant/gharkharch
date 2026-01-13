#!/bin/bash

# Firestore Setup Script for Gharkharch
# This script helps you set up Firestore database, rules, and indexes

set -e

echo "🔥 Firebase Firestore Setup for Gharkharch"
echo "=========================================="
echo ""

# Check if firebase CLI is available
# Try local installation first, then global, then npx
FIREBASE_CMD=""
if [ -f "./node_modules/.bin/firebase" ]; then
    FIREBASE_CMD="./node_modules/.bin/firebase"
    echo "ℹ️  Using local Firebase CLI"
elif command -v firebase &> /dev/null; then
    FIREBASE_CMD="firebase"
    echo "ℹ️  Using global Firebase CLI"
elif command -v npx &> /dev/null; then
    FIREBASE_CMD="npx firebase"
    echo "ℹ️  Using npx Firebase CLI"
else
    echo "❌ Error: Firebase CLI not found"
    echo "   Installing locally..."
    npm install --save-dev firebase-tools
    FIREBASE_CMD="./node_modules/.bin/firebase"
fi

# Step 1: Login check
echo "Step 1: Checking Firebase authentication..."
if ! $FIREBASE_CMD projects:list &> /dev/null; then
    echo "⚠️  Not logged in to Firebase"
    echo ""
    echo "Please run this command in your terminal:"
    echo "  $FIREBASE_CMD login"
    echo ""
    echo "This will open a browser for authentication."
    echo "After logging in, run this script again."
    exit 1
fi

echo "✅ Logged in to Firebase"
echo ""

# Step 2: Link project
echo "Step 2: Linking Firebase project..."
if [ ! -f .firebaserc ]; then
    echo "⚠️  Project not linked yet"
    echo ""
    echo "Please run this command:"
    echo "  $FIREBASE_CMD use --add"
    echo ""
    echo "When prompted, select: gharkharch-d36dc"
    echo "After linking, run this script again."
    exit 1
fi

echo "✅ Project linked"
echo ""

# Step 3: Deploy Firestore rules and indexes
echo "Step 3: Deploying Firestore rules and indexes..."
echo ""

$FIREBASE_CMD deploy --only firestore

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to Firebase Console: https://console.firebase.google.com"
echo "2. Select project: gharkharch-d36dc"
echo "3. Go to Firestore Database → Data tab"
echo "4. Verify your collections appear when you use the app"
echo ""
