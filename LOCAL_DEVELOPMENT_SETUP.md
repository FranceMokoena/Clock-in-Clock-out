# Local Development Setup Guide

This guide will help you set up local testing environment for the Clock-in/Clock-out system.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (local installation or MongoDB Atlas)
3. **Expo CLI** (installed globally: `npm install -g expo-cli`)
4. **Android Studio** (for Android emulator) or **Xcode** (for iOS simulator)

## Backend Setup

### 1. Install Backend Dependencies

```bash
cd FaceClockBackend
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your MongoDB connection string
# For local MongoDB:
MONGO_URI=mongodb://localhost:27017/faceclock

# For MongoDB Atlas:
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/faceclock
```

### 3. Download ONNX Models (Required for Face Recognition)

```bash
npm run download-models
```

### 4. Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

The backend will run on `http://localhost:5000`

**Verify it's working:**
- Open browser: `http://localhost:5000/api/health`
- Should see: `{"status":"OK","message":"Face Clock API is running"}`

## Frontend Setup

### 1. Install Frontend Dependencies

```bash
cd FaceClockApp
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your local API URL
# For Android Emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api

# For iOS Simulator:
EXPO_PUBLIC_API_URL=http://localhost:5000/api

# For Physical Device (replace with your computer's IP):
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
```

### 3. Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

**Mac/Linux:**
```bash
ifconfig
# Look for inet address (e.g., 192.168.1.100)
```

### 4. Start Expo Development Server

**For Android Emulator:**
```bash
npm run start:android
```

**For iOS Simulator:**
```bash
npm run start:ios
```

**For Web Browser:**
```bash
npm run start:web
```

**For Physical Device:**
1. Update `.env.local` with your computer's IP address
2. Run: `npm run start:local`
3. Scan QR code with Expo Go app

## Testing Checklist

### Backend Tests
- [ ] Backend server starts without errors
- [ ] MongoDB connection successful
- [ ] Health endpoint responds: `http://localhost:5000/api/health`
- [ ] API root endpoint works: `http://localhost:5000/api`

### Frontend Tests
- [ ] Expo server starts successfully
- [ ] App loads on emulator/simulator/device
- [ ] Can navigate to MainMenu
- [ ] API calls connect to local backend (check console logs)
- [ ] Face recognition works (if models downloaded)

## Common Issues & Solutions

### Issue: "Cannot connect to backend"
**Solution:**
- Verify backend is running on port 5000
- Check firewall settings
- For physical device: Ensure phone and computer are on same WiFi network
- For Android emulator: Use `10.0.2.2` instead of `localhost`

### Issue: "MongoDB connection failed"
**Solution:**
- Ensure MongoDB is running: `mongod` (or check MongoDB service)
- Verify MONGO_URI in `.env` is correct
- Check MongoDB logs for errors

### Issue: "Face recognition not working"
**Solution:**
- Run `npm run download-models` in backend directory
- Check that `models/onnx/` directory contains model files
- Verify ONNX models are downloaded correctly

### Issue: "Expo server won't start"
**Solution:**
- Clear cache: `npm run clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be v18+)

## Switching Between Local and Production

### Use Local Backend
```bash
# Set environment variable
export EXPO_PUBLIC_API_URL=http://localhost:5000/api
npm start
```

### Use Production Backend
```bash
# Remove environment variable or use production script
npm run start:production
```

Or simply use the default `npm start` which will use production if no `.env.local` file exists.

## Development Workflow

1. **Start Backend:**
   ```bash
   cd FaceClockBackend
   npm run dev
   ```

2. **Start Frontend (in new terminal):**
   ```bash
   cd FaceClockApp
   npm run start:android  # or start:ios, start:web
   ```

3. **Make Changes:**
   - Backend: Changes auto-reload with nodemon
   - Frontend: Changes hot-reload in Expo

4. **Test Features:**
   - Register new staff
   - Clock in/out
   - View admin dashboard
   - Test all functionality

## Production Deployment

When ready to deploy:
1. Remove `.env.local` file
2. Use `npm run start:production` or default `npm start`
3. App will automatically use production API: `https://clock-in.duckdns.org/api`

## Notes

- **Never commit `.env` or `.env.local` files** - they're in `.gitignore`
- **Local setup is for testing only** - production uses the deployed backend
- **Physical device testing** requires both devices on the same network
- **Android emulator** uses `10.0.2.2` to access host machine's localhost

