# Force Start Expo Go Script
# This script forcefully starts Expo with the correct network settings

Write-Host "🚀 Force Starting Expo Go..." -ForegroundColor Green

# Kill any existing Expo processes
Write-Host "📋 Checking for existing Expo processes..." -ForegroundColor Yellow
$expoProcesses = Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.MainWindowTitle -like "*expo*"}
if ($expoProcesses) {
    Write-Host "⚠️  Found existing processes. Kill them first if needed." -ForegroundColor Yellow
}

# Set the backend IP environment variable
$env:EXPO_PUBLIC_BACKEND_IP = "192.168.0.113"
$env:EXPO_PUBLIC_API_URL = "http://192.168.0.113:5000/api"

Write-Host ""
Write-Host "📌 Backend IP: $env:EXPO_PUBLIC_BACKEND_IP" -ForegroundColor Cyan
Write-Host "📌 API URL: $env:EXPO_PUBLIC_API_URL" -ForegroundColor Cyan
Write-Host ""

# Start Expo with LAN mode and cleared cache
Write-Host "🎯 Starting Expo in LAN mode with cleared cache..." -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   1. Make sure your backend is running on port 5000" -ForegroundColor White
Write-Host "   2. Make sure your phone is on the SAME Wi-Fi network" -ForegroundColor White
Write-Host "   3. Scan the QR code with Expo Go app" -ForegroundColor White
Write-Host "   4. If LAN doesn't work, try: npm run start:tunnel" -ForegroundColor White
Write-Host ""

# Start Expo
npx expo start --lan --clear

