#!/bin/bash
# Quick deployment script for Bike Manager PWA
# Copy and paste these commands (customize USERNAME)

echo "🚀 Deploying Bike Manager PWA to GitHub Pages"
echo ""

# Step 1: Initialize Git
echo "📦 Step 1: Initializing Git repository..."
git init
git add .
git commit -F COMMIT_MESSAGE.txt

# Step 2: Set remote (CUSTOMIZE THIS!)
echo ""
echo "🔗 Step 2: Setting remote repository..."
echo "⚠️  IMPORTANT: Replace USERNAME with your GitHub username!"
read -p "Enter your GitHub username: " USERNAME
git remote add origin "https://github.com/$USERNAME/bike-manager.git"
git branch -M main

# Step 3: Push to GitHub
echo ""
echo "⬆️  Step 3: Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Now enable GitHub Pages:"
echo "   1. Go to https://github.com/$USERNAME/bike-manager/settings/pages"
echo "   2. Source: Deploy from branch"
echo "   3. Branch: main / (root)"
echo "   4. Save"
echo ""
echo "🌐 Your app will be available at:"
echo "   https://$USERNAME.github.io/bike-manager/"
echo ""
echo "🎉 Installation complete!"
