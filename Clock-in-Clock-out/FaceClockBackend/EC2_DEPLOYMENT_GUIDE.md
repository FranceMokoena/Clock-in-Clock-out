# 🚀 AWS EC2 Deployment Guide - How Your Backend Works

## 📍 Current Production Setup

**Production Backend URL:** `http://100.31.103.225:5000/api`

This is an **AWS EC2 instance** running your Node.js backend server.

---

## 🔍 How EC2 Deployment Works - Complete Breakdown

### **1. What is EC2?**

EC2 (Elastic Compute Cloud) is AWS's virtual server service. Think of it as:
- A **remote computer** in the cloud
- Running **24/7** (or until you stop it)
- Accessible via **IP address** (`100.31.103.225` in your case)
- Running **Linux** (usually Ubuntu or Amazon Linux)

---

### **2. How Your Backend Got Deployed to EC2**

Based on your codebase, here's how the deployment likely happened:

#### **Step 1: EC2 Instance Setup**
1. **Created EC2 Instance** in AWS Console
   - Chose instance type (e.g., t2.micro, t3.small)
   - Selected OS (likely Ubuntu or Amazon Linux)
   - Configured security group (opened port 5000)
   - Created/downloaded SSH key pair (.pem file)

#### **Step 2: Server Configuration**
2. **SSH into EC2 Instance**
   ```bash
   ssh -i your-key.pem ubuntu@100.31.103.225
   # or
   ssh -i your-key.pem ec2-user@100.31.103.225
   ```

3. **Installed Required Software**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y  # Ubuntu
   # or
   sudo yum update -y  # Amazon Linux
   
   # Install Node.js (likely v18 or v20)
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install npm
   sudo apt install -y npm
   
   # Install Git (to clone repository)
   sudo apt install -y git
   ```

#### **Step 3: Code Deployment**
4. **Cloned Your Repository**
   ```bash
   cd /home/ubuntu  # or /home/ec2-user
   git clone https://github.com/your-username/Clock-in-Clock-out.git
   cd Clock-in-Clock-out/FaceClockBackend
   ```

5. **Installed Dependencies**
   ```bash
   npm install
   # This also runs the postinstall script which downloads ONNX models
   ```

6. **Set Up Environment Variables**
   ```bash
   # Created .env file
   nano .env
   # Added:
   # MONGO_URI=your_mongodb_connection_string
   # PORT=5000
   # NODE_ENV=production
   # AWS_ACCESS_KEY_ID=your_aws_key
   # AWS_SECRET_ACCESS_KEY=your_aws_secret
   # AWS_REGION=us-east-1
   ```

#### **Step 4: Running the Server**
7. **Started the Server** (using one of these methods):

   **Option A: Direct Node (Simple but stops on disconnect)**
   ```bash
   node server.js
   ```

   **Option B: Using PM2 (Recommended - Keeps running)**
   ```bash
   # Install PM2 globally
   sudo npm install -g pm2
   
   # Start server with PM2
   pm2 start server.js --name "faceclock-backend"
   
   # Save PM2 configuration
   pm2 save
   
   # Setup PM2 to start on boot
   pm2 startup
   ```

   **Option C: Using systemd (Linux service)**
   ```bash
   # Create service file
   sudo nano /etc/systemd/system/faceclock-backend.service
   
   # Add:
   [Unit]
   Description=Face Clock Backend API
   After=network.target
   
   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/Clock-in-Clock-out/FaceClockBackend
   ExecStart=/usr/bin/node server.js
   Restart=always
   Environment=NODE_ENV=production
   EnvironmentFile=/home/ubuntu/Clock-in-Clock-out/FaceClockBackend/.env
   
   [Install]
   WantedBy=multi-user.target
   
   # Enable and start service
   sudo systemctl enable faceclock-backend
   sudo systemctl start faceclock-backend
   ```

#### **Step 5: Security Group Configuration**
8. **Opened Port 5000 in AWS Security Group**
   - Went to EC2 Console → Security Groups
   - Added inbound rule:
     - Type: Custom TCP
     - Port: 5000
     - Source: 0.0.0.0/0 (allows all IPs) or specific IPs

---

## 🔄 How It Works Now (Current State)

### **Architecture Flow:**

```
Mobile App (FaceClockApp)
    ↓
    HTTP Request
    ↓
Internet
    ↓
AWS EC2 Instance (100.31.103.225:5000)
    ↓
Node.js Server (server.js)
    ↓
    ├─→ MongoDB Atlas (Database)
    ├─→ AWS Rekognition (Face Recognition)
    └─→ ONNX Models (Local Face Recognition Fallback)
```

### **What Happens When Your App Makes a Request:**

1. **Mobile App** sends request to `http://100.31.103.225:5000/api/staff/register`
2. **Internet** routes request to AWS EC2 instance
3. **EC2 Security Group** checks if port 5000 is allowed (it is)
4. **Node.js Server** (`server.js`) receives request
5. **Express.js** routes to appropriate handler (`/api/staff/register`)
6. **Server processes request:**
   - Validates data
   - Connects to MongoDB Atlas
   - Processes face recognition (AWS Rekognition or ONNX)
   - Saves staff data
7. **Response** sent back to mobile app

---

## 📦 What's Running on Your EC2 Instance

### **Files Structure:**
```
/home/ubuntu/Clock-in-Clock-out/FaceClockBackend/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── .env                   # Environment variables (secrets)
├── models/                # MongoDB models
│   ├── Staff.js
│   ├── ClockLog.js
│   └── onnx/              # Face recognition models
│       ├── scrfd_10g_gnkps_fp32.onnx
│       └── w600k_r50.onnx
├── routes/                # API routes
│   ├── staff.js
│   └── locations.js
└── utils/                 # Utilities
    ├── faceRecognitionONNX.js
    ├── rekognitionClient.js
    └── staffCache.js
```

### **Process Management:**
Your server is likely running via:
- **PM2** (most common) - Keeps server running even after SSH disconnect
- **systemd** - Linux service manager
- **Screen/Tmux** - Terminal multiplexer (less common)

---

## 🔧 Key Components Explained

### **1. server.js (Main Server)**
- **Express.js** web framework
- Listens on port **5000**
- Handles CORS (allows mobile app to connect)
- Connects to **MongoDB Atlas**
- Loads **ONNX models** for face recognition
- Uses **AWS Rekognition** as primary face recognition service

### **2. Environment Variables (.env)**
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
PORT=5000
NODE_ENV=production
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### **3. Face Recognition Flow**
1. **Primary:** AWS Rekognition (cloud service)
2. **Fallback:** ONNX models (local on EC2)
3. Models downloaded during `npm install` (postinstall script)

### **4. MongoDB Atlas**
- Cloud database (not on EC2)
- EC2 connects to it via internet
- IP whitelist configured to allow EC2's IP

---

## 🛠️ Common Operations

### **SSH into EC2:**
```bash
ssh -i your-key.pem ubuntu@100.31.103.225
```

### **Check if Server is Running:**
```bash
# If using PM2
pm2 list
pm2 logs faceclock-backend

# If using systemd
sudo systemctl status faceclock-backend

# Check port 5000
sudo netstat -tlnp | grep 5000
# or
sudo lsof -i :5000
```

### **Restart Server:**
```bash
# PM2
pm2 restart faceclock-backend

# systemd
sudo systemctl restart faceclock-backend
```

### **View Logs:**
```bash
# PM2
pm2 logs faceclock-backend

# systemd
sudo journalctl -u faceclock-backend -f

# Direct logs
tail -f /path/to/logs/server.log
```

### **Update Code:**
```bash
cd /home/ubuntu/Clock-in-Clock-out/FaceClockBackend
git pull
npm install
pm2 restart faceclock-backend
```

---

## 🔒 Security Considerations

### **Current Setup:**
- ✅ Server running on EC2
- ✅ Port 5000 open in security group
- ✅ MongoDB Atlas IP whitelist configured
- ✅ Environment variables in .env file

### **Recommendations:**
1. **Use HTTPS** (add SSL certificate, use port 443)
2. **Restrict Security Group** (only allow specific IPs, not 0.0.0.0/0)
3. **Use AWS Secrets Manager** instead of .env file
4. **Set up CloudWatch** for monitoring
5. **Use Load Balancer** for high availability
6. **Enable AWS WAF** for DDoS protection

---

## 💰 Cost Breakdown

### **EC2 Instance:**
- **t2.micro** (Free tier): $0/month (first year)
- **t3.small**: ~$15/month
- **t3.medium**: ~$30/month

### **MongoDB Atlas:**
- Free tier: 512MB storage
- Paid: Based on usage

### **AWS Rekognition:**
- First 5,000 images/month: Free
- After: $1.00 per 1,000 images

### **Data Transfer:**
- First 1GB/month: Free
- After: $0.09/GB

---

## 🚨 Troubleshooting

### **Server Not Responding:**
```bash
# Check if server is running
pm2 list

# Check EC2 instance status (AWS Console)
# Check security group rules
# Check server logs
pm2 logs faceclock-backend
```

### **Can't Connect to MongoDB:**
- Check MongoDB Atlas IP whitelist
- Verify MONGO_URI in .env
- Check EC2 instance IP hasn't changed

### **Port 5000 Not Accessible:**
- Check security group inbound rules
- Verify server is listening: `sudo netstat -tlnp | grep 5000`
- Check firewall: `sudo ufw status`

### **High Memory Usage:**
- Your server has memory monitoring (every 30 seconds)
- Check logs for memory warnings
- Consider upgrading instance type

---

## 📊 Monitoring Your Deployment

### **Check Server Health:**
```bash
curl http://100.31.103.225:5000/api/health
```

### **View Real-time Logs:**
```bash
pm2 logs faceclock-backend --lines 100
```

### **Monitor Resources:**
```bash
# CPU and Memory
htop
# or
top

# Disk space
df -h

# Network
sudo iftop
```

---

## 🔄 Deployment Workflow Summary

**Initial Deployment:**
1. Create EC2 instance
2. Configure security group
3. SSH into instance
4. Install Node.js, npm, git
5. Clone repository
6. Install dependencies
7. Configure environment variables
8. Start server with PM2/systemd
9. Test API endpoint

**Updates:**
1. SSH into EC2
2. Pull latest code (`git pull`)
3. Install new dependencies (`npm install`)
4. Restart server (`pm2 restart`)

---

## 📝 Key Takeaways

1. **EC2 = Remote Linux Server** running your Node.js backend
2. **IP Address** (`100.31.103.225`) is how your app connects
3. **PM2/systemd** keeps server running 24/7
4. **Security Group** controls which ports are accessible
5. **MongoDB Atlas** is separate cloud database
6. **AWS Rekognition** handles face recognition
7. **ONNX Models** provide fallback face recognition

---

## 🎯 Next Steps (Optional Improvements)

1. **Set up CI/CD** (GitHub Actions → Auto deploy on push)
2. **Add SSL/HTTPS** (Let's Encrypt certificate)
3. **Set up monitoring** (CloudWatch, DataDog)
4. **Use Load Balancer** (for high availability)
5. **Automate backups** (database snapshots)
6. **Set up alerts** (server down, high CPU, etc.)

---

**Your backend is successfully deployed and running on AWS EC2! 🎉**

