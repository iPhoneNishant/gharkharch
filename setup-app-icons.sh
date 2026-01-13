#!/bin/bash

# App Icon Setup Script for Gharkharch
# This script helps you set up app icons

echo "📱 Gharkharch App Icon Setup"
echo "=============================="
echo ""

# Check if assets directory exists
if [ ! -d "assets" ]; then
    echo "❌ Error: assets directory not found"
    exit 1
fi

echo "Current icon files in assets/:"
ls -lh assets/*.png 2>/dev/null || echo "No PNG files found"

echo ""
echo "📋 Required icon files:"
echo "  1. icon.png (1024x1024) - Main app icon"
echo "  2. adaptive-icon.png (1024x1024) - Android adaptive icon foreground"
echo "  3. splash-icon.png (1024x1024) - Splash screen icon"
echo "  4. favicon.png (48x48 or 16x16) - Web favicon"
echo ""

# Check if ImageMagick is installed (for image validation)
if command -v identify &> /dev/null; then
    echo "✅ ImageMagick found - can validate image sizes"
    HAS_IMAGEMAGICK=true
else
    echo "⚠️  ImageMagick not found - install it for image size validation"
    echo "   macOS: brew install imagemagick"
    HAS_IMAGEMAGICK=false
fi

echo ""
read -p "Do you want to check existing icon sizes? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]] && [ "$HAS_IMAGEMAGICK" = true ]; then
    echo ""
    echo "Checking icon sizes..."
    for file in assets/icon.png assets/adaptive-icon.png assets/splash-icon.png assets/favicon.png; do
        if [ -f "$file" ]; then
            size=$(identify -format "%wx%h" "$file" 2>/dev/null)
            if [ ! -z "$size" ]; then
                echo "  $(basename $file): $size"
            fi
        fi
    done
fi

echo ""
echo "📝 Next steps:"
echo "  1. Prepare your icon images with the required sizes"
echo "  2. Replace the files in the assets/ directory"
echo "  3. Run 'eas build' to rebuild your app with new icons"
echo ""
echo "For detailed instructions, see APP_ICON_SETUP.md"
