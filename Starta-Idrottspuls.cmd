@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installera Node.js fran https://nodejs.org och forsok igen.
  pause
  exit /b 1
)
start "Idrottspuls" http://localhost:4173
node preview.mjs
pause
