# Local Development Setup

## Starting the Backend Server

1. **Install dependencies** (if not already done):
   ```bash
   cd FaceClockBackend
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in `FaceClockBackend/` with:
   ```
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   ```

3. **Start the server**:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

4. **Verify it's running**:
   - You should see: `🚀 Server running on port 5000`
   - Test: Open http://localhost:5000/api/health in your browser

## Connecting from Mobile App

### Android Emulator
The Android emulator uses `10.0.2.2` to access `localhost` on your machine.
- Backend URL: `http://10.0.2.2:5000/api`
- This is automatically configured in `FaceClockApp/config/api.js`

### Physical Device (Android/iOS)
Physical devices need your computer's **actual IP address** on your local network.

**Step 1: Find your computer's IP address**
```bash
# Windows
ipconfig
# Look for "IPv4 Address" under "Wireless LAN adapter Wi-Fi" or "Ethernet adapter"
# Example: 192.168.1.104

# Mac/Linux
ifconfig
# Look for inet address under en0 or eth0
```

**Step 2: Create `.env` file in `FaceClockApp/` directory:**
```bash
cd FaceClockApp
# Create .env file with:
EXPO_PUBLIC_API_URL=http://192.168.1.104:5000/api
```
Replace `192.168.1.104` with your actual IP address!

**Step 3: Restart Expo**
```bash
# Stop Expo (Ctrl+C) and restart
npm start
```

**Step 4: Allow Windows Firewall**
- Windows may block incoming connections
- When you start the backend, Windows will ask to allow Node.js through firewall
- Click "Allow access" or manually add port 5000 to firewall rules

**Step 5: Verify connection**
- Make sure your phone and computer are on the **same Wi-Fi network**
- Test in browser: `http://192.168.1.104:5000/api/health`
- Should return: `{"status":"OK","message":"Face Clock API is running"}`

## Troubleshooting

### "Network Error" in Android App

**Common causes and fixes:**

1. **Backend not running:**
   ```bash
   # Make sure you see: "🚀 Server running on port 5000"
   cd FaceClockBackend
   npm start
   ```

2. **Windows Firewall blocking port 5000:**
   - Open Windows Defender Firewall
   - Allow Node.js through firewall
   - Or temporarily disable firewall to test

3. **Android emulator network issue:**
   - Restart the Android emulator
   - Make sure you're using Android emulator (not physical device)
   - Physical devices need your computer's actual IP address, not `10.0.2.2`

4. **Test connectivity:**
   - Open browser on your computer: `http://localhost:5000/api/health`
   - Should return: `{"status":"OK","message":"Face Clock API is running"}`
   - If this works but Android doesn't, it's an emulator network issue

5. **Use production URL instead:**
   - In `FaceClockApp/config/api.js`, temporarily set `USE_PRODUCTION = true`
   - This will use Render backend instead of local

### Models Not Loading

- Models should download automatically on `npm install` (postinstall script)
- If not, run: `npm run download-models`
- Check that `FaceClockBackend/models/face-api/` contains the model files
- Models are now committed to git, so they'll be available on Render

### Performance Optimization

**Install TensorFlow.js Node backend for 10x faster processing:**
```bash
cd FaceClockBackend
npm install @tensorflow/tfjs-node
```

This uses native C++ bindings instead of pure JavaScript, making face recognition **10x faster**!

