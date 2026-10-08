@echo off
echo ========================================================
echo          Starting Synthora.AI (Frontend + Backend)
echo ========================================================

REM Refresh PATH in case Node.js was recently installed
set "PATH=%PATH%;C:\Program Files\nodejs"

echo Starting Backend Server on http://localhost:5000 ...
start "Synthora Backend" cmd /k "cd /d %~dp0backend && node src/server.js"

echo Starting Frontend Server on http://localhost:5173 ...
start "Synthora Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Both servers have been launched in separate terminal windows!
echo Backend:  http://localhost:5000 (API: http://localhost:5000/api/health)
echo Frontend: http://localhost:5173
echo ========================================================
pause
