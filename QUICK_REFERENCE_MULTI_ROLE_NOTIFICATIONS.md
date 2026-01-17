# Multi-Role Notification System - QUICK REFERENCE

## 🎯 DELIVERABLES SUMMARY

### FILES MODIFIED (Backend)
1. `FaceClockBackend/utils/notificationRules.js` - Added 12 new action cases + metadata
2. `FaceClockBackend/utils/eventEmitter.js` - Added 6 new Socket.IO emission methods
3. `FaceClockBackend/utils/actionLogger.js` - Added message templates for new notification types

### FILES CREATED (Mobile App)
1. `FaceClockApp/context/NotificationContext.js` - Notification state management
2. `FaceClockApp/services/notificationService.js` - Socket.IO client integration
3. `FaceClockApp/screens/Shared/Recents.js` - Activities screen with filtering

### FILES MODIFIED (Mobile App)
1. `FaceClockApp/components/NotificationBell.js` - Updated to use NotificationContext
2. `FaceClockApp/App.js` - Added NotificationProvider wrapper & Recents screen

### FILES REFERENCED (No changes needed)
1. `FaceClockBackend/models/Notification.js` - Schema already supports all roles
2. `FaceClockApp/screens/Intern/Dashboard.js` - NotificationBell already integrated

---

## 🔄 DATA FLOW

### New Notification Trigger (Example: Intern Missing Clock-In)
```
1. Backend API detects missing clock-in
   → Calls: eventEmitter.emitAction('INTERN_MISSING_CLOCKIN', {internId, hostCompanyId, date})

2. eventEmitter.emitAction() → getRecipientsForAction()
   → Returns: {admins: [...], hostCompany: [...], specific: [internId]}

3. actionLogger.createNotification()
   → Creates 3 Notification documents:
     - recipientType='Admin' for each admin
     - recipientType='HostCompany' for each company admin
     - recipientType='Intern' for the intern

4. Socket.IO emission via eventEmitter methods:
   - eventEmitter.sendToUser(adminId, 'Admin', notification)
   - eventEmitter.sendToUser(companyAdminId, 'HostCompany', notification)
   - eventEmitter.sendToIntern(internId, notification)

5. Connected clients receive in real-time:
   - Admin Dashboard → sees "❌ Missing Clock-In"
   - Host Company Dashboard → sees "❌ Staff Missing Clock-In"
   - Intern Mobile → sees "❌ Missing Clock-In"

6. If not connected → Persisted in DB → Fetched on next login via GET /api/notifications
```

---

## 📋 NEW NOTIFICATION TYPES

### INTERN (Mobile Only)
| Type | Recipients | Message | Icon |
|------|-----------|---------|------|
| INTERN_REPORTED | Admin, HostCompany, Intern | "You have been reported" | ⚠️ |
| INTERN_FLAGGED | Admin, HostCompany, Intern | "Account flagged" | 🚩 |
| INTERN_NOT_ACCOUNTABLE | Admin, HostCompany, Intern | "Marked as not accountable" | ⚠️ |
| INTERN_MISSING_CLOCKIN | Admin, HostCompany, Intern | "Missing clock-in" | ❌ |
| INTERN_MISSING_CLOCKOUT | Admin, HostCompany, Intern | "Missing clock-out" | ❌ |

### HOST COMPANY (Desktop + Mobile)
| Type | Recipients | Message | Icon |
|------|-----------|---------|------|
| STAFF_CLOCKIN | HostCompany only | "{Name} clocked in" | ✅ |
| STAFF_CLOCKOUT | HostCompany only | "{Name} clocked out" | ⏹️ |
| STAFF_CLOCKIN_LATE | Admin, HostCompany | "{Name} clocked in late" | ⏰ |
| STAFF_MISSING_CLOCKIN | Admin, HostCompany | "{Name} missing clock-in" | ❌ |
| STAFF_MISSING_CLOCKOUT | Admin, HostCompany | "{Name} missing clock-out" | ❌ |
| STAFF_ABSENT | Admin, HostCompany | "{Name} marked absent" | 📋 |
| REPORT_ACTION_TAKEN | Admin, HostCompany | "Action taken on report" | ✅ |

---

## 🧪 TEST SCENARIOS

### Scenario 1: Intern Gets Reported
```
Step 1: Admin reports an intern
→ Backend: emitAction('INTERN_REPORTED', {internId, hostCompanyId, ...})

Step 2: Check notifications
→ Admin Dashboard: Sees "⚠️ You have been reported"
→ Host Company Dashboard: Sees "⚠️ {InternName} reported"
→ Intern Mobile: Sees "⚠️ You have been reported"
→ Database: 3 Notification documents created

Step 3: Navigate
→ Intern taps bell → Recents screen shows the report
→ Host Company taps bell → Recents shows staff activities
```

### Scenario 2: Staff Clocks In Late (Host Company Perspective)
```
Step 1: Staff clocks in late
→ Backend: emitAction('STAFF_CLOCKIN_LATE', {staffName, hostCompanyId, ...})

Step 2: Check notifications
→ Admin Dashboard: Sees "⏰ {Staff} clocked in late"
→ Host Company Mobile: Bell shows 1 unread
→ Intern Mobile: No notification

Step 3: Filter in Recents
→ Host Company: Tap bell → Recents → Filter by "Last 10" → See only this company's events
```

### Scenario 3: Data Isolation
```
Step 1: Intern A logs in
→ Sees only Intern A's notifications
→ Recents shows: "❌ Missing Clock-In", "🚩 Flagged", etc.

Step 2: Intern A logs out, Intern B logs in
→ Sees only Intern B's notifications
→ Different set of events

Step 3: Host Company 1 logs in
→ Sees only staff from Host Company 1
→ Staff clocking in/out from Host Company 2 not visible

Step 4: Host Company 1 logs out, Host Company 2 logs in
→ Sees only staff from Host Company 2
```

---

## 🔒 SECURITY NOTES

1. **Socket.IO Auth**: Every connection requires `{userId, userType}`
2. **Recipient Filtering**: Notifications created with specific `recipientId` and `recipientType`
3. **No Broadcasting**: Notifications targeted to specific users, not broadcast globally
4. **API Filtering**: GET /api/notifications filters by `recipientId` and `recipientType`
5. **Database Indexes**: Optimized for querying by `recipientType:1, recipientId:1`

---

## 🚀 DEPLOYMENT STEPS

### Phase 1: Backend
```bash
# Deploy notificationRules.js changes
# Deploy eventEmitter.js changes
# Deploy actionLogger.js changes
# Restart backend server
# Test: Send test notification via API
```

### Phase 2: Mobile App
```bash
# Deploy context/NotificationContext.js
# Deploy services/notificationService.js
# Deploy screens/Shared/Recents.js
# Deploy updated App.js
# Deploy updated components/NotificationBell.js
# Build and deploy mobile app
# Test: Login as Intern → See bell → Tap → View Recents
```

### Phase 3: Verification
```bash
# Verify Admin Desktop still works (regression test)
# Verify Intern Mobile receives correct notifications
# Verify Host Company Mobile receives correct notifications
# Verify no data leakage between roles
# Verify mark-as-read functionality
# Monitor logs for Socket.IO connections
```

---

## 📊 VERIFICATION CHECKLIST

- [ ] Admin can still see all notifications (backward compatibility)
- [ ] Intern receives ONLY their own notifications
- [ ] Host Company receives ONLY their staff notifications
- [ ] Admin does NOT see "STAFF_CLOCKIN" (low priority host company events)
- [ ] Intern does NOT see other interns' notifications
- [ ] Badge count matches unread count
- [ ] Mark-as-read updates persist across sessions
- [ ] No duplicate notifications on reconnect
- [ ] Socket.IO connections show correct auth info
- [ ] Database queries filtered correctly
- [ ] Mobile and Desktop apps behave identically

---

## 🔧 DEBUGGING

### Check Socket.IO Connections
```javascript
// Backend console
eventEmitter.getActiveConnections('Intern')  // Count of connected interns
eventEmitter.getActiveConnections('HostCompany')  // Count of host companies
eventEmitter.getActiveConnections('Admin')  // Count of admins
eventEmitter.getActiveConnections()  // Total connections
```

### Check Notifications in Database
```javascript
// MongoDB
db.notifications.find({recipientType: 'Intern', recipientId: internId})
db.notifications.find({recipientType: 'HostCompany', recipientId: companyId})
db.notifications.find({recipientType: 'Admin', recipientId: adminId})
```

### Check Mobile Logs
```
Look for:
✅ Connected to notification server
📌 Registered as: Intern (internId)
📢 New notification: [TYPE]
📤 Emitted to [userType]:[userId]
```

---

## 💡 KEY DECISIONS

1. **Separate Notification Documents**: Each role gets their own document (not shared)
   - Pro: Simple filtering, clear audit trail
   - Con: More DB storage (minimal)

2. **Socket.IO over Polling**: Real-time Socket.IO with 30-second polling fallback
   - Pro: Low latency, offline resilience
   - Con: Requires Socket.IO server

3. **Same API Endpoint**: Single `/api/notifications` endpoint filtered by recipient
   - Pro: Single source of truth, less duplication
   - Con: Need to trust client's recipientId (mitigated by auth)

4. **Recents Screen for All Roles**: Same component, role-specific views
   - Pro: Code reuse, consistent UX
   - Con: More conditional logic

---

## 📚 REFERENCE IMPLEMENTATION

Look at existing patterns:
- **Admin Notifications**: `FaceClockDesktop/src/components/Notifications/`
- **Socket.IO Setup**: `FaceClockBackend/server.js`
- **Action Logging**: `FaceClockBackend/routes/staff.js` (clock-in endpoint)

These are the reference implementations - new code follows the same patterns.
