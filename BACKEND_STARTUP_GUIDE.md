# Backend Server Startup Guide

## Network Error Fix

If you're seeing these errors:
```
ERROR  Error loading timesheet: [AxiosError: Network Error]
ERROR  Error loading staff: [AxiosError: Network Error]
```

**The backend server is not running!**

## Quick Start - Backend Server

### Step 1: Open Terminal/Command Prompt in FaceClockBackend folder

```bash
cd C:\Users\ACER\Desktop\Clock-in-Clock-out-clean\FaceClockBackend
```

### Step 2: Start the Backend Server

```bash
npm start
```

Or if that doesn't work:

```bash
node server.js
```

### Step 3: Check if Server is Running

You should see something like:
```
✓ Server is running on port 5000
✓ MongoDB connected
✓ Ready to accept API requests
```

### Step 4: Verify Backend Connection

1. Open browser and visit: **http://localhost:5000/api** or **http://192.168.88.41:5000/api**
2. You should see a response from the server
3. No response = server not running or wrong IP address

---

## Network Configuration

### Current Setup:
- **Backend IP**: `192.168.88.41`
- **Backend Port**: `5000`
- **API Base URL**: `http://192.168.88.41:5000/api`

### If Connection Still Fails:

1. **Find Your Computer's Actual IP Address:**
   - Windows: Open Command Prompt and type `ipconfig`
   - Look for "IPv4 Address" under your network adapter
   - It should look like `192.168.x.x` or `10.0.x.x`

2. **Update the Backend IP in Mobile App:**
   - Edit: `FaceClockApp/config/api.js`
   - Find the line: `const backendIp = process.env.EXPO_PUBLIC_BACKEND_IP || '192.168.88.41';`
   - Replace `192.168.88.41` with your actual IP address

3. **Restart the Mobile App** (Reload Expo Go or restart the app)

---

## Troubleshooting

### Issue: "Cannot GET /api"
- Server is running but routes not loaded
- Solution: Check `FaceClockBackend/server.js` for route imports

### Issue: "Connection refused"
- Backend not running or wrong port
- Solution: Make sure you ran `npm start` in the backend folder

### Issue: "Network Error" but Backend is Running
- Firewall blocking connection
- IP address mismatch
- Solution: 
  - Check Windows Firewall settings
  - Verify your actual IP address matches in `config/api.js`

### Issue: "MongoDB connection error"
- Database connection issue
- Solution: Check MongoDB Atlas connection string in `.env` file

---

## Background Server (Keep Running)

To keep the backend running in the background while developing:

### Option 1: VS Code Terminal
- Open VS Code in the FaceClockBackend folder
- Open Terminal (Ctrl + `)
- Run `npm start`
- Leave it running

### Option 2: Separate Terminal Window
- Open separate Command Prompt
- Navigate to FaceClockBackend
- Run `npm start`
- Keep window open

### Option 3: PM2 (Recommended for Production)
```bash
npm install -g pm2
pm2 start server.js --name "Clock-In-Backend"
pm2 logs
```

---

## Summary

✅ **To fix network errors:**
1. Open FaceClockBackend folder
2. Run `npm start`
3. Wait for "Server is running on port 5000" message
4. Reload the mobile app

✅ **If still not working:**
1. Check your actual IP: `ipconfig`
2. Update `FaceClockApp/config/api.js` with your IP
3. Restart mobile app
4. Check Windows Firewall

❌ **If backend won't start:**
1. Check MongoDB connection in `.env`
2. Ensure Node.js is installed: `node --version`
3. Install dependencies: `npm install`
4. Try `node server.js` directly
