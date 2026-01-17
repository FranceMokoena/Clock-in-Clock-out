# 🔔 Notification System - Troubleshooting Guide

**Problem**: Bell doesn't show unread count when clocking in  
**Status**: 🔧 **FIXING NOW**

---

## ✅ What Was Fixed

I found the issue! The Socket.IO connection wasn't sending the **auth data** (userId and userType) to the backend, so the backend couldn't identify which desktop user to send notifications to.

### The Fix Applied:
Updated `notificationService.js` to send auth credentials:
```javascript
socket = io(API_BASE_URL, {
  transports: ['websocket', 'polling'],
  auth: {
    userId: recipientId,        // ← NOW SENT
    userType: recipientType      // ← NOW SENT
  }
});
```

---

## 🧪 Testing Checklist

Follow these steps to verify everything works:

### Step 1: **Kill Everything & Start Fresh**
```bash
# Terminal 1: Close everything
# Ctrl+C on backend and desktop

# Terminal 2: Kill any hanging processes
pkill -f node
pkill -f electron

# Wait 5 seconds
sleep 5
```

### Step 2: **Start Backend with Fresh Connection**
```bash
cd FaceClockBackend
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
✅ Server is running on port 5000
```

### Step 3: **Start Desktop in New Terminal**
```bash
cd FaceClockDesktop
npm start
```

Wait for it to fully load, then **login** as Admin/HostCompany.

### Step 4: **Watch for Socket.IO Connection**

**In Desktop Browser Console** (F12 → Console):
Look for these messages:
```
✅ Connected to notification server
📌 Registered as: Admin (user-id-here)
```

**In Backend Terminal**:
Look for:
```
✅ Socket.IO registered for real-time notifications
✅ User connected: Admin:user-id-here
```

### Step 5: **Trigger Clock-In from Mobile**

1. Open mobile app (iOS/Android emulator)
2. Login as **Intern**
3. Go to **Clock In** screen
4. Click **Clock In**

### Step 6: **Watch Desktop for Notification**

Expected sequence:

**Backend Console:**
```
📢 ACTION: CLOCK_IN
✅ Action logged: CLOCK_IN
📤 Emitted 'notification' to Admin:admin-id-here
```

**Desktop Browser Console:**
```
📢 New notification: CLOCKIN_SUCCESS
```

**Desktop Bell Icon:**
- Should show `1` badge
- Should start shaking (animation)
- Should show unread count

---

## 🐛 Troubleshooting

### ❌ Problem: Bell still shows no count

**Diagnosis Steps:**

1. **Check Browser Console (F12)**
   - Look for errors
   - Should see: `✅ Connected to notification server`
   - If missing: Socket.IO not connected

2. **Check Backend Logs**
   - Look for: `✅ User connected: Admin:xxx`
   - If missing: Backend not receiving connection

3. **Check Network Tab (F12)**
   - Look for WebSocket connection to `ws://localhost:5000/socket.io/`
   - Should be `101 Switching Protocols`

### ❌ Problem: Backend says "User not connected"

**Solution:**
- Check auth data is being sent: `socket.handshake.auth.userId` should exist
- Verify recipientId and recipientType are passed correctly
- Check Dashboard.js passes them to NotificationProvider

### ❌ Problem: Mobile clock-in succeeds but no notification

**Solution:**
1. Verify `logAction('CLOCK_IN', ...)` is called in backend
2. Check actionLogger.js is creating notifications
3. Verify eventEmitter.sendToUser() is called
4. Check socket exists: `this.socketIOInstances.io`

---

## 📝 Current Code Changes

### File: notificationService.js
```javascript
// BEFORE: No auth data sent
socket = io(API_BASE_URL, {
  transports: ['websocket', 'polling'],
  // ❌ No auth data
});

// AFTER: Auth data included ✅
socket = io(API_BASE_URL, {
  transports: ['websocket', 'polling'],
  auth: {
    userId: recipientId,
    userType: recipientType
  }
});
```

---

## 🔗 Connection Flow

```
Mobile App Clocks In
        ↓
Backend: POST /api/staff/clock-in
        ↓
logAction('CLOCK_IN', {...})
        ↓
actionLogger.js creates notification
        ↓
eventEmitter.emitAction('CLOCK_IN', {...})
        ↓
eventEmitter.sendToUser(adminId, 'Admin', notification)
        ↓
REQUIRES: Socket connected with userId + userType in auth
        ↓
Desktop receives via Socket.IO
        ↓
NotificationContext updates unreadCount
        ↓
NotificationBell renders count badge
        ↓
User sees notification number! 🎉
```

---

## 🎯 Expected Behavior After Fix

### When clock-in happens:

**In 1-2 seconds:**
- [ ] Bell shows count (e.g., `1`, `2`, etc.)
- [ ] Bell shakes animation triggers
- [ ] Browser console shows notification received
- [ ] Click bell → modal opens
- [ ] Click notification → navigates to Not Accountable

---

## 📋 File Modified

- ✅ `notificationService.js` - Added auth credentials to Socket.IO connection

---

## 🚀 Next Steps

1. **Pull the latest code** with the fix
2. **Restart everything** (fresh terminal windows)
3. **Test clock-in** from mobile
4. **Watch for bell notification** on desktop

---

## 💬 If Still Not Working

Check these in order:

1. **Backend receiving Socket connection?**
   - Backend logs should show: `✅ User connected: Admin:xxx`
   - If not → Socket.IO isn't connecting

2. **Desktop sending auth data?**
   - Browser console: `📌 Registered as: Admin (xxx)`
   - If shows "unknown" or "Admin (undefined)" → recipientId not passed

3. **Backend sending notification?**
   - Backend logs should show: `📤 Emitted 'notification' to Admin:xxx`
   - If not → Backend not recognizing recipient

4. **Desktop receiving event?**
   - Browser console: `📢 New notification: CLOCKIN_SUCCESS`
   - If not → Socket listener not active

---

## ✅ Verification Commands

**Backend running?**
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"OK","message":"Face Clock API is running"}
```

**Desktop connected to backend?**
Check Network tab (F12) → WS tab → should see:
```
ws://localhost:5000/socket.io/?EIO=4&transport=websocket
Status: 101 Switching Protocols
```

---

**You're almost there!** 🎯 This should fix the notification issue completely.
