# Quick Start - Local Testing

## 🚀 Fast Setup (5 minutes)

### Step 1: Backend Setup
```bash
cd FaceClockBackend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run download-models
npm run dev
```

### Step 2: Frontend Setup (New Terminal)
```bash
cd FaceClockApp
npm install
cp .env.example .env.local
# Edit .env.local with your API URL:
# - Android: EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
# - iOS: EXPO_PUBLIC_API_URL=http://localhost:5000/api
npm run start:android  # or start:ios
```

## ✅ Verify Setup

1. **Backend Running?** → Open `http://localhost:5000/api/health`
2. **Frontend Running?** → App should load in emulator
3. **Connected?** → Check console logs for API URL

## 🔄 Switching Modes

**Local Testing:**
```bash
npm run start:local
```

**Production:**
```bash
npm run start:production
# or just
npm start
```

## 📝 Notes

- Backend runs on port **5000**
- Frontend auto-detects local vs production
- Production setup is **unchanged** - still uses `https://clock-in.duckdns.org/api`

