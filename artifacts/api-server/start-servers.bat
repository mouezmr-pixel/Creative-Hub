@echo off
set PORT=8080
set NODE_ENV=development
set SESSION_SECRET=test-secret-not-for-production
start "API Server" node --enable-source-maps "D:\Creative-Hub\artifacts\api-server\dist\index.mjs"

set PORT=3000
start "Vite Dev" cmd /c "cd /d D:\Creative-Hub\artifacts\studio-crm && pnpm run dev"
