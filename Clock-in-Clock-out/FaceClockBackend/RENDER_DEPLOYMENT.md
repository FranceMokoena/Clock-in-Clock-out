# Render Deployment Guide

## 🚀 Deploy Backend to Render

Current production backend: `http://100.31.103.225:5000/api`

### Step 1: Prepare Backend for Render

1. **Ensure all dependencies are in package.json**
   ```bash
   cd FaceClockBackend
   npm install
   ```

2. **Create/Update render.yaml** (optional, for easier setup)
   - See `render.yaml` example below

3. **Set Environment Variables on Render**
   - `MONGO_URI` - Your MongoDB connection string
   - `PORT` - Port number (Render sets this automatically, but you can override)
   - `GOOGLE_VISION_API_KEY` - If using Google Vision API
   - `ENCRYPTION_KEY` - For data encryption (if used)

### Step 2: Deploy to Render

#### Option A: Using Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (or deploy manually)
4. Configure:
   - **Name**: `clock-in-clock-out-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` or `node server.js`
   - **Plan**: Free tier is fine for testing

5. **Set Environment Variables**:
   - Click on your service → **Environment**
   - Add all required environment variables

6. **Deploy**
   - Render will automatically deploy
   - Wait for deployment to complete (~5-10 minutes)
   - Your backend URL will be: `http://100.31.103.225:5000/api`

#### Option B: Using render.yaml (Recommended)

1. Create `render.yaml` in `FaceClockBackend/` directory
2. Push to GitHub
3. Render will auto-detect and deploy

### Step 3: Update App Configuration

After deployment, verify the URL in `FaceClockApp/config/api.js`:

```javascript
const DEFAULT_PRODUCTION_URL = 'http://100.31.103.225:5000/api';
```

### Step 4: Test Backend

```bash
# Test the deployed backend
curl http://100.31.103.225:5000/api/staff/health

# Or visit in browser
http://100.31.103.225:5000/api/staff/health
```

### Step 5: Build Production APK

Once backend is deployed and tested:

```bash
cd FaceClockApp
eas build --profile production --platform android
```

The production build will automatically use the Render URL!

## 🔧 Render Configuration

### render.yaml Example

```yaml
services:
  - type: web
    name: clock-in-clock-out-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: MONGO_URI
        sync: false  # Set manually in Render dashboard
      - key: PORT
        value: 10000
      - key: NODE_ENV
        value: production
```

### Important Notes

1. **Free Tier Limitations**:
   - Service spins down after 15 minutes of inactivity
   - First request after spin-down takes ~30 seconds
   - Consider upgrading for production use

2. **MongoDB Atlas**:
   - Make sure MongoDB Atlas allows connections from Render's IPs
   - Add `0.0.0.0/0` to IP whitelist (or Render's specific IPs)

3. **Face Recognition Models**:
   - Models need to be downloaded on first startup
   - This may take a few minutes on first deploy
   - Consider pre-downloading models in build step

4. **CORS**:
   - Your backend already has CORS configured for all origins
   - For production, consider restricting to your app's domain

## 🧪 Testing Deployment

### Test Locally with Production URL

```bash
# In FaceClockApp, set environment variable
export EXPO_PUBLIC_API_ENV=production
npx expo start
```

This will use the Render URL even in development mode.

### Test Production Build

1. Build preview APK:
   ```bash
   eas build --profile preview --platform android
   ```

2. Install on device

3. Test all features:
   - Staff registration
   - Clock in/out
   - Face recognition
   - Location validation

## 📝 Checklist Before Building APK

- [ ] Backend deployed to Render
- [ ] Backend URL tested and working
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Environment variables set on Render
- [ ] API URL updated in `FaceClockApp/config/api.js`
- [ ] Tested backend endpoints
- [ ] CORS configured correctly
- [ ] Ready to build production APK

## 🆘 Troubleshooting

### Backend not responding
- Check Render logs: Dashboard → Your Service → Logs
- Verify environment variables are set
- Check MongoDB connection

### CORS errors
- Verify CORS is enabled in `server.js`
- Check allowed origins

### Models not loading
- Check Render logs for download errors
- Verify network access for model downloads
- Consider pre-downloading models

### Slow first request
- Normal on free tier (cold start)
- Consider upgrading to paid plan

## 🔗 Useful Links

- [Render Dashboard](https://dashboard.render.com/)
- [Render Docs](https://render.com/docs)
- [MongoDB Atlas](https://cloud.mongodb.com/)

