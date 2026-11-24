#!/bin/bash

cd /Users/pratham/.gemini/antigravity/scratch/vehicle-logger

echo "🚀 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Deployment cancelled."
    read -p "Press Enter to close..."
    exit 1
fi

echo "☁️ Deploying to Firebase..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment process finished."
read -p "Press Enter to close..."
