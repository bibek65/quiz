#!/bin/bash
set -e

# Update the app on the Azure VM after code changes

APP_DIR=/opt/quizapp

echo "=== Updating quiz app ==="
cd "$APP_DIR"

# Pull latest code
if [ -d .git ]; then
  git pull
fi

# Install dependencies
npm install

# Build
npm run build

# Push database schema if it changed
npx prisma db push

# Restart PM2 process
pm2 restart quiz-app

# Save PM2 config
pm2 save

echo "=== Update complete ==="
pm2 status
