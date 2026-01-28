# Expo Go Testing Guide - Network Connection Troubleshooting

## Your Network Details:
- **Computer IP**: 192.168.0.135
- **Network**: Wi-Fi (192.168.0.0/24)
- **Backend Port**: 5000
- **API URL**: http://192.168.0.135:5000/api

---

## Step-by-Step Setup

### Step 1: Verify Backend is Running
```bash
# Terminal 1: Start the Node.js backend server
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockBackend
npm start
```
✅ **Success Indicators:**
- You should see: `Server running on port 5000`
- Backend logs should appear in the terminal

### Step 2: Start Expo Bundler
```bash
# Terminal 2: Start the Expo bundler
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockApp
npm start
```

✅ **Success Indicators:**
- You should see a QR code in the terminal
- Metro bundler should show: `Metro waiting on exp://192.168.0.135:8081`
- You should see an option for "w - open web" and "a - open Android"

### Step 3: Configure Expo to Use Your IP Address

When Expo starts, it will automatically try to detect your IP. If it doesn't show 192.168.0.135, you can force it:

```bash
# Kill the current Expo server (Ctrl+C)
# Then start with explicit IP binding:
npx expo start --tunnel
```

OR configure it with the IP explicitly:

```powershell
# For Windows PowerShell:
$env:EXPO_PUBLIC_API_URL = "http://192.168.88.29:5000/api"
npm start
```

### Step 4: Connect Phone/Device

1. **Install Expo Go App** on your Android/iOS device
2. **Make sure device is on SAME Wi-Fi network** (192.168.0.x)
3. **Scan the QR code** shown in your terminal
4. **App should load** in 10-30 seconds

---

## Common Issues & Solutions

### Issue 1: "Cannot connect to development server"
**Cause:** Backend or Expo server not running

**Fix:**
```bash
# Check if port 5000 is in use:
netstat -ano | findstr :5000

# If something is using it, kill it:
taskkill /PID <PID> /F

# Restart both servers
```

### Issue 2: "Network request failed"
**Cause:** Windows firewall blocking port 5000/8081

**Fix:**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Click "Change settings" (might need admin)
4. Click "Allow another app"
5. Add `node.exe` and allow it on **Private Networks**

**OR use PowerShell (as Admin):**
```powershell
New-NetFirewallRule -DisplayName "Allow Node Port 5000" `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5000
```

### Issue 3: Phone can't reach 192.168.0.135:5000
**Cause:** Not on same network, or network is blocking

**Test connectivity:**
```bash
# From your computer:
ping 192.168.0.135

# From your phone, open a browser and try:
http://192.168.0.135:5000/api
# Should NOT show a blank page, might show error about missing endpoint
```

### Issue 4: QR Code shows wrong IP (not 192.168.0.135)
**Force the correct IP:**

```bash
# Kill Expo (Ctrl+C)
# Edit your metro.config.js to:
```

### Issue 5: "Metro has encountered an error: Cannot find module"
**Fix:**
```bash
# Clear cache and reinstall
cd FaceClockApp
rm -r node_modules package-lock.json
npm install
npm start
```

---

## Complete Working Setup (Step-by-Step)

### Terminal 1: Backend Server
```bash
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockBackend
npm start
# Expected: "Server running on port 5000"
```

### Terminal 2: Expo Bundler
```bash
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockApp
npm start
```

### Terminal Output Should Show:
```
✔ Expo go (Android)
exp://192.168.0.135:8081

✔ Expo go (iOS)
exp://192.168.0.135:8081

Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### On Your Phone:
1. Open **Expo Go** app
2. **Tap "Scan QR Code"**
3. **Point at the QR code** in your terminal
4. **Wait 10-30 seconds** for app to load
5. **Check for API errors** in the app console

---

## Debugging Tips

### Check Network Connectivity:
```powershell
# From PowerShell on your computer:
Test-NetConnection -ComputerName 192.168.0.135 -Port 5000
Test-NetConnection -ComputerName 192.168.0.135 -Port 8081

# Should show: TcpTestSucceeded: True
```

### View Expo Logs:
```bash
# In the terminal running Expo, press:
# 'j' for Android/iOS toggle
# 'r' to reload
# 's' to see logs
```

### View Backend Logs:
The backend terminal should show all API requests in real-time:
```
GET /api/dashboard/stats
POST /api/auth/login
GET /api/staff/admin/staff
```

---

## Network Diagram

```
┌─────────────────────────────────────┐
│  Your Computer (192.168.0.135)     │
│  ┌──────────────────────────────┐  │
│  │ Node.js Backend              │  │
│  │ Port 5000                    │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Expo Bundler (Metro)         │  │
│  │ Port 8081                    │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │ Wi-Fi 192.168.0.0/24
              │
┌─────────────────────────────────────┐
│  Your Mobile Device                 │
│  (Same Wi-Fi Network)               │
│  ┌──────────────────────────────┐  │
│  │ Expo Go App                  │  │
│  │ Connected via exp://192.0... │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Quick Checklist

- [ ] Backend running on port 5000 (`npm start` in FaceClockBackend)
- [ ] Expo running on port 8081 (`npm start` in FaceClockApp)
- [ ] Phone on SAME Wi-Fi network (192.168.0.x)
- [ ] Expo Go app installed on phone
- [ ] Windows firewall allows Node.js on private networks
- [ ] QR code shows exp://192.168.0.135:8081
- [ ] API URL in config is http://192.168.0.135:5000/api

---

## Still Having Issues?

1. **Paste the full error message** from Expo or your phone
2. **Check the backend logs** - are API requests reaching the server?
3. **Check the phone logs** - open Chrome and navigate to `chrome://inspect` to debug
4. **Try USB connection** - connect phone with USB cable instead of Wi-Fi

---

## Environment Variables Summary

For your setup, these should work:

```bash
# Windows Command Prompt:
set EXPO_PUBLIC_API_URL=http://192.168.0.135:5000/api
npm start

# OR Windows PowerShell:
$env:EXPO_PUBLIC_API_URL = "http://192.168.0.135:5000/api"
npm start
```

The API configuration file already has your IP (192.168.0.135) hardcoded, so it should work automatically!
