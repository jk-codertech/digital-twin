#!/bin/bash

# Digital Twin Production Deployment Script

echo "🚀 Starting Digital Twin deployment..."

# Check if we're in the right directory
if [[ ! -f "package.json" || ! -d "convex" ]]; then
    echo "❌ Error: Run this script from the digital-twin project root directory"
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm ci

# Deploy Convex functions
echo "☁️ Deploying Convex functions..."
npx convex deploy

if [ $? -ne 0 ]; then
    echo "❌ Convex deployment failed"
    exit 1
fi

# Build the frontend
echo "🔨 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "📁 Frontend build files are in the 'dist' directory"
echo "🌐 Upload the contents of 'dist' to your web hosting service"
echo "📊 Monitor your deployment at: https://dashboard.convex.dev"
echo ""
echo "🎉 Your Digital Twin Counter is ready for production!"
