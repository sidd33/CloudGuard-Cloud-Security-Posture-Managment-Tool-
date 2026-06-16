@echo off
echo Starting CloudGuard Services...

echo Loading environment variables from .env...
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" set %%a=%%b
)

echo 1. Starting Backend (Spring Boot)...
start cmd /k "cd backend && mvnw.cmd spring-boot:run"

echo 2. Starting Frontend (Next.js)...
start cmd /k "cd frontend && npm run dev"

echo Both services are starting up in separate terminal windows!
echo - Frontend will be available at: http://localhost:3000
echo - Backend API will be available at: http://localhost:8080
