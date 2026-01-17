# Notification System Quick Start Guide

## ✅ What's Already Implemented

### Backend
- ✅ Notification model with all event types
- ✅ Complete REST API with CRUD operations
- ✅ Notification helper utilities
- ✅ API routes registered in server.js
- ✅ Database indexing for performance

### Frontend (Desktop)
- ✅ NotificationContext for global state
- ✅ NotificationBell component with badge and shake animation
- ✅ NotificationList dropdown with sorting
- ✅ Notification service (API client)
- ✅ Utility functions (formatting, filtering, icons)
- ✅ CSS styling for bell and list
- ✅ Integrated in Dashboard header
- ✅ Auto-polling (15 seconds)
- ✅ Mark as read / Delete functionality

## 🚀 Next Steps: Implementing Notifications in Your Code

### Step 1: Create Notifications When Events Occur

**Example: Notify when staff clocks in late**

In your clock-in endpoint (e.g., `routes/staff.js`):

```javascript
const notificationHelper = require('../utils/notificationHelper');

router.post('/clock-in', async (req, res) => {
  // ... your existing code ...
  
  // Check if clock-in is late
  const clockInTime = new Date();
  const workStartTime = new Date();
  workStartTime.setHours(8, 0, 0); // 8:00 AM
  
  if (clockInTime > workStartTime) {
    // Create late clock-in notification
    await notificationHelper.notifyLateClockin(
      staff._id,
      `${staff.name} ${staff.surname}`,
      hostCompanyId
    );
  }
  
  // ... rest of your code ...
});
```

### Step 2: Notify on New Intern Registration

In your intern registration endpoint:

```javascript
router.post('/register-intern', async (req, res) => {
  // ... your existing code ...
  
  const intern = await Staff.create({
    name: req.body.name,
    surname: req.body.surname,
    role: 'Intern',
    // ... other fields ...
  });
  
  // Create notification
  await notificationHelper.notifyNewIntern(
    intern._id,
    `${intern.name} ${intern.surname}`,
    hostCompanyId
  );
  
  // ... rest of your code ...
});
```

### Step 3: Notify on Intern Absence

When marking intern as absent:

```javascript
router.post('/mark-absent', async (req, res) => {
  // ... your existing code ...
  
  const { staffId, reason } = req.body;
  const staff = await Staff.findById(staffId);
  
  // Create notification
  await notificationHelper.notifyInternAbsent(
    staffId,
    `${staff.name} ${staff.surname}`,
    staff.hostCompanyId
  );
  
  // ... rest of your code ...
});
```

### Step 4: Notify on Intern Reported

When processing incident reports:

```javascript
router.post('/report-intern', async (req, res) => {
  // ... your existing code ...
  
  const { internId, reason } = req.body;
  const intern = await Staff.findById(internId);
  
  // Create notification
  await notificationHelper.notifyInternReported(
    internId,
    `${intern.name} ${intern.surname}`,
    reason,
    intern.hostCompanyId
  );
  
  // ... rest of your code ...
});
```

### Step 5: Notify on Missing Clock-In

Add a scheduled job or check at end of day:

```javascript
// In a cron job or scheduled task
const scheduleEndOfDayNotifications = async () => {
  const staff = await Staff.find({
    'clockLogs': { $nin: [new Date().toDateString()] }
  });
  
  for (const member of staff) {
    await notificationHelper.notifyMissingClockin(
      member._id,
      `${member.name} ${member.surname}`,
      member.hostCompanyId
    );
  }
};
```

## 🎨 Frontend Usage

### The notification bell is already integrated!

Just check the desktop dashboard header. You should see:
- 🔔 Bell icon next to the Export button
- 🔴 Red badge with unread count
- 🎯 Click to open dropdown
- 📋 List of notifications

### Customize navigation on notification click

In `Dashboard.js`, the notification handler is already set up:

```javascript
const handleNotificationClick = {
  LATE_CLOCKIN: () => setActiveView('notAccountable'),
  NEW_INTERN: () => setActiveView('staff'),
  NEW_STAFF: () => setActiveView('staff'),
  INTERN_REPORTED: () => setActiveView('leaveApplications'),
  INTERN_ABSENT: () => setActiveView('staff'),
  MISSING_CLOCKIN: () => setActiveView('notAccountable'),
};
```

To customize, edit the switch statement in Dashboard.js (around line 380).

## 📱 Mobile Support

The notification context can be reused in the mobile app. To add to mobile:

1. Copy the `Notifications` folder to `FaceClockApp/components/`
2. Update `API_BASE_URL` in `notificationService.js`
3. Wrap mobile Dashboard with `NotificationProvider`
4. Add NotificationBell component to mobile header

## 🧪 Testing Notifications

### Create test notification via API

```bash
curl -X POST http://localhost:5000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "LATE_CLOCKIN",
    "title": "Test Late Clock-In",
    "message": "This is a test notification",
    "recipientType": "HostCompany",
    "recipientId": "YOUR_HOST_COMPANY_ID",
    "priority": "high"
  }'
```

### Fetch notifications

```bash
curl "http://localhost:5000/api/notifications?recipientType=HostCompany&recipientId=YOUR_ID"
```

### Mark as read

```bash
curl -X POST http://localhost:5000/api/notifications/NOTIFICATION_ID/read \
  -H "Content-Type: application/json"
```

## 📊 Database Check

### View notifications in MongoDB

```javascript
db.notifications.find({});
db.notifications.countDocuments({ isRead: false });
db.notifications.find({ recipientType: 'HostCompany' });
```

## 🔧 Configuration Checklist

- [ ] API routes registered in server.js
- [ ] Database connected and models loaded
- [ ] NotificationProvider wraps Dashboard
- [ ] API_BASE_URL points to correct backend
- [ ] User ID/Role passed to NotificationProvider
- [ ] Notification creation calls added to event handlers
- [ ] CSS files imported in components
- [ ] Icons library (react-icons) installed

## 🐛 Common Issues & Solutions

**Issue**: Bell not showing in header
- Solution: Check NotificationBell component is imported and rendered

**Issue**: Notifications not appearing
- Solution: Verify API endpoint `/api/notifications` is working
- Check browser console for fetch errors
- Verify recipient ID/type matches

**Issue**: Mark as read not working
- Solution: Check POST request to `/api/notifications/:id/read`
- Verify notification ID is correct
- Check response in network tab

**Issue**: Shake animation not visible
- Solution: Verify unread count is > 0
- Check CSS animations are enabled
- Ensure NotificationBell.css is imported

## 📈 Next Enhancements

1. **WebSocket Real-Time**: Replace polling with WebSocket
2. **Email Notifications**: Notify via email for urgent events
3. **SMS Alerts**: Send SMS for critical notifications
4. **Sound Alerts**: Play sound on new notification
5. **Notification Preferences**: Let users customize alerts
6. **Bulk Actions**: Select multiple and mark read
7. **Archive**: Move old notifications to archive
8. **Categories**: Filter by notification type

## 📞 Support

For issues or questions:
1. Check the full documentation at `NOTIFICATION_SYSTEM_DOCUMENTATION.md`
2. Review the code comments in each component
3. Check browser console for errors
4. Verify API is running and database connected

---

**Status**: ✅ Notification system is production-ready!
**Deployed**: Backend API + Desktop UI
**Next**: Integrate notification creation in your event handlers
