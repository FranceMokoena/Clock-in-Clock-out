# 🔧 EC2 Connection Issue - Step-by-Step Fix

## 🚨 Problem: APK Shows "Connection Issue Please Check Your Internet"

Your EC2 instance is running, but the app can't connect. Here's how to fix it:

---

## ✅ Step 1: Check Security Group (MOST COMMON ISSUE)

### **Your EC2 Instance Details:**
- **Instance ID:** `i-06a2800f10af97f89`
- **Public IP:** `100.31.103.225`
- **Security Group:** `launch-wizard-1`
- **Status:** Running ✅

### **Fix Security Group:**

1. **Go to EC2 Console** → Click on your instance
2. **Click "Security" tab** → Click on security group name (`launch-wizard-1`)
3. **Click "Edit inbound rules"**
4. **Add this rule:**
   - **Type:** Custom TCP
   - **Port:** 5000
   - **Source:** 0.0.0.0/0 (or your specific IP for security)
   - **Description:** Allow backend API
5. **Click "Save rules"**

### **Verify Security Group:**
```bash
# From your computer, test if port is open
telnet 100.31.103.225 5000
# or
curl http://100.31.103.225:5000/api/health
```

---

## ✅ Step 2: SSH into EC2 and Check Server Status

### **Connect to EC2:**
```bash
# Windows PowerShell
ssh -i "C:\path\to\FaceClockKey.pem" ubuntu@100.31.103.225

# If permission denied, fix key permissions (Linux/Mac)
chmod 400 FaceClockKey.pem
ssh -i FaceClockKey.pem ubuntu@100.31.103.225
```

### **Check if Server is Running:**
```bash
# Check if Node.js is installed
node --version
npm --version

# Check if your code is there
cd ~
ls -la
# Should see: Clock-in-Clock-out directory

# Check if server is running
pm2 list
# or
sudo systemctl status faceclock-backend
# or
ps aux | grep node
```

---

## ✅ Step 3: Install and Start Server (If Not Running)

### **If server is NOT running, follow these steps:**

```bash
# 1. Navigate to backend directory
cd ~/Clock-in-Clock-out/FaceClockBackend
# OR if you need to clone it:
# git clone https://github.com/your-username/Clock-in-Clock-out.git
# cd Clock-in-Clock-out/FaceClockBackend

# 2. Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install dependencies
npm install

# 4. Create .env file
nano .env
# Add these lines:
# MONGO_URI=your_mongodb_connection_string
# PORT=5000
# NODE_ENV=production
# AWS_ACCESS_KEY_ID=your_aws_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret
# AWS_REGION=us-east-1
# Press Ctrl+X, then Y, then Enter to save

# 5. Install PM2 (process manager)
sudo npm install -g pm2

# 6. Start server with PM2
pm2 start server.js --name "faceclock-backend"

# 7. Save PM2 configuration
pm2 save

# 8. Setup PM2 to start on boot
pm2 startup
# Copy and run the command it gives you

# 9. Check server logs
pm2 logs faceclock-backend
```

---

## ✅ Step 4: Configure Ubuntu Firewall

### **Ubuntu Firewall (ufw) might be blocking port 5000:**

```bash
# Check firewall status
sudo ufw status

# If firewall is active, allow port 5000
sudo ufw allow 5000/tcp

# Or disable firewall (less secure, but for testing)
sudo ufw disable

# Verify port is listening
sudo netstat -tlnp | grep 5000
# Should show: tcp 0.0.0.0:5000 LISTEN
```

---

## ✅ Step 5: Test Backend from EC2

### **Test if server responds locally:**

```bash
# From EC2 instance
curl http://localhost:5000/api/health

# Should return JSON with status: "OK"
```

### **Test from your computer:**

```bash
# From your Windows computer
curl http://100.31.103.225:5000/api/health

# Should return JSON with status: "OK"
```

---

## ✅ Step 6: Fix APK Production Build

### **The APK might be using development mode. Fix this:**

1. **Check `FaceClockApp/config/api.js`** - Already correct ✅
   - Production URL: `http://100.31.103.225:5000/api`

2. **Rebuild APK with production environment:**

```bash
cd FaceClockApp

# Build production APK
eas build --profile production --platform android

# Make sure it uses production URL
# The code checks: if (__DEV__ && !forceProduction) use local, else use production
# In production builds, __DEV__ is false, so it uses production URL
```

### **Verify APK is using production URL:**

After building, the APK should automatically use:
- `http://100.31.103.225:5000/api` (production)

NOT:
- `http://192.168.88.41:5000/api` (local development)

---

## 🔍 Quick Diagnostic Commands

### **Run these on EC2:**

```bash
# 1. Check if port 5000 is listening
sudo lsof -i :5000
# or
sudo netstat -tlnp | grep 5000

# 2. Check server logs
pm2 logs faceclock-backend --lines 50

# 3. Check server status
pm2 status

# 4. Check if MongoDB is connecting
pm2 logs faceclock-backend | grep -i mongo

# 5. Test API endpoint
curl http://localhost:5000/api/health
```

### **Run these from your computer:**

```bash
# 1. Test if EC2 is reachable
ping 100.31.103.225

# 2. Test if port 5000 is open
telnet 100.31.103.225 5000
# If it connects, port is open

# 3. Test API endpoint
curl http://100.31.103.225:5000/api/health
# Should return JSON
```

---

## 🎯 Most Likely Issues (In Order)

1. **Security Group** - Port 5000 not open (90% of cases)
2. **Server not running** - Need to start with PM2
3. **Firewall blocking** - Ubuntu ufw needs port 5000 allowed
4. **APK using dev mode** - Need to rebuild production APK
5. **MongoDB connection** - Check MONGO_URI in .env

---

## 📋 Complete Setup Script (Copy-Paste)

Run this entire script on your EC2 instance:

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# Clone repository (if not already cloned)
cd ~
if [ ! -d "Clock-in-Clock-out" ]; then
    git clone https://github.com/your-username/Clock-in-Clock-out.git
fi

# Navigate to backend
cd Clock-in-Clock-out/FaceClockBackend

# Install dependencies
npm install

# Create .env file (you'll need to edit this)
if [ ! -f ".env" ]; then
    cat > .env << EOF
MONGO_URI=your_mongodb_connection_string_here
PORT=5000
NODE_ENV=production
AWS_ACCESS_KEY_ID=your_aws_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_here
AWS_REGION=us-east-1
EOF
    echo "⚠️  Please edit .env file with your actual credentials"
    nano .env
fi

# Install PM2
sudo npm install -g pm2

# Stop existing server (if running)
pm2 stop faceclock-backend 2>/dev/null || true
pm2 delete faceclock-backend 2>/dev/null || true

# Start server
pm2 start server.js --name "faceclock-backend"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup | tail -1 | sudo bash

# Configure firewall
sudo ufw allow 5000/tcp
sudo ufw --force enable

# Check status
echo "✅ Server status:"
pm2 status

echo "✅ Testing API:"
curl http://localhost:5000/api/health

echo ""
echo "🎉 Setup complete! Server should be running on port 5000"
echo "📡 Test from your computer: curl http://100.31.103.225:5000/api/health"
```

---

## 🚀 After Fixing - Test Your APK

1. **Rebuild APK:**
   ```bash
   cd FaceClockApp
   eas build --profile production --platform android
   ```

2. **Install APK on device**

3. **Try clocking in** - Should connect to `http://100.31.103.225:5000/api`

4. **Check logs** if still failing:
   ```bash
   # On EC2
   pm2 logs faceclock-backend
   ```

---

## 📞 Still Not Working?

### **Check these:**

1. **EC2 Instance Status** - Should be "Running" ✅
2. **Security Group** - Port 5000 open ✅
3. **Server Running** - `pm2 list` shows faceclock-backend ✅
4. **Port Listening** - `sudo netstat -tlnp | grep 5000` ✅
5. **Firewall** - `sudo ufw status` shows port 5000 allowed ✅
6. **MongoDB** - Check logs for connection errors ✅
7. **APK Build** - Rebuilt with production profile ✅

---

## 💡 Pro Tips

1. **Use Elastic IP** - So IP doesn't change when instance restarts
2. **Set up CloudWatch** - Monitor server logs remotely
3. **Use HTTPS** - More secure (Let's Encrypt certificate)
4. **Set up auto-restart** - PM2 already does this ✅
5. **Monitor resources** - `htop` to check CPU/memory

---

**Your EC2 instance is ready - just need to configure security group and start the server! 🚀**


