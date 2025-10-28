#!/bin/bash
# Copy locales to dist folder for web deployment

set -e

echo "📦 Copying locales to dist..."

# Create locales directory in dist
mkdir -p dist/locales

# Copy all locale files
cp -r locales/* dist/locales/

echo "✅ Locales copied successfully"
ls -la dist/locales/
