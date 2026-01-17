# 🚀 FORCE EXPO GO TO LOAD YOUR APP

## Your Current Network Setup
- **Your Computer IP**: `192.168.0.113`
- **Backend Port**: `5000`
- **Expo Port**: `8081`

---

## ✅ STEP-BY-STEP FORCE LOAD PROCESS

### Step 1: Kill ALL Existing Processes
Open PowerShell and run:
```powershell
# Kill Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill processes on ports 8081 and 5000
netstat -ano | findstr :8081 | ForEach-Object { $_.Split()[4] } | ForEach-Object { taskkill /F /PID $_ }
netstat -ano | findstr :5000 | ForEach-Object { $_.Split()[4] } | ForEach-Object { taskkill /F /PID $_ }
```

### Step 2: Start Backend FIRST
```powershell
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockBackend
npm start
```
✅ **Wait until you see**: `Server running on port 5000`

### Step 3: Force Start Expo in LAN Mode
**Open a NEW PowerShell terminal** and run:
```powershell
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockApp

# Set environment variables
$env:EXPO_PUBLIC_BACKEND_IP = "192.168.0.113"
$env:EXPO_PUBLIC_API_URL = "http://192.168.0.113:5000/api"

# Force start with LAN mode
npx expo start --lan --clear
```

### Step 4: If LAN Mode Doesn't Work, Use TUNNEL Mode
```powershell
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockApp

# Set environment variables
$env:EXPO_PUBLIC_BACKEND_IP = "192.168.0.113"
$env:EXPO_PUBLIC_API_URL = "http://192.168.0.113:5000/api"

# Use tunnel mode (works across ANY network)
npx expo start --tunnel --clear
```

---

## 🔥 ALTERNATIVE: Use npm Scripts

### Option 1: LAN Mode
```powershell
cd FaceClockApp
npm run start:lan
```

### Option 2: Tunnel Mode (MOST RELIABLE)
```powershell
cd FaceClockApp
npm run start:tunnel
```

---

## 📱 ON YOUR PHONE

1. **Open Expo Go app**
2. **Tap "Scan QR Code"**
3. **Point at the QR code** in your terminal
4. **Wait 20-40 seconds** for the app to bundle and load
5. If it shows "Unable to connect", try:
   - Close Expo Go completely
   - Reopen Expo Go
   - Scan QR code again

---

## 🔍 VERIFY IT'S WORKING

### Check Backend is Running:
Open browser: `http://192.168.0.113:5000/api`
- Should NOT show "connection refused"
- May show JSON error (that's OK, backend is running)

### Check Expo is Running:
In terminal, you should see:
```
✔ Expo Go (Android)
exp://192.168.0.113:8081
```

---

## ⚠️ FIREWALL FIX (If Still Not Working)

Run PowerShell **AS ADMINISTRATOR**:
```powershell
# Allow Node.js through firewall
New-NetFirewallRule -DisplayName "Allow Node Port 5000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000 -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Allow Node Port 8081" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8081 -ErrorAction SilentlyContinue
```

---

## 🎯 TROUBLESHOOTING

### Problem: "Unable to connect to Metro"
**Solution**: 
- Make sure phone and computer are on SAME Wi-Fi
- Use `--tunnel` mode instead of `--lan`

### Problem: "Network request failed" in app
**Solution**:
- Backend not running - Start it first!
- Wrong IP - Check `config/api.js` has `192.168.0.113`

### Problem: QR code doesn't appear
**Solution**:
- Clear cache: `npx expo start --clear`
- Check for errors in terminal

### Problem: App loads but shows blank screen
**Solution**:
- Check terminal for JavaScript errors
- Make sure all dependencies installed: `npm install`

---

## ✅ QUICK CHECKLIST

- [ ] Backend running on port 5000
- [ ] Expo running on port 8081  
- [ ] Phone and computer on SAME Wi-Fi
- [ ] QR code shows `exp://192.168.0.113:8081` (or tunnel URL)
- [ ] Expo Go app installed on phone
- [ ] Scanned QR code with Expo Go
- [ ] Waited 30+ seconds for bundle

---

## 🚨 NUCLEAR OPTION (If Nothing Works)

1. **Uninstall Expo Go** from your phone
2. **Reinstall Expo Go** from App Store/Play Store
3. **Clear all Expo cache**:
   ```powershell
   cd FaceClockApp
   npx expo start --clear
   Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   ```
4. **Restart everything**:
   - Restart backend
   - Restart Expo with tunnel mode
   - Scan QR code again

---

## 📞 YOUR CURRENT CONFIGURATION

✅ **API Config**: `FaceClockApp/config/api.js` - Uses `192.168.0.113`  
✅ **Package Scripts**: Updated to use `192.168.0.113`  
✅ **App Entry**: `FaceClockApp/index.js` → `App.js`  

Everything is configured correctly! The issue is likely network connectivity or cache.

**TRY TUNNEL MODE FIRST** - It's the most reliable! 🎯

