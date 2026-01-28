# Force Start Expo Go Script
# This script forcefully starts Expo with the correct network settings

Write-Host "🚀 Force Starting Expo Go..." -ForegroundColor Green

# Kill any existing Expo processes
Write-Host "📋 Checking for existing Expo processes..." -ForegroundColor Yellow
$expoProcesses = Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.MainWindowTitle -like "*expo*"}
if ($expoProcesses) {
    Write-Host "⚠️  Found existing processes. Kill them first if needed." -ForegroundColor Yellow
}

# Detect the active IPv4 address (prefer interface with default gateway)
$localIp = $null
try {
    $defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" |
        Where-Object { $_.NextHop -ne "0.0.0.0" } |
        Sort-Object -Property RouteMetric, InterfaceMetric
    if ($defaultRoute) {
        $ifaceIndex = $defaultRoute[0].InterfaceIndex
        $addr = Get-NetIPAddress -InterfaceIndex $ifaceIndex -AddressFamily IPv4 |
            Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } |
            Select-Object -First 1
        if ($addr) {
            $localIp = $addr.IPAddress
        }
    }
} catch {
    $localIp = $null
}

if (-not $localIp) {
    $config = Get-NetIPConfiguration |
        Where-Object { $_.IPv4Address -and $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        Sort-Object -Property InterfaceMetric
    if ($config) {
        $wifi = $config | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless' }
        if ($wifi) {
            $localIp = $wifi[0].IPv4Address.IPAddress
        } else {
            $localIp = $config[0].IPv4Address.IPAddress
        }
    }
}

if (-not $localIp) {
    $addr = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } |
        Sort-Object -Property InterfaceMetric |
        Select-Object -First 1
    if ($addr) {
        $localIp = $addr.IPAddress
    }
}

if (-not $localIp) {
    Write-Host "Could not detect a local IPv4 address. Set EXPO_PUBLIC_BACKEND_IP manually." -ForegroundColor Red
    exit 1
}

# Set environment variables for Expo and the backend
$env:EXPO_PUBLIC_BACKEND_IP = $localIp
$env:EXPO_PUBLIC_API_URL = "http://$localIp:5000/api"
$env:EXPO_DEV_SERVER_HOST = $localIp
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $localIp

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

