# Quick Network Debugging Checklist

## Error You're Seeing:
```
ERROR  Error loading timesheet: [AxiosError: Network Error]
ERROR  Error loading staff: [AxiosError: Network Error]
```

## Fix in 2 Minutes:

### ✅ Step 1: Start Backend Server
```bash
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockBackend
npm start
```

**Wait for confirmation:**
```
✓ Server is running on port 5000
✓ Connected to MongoDB
✓ API ready at http://192.168.88.41:5000/api
```

### ✅ Step 2: Reload Mobile App
- Press `r` in Expo Go terminal to reload
- Or close and reopen the app

### ✅ Step 3: Test Connection
In browser, visit: **http://192.168.88.41:5000/api**
- Should see JSON response
- If nothing: Check Windows Firewall

---

## If That Doesn't Work:

### Find Your Real IP Address:
```bash
ipconfig
```
Look for: `IPv4 Address: 192.168.x.x` (NOT 192.168.88.41)

### Update Mobile App Config:
Edit `FaceClockApp/config/api.js`
```javascript
const backendIp = process.env.EXPO_PUBLIC_BACKEND_IP || 'YOUR_ACTUAL_IP_HERE';
```

### Common IPs:
- Home WiFi: Often `192.168.1.x` or `192.168.0.x`
- Work Network: Varies
- Find yours: `ipconfig` command

---

## Verification Checklist:

- [ ] Backend folder open in terminal
- [ ] `npm start` command executed
- [ ] "Server is running on port 5000" message appears
- [ ] Mobile app reloaded/restarted
- [ ] No firewall warnings blocked
- [ ] Computer IP matches config (if not 192.168.88.41)

---

## What Changed in Code:

✅ **Added timeouts** to prevent hanging
✅ **Better error messages** in console logs
✅ **Detailed logging** showing which API endpoint failed

The app will now tell you exactly what's wrong!

---

## Still Having Issues?

### Check Backend Logs for Real Error:
```bash
# Terminal where backend is running will show detailed errors
# Look for: "MongoDB", "Port", "Route", "Connection" errors
```

### Test Endpoint Directly:
```bash
curl http://192.168.88.41:5000/api/staff/admin/staff
# Should return JSON data, not "Cannot GET"
```

### Restart Everything:
1. Stop backend (Ctrl+C)
2. Stop mobile app 
3. `npm start` backend again
4. Reload mobile app

---

**Most Common Fix:** Backend wasn't running! 🎯
