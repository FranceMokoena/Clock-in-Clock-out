# Deployment Guide for Render

This guide will help you deploy the Face Clock backend to Render.

## Prerequisites

- MongoDB Atlas account (or your MongoDB connection string)
- Render account (sign up at https://render.com)

## Step 1: Prepare MongoDB

1. Go to MongoDB Atlas (https://cloud.mongodb.com)
2. Create a cluster (free tier is fine)
3. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Add database name: `/faceclock?retryWrites=true&w=majority`

## Step 2: Deploy to Render

### Option A: Using Render Dashboard

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (or deploy from public git)
4. Configure:
   - **Name**: `faceclock-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid if needed)

5. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `PORT`: `10000` (Render sets this automatically, but set as fallback)
   - `ENCRYPTION_KEY`: Generate one using:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `NODE_ENV`: `production`

6. Click "Create Web Service"

### Option B: Using render.yaml (Recommended)

1. Make sure `render.yaml` is in your repository root
2. In Render Dashboard:
   - Go to "New +" → "Blueprint"
   - Connect your repository
   - Render will automatically detect and use `render.yaml`

## Step 3: Get Your Backend URL

After deployment:
1. Your service will have a URL like: `https://faceclock-backend-xxxx.onrender.com`
2. Wait for the first deployment to complete (can take 5-10 minutes)

## Step 4: Update Frontend API Configuration

1. Update `FaceClockApp/config/api.js`:
   ```javascript
   const API_BASE_URL = __DEV__
     ? 'http://localhost:5000/api' // Development
     : 'https://your-render-url.onrender.com/api'; // Production - Update this!
   ```

2. For testing on physical devices during development:
   - Find your computer's local IP (e.g., `192.168.1.100`)
   - Update to: `http://192.168.1.100:5000/api`

## Step 5: Test Your Deployment

1. Visit: `https://your-render-url.onrender.com/api/health`
2. Should return: `{"status":"OK","message":"Face Clock API is running"}`

## Important Notes

- **Free Tier Limitations**: 
  - Services sleep after 15 minutes of inactivity
  - First request after sleep may take 30-60 seconds
  - Upgrade to paid plan for always-on services

- **Environment Variables**:
  - Never commit `.env` file to git
  - Always set environment variables in Render dashboard
  - Encryption key must be the same for all deployments

- **MongoDB Atlas**:
  - Make sure your IP is whitelisted (or use 0.0.0.0/0 for development)
  - Network access must allow connections from Render

## Troubleshooting

### Service won't start:
- Check logs in Render dashboard
- Verify all environment variables are set
- Check MongoDB connection string is correct

### Connection timeout:
- Verify MongoDB Atlas network access settings
- Check firewall rules
- Ensure MongoDB user has correct permissions

### CORS errors:
- Backend has CORS enabled for all origins
- If issues persist, check CORS configuration in `server.js`

