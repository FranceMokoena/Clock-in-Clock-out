# 🗺️ Notification System - Code Locations Map

## Backend Integration Points

All logAction() calls are in `FaceClockBackend/routes/staff.js`

### 1. Staff Registration (Line 548-558)
```
Location: staff.js, lines 548-558
After:    await staff.save();
Action:   STAFF_REGISTERED
Triggered: When new staff member is registered via /register endpoint
Recipients: All admins + Host company
```

**Code Block:**
```javascript
await staff.save();

// 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
await logAction('STAFF_REGISTERED', {
  staffId: staff._id?.toString(),
  staffName: `${staff.name} ${staff.surname}`,
  role: staff.role,
  idNumber: staff.idNumber,
  hostCompanyId: staff.hostCompanyId?.toString(),
  departmentId: staff.department?.toString(),
  email: staff.email
}, null);
```

---

### 2. Clock In/Out (Line 1390-1410)
```
Location: staff.js, lines 1390-1410
After:    Promise.race([savePromise, timeoutPromise]); (clock log save)
Action:   CLOCK_IN
Triggered: Every time staff member clocks in/out
Recipients: All admins + Host company + Department managers
```

**Code Block:**
```javascript
await Promise.race([savePromise, timeoutPromise]);
const saveTime = Date.now() - saveStartTime;
console.log(`✅ Clock log saved for ${staff.name}`);

// 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
await logAction('CLOCK_IN', {
  staffId: staff._id.toString(),
  staffName: staff.name,
  timestamp: timestamp,
  hostCompanyId: staff.hostCompanyId?.toString(),
  departmentId: staff.department?.toString(),
  clockLogId: clockLog._id?.toString(),
  location: req.body.location || 'Unknown',
  type: type,
  confidence: confidence
}, req.user?._id);
```

---

### 3. Leave Request (Line 3643-3665)
```
Location: staff.js, lines 3643-3665
After:    await application.save(); (leave application save)
Action:   LEAVE_REQUEST
Triggered: When staff submits leave request
Recipients: All admins + Host company + Department managers + Requester
Endpoint:  POST /intern/leave-applications
```

**Code Block:**
```javascript
await application.save();

// 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
await logAction('LEAVE_REQUEST', {
  staffId: internId,
  staffName: internName,
  leaveType: leaveType,
  startDate: parsedStart,
  endDate: parsedEnd,
  numberOfDays: numberOfDays,
  reason: reason,
  hostCompanyId: validatedHostCompanyId?.toString(),
  leaveApplicationId: application._id?.toString()
}, createdById);
```

---

### 4. Leave Approval/Rejection (Line 3822-3848)
```
Location: staff.js, lines 3822-3848
After:    await application.save(); (after status update)
Action:   LEAVE_APPROVED or LEAVE_REJECTED
Triggered: When admin/manager reviews leave request
Recipients: Requester + All admins + Host company + Department managers
Endpoint:  PUT /admin/leave-applications/:id
```

**Code Block:**
```javascript
await application.save();

// 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
const actionType = action === 'approve' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED';
await logAction(actionType, {
  staffId: application.internId?.toString(),
  staffName: application.internName,
  leaveType: application.leaveType,
  startDate: application.startDate,
  endDate: application.endDate,
  leaveApplicationId: application._id?.toString(),
  hostCompanyId: application.hostCompanyId?.toString(),
  rejectionReason: action === 'reject' ? rejectionReason : undefined,
  reviewedBy: reviewedBy,
  reviewerRole: reviewerRole
}, reviewedBy);
```

---

### 5. Attendance Correction Request (Line 3283-3308)
```
Location: staff.js, lines 3283-3308
After:    await correction.save(); (correction save)
Action:   ATTENDANCE_CORRECTION_REQUEST
Triggered: When staff submits correction request
Recipients: All admins + Host company + Department managers
Endpoint:  POST /intern/attendance-corrections
```

**Code Block:**
```javascript
await correction.save();

// 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
await logAction('ATTENDANCE_CORRECTION_REQUEST', {
  staffId: internId,
  staffName: internName,
  date: parsedDate,
  correctionType: correctionType,
  description: requestedChange?.description,
  originalTime: requestedChange?.originalTime,
  correctedTime: requestedChange?.requestedTime,
  reason: requestedChange?.reason,
  hostCompanyId: hostCompanyId?.toString(),
  attendanceCorrectionId: correction._id?.toString()
}, null);
```

---

### 6. Attendance Correction Approval/Rejection (Line 3466-3488)
```
Location: staff.js, lines 3466-3488
After:    await correction.save(); (after status update)
Action:   CORRECTION_APPROVED or CORRECTION_REJECTED
Triggered: When admin/manager reviews correction request
Recipients: Requester + All admins + Host company + Department managers
Endpoint:  PUT /admin/attendance-corrections/:id
```

**Code Block:**
```javascript
await correction.save();

// 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
const actionType = action === 'approve' ? 'CORRECTION_APPROVED' : 'CORRECTION_REJECTED';
await logAction(actionType, {
  staffId: correction.internId?.toString(),
  staffName: correction.internName,
  date: correction.date,
  correctionType: correction.correctionType,
  originalTime: correction.requestedChange?.originalTime,
  correctedTime: correction.requestedChange?.requestedTime,
  attendanceCorrectionId: correction._id?.toString(),
  hostCompanyId: correction.hostCompanyId?.toString(),
  rejectionReason: action === 'reject' ? rejectionReason : undefined,
  reviewedBy: reviewedBy,
  reviewerRole: reviewerRole
}, reviewedBy);
```

---

### 7. Staff Removal (Line 5365-5408)
```
Location: staff.js, lines 5365-5408
After:    await Staff.findByIdAndDelete(staffId);
Action:   STAFF_REMOVED
Triggered: When admin deletes staff member
Recipients: All admins + Host company
Endpoint:  DELETE /admin/staff/:staffId
```

**Code Block:**
```javascript
// Delete the staff member
await Staff.findByIdAndDelete(staffId);

// 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
await logAction('STAFF_REMOVED', {
  staffId: staffIdString,
  staffName: staffName,
  role: staff.role,
  idNumber: staff.idNumber,
  hostCompanyId: hostCompanyId,
  departmentId: staff.department?.toString()
}, null);
```

---

## Utility Files Location

### Event Emitter (Socket.IO Manager)
**File:** `FaceClockBackend/utils/eventEmitter.js`
**Lines:** 152 total
**Purpose:** Central hub for managing Socket.IO connections and broadcasting events

**Key Methods:**
- `registerSocketIO(io)` - Register Socket.IO instance
- `emitAction(actionType, payload)` - Log and emit events
- `sendToUser(userId, userType, notification)` - Send to specific user
- `broadcastToType(userType, notification)` - Send to all of a type
- `getActiveConnections()` - Get active user count

---

### Action Logger Service
**File:** `FaceClockBackend/utils/actionLogger.js`
**Lines:** 393 total
**Purpose:** Create notifications and route them to recipients

**Main Export:**
```javascript
async logAction(actionType, payload, initiatedBy)
```

**Supported Action Types:**
```
CLOCK_IN, CLOCK_OUT, STAFF_REGISTERED, STAFF_REMOVED,
LEAVE_REQUEST, LEAVE_APPROVED, LEAVE_REJECTED,
ATTENDANCE_CORRECTION_REQUEST, CORRECTION_APPROVED, CORRECTION_REJECTED,
SECURITY_ALERT, FAILED_RECOGNITION, PAYROLL_PROCESSED
```

---

### Notification Routing Rules
**File:** `FaceClockBackend/utils/notificationRules.js`
**Lines:** 346 total
**Purpose:** Determine who receives each notification type

**Main Function:**
```javascript
getRecipientsForAction(actionType, payload)
```

**Returns:**
```javascript
{
  admins: [admin_ids],
  hostCompany: [company_rep_ids],
  department: [manager_ids],
  specific: [staff_ids]
}
```

---

### Notification Model
**File:** `FaceClockBackend/models/Notification.js`
**Purpose:** MongoDB schema for storing notifications

**Key Fields:**
```
actionType: String (CLOCK_IN, LEAVE_REQUEST, etc.)
payload: Object (raw action data)
source: String (mobile_app, desktop_app, api, system)
recipientId: ObjectId (who receives the notification)
recipientType: String (admin, staff, hostCompany, departmentManager)
priority: String (normal, high, critical)
deliveryChannels: Object (inApp, push, email, sms)
deliveryStatus: Object (status per channel)
relatedEntities: Object (references to other records)
createdAt: Date
expiresAt: Date (auto-deletes after 30 days via TTL)
```

---

### Server Setup
**File:** `FaceClockBackend/server.js`
**Location:** Socket.IO initialization already done
**Status:** ✅ Complete

**What's Configured:**
```javascript
const http = require('http');
const socketIO = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URLS?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000
});

// Register event emitter
eventEmitter.registerSocketIO(io);

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔔 Socket.IO server initialized`);
});
```

---

## Mobile App Integration Files

### Notification Handler
**File:** `FaceClockApp/utils/notificationHandler.js`
**Lines:** 300 total
**Status:** ✅ Ready for integration
**Needs:** App.js connection

**Main Export:**
```javascript
notificationHandler.initialize(userId, userType, apiBaseUrl)
notificationHandler.disconnect()
notificationHandler.getConnectionStatus()
notificationHandler.addEventListener(eventType, callback)
notificationHandler.getStoredNotifications()
```

### Notification UI Component
**File:** `FaceClockApp/components/NotificationPanel.js`
**Lines:** 400 total
**Status:** ✅ Ready for integration
**Features:**
- Toast notifications (auto-dismiss)
- Notification history panel
- Badge with unread count
- Auto-refresh every 30 seconds

---

## Desktop App Integration Files

### Notification Handler (Electron)
**File:** `FaceClockDesktop/src/utils/notificationHandler.js`
**Lines:** 280 total
**Status:** ✅ Ready for initialization
**Needs:** main.js setup

**Main Export:**
```javascript
notificationHandler.initialize()
notificationHandler.setUserContext(userId, userType)
notificationHandler.showNotification(title, options)
notificationHandler.testConnection()
```

**Features:**
- System notifications (OS-level)
- Sound alerts
- Auto-start on app launch
- Electron IPC communication

---

## Import Statement Location

**File:** `FaceClockBackend/routes/staff.js`
**Line:** 14
**Current Status:** ✅ Already added

```javascript
const { logAction } = require('../utils/actionLogger');
```

This import is already at the top of staff.js, so all endpoints have access to the logAction function.

---

## Directory Structure

```
FaceClockBackend/
├── routes/
│   └── staff.js ........................ 7 logAction integrations ✅
├── utils/
│   ├── eventEmitter.js ................ Socket.IO manager ✅
│   ├── actionLogger.js ................ Create notifications ✅
│   └── notificationRules.js ........... Route recipients ✅
├── models/
│   └── Notification.js ................ DB schema ✅
└── server.js .......................... Socket.IO init ✅

FaceClockApp/
├── utils/
│   └── notificationHandler.js ......... WebSocket client ✅
├── components/
│   └── NotificationPanel.js ........... UI component ✅
└── App.js ............................ NEEDS INTEGRATION ⚠️

FaceClockDesktop/
├── src/utils/
│   └── notificationHandler.js ......... IPC handler ✅
└── main.js ........................... NEEDS INITIALIZATION ⚠️
```

---

## Quick Navigation

| Need | File | Line |
|---|---|---|
| View clock integration | staff.js | 1390-1410 |
| View leave integration | staff.js | 3643-3665 |
| View correction integration | staff.js | 3466-3488 |
| Edit routing rules | notificationRules.js | See function |
| Debug notifications | actionLogger.js | ~350 (debug section) |
| Check DB schema | Notification.js | Full file |
| Setup mobile | notificationHandler.js | mobile app |
| Setup desktop | notificationHandler.js | desktop app |

---

## Testing Each Integration

### Test Staff Registration
```bash
POST http://localhost:5000/api/register
Check: db.notifications.find({actionType: 'STAFF_REGISTERED'})
```

### Test Clock In
```bash
POST http://localhost:5000/api/clock
Check: db.notifications.find({actionType: 'CLOCK_IN'})
```

### Test Leave Request
```bash
POST http://localhost:5000/api/intern/leave-applications
Check: db.notifications.find({actionType: 'LEAVE_REQUEST'})
```

### Test Correction Request
```bash
POST http://localhost:5000/api/intern/attendance-corrections
Check: db.notifications.find({actionType: 'ATTENDANCE_CORRECTION_REQUEST'})
```

### Test Staff Removal
```bash
DELETE http://localhost:5000/api/admin/staff/:staffId
Check: db.notifications.find({actionType: 'STAFF_REMOVED'})
```

---

## Common Modifications

### To change who gets a notification
**Edit:** `FaceClockBackend/utils/notificationRules.js`
**Find:** Function `getRecipientsForAction(actionType, payload)`
**Modify:** Case statement for your action type

### To add a new action type
**Step 1:** Add to `notificationRules.js` case statement
**Step 2:** Add `logAction('NEW_TYPE', {...}, ...)` call in endpoint
**Step 3:** Restart backend

### To add new notification fields
**Edit:** `FaceClockBackend/utils/actionLogger.js`
**Find:** `createNotification()` function
**Add:** New field to notification document

---

**Last Updated:** 2024  
**Status:** ✅ All Backend Integrations Complete  
**Mobile:** Ready for App.js connection  
**Desktop:** Ready for main.js initialization  
