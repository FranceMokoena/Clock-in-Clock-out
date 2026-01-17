# 🚀 NOTIFICATION SYSTEM - QUICK INTEGRATION GUIDE

## Step 1: Install Dependencies

```bash
cd FaceClockBackend
npm install socket.io
```

## Step 2: Test the System

### A. Start the backend
```bash
npm run dev
# You should see: "📡 WebSocket ready for real-time notifications"
```

### B. Connect a test client (Node.js)
```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: {
    userId: 'test-user-id',
    userType: 'admin'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected');
});

socket.on('notification', (notification) => {
  console.log('📬 Received notification:', notification);
});
```

## Step 3: Trigger Notifications (Test Examples)

### From Backend Route (Test with Postman)

```javascript
// Example: Clock In with Notification
router.post('/clock', async (req, res) => {
  try {
    const staff = await Staff.findById(req.body.staffId);
    
    const clockLog = new ClockLog({
      staffId: staff._id,
      timestamp: new Date(),
      type: 'in'
    });
    await clockLog.save();

    // 🔔 TRIGGER NOTIFICATION
    const { logAction } = require('../utils/actionLogger');
    await logAction('CLOCK_IN', {
      staffId: staff._id.toString(),
      staffName: staff.name,
      timestamp: clockLog.timestamp,
      hostCompanyId: staff.hostCompanyId?.toString(),
      departmentId: staff.department?.toString()
    }, req.user?._id);

    res.json({ success: true, clockLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Step 4: Mobile App Integration

### 1. Add socket.io-client to Expo

```bash
cd FaceClockApp
npm install socket.io-client expo-notifications
```

### 2. Initialize in App.js

```javascript
import notificationHandler from './utils/notificationHandler';
import { useNotifications, NotificationPanel } from './components/NotificationPanel';

export default function App() {
  const userInfo = useAuth(); // Your auth hook

  useEffect(() => {
    if (userInfo) {
      // Initialize notifications
      notificationHandler.initialize(
        userInfo._id,
        userInfo.role.toLowerCase(),
        API_BASE_URL
      );
    }

    return () => {
      notificationHandler.disconnect();
    };
  }, [userInfo]);

  return (
    // Your app content...
  );
}
```

### 3. Add Notification Button to Dashboard

```javascript
export function AdminDashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount } = useNotifications();

  return (
    <View>
      {/* Notification Button */}
      <TouchableOpacity
        onPress={() => setShowNotifications(true)}
        style={{ position: 'relative' }}
      >
        <Text style={{ fontSize: 24 }}>🔔</Text>
        {unreadCount > 0 && (
          <View style={{
            position: 'absolute',
            top: -5,
            right: -5,
            backgroundColor: '#dc2626',
            borderRadius: 10,
            width: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Notification Panel */}
      <NotificationPanel
        visible={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onNotificationPress={(notification) => {
          // Handle notification click
          // Example: Navigate to related screen
          if (notification.type === 'leave_request') {
            navigation.navigate('LeaveRequests');
          }
        }}
      />
    </View>
  );
}
```

## Step 5: Desktop App Integration

### 1. Initialize in main.js

```javascript
const notificationHandler = require('./src/utils/notificationHandler');
const { ipcMain } = require('electron');

// After user login
ipcMain.handle('init-notifications', async (event, userId, userType, apiUrl) => {
  return await notificationHandler.initialize(
    userId,
    userType,
    apiUrl,
    mainWindow
  );
});

// Listen for notifications from main process
notificationHandler.addEventListener('notification_received', (notification) => {
  mainWindow.webContents.send('notification-received', notification);
});
```

### 2. Update React component

```javascript
import { ipcRenderer } from 'electron';
import { useEffect, useState } from 'react';

export function Dashboard() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Initialize notifications
    ipcRenderer.invoke('init-notifications', 
      userId, 
      userType, 
      API_BASE_URL
    );

    // Listen for incoming notifications
    ipcRenderer.on('notification-received', (event, notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      
      // Optional: Show toast
      showToast(notification.title);
    });

    return () => {
      ipcRenderer.removeAllListeners('notification-received');
    };
  }, []);

  return (
    <div>
      {/* Notification UI */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowPanel(!showPanel)}>
          🔔
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute',
              top: -5,
              right: -5,
              backgroundColor: '#dc2626',
              color: 'white',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 'bold'
            }}>
              {notifications.length > 99 ? '99+' : notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* Notification list */}
      {showPanel && (
        <div style={{
          position: 'absolute',
          top: 40,
          right: 0,
          width: 400,
          maxHeight: 500,
          overflowY: 'auto',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {notifications.map(notif => (
            <div key={notif._id} style={{
              padding: 12,
              borderBottom: '1px solid #f3f4f6',
              borderLeft: `4px solid ${getPriorityColor(notif.priority)}`
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {notif.title}
              </div>
              <div style={{ fontSize: 14, color: '#666' }}>
                {notif.message}
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                {new Date(notif.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Step 6: Add logAction Calls to All Routes

### Clock Routes
```javascript
const { logAction } = require('../utils/actionLogger');

// Clock in
await logAction('CLOCK_IN', {
  staffId: staff._id.toString(),
  staffName: staff.name,
  timestamp: new Date(),
  hostCompanyId: staff.hostCompanyId?.toString(),
  departmentId: staff.department?.toString()
});

// Clock out
await logAction('CLOCK_OUT', {
  staffId: staff._id.toString(),
  staffName: staff.name,
  timestamp: new Date(),
  hostCompanyId: staff.hostCompanyId?.toString(),
  departmentId: staff.department?.toString()
});
```

### Staff Routes
```javascript
// Staff registered
await logAction('STAFF_REGISTERED', {
  staffId: staff._id.toString(),
  staffName: staff.name,
  role: staff.role,
  hostCompanyId: staff.hostCompanyId?.toString()
});

// Staff removed
await logAction('STAFF_REMOVED', {
  staffId: staff._id.toString(),
  staffName: staff.name,
  hostCompanyId: staff.hostCompanyId?.toString()
});
```

### Leave Routes
```javascript
// Leave requested
await logAction('LEAVE_REQUEST', {
  staffId: leaveApp.staffId.toString(),
  staffName: staff.name,
  startDate: leaveApp.startDate,
  endDate: leaveApp.endDate,
  requesterId: leaveApp.staffId.toString(),
  hostCompanyId: staff.hostCompanyId?.toString(),
  departmentId: staff.department?.toString()
});

// Leave approved
await logAction('LEAVE_APPROVED', {
  leaveApplicationId: leaveApp._id.toString(),
  requesterId: leaveApp.staffId.toString(),
  approvedBy: req.user.name,
  hostCompanyId: staff.hostCompanyId?.toString()
});

// Leave rejected
await logAction('LEAVE_REJECTED', {
  leaveApplicationId: leaveApp._id.toString(),
  requesterId: leaveApp.staffId.toString(),
  rejectedBy: req.user.name
});
```

### Attendance Correction Routes
```javascript
// Correction requested
await logAction('ATTENDANCE_CORRECTION_REQUEST', {
  staffId: correction.staffId.toString(),
  staffName: staff.name,
  date: correction.date,
  requesterId: correction.staffId.toString(),
  hostCompanyId: staff.hostCompanyId?.toString(),
  departmentId: staff.department?.toString()
});

// Correction approved
await logAction('ATTENDANCE_CORRECTION_APPROVED', {
  staffId: correction.staffId.toString(),
  requesterId: correction.staffId.toString(),
  approvedBy: req.user.name,
  hostCompanyId: staff.hostCompanyId?.toString()
});

// Correction rejected
await logAction('ATTENDANCE_CORRECTION_REJECTED', {
  staffId: correction.staffId.toString(),
  requesterId: correction.staffId.toString()
});
```

## Step 7: Test the Entire Flow

### Scenario: Clock In Triggers Notifications

1. **Mobile user clocks in**
2. **Backend logs action**: `logAction('CLOCK_IN', ...)`
3. **Rules engine determines recipients**:
   - Admin (all admins)
   - Host Company (company reps)
   - Department Manager (dept managers)
4. **For each recipient**:
   - Save notification to database
   - Send real-time via Socket.IO (if connected)
5. **Mobile/Desktop receives notification**
6. **Shows in notification panel with badge**

### Manual Test with Postman

```bash
# 1. Start backend
npm run dev

# 2. Check health (should show active connections)
GET http://localhost:5000/api/health

# 3. Create test staff if needed
POST http://localhost:5000/api/staff/register
{
  "name": "Test User",
  "role": "Admin",
  ...
}

# 4. Clock in
POST http://localhost:5000/api/staff/clock
{
  "staffId": "...",
  "type": "in",
  "location": "Office"
}

# 5. Get notifications
GET http://localhost:5000/api/notifications?recipientId=...&recipientType=Admin

# 6. Connected users should have received notification in real-time
```

## Step 8: Production Checklist

- [ ] Socket.IO installed in backend
- [ ] server.js updated with Socket.IO
- [ ] Notification model enhanced
- [ ] eventEmitter.js created
- [ ] actionLogger.js created
- [ ] notificationRules.js created
- [ ] Mobile app notification handler integrated
- [ ] Desktop app notification handler integrated
- [ ] logAction() calls added to all routes
- [ ] Tested with real client connections
- [ ] Monitored logs for errors
- [ ] Database indexes created
- [ ] CORS properly configured
- [ ] Rate limiting considered
- [ ] Environment variables set

---

## 📝 Summary

The notification system is now **fully event-driven**:

✅ **Every action triggers notifications**
✅ **Real-time delivery to mobile & desktop**
✅ **Smart recipient routing by role**
✅ **Persistent storage for offline access**
✅ **Delivery tracking per channel**
✅ **Connection status monitoring**

**Total time to integrate: ~2-3 hours of code changes**
