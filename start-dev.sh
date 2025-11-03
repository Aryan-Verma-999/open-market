#!/bin/bash

# Equipment Marketplace Development Startup Script

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Equipment Marketplace Development Environment${NC}"
echo

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm run install:all

echo -e "${YELLOW}🐳 Starting Docker services...${NC}"
docker-compose up -d postgres redis

echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 10

echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..

echo -e "${YELLOW}🚀 Starting application services...${NC}"
docker-compose up -d

echo
echo -e "${GREEN}✅ Equipment Marketplace is starting up!${NC}"
echo
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend API:${NC} http://localhost:3002"
echo -e "${BLUE}💾 Database:${NC} postgresql://equipment_user:equipment_password@localhost:5432/equipment_marketplace"
echo -e "${BLUE}🗄️ Redis:${NC} redis://localhost:6379"
echo
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  Access database: docker-compose exec postgres psql -U equipment_user -d equipment_marketplace"
echo
echo -e "${GREEN}🎉 Happy coding!${NC}"