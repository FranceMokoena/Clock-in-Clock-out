# ⚡ QUICK FIX - Connection Issue

## 🎯 Your Problem:
APK shows "Connection Issue Please Check Your Internet" when trying to clock in.

## ✅ SOLUTION (Do These 3 Things):

### **1. Open Port 5000 in Security Group (AWS Console)**

1. Go to **EC2 Console** → Click instance `i-06a2800f10af97f89`
2. Click **"Security" tab** → Click security group `launch-wizard-1`
3. Click **"Edit inbound rules"**
4. Click **"Add rule"**:
   - **Type:** Custom TCP
   - **Port:** 5000
   - **Source:** 0.0.0.0/0
   - **Description:** Backend API
5. Click **"Save rules"**

**⏱️ Takes 30 seconds**

---

### **2. SSH into EC2 and Start Server**

```bash
# Connect to EC2
ssh -i "FaceClockKey.pem" ubuntu@100.31.103.225

# Once connected, run:
cd ~/Clock-in-Clock-out/FaceClockBackend

# Install PM2 if not installed
sudo npm install -g pm2

# Start server
pm2 start server.js --name "faceclock-backend"
pm2 save
pm2 startup  # Copy and run the command it shows

# Allow firewall port
sudo ufw allow 5000/tcp

# Check if running
pm2 list
curl http://localhost:5000/api/health
```

**⏱️ Takes 2 minutes**

---

### **3. Test from Your Computer**

```bash
# Test if backend is accessible
curl http://100.31.103.225:5000/api/health

# Should return: {"status":"OK","message":"Face Clock API is running",...}
```

**⏱️ Takes 10 seconds**

---

## ✅ After These Steps:

1. **Rebuild your APK:**
   ```bash
   cd FaceClockApp
   eas build --profile production --platform android
   ```

2. **Install new APK** on your device

3. **Try clocking in** - Should work now! ✅

---

## 🚨 Still Not Working?

### **Check These:**

```bash
# On EC2, check:
pm2 logs faceclock-backend          # Server logs
sudo netstat -tlnp | grep 5000     # Port listening?
sudo ufw status                     # Firewall status

# From your computer:
curl http://100.31.103.225:5000/api/health  # Can you reach it?
```

---

## 📋 Your EC2 Details:
- **IP:** 100.31.103.225
- **Instance:** i-06a2800f10af97f89
- **OS:** Ubuntu 22.04 ✅
- **Status:** Running ✅
- **Security Group:** launch-wizard-1 (needs port 5000)
- **Key:** FaceClockKey.pem

---

**Most likely issue: Security group doesn't have port 5000 open!** 🔒

Fix that first, then start the server. Should work immediately! 🚀


