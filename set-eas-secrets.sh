#!/bin/bash

# Script to set Firebase environment variables as EAS Environment Variables
# Usage: ./set-eas-secrets.sh [ENVIRONMENT]
# Example: ./set-eas-secrets.sh production
# Example: ./set-eas-secrets.sh preview (default)

set -e

# Default environment is preview
ENVIRONMENT=${1:-preview}

echo "🔐 Setting Firebase environment variables for EAS Build..."
echo "Environment: $ENVIRONMENT"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found!"
    echo ""
    echo "Please install EAS CLI:"
    echo "  npm install -g eas-cli"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo ""
    echo "Please create a .env file with your Firebase credentials."
    echo "See .env.example for the required variables."
    exit 1
fi

# Check if logged in to EAS
echo "Checking EAS login status..."
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to EAS"
    echo ""
    echo "Please login:"
    echo "  eas login"
    exit 1
fi

echo "✅ Logged in to EAS"
echo ""

# Required Firebase variables
REQUIRED_VARS=(
    "EXPO_PUBLIC_FIREBASE_API_KEY"
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID"
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    "EXPO_PUBLIC_FIREBASE_APP_ID"
)

# Check if all required variables are in .env file
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables in .env file:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set all required variables in your .env file."
    exit 1
fi

echo "✅ All required variables found in .env file"
echo ""

# Function to set a secret using eas env:create
set_secret() {
    local name=$1
    local value=$2
    
    echo "Setting $name..."
    
    # Check if variable already exists
    if eas env:list --environment "$ENVIRONMENT" --json 2>/dev/null | grep -q "\"$name\""; then
        echo "  ⚠️  Variable already exists. Updating..."
        eas env:update "$ENVIRONMENT" --name "$name" --value "$value" --visibility sensitive --non-interactive 2>/dev/null || true
    else
        # Create the variable with sensitive visibility (EXPO_PUBLIC_ vars should not be secret)
        eas env:create "$ENVIRONMENT" --name "$name" --value "$value" --visibility sensitive --non-interactive
    fi
    
    echo "  ✅ Set successfully"
    echo ""
}

# Load .env file to get values
source .env

# Set all Firebase secrets
set_secret "EXPO_PUBLIC_FIREBASE_API_KEY" "$EXPO_PUBLIC_FIREBASE_API_KEY"
set_secret "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
set_secret "EXPO_PUBLIC_FIREBASE_PROJECT_ID" "$EXPO_PUBLIC_FIREBASE_PROJECT_ID"
set_secret "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
set_secret "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
set_secret "EXPO_PUBLIC_FIREBASE_APP_ID" "$EXPO_PUBLIC_FIREBASE_APP_ID"

# Optional: Set measurement ID if it exists
if [ -n "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID" ]; then
    set_secret "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID" "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
fi

echo "🎉 All Firebase environment variables have been set for '$ENVIRONMENT' environment!"
echo ""
echo "You can now build your app with:"
echo "  eas build --platform android --profile preview"
echo ""
echo "To verify variables:"
echo "  eas env:list --environment $ENVIRONMENT"
echo ""
echo "To set for other environments:"
echo "  ./set-eas-secrets.sh production"
echo "  ./set-eas-secrets.sh development"
