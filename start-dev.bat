@echo off
echo 🚀 Starting Equipment Marketplace Development Environment
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm run install:all

echo 🐳 Starting Docker services...
docker-compose up -d postgres redis

echo ⏳ Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo 🗄️ Running database migrations...
cd backend
call npx prisma migrate dev --name init
call npx prisma db seed
cd ..

echo 🚀 Starting application services...
docker-compose up -d

echo.
echo ✅ Equipment Marketplace is starting up!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:3002
echo 💾 Database: postgresql://equipment_user:equipment_password@localhost:5432/equipment_marketplace
echo 🗄️ Redis: redis://localhost:6379
echo.
echo 📋 Useful commands:
echo   View logs: docker-compose logs -f
echo   Stop services: docker-compose down
echo   Restart services: docker-compose restart
echo.
echo 🎉 Happy coding!
pause