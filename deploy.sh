#!/bin/bash
# CourtFlow VPS Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on any error

echo "🚀 Starting CourtFlow deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/courtflow"
PM2_APP_NAME="courtflow"
DB_USER="courtflow"
DB_NAME="courtflow"

echo -e "${YELLOW}📂 Navigating to project directory...${NC}"
cd "$PROJECT_DIR"

echo -e "${YELLOW}🔄 Pulling latest changes from git...${NC}"
git pull origin main

echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
npm install --production=false

echo -e "${YELLOW}🔨 Building project...${NC}"
npm run build

echo -e "${YELLOW}🔄 Restarting PM2 process...${NC}"
pm2 restart "$PM2_APP_NAME"

echo -e "${YELLOW}💾 Saving PM2 configuration...${NC}"
pm2 save

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Application status:"
pm2 status "$PM2_APP_NAME"
echo ""
echo "📝 Recent logs (last 20 lines):"
pm2 logs "$PM2_APP_NAME" --lines 20 --nostream
echo ""
echo -e "${GREEN}🎉 CourtFlow is now running with the latest changes!${NC}"
