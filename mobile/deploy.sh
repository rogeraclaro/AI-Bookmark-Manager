#!/bin/bash
# Deploy mobile PWA to VPS
# Usage: ./deploy.sh user@your-vps-ip

set -e

VPS_USER_HOST="${1:-root@ailinksdb.masellas.info}"
VPS_PATH="/home/masellas-ailinksdb/htdocs/ailinksdb.masellas.info/mobile"

echo "Building..."
npm run build

echo "Deploying to $VPS_USER_HOST:$VPS_PATH ..."
rsync -av --delete dist/ "$VPS_USER_HOST:$VPS_PATH/"

echo "Done. Visit https://ailinksdb.masellas.info/mobile/"
