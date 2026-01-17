# 🔔 COMPREHENSIVE NOTIFICATION SYSTEM DOCUMENTATION

## Overview

The new notification system listens to **EVERY ACTION** in the system and delivers real-time notifications to the right people across:
- **Mobile App** (Expo React Native)
- **Desktop App** (Electron)
- **Web Dashboard** (Admin & Host Company)

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SYSTEM ACTIONS                              │
├─────────────────────────────────────────────────────────────────┤
│  • Clock In/Out                    • Staff Registration         │
│  • Leave Requests                  • Attendance Corrections     │
│  • Payroll Processing              • Security Events            │
│  • Department Changes              • System Alerts              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│         EVENT EMITTER (eventEmitter.js)                         │
│     Central hub for all system events and notifications          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  ACTION LOGGER   │ │NOTIFICATION RULES│ │   DATABASE       │
│(actionLogger.js) │ │(notificationRules)│ │ (Notification)  │
│                  │ │   Engine          │ │                  │
│ • Logs actions   │ │                   │ │ • Persists       │
│ • Triggers rules │ │ • Routes to right │ │   notifications  │
│ • Creates notifs │ │   recipients      │ │ • Supports       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  SOCKET.IO       │ │  MOBILE APP      │ │  DESKTOP APP     │
│  (Real-time)     │ │ (Notification    │ │ (System Notif)   │
│                  │ │  Handler.js)     │ │ (notifHandler.js)│
│ • Websocket      │ │                  │ │                  │
│ • Direct delivery│ │ • Real-time UI   │ │ • Electron       │
│ • Broadcast      │ │ • Local storage  │ │ • Windows/Mac    │
│ • User tracking  │ │ • Toast messages │ │ • Sound alerts   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 🔧 CORE COMPONENTS

### 1. **Event Emitter** (`utils/eventEmitter.js`)

Central hub that:
- Tracks Socket.IO connections
- Broadcasts events to connected clients
- Routes notifications to specific users/groups
- Manages connection lifecycle

**Key Methods:**
```javascript
// Register Socket.IO instance
eventEmitter.registerSocketIO(io);

// Emit an action that triggers notifications
eventEmitter.emitAction('CLOCK_IN', {
  staffId: '...',
  staffName: 'John Doe',
  timestamp: new Date(),
  hostCompanyId: '...',
  departmentId: '...'
});

// Send notification to specific user
eventEmitter.sendToUser(userId, userType, notification);

// Broadcast to all users of a type
eventEmitter.broadcastToType('admin', notification);
```

### 2. **Action Logger** (`utils/actionLogger.js`)

Logs every action and creates notifications:
- Creates persistent notification records in database
- Determines recipients using rules engine
- Sends real-time notifications via Socket.IO
- Tracks delivery status

**Key Methods:**
```javascript
// Log an action (automatically handles recipients & delivery)
await logAction('CLOCK_IN', {
  staffId: '...',
  staffName: 'John Doe',
  timestamp: new Date(),
  hostCompanyId: '...',
  departmentId: '...'
}, initiatedBy_userId);

// Create a quick notification
await createQuickNotification(
  recipientId, 
  'Admin',
  'Title',
  'Message',
  'type',
  'priority'
);

// Bulk notifications
await bulkCreateNotifications(
  [userId1, userId2],
  'Intern',
  'Title',
  'Message'
);
```

### 3. **Notification Rules Engine** (`utils/notificationRules.js`)

Determines who receives notifications based on:
- Action type
- User role (admin, host company, department manager, staff)
- Organization structure (host company, department)
- Notification priority

**Action-to-Recipient Mapping:**

| Action | Recipients |
|--------|-----------|
| CLOCK_IN/OUT | Admin, Host Company, Department Manager |
| STAFF_REGISTERED | Admin, Host Company |
| LEAVE_REQUEST | Admin, Host Company, Dept Manager, Requester |
| LEAVE_APPROVED | Requester, Admin, Host Company |
| PAYROLL_PROCESSED | Admin, Host Company, All Staff (host company) |
| SECURITY_ALERT | Admin, Host Company |
| FAILED_RECOGNITION | Admin, Host Company |
| DEPARTMENT_CHANGES | Admin, Host Company |

### 4. **Enhanced Notification Model** (`models/Notification.js`)

Stores all notifications with:
- **Recipient routing**: Type + ID
- **Action tracking**: Source action details
- **Device info**: Which app sent it
- **Delivery channels**: In-app, push, email, SMS
- **Delivery status**: Tracked per channel
- **Auto-expiry**: 30 days default TTL
- **Relationship links**: To staff, host company, clock logs, etc.

**Schema:**
```javascript
{
  // Recipient info
  recipientType: 'Admin|HostCompany|DepartmentManager|Intern',
  recipientId: ObjectId,
  
  // Content
  title: String,
  message: String,
  type: String,
  priority: 'low|medium|high|urgent',
  
  // Source tracking
  source: 'mobile_app|desktop_app|api|system',
  
  // Device info
  deviceInfo: {
    deviceId: String,
    platform: String,
    appVersion: String
  },
  
  // Related entities
  relatedEntities: {
    staffId: ObjectId,
    hostCompanyId: ObjectId,
    departmentId: ObjectId,
    clockLogId: ObjectId,
    leaveApplicationId: ObjectId,
    attendanceCorrectionId: ObjectId,
    payrollRecordId: ObjectId
  },
  
  // Delivery channels
  deliveryChannels: {
    inApp: Boolean,
    push: Boolean,
    email: Boolean,
    sms: Boolean
  },
  
  // Delivery tracking
  deliveryStatus: {
    inAppDelivered: Boolean,
    pushDelivered: Boolean,
    emailDelivered: Boolean,
    smsDelivered: Boolean
  },
  
  // Read status
  isRead: Boolean,
  readAt: Date,
  
  // Metadata
  createdAt: Date,
  expiresAt: Date
}
```

---

## 🚀 REAL-TIME DELIVERY SYSTEM

### Socket.IO Integration (Server)

**In `server.js`:**
```javascript
const http = require('http');
const socketIO = require('socket.io');

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

// Register with event emitter
eventEmitter.registerSocketIO(io);

// Start with server.listen() instead of app.listen()
server.listen(PORT);
```

### Client Connection (Mobile & Desktop)

**Authentication:**
```javascript
socket = io('https://api-url', {
  auth: {
    userId: 'user-id',
    userType: 'admin' // or 'host', 'manager', 'intern'
  }
});
```

### User-to-Socket Mapping

- **Format**: `{userType}:{userId}`
- **Examples**:
  - `admin:507f1f77bcf86cd799439011`
  - `host:507f1f77bcf86cd799439012`
  - `intern:507f1f77bcf86cd799439013`

### Event Flow

```
Backend Action → eventEmitter.emitAction()
    ↓
Check recipients using rules engine
    ↓
For each recipient:
  1. Save to database
  2. If connected via Socket.IO → send real-time
  3. Emit event for listeners
    ↓
Socket.IO broadcasts to client
    ↓
Client receives and displays
```

---

## 📱 MOBILE APP INTEGRATION

### Setup in Main App

**In `App.js` or init code:**
```javascript
import notificationHandler from './utils/notificationHandler';
import { useNotifications } from './components/NotificationPanel';

// Initialize after user login
useEffect(() => {
  const userId = userInfo._id;
  const userType = userInfo.role.toLowerCase(); // 'admin', 'intern', etc
  
  notificationHandler.initialize(
    userId,
    userType,
    API_BASE_URL
  );
}, []);
```

### Using Notifications in Components

**Hook Usage:**
```javascript
import { useNotifications, NotificationPanel, NotificationBadge } from './components/NotificationPanel';

export function MyComponent() {
  const [showNotifications, setShowNotifications] = useState(false);
  const {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    clearNotification
  } = useNotifications();

  return (
    <>
      {/* Notification badge on button */}
      <TouchableOpacity onPress={() => setShowNotifications(true)}>
        <Text>🔔</Text>
        <NotificationBadge count={unreadCount} />
      </TouchableOpacity>

      {/* Notification panel */}
      <NotificationPanel
        visible={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onNotificationPress={(notif) => {
          markAsRead(notif._id);
          // Navigate to related screen
        }}
      />
    </>
  );
}
```

### Notification Handler API

```javascript
// Initialize
await notificationHandler.initialize(userId, userType, apiBaseUrl);

// Listen for events
notificationHandler.addEventListener('notification_received', (notification) => {
  console.log('New notification:', notification);
});

notificationHandler.addEventListener('connection_status', (status) => {
  if (status.status === 'connected') {
    console.log('✅ Connected');
  }
});

// Get stored notifications
const notifications = await notificationHandler.getStoredNotifications();

// Clear a notification
await notificationHandler.clearNotification(notificationId);

// Disconnect
notificationHandler.disconnect();

// Check status
const status = notificationHandler.getConnectionStatus();
```

---

## 🖥️ DESKTOP APP INTEGRATION

### Setup in Main Process

**In `main.js` or preload:**
```javascript
const notificationHandler = require('./src/utils/notificationHandler');

// After user login
notificationHandler.initialize(
  userId,
  userType,
  API_BASE_URL,
  mainWindow
);

// Listen to notifications
notificationHandler.addEventListener('notification_received', (notification) => {
  // Update UI in renderer
  mainWindow.webContents.send('notification-received', notification);
});
```

### Renderer Process (React)

```javascript
import { ipcRenderer } from 'electron';

export function useDesktopNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    ipcRenderer.on('notification-received', (event, notification) => {
      setNotifications(prev => [notification, ...prev]);
    });
  }, []);

  return { notifications };
}
```

### Configuration

```javascript
// Get current settings
const settings = notificationHandler.settings;

// Update settings
notificationHandler.saveSettings({
  soundEnabled: true,
  popupEnabled: true,
  trayEnabled: true
});
```

---

## 📊 BACKEND: INTEGRATING ACTIONS

### Clock In/Out Example

**In `routes/staff.js`:**
```javascript
const { logAction } = require('../utils/actionLogger');

router.post('/clock', async (req, res) => {
  try {
    // ... existing clock logic ...
    
    const clockLog = new ClockLog({
      staffId: staff._id,
      timestamp: new Date(),
      type: 'in' // or 'out'
      // ... other fields
    });
    await clockLog.save();

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('CLOCK_IN', {
      staffId: staff._id.toString(),
      staffName: staff.name,
      timestamp: clockLog.timestamp,
      hostCompanyId: staff.hostCompanyId?.toString(),
      departmentId: staff.department?.toString(),
      location: req.body.location
    }, req.user?._id);

    res.json({ success: true, clockLog });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Leave Request Example

**In `routes/leaveApplications.js`:**
```javascript
router.post('/request', async (req, res) => {
  try {
    const leaveApp = new LeaveApplication({
      staffId: req.body.staffId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      reason: req.body.reason,
      status: 'pending'
    });
    await leaveApp.save();

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('LEAVE_REQUEST', {
      staffId: leaveApp.staffId.toString(),
      staffName: staff.name,
      startDate: leaveApp.startDate,
      endDate: leaveApp.endDate,
      leaveApplicationId: leaveApp._id.toString(),
      hostCompanyId: staff.hostCompanyId?.toString(),
      departmentId: staff.department?.toString(),
      requesterId: leaveApp.staffId.toString()
    }, req.user?._id);

    res.json({ success: true, leaveApp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Approving Leave Example

```javascript
router.post('/approve/:id', async (req, res) => {
  try {
    const leaveApp = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedDate: new Date() },
      { new: true }
    );

    // 🔔 LOG ACTION FOR NOTIFICATIONS
    await logAction('LEAVE_APPROVED', {
      leaveApplicationId: leaveApp._id.toString(),
      requesterId: leaveApp.staffId.toString(),
      staffName: staff.name,
      approvedBy: req.user.name,
      hostCompanyId: staff.hostCompanyId?.toString()
    }, req.user._id);

    res.json({ success: true, leaveApp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### All Action Types to Integrate

1. **CLOCK_IN** - When staff clocks in
2. **CLOCK_OUT** - When staff clocks out
3. **STAFF_REGISTERED** - When new staff registered
4. **STAFF_REMOVED** - When staff is removed
5. **LEAVE_REQUEST** - When leave requested
6. **LEAVE_APPROVED** - When leave approved
7. **LEAVE_REJECTED** - When leave rejected
8. **ATTENDANCE_CORRECTION_REQUEST** - When correction requested
9. **ATTENDANCE_CORRECTION_APPROVED** - When correction approved
10. **ATTENDANCE_CORRECTION_REJECTED** - When correction rejected
11. **PAYROLL_PROCESSED** - When payroll is processed
12. **PAYROLL_GENERATED** - When individual payroll generated
13. **SECURITY_ALERT** - For security events (multiple failed logins, etc)
14. **FAILED_RECOGNITION** - When face recognition fails
15. **SYSTEM_ALERT** - For general system events
16. **DEPARTMENT_CREATED** - When department created
17. **DEPARTMENT_UPDATED** - When department updated

---

## 📡 API ENDPOINTS

### Get Notifications

```
GET /api/notifications?recipientId=X&recipientType=Admin&isRead=false&limit=20&skip=0
```

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "_id": "...",
      "title": "✅ Clock In Recorded",
      "message": "John Doe clocked in at 09:00 AM",
      "type": "attendance",
      "priority": "medium",
      "isRead": false,
      "createdAt": "2025-01-10T09:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 8
}
```

### Get Unread Count

```
GET /api/notifications/unread-count?recipientId=X&recipientType=Admin
```

### Mark as Read

```
POST /api/notifications/:id/read
```

### Create Notification (Manual)

```
POST /api/notifications
{
  "type": "attendance",
  "title": "Custom Title",
  "message": "Custom message",
  "recipientType": "Admin",
  "recipientId": "...",
  "priority": "high",
  "data": { ... }
}
```

---

## ⚙️ CONFIGURATION

All settings are in `utils/notificationRules.js`:

```javascript
// Notification priority mapping
const metadata = getNotificationMetadata(actionType);
// Returns: { priority, notificationType, sendEmail, sendPush, etc }

// Recipient rules
const recipients = await getRecipientsForAction(actionType, payload);
// Returns: { admins: [], hostCompany: [], department: [], specific: [] }
```

---

## 🔐 SECURITY CONSIDERATIONS

1. **Authentication**: Socket.IO validates `userId` and `userType` in connection auth
2. **Authorization**: Only send notifications to users with appropriate role/permissions
3. **Data Privacy**: Don't include sensitive data in notification messages
4. **Rate Limiting**: Consider adding rate limits for notification creation
5. **Validation**: All action payloads are validated before creating notifications

---

## 🐛 TROUBLESHOOTING

### WebSocket Not Connecting

**Solution**: Check that:
- Backend Socket.IO is initialized properly
- CORS is configured correctly
- Client is using correct API URL
- Firewall/proxy allows WebSocket connections

### Notifications Not Appearing

**Solution**: Check that:
- User is connected to WebSocket (check `eventEmitter.getActiveConnections()`)
- Action log was called with correct recipientType
- Notification rules engine is returning correct recipients
- Database connection is working

### Real-time Delivery Not Working

**Solution**:
- Check browser console for Socket.IO errors
- Verify Socket.IO events are being emitted
- Check network tab for WebSocket connection
- Enable debug logging: `localStorage.debug = 'socket.io-client:socket'`

---

## 📈 MONITORING

### Active Connections

```javascript
const count = eventEmitter.getActiveConnections();
const adminCount = eventEmitter.getActiveConnections('admin');
```

### Check Health

```
GET /api/health
{
  "status": "OK",
  "websocket": {
    "status": "ready",
    "activeConnections": 45
  }
}
```

---

## 🎯 NEXT STEPS

1. **Install Socket.IO**: `npm install socket.io` in backend
2. **Test WebSocket**: Connect with test client and verify events
3. **Integrate Actions**: Add `logAction()` calls to all routes
4. **Deploy**: Test in development, then production
5. **Monitor**: Watch logs for connection issues

---

## 📞 SUPPORT

For issues or questions, refer to:
- Socket.IO Docs: https://socket.io/docs/
- Mongoose Docs: https://mongoosejs.com/docs/
- Expo Notifications: https://docs.expo.dev/modules/notifications/
- Electron IPC: https://www.electronjs.org/docs/api/ipc-main
