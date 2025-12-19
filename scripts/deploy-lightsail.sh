#!/bin/bash
# ============================================
# 🚀 Bank Basha - Lightsail Deployment Script
# ============================================
# Run this on your Lightsail instance

set -e

echo "🔧 Installing dependencies..."
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git

echo "📦 Installing PM2..."
sudo npm install -g pm2

echo "📂 Setting up application..."
cd /home/ubuntu
if [ -d "app" ]; then
    cd app
    git pull
else
    git clone YOUR_REPO_URL app
    cd app
fi

echo "📦 Installing npm packages..."
npm ci --only=production

echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "🗄️ Running database migrations..."
npx prisma db push

echo "🏗️ Building application..."
npm run build

echo "🚀 Starting with PM2..."
pm2 delete bankbasha 2>/dev/null || true
pm2 start npm --name "bankbasha" -- start
pm2 save
pm2 startup

echo "✅ Deployment complete!"
echo "📝 Don't forget to:"
echo "   1. Configure Nginx"
echo "   2. Setup SSL with Certbot"
echo "   3. Update .env file"
