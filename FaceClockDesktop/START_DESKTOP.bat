@echo off
echo Starting FaceClock Desktop Application...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the desktop app
echo Starting Electron Desktop App...
echo.
npm run dev

pause

