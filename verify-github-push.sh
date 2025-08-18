#!/bin/bash

echo "🔍 RapidCare GitHub Push Verification"
echo "======================================"

# Check if remote is configured
echo "📡 Checking remote repository..."
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ Remote origin configured: $(git remote get-url origin)"
else
    echo "❌ No remote origin configured"
    echo "   Run: git remote add origin https://github.com/YOUR_USERNAME/rapidcare.git"
    exit 1
fi

# Check current branch
echo "🌿 Current branch: $(git branch --show-current)"

# Check if there are any uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  Uncommitted changes detected:"
    git status --short
    echo "   Commit changes before pushing"
else
    echo "✅ Working directory clean"
fi

# Check if we're ahead of remote
if git status | grep -q "ahead"; then
    echo "📤 Ready to push commits to GitHub"
elif git status | grep -q "up to date"; then
    echo "✅ Already up to date with remote"
else
    echo "📤 Ready for initial push to GitHub"
fi

echo ""
echo "🚀 To push to GitHub, run:"
echo "   git push -u origin main"
echo ""
echo "📋 After pushing, you can:"
echo "   1. Set up Vercel deployment (frontend)"
echo "   2. Set up Railway/Render deployment (backend)"
echo "   3. Configure environment variables"
echo "   4. Test the live application"