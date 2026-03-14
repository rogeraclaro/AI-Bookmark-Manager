#!/bin/bash
# Deploy mobile PWA to VPS
# Usage: ./deploy.sh user@your-vps-ip

set -e

VPS_USER_HOST="${1:-user@ailinksdb.masellas.info}"
VPS_PATH="/var/www/ailinksdb.masellas.info/mobile"

echo "Building..."
npm run build

echo "Deploying to $VPS_USER_HOST:$VPS_PATH ..."
rsync -av --delete dist/ "$VPS_USER_HOST:$VPS_PATH/"

echo "Done. Visit https://ailinksdb.masellas.info/mobile/"
