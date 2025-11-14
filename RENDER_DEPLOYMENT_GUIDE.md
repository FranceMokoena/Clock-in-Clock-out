# Render Deployment Guide - Step by Step

## 🎯 Configuration for Render Web Service

Follow these exact settings to deploy your backend:

### Basic Settings

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `faceclock-backend` | (or any name you prefer) |
| **Language** | `Node` | ✅ Already selected |
| **Branch** | `main` | ✅ Already selected |
| **Region** | `Oregon (US West)` or closest to you | Your choice |
| **Root Directory** | `FaceClockBackend` | ⚠️ **CRITICAL - Set this!** |
| **Build Command** | `npm install` | Change from `yarn` |
| **Start Command** | `npm start` | Change from `yarn start` |
| **Instance Type** | `Free` | ✅ Selected (can upgrade later) |

## 📝 Step-by-Step Instructions

### 1. Basic Configuration

1. **Name**: Change to `faceclock-backend` (or keep `Clock-in-Clock-out`)
2. **Language**: Already set to `Node` ✅
3. **Branch**: Already set to `main` ✅
4. **Region**: Choose closest to you (Oregon is fine)

### 2. ⚠️ IMPORTANT: Root Directory

**You MUST set this:**
- **Root Directory**: `FaceClockBackend`

This tells Render to look in the `FaceClockBackend` folder (since your repo has both frontend and backend).

### 3. Build & Start Commands

Change these:

- **Build Command**: Delete `yarn` and enter:
  ```
  npm install
  ```

- **Start Command**: Delete `yarn start` and enter:
  ```
  npm start
  ```

### 4. Instance Type

- Keep **Free** for now (you can upgrade later if needed)
- Note: Free instances sleep after 15 min of inactivity

### 5. 🔐 Environment Variables

Click **"Add Environment Variable"** and add these one by one:

#### Variable 1: MONGO_URI
```
NAME: MONGO_URI
VALUE: mongodb+srv://alphadev28_db_user:2CNEy6v686tVOxzH@my1st-cluster.y7nyqx5.mongodb.net/faceclock?retryWrites=true&w=majority
```
⚠️ **Copy from your `.env` file**

#### Variable 2: PORT
```
NAME: PORT
VALUE: 10000
```
⚠️ **Render sets this automatically, but set as fallback**

#### Variable 3: ENCRYPTION_KEY
```
NAME: ENCRYPTION_KEY
VALUE: ac1fd3f1bb4b6f68d14234a9a146859c8e6ac489fae0f2c56b832b405cd899d6
```
⚠️ **Copy from your `.env` file**

#### Variable 4: NODE_ENV
```
NAME: NODE_ENV
VALUE: production
```

### 6. Deploy!

Click **"Deploy web service"** button at the bottom.

## ⏱️ What Happens Next

1. **First Deploy**: Takes 5-10 minutes
2. **Build**: Render installs dependencies (`npm install`)
3. **Start**: Render starts your server (`npm start`)
4. **URL**: Render gives you a URL like:
   ```
   https://faceclock-backend-xxxx.onrender.com
   ```

## 🔍 After Deployment

### Test Your Backend

1. Visit your health check endpoint:
   ```
   https://your-service-name.onrender.com/api/health
   ```
   
   Should return:
   ```json
   {
     "status": "OK",
     "message": "Face Clock API is running"
   }
   ```

### Update Frontend

1. Open `FaceClockApp/config/api.js`
2. Update the production URL:
   ```javascript
   const API_BASE_URL = __DEV__
     ? 'http://localhost:5000/api'
     : 'https://your-service-name.onrender.com/api'; // ← Update this!
   ```

## 🐛 Troubleshooting

### Build Fails

**Check logs in Render dashboard:**
- Make sure `Root Directory` is set to `FaceClockBackend`
- Verify `package.json` exists in `FaceClockBackend/`
- Check build command is `npm install`

### Server Won't Start

**Check logs:**
- Verify all environment variables are set
- Check MongoDB connection string is correct
- Verify `npm start` command works locally

### MongoDB Connection Error

**Solutions:**
1. Check MongoDB Atlas Network Access:
   - Go to MongoDB Atlas dashboard
   - Click "Network Access"
   - Add IP: `0.0.0.0/0` (allows all IPs)
   
2. Verify connection string:
   - Check username and password are correct
   - Ensure database name is `faceclock`

### Service Sleeps (Free Tier)

- First request after sleep takes 30-60 seconds
- This is normal for free tier
- Upgrade to paid plan to prevent sleeping

## 📋 Quick Reference

### Render Settings Summary

```
Name: faceclock-backend
Language: Node
Branch: main
Root Directory: FaceClockBackend ⚠️
Build Command: npm install
Start Command: npm start
Instance: Free
```

### Environment Variables Checklist

- [ ] MONGO_URI (your MongoDB connection string)
- [ ] PORT (10000)
- [ ] ENCRYPTION_KEY (your 64-char hex key)
- [ ] NODE_ENV (production)

## 🚀 Next Steps After Deployment

1. ✅ Wait for deployment to complete (green status)
2. ✅ Test health endpoint
3. ✅ Update frontend `config/api.js` with Render URL
4. ✅ Test full registration flow
5. ✅ Test clock-in/out flow

## 💡 Pro Tips

1. **Monitor Logs**: Check Render logs tab for real-time status
2. **Environment Variables**: Keep them in Render dashboard, never in code
3. **Database**: Ensure MongoDB Atlas allows connections from Render
4. **Testing**: Test locally first before deploying
5. **Backup**: Keep a backup of your `.env` values locally (not in git!)

---

**Need help?** Check the logs in Render dashboard - they show detailed error messages!

