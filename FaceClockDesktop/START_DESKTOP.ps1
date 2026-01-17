Write-Host "Starting FaceClock Desktop Application..." -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start the desktop app
Write-Host "Starting Electron Desktop App..." -ForegroundColor Green
Write-Host ""
npm run dev

