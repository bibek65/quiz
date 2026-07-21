#!/bin/bash
set -e

# Azure VM setup script for Next.js Quiz App
# Run this as the quizapp user after the VM is provisioned.

APP_DIR=/opt/quizapp
REPO_URL=""

echo "=== Setting up quiz app on Azure VM ==="

# Update packages
sudo apt-get update
sudo apt-get install -y nginx git curl ca-certificates gnupg certbot python3-certbot-nginx

# Install Node.js 20 if not already installed
if ! command -v node &> /dev/null; then
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
  sudo apt-get update
  sudo apt-get install -y nodejs
fi

# Install PM2 globally
sudo npm install -g pm2

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown $(whoami):$(whoami) $APP_DIR

# Clone repository (if you want to do this automatically; otherwise use scp)
if [ -n "$REPO_URL" ]; then
  git clone "$REPO_URL" $APP_DIR
fi

cd $APP_DIR

# Install dependencies
npm install

# Build the app
npm run build

# Create .env file (edit this manually or set via Azure portal/cloud-init)
if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL="postgresql://quizuser:quizpass@localhost:5432/quizdb?schema=public"
SESSION_SECRET="$(openssl rand -base64 32)"
HOST_PASSWORD="admin123"
NEXT_PUBLIC_SOCKET_URL="http://YOUR_DOMAIN_OR_IP"
NEXT_PUBLIC_SOCKET_PATH="/api/socket"
SOCKET_EMIT_URL="http://localhost:3000/emit"
ALLOWED_ORIGIN=""
EOF
  echo "Created .env file. Please edit $APP_DIR/.env with your real database and domain."
fi

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/quizapp
sudo sed -i "s/YOUR_DOMAIN_OR_IP/$(hostname -I | awk '{print $1}')/g" /etc/nginx/sites-available/quizapp
sudo ln -sf /etc/nginx/sites-available/quizapp /etc/nginx/sites-enabled/quizapp
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Start app with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd --user $(whoami)

echo "=== Setup complete ==="
echo "App should be running at http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Next steps:"
echo "1. Edit $APP_DIR/.env with production values"
echo "2. Set up the database: npx prisma db push"
echo "3. Restart the app: pm2 restart quiz-app"
echo "4. If using a domain, run: sudo certbot --nginx -d your-domain.com"
echo ""
echo "Optional: add swap memory for B1s VM:"
echo "  ./scripts/setup-swap.sh"
echo ""
echo "To update the app after code changes:"
echo "  ./scripts/update-app.sh"
