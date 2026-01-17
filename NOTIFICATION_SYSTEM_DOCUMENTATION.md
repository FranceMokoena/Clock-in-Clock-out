# Notification System Documentation

## Overview
The notification system provides real-time alerts for important events in the Clock-In Management System. It includes:
- Backend API for managing notifications
- Frontend bell icon with badge counter and shake animation
- Notification dropdown list
- Auto-refresh polling (every 15 seconds)
- Mark as read functionality
- Delete notifications

## Architecture

### Backend Components

#### 1. Notification Model (`FaceClockBackend/models/Notification.js`)
Stores notification data with fields:
- `type`: LATE_CLOCKIN, NEW_INTERN, NEW_STAFF, INTERN_REPORTED, INTERN_ABSENT, MISSING_CLOCKIN
- `title`: Notification title
- `message`: Notification message
- `recipientType`: HR, HostCompany, Intern, All
- `recipientId`: Specific recipient (if applicable)
- `relatedId`: Related entity ID (staff/intern/etc)
- `priority`: low, medium, high, urgent
- `isRead`: Boolean flag
- `readAt`: Date when read
- `createdAt`: Timestamp

#### 2. API Routes (`FaceClockBackend/routes/notifications.js`)

**GET /api/notifications**
- Fetch notifications for a user
- Query params: `recipientId`, `recipientType`, `isRead`, `limit`, `skip`
- Returns: Array of notifications with pagination

**GET /api/notifications/unread-count**
- Get count of unread notifications
- Query params: `recipientId`, `recipientType`
- Returns: `{ unreadCount: number }`

**POST /api/notifications**
- Create a new notification (admin/backend only)
- Body: `{ type, title, message, recipientType, recipientId, relatedId, priority }`
- Returns: Created notification

**POST /api/notifications/:id/read**
- Mark specific notification as read
- Returns: Updated notification with `readAt` timestamp

**POST /api/notifications/read-all**
- Mark all unread notifications as read for a user
- Body: `{ recipientId, recipientType }`
- Returns: `{ modifiedCount: number }`

**DELETE /api/notifications/:id**
- Delete a specific notification

**DELETE /api/notifications/delete-all**
- Delete all notifications for a user
- Body: `{ recipientId, recipientType }`

#### 3. Notification Helper (`FaceClockBackend/utils/notificationHelper.js`)

Utility functions for creating notifications:
- `notifyLateClockin(staffId, staffName, hostCompanyId)`
- `notifyNewIntern(internId, internName, hostCompanyId)`
- `notifyNewStaff(staffId, staffName, hostCompanyId)`
- `notifyInternReported(internId, internName, reason, hostCompanyId)`
- `notifyInternAbsent(internId, internName, hostCompanyId)`
- `notifyMissingClockin(staffId, staffName, hostCompanyId)`
- `createNotification(type, title, message, recipientType, recipientId, relatedId, priority)`

### Frontend Components (Desktop)

#### 1. NotificationContext (`src/components/Notifications/NotificationContext.jsx`)
Global state management using React Context:
- `notifications`: Array of notifications
- `unreadCount`: Number of unread notifications
- `loading`: Loading state
- `loadNotifications()`: Fetch notifications from API
- `markAsRead(notificationId)`: Mark single notification as read
- `markAllAsRead()`: Mark all as read
- `deleteNotification(notificationId)`: Delete notification

Auto-fetches notifications on mount and polls every 15 seconds.

#### 2. NotificationBell Component (`src/components/Notifications/NotificationBell.jsx`)
- Displays bell icon with unread count badge
- Shake animation triggers on new notifications (for 30 seconds)
- Accessible keyboard navigation (Enter/Space)

#### 3. NotificationList Component (`src/components/Notifications/NotificationList.jsx`)
Dropdown list showing:
- All notifications sorted by date (newest first)
- Visual indicator for unread notifications
- Click to mark as read and navigate
- Delete button for each notification
- "Mark all as read" button
- Empty state when no notifications
- Loading spinner

#### 4. Notification Service (`src/components/Notifications/notificationService.js`)
API client functions:
- `fetchNotifications()`: Fetch all notifications
- `getUnreadCount()`: Get count of unread
- `createNotification()`: Create new notification
- `markNotificationAsRead()`: Mark as read
- `markAllNotificationsAsRead()`: Mark all as read
- `deleteNotification()`: Delete single
- `deleteAllNotifications()`: Delete all

#### 5. Notification Utils (`src/components/Notifications/notificationUtils.js`)
Helper functions:
- `formatNotificationType(type)`: Convert type to readable format
- `getNotificationIcon(type)`: Get icon component for type
- `getNotificationColor(type)`: Get color for type
- `formatTimeAgo(date)`: Format timestamp as "X minutes ago"
- `getNavigationUrl(notification)`: Get URL for notification type
- `filterNotificationsByType(notifications, type)`: Filter array
- `sortNotificationsByDate(notifications, order)`: Sort array
- `groupNotificationsByType(notifications)`: Group by type

## Integration Guide

### Backend Integration

1. **Import notification helper in your routes:**
```javascript
const notificationHelper = require('../utils/notificationHelper');
```

2. **Create notifications when events occur:**
```javascript
// When staff clocks in late
await notificationHelper.notifyLateClockin(staffId, staffName, hostCompanyId);

// When new intern registers
await notificationHelper.notifyNewIntern(internId, internName, hostCompanyId);
```

3. **Register the notifications route in server.js:**
```javascript
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);
```

### Frontend Integration

1. **Wrap Dashboard with NotificationProvider:**
```jsx
<NotificationProvider recipientId={user?.id} recipientType={userRole}>
  {/* Dashboard content */}
</NotificationProvider>
```

2. **Add bell in header:**
```jsx
import NotificationBell from '../components/Notifications/NotificationBell';
import NotificationList from '../components/Notifications/NotificationList';

<NotificationBell onClick={() => setShowNotifications(!showNotifications)} />
{showNotifications && <NotificationList onSelect={handleSelect} />}
```

3. **Handle notification selection:**
```jsx
const handleNotificationSelect = (notification) => {
  // Navigate based on notification type
  const url = getNavigationUrl(notification);
  window.location.href = url;
};
```

## Notification Types and Triggers

### LATE_CLOCKIN
- **Triggered**: When staff clocks in after work hours
- **Recipients**: Host Company / HR
- **Priority**: High
- **Action**: Navigate to Not Accountable view

### NEW_INTERN
- **Triggered**: When new intern is registered
- **Recipients**: All (HR, Host Company, Admins)
- **Priority**: Medium
- **Action**: Navigate to Staff list

### NEW_STAFF
- **Triggered**: When new staff member is registered
- **Recipients**: HR
- **Priority**: Medium
- **Action**: Navigate to Staff list

### INTERN_REPORTED
- **Triggered**: When intern is reported (misconduct, absence, etc.)
- **Recipients**: Host Company / HR
- **Priority**: Urgent
- **Action**: Navigate to Leave Applications

### INTERN_ABSENT
- **Triggered**: When intern is marked absent
- **Recipients**: Host Company / HR
- **Priority**: High
- **Action**: Navigate to Staff list

### MISSING_CLOCKIN
- **Triggered**: When staff hasn't clocked in by end of day
- **Recipients**: Host Company / HR
- **Priority**: High
- **Action**: Navigate to Not Accountable view

## Features

### Visual Indicators
- **Badge Counter**: Shows number of unread notifications
- **Shake Animation**: Bell shakes for 30 seconds when new notification arrives
- **Blue Dot**: Indicates unread notifications in list
- **Different Colors**: Icons use colors to indicate urgency/type

### User Experience
- **Auto-refresh**: Polls for new notifications every 15 seconds
- **Mark as Read**: Click notification to mark as read and navigate
- **Batch Actions**: "Mark all as read" button
- **Delete**: Remove individual notifications
- **Responsive**: Works on desktop and mobile
- **Empty State**: Shows message when no notifications

### Accessibility
- Keyboard navigation (Tab, Enter, Space)
- ARIA labels and roles
- Semantic HTML structure
- High contrast colors

## API Response Examples

### GET /api/notifications
```json
{
  "success": true,
  "notifications": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "LATE_CLOCKIN",
      "title": "Late Clock-In",
      "message": "John Doe clocked in late today",
      "recipientType": "HostCompany",
      "relatedId": "507f1f77bcf86cd799439012",
      "isRead": false,
      "priority": "high",
      "createdAt": "2026-01-10T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

### POST /api/notifications
```json
{
  "type": "LATE_CLOCKIN",
  "title": "Late Clock-In",
  "message": "John clocked in late",
  "recipientType": "HostCompany",
  "recipientId": "507f1f77bcf86cd799439011",
  "priority": "high"
}
```

## Configuration

### Polling Interval
Default: 15 seconds. To change, modify in `NotificationContext.jsx`:
```javascript
const interval = setInterval(loadNotifications, 15000); // Change 15000 to desired ms
```

### API Base URL
Set in `notificationService.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000'; // Change as needed
```

### Shake Duration
Default: 30 seconds. To change, modify in `NotificationBell.jsx`:
```javascript
const timer = setTimeout(() => setShake(false), 30000); // Change 30000 to desired ms
```

## Future Enhancements

1. **WebSocket Support**: Replace polling with real-time WebSocket connection
2. **Sound Alerts**: Play notification sound on new messages
3. **Desktop Notifications**: Use browser notification API
4. **Email Notifications**: Send email for urgent notifications
5. **Notification Preferences**: Let users customize notification types
6. **Batch Notifications**: Group similar notifications together
7. **Notification History**: Archive old notifications
8. **Scheduled Notifications**: Schedule notifications for later

## Troubleshooting

### Notifications not appearing
1. Check API endpoint is registered in `server.js`
2. Verify `recipientType` and `recipientId` match user
3. Check browser console for errors
4. Verify notification is created in database

### Bell not shaking
1. Check `NotificationBell.jsx` for CSS class `shake`
2. Verify unread count is updating
3. Check if shake timeout is too short

### List not showing
1. Check if `NotificationProvider` wraps component
2. Verify `fetchNotifications` returns data
3. Check API response in network tab
4. Verify `recipientId` is passed to provider

## Performance Notes

- Pagination: Uses default limit of 20 notifications
- Indexing: Database has indexes on key fields for fast queries
- Polling: 15-second intervals balance freshness and server load
- Caching: Consider adding Redis for frequently accessed notifications

## Security Considerations

1. **Authorization**: Validate user can only see their notifications
2. **Data Validation**: Sanitize all input in backend
3. **Rate Limiting**: Add rate limits to notification endpoints
4. **XSS Prevention**: Sanitize notification messages before display
5. **CSRF Protection**: Ensure POST requests use CSRF tokens if enabled

