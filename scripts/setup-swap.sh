#!/bin/bash
set -e

# Setup a 2GB swap file on low-RAM Azure B1s VMs

if [ -f /swapfile ]; then
  echo "Swap file already exists"
  swapon --show
  exit 0
fi

echo "Creating 2GB swap file..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent
if ! grep -q "^/swapfile" /etc/fstab; then
  echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab > /dev/null
fi

echo "Swap enabled:"
swapon --show
free -h
