import io from 'socket.io-client';
import API_BASE_URL from '../../config/api';

const API_HTTP_BASE = API_BASE_URL.replace(/\/$/, '');
const API_ROOT_URL = API_HTTP_BASE.replace(/\/api$/i, '');
let socket = null;
let currentRecipientId = null;
let currentRecipientType = null;

/**
 * Initialize Socket.IO connection for real-time notifications
 */
export const initializeSocket = (recipientId, recipientType) => {
  if (!recipientId || !recipientType) {
    console.warn('Socket not initialized: missing recipient details');
    return socket;
  }

  const isSameRecipient = socket && socket.connected &&
    recipientId === currentRecipientId &&
    recipientType === currentRecipientType;

  if (isSameRecipient) {
    console.log('Socket already connected for current recipient');
    return socket;
  }

  if (socket) {
    socket.off();
    socket.disconnect();
    socket = null;
  }

  currentRecipientId = recipientId;
  currentRecipientType = recipientType;

  const activeSocket = io(API_ROOT_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    auth: {
      userId: recipientId,
      userType: recipientType
    }
  });

  socket = activeSocket;

  activeSocket.on('connect', () => {
    console.log('✅ Connected to notification server');
    console.log(`📌 Registered as: ${recipientType} (${recipientId})`);
    // Register this client for notifications
    activeSocket.emit('register', { recipientId, recipientType });
  });

  activeSocket.on('disconnect', () => {
    console.log('❌ Disconnected from notification server');
  });

  activeSocket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return activeSocket;
};

/**
 * Subscribe to real-time notifications
 */
export const subscribeToRealTimeNotifications = (callback) => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket first.');
    return;
  }

  const handleNotification = (notification) => {
    console.log('📢 New notification:', notification.type, '-', notification.message);
    callback(notification);
  };

  socket.off('notification');
  socket.off('new_notification');
  socket.on('notification', handleNotification);
  socket.on('new_notification', handleNotification);

  socket.off('notification_count');
  socket.on('notification_count', (payload) => {
    if (typeof callback === 'function') {
      callback({ __notificationCount: true, ...payload });
    }
  });

  // Listen for specific event types from mobile app and desktop
  socket.on('clockin_event', (data) => {
    callback({
      type: 'CLOCKIN_SUCCESS',
      message: `${data.staffName} clocked in at ${data.time}`,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('clockout_event', (data) => {
    callback({
      type: 'CLOCKOUT_SUCCESS',
      message: `${data.staffName} clocked out at ${data.time}`,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('late_clockin_event', (data) => {
    callback({
      type: 'LATE_CLOCKIN',
      message: `${data.staffName} clocked in late at ${data.time}`,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('missing_clockin_event', (data) => {
    callback({
      type: 'MISSING_CLOCKIN',
      message: `${data.staffName} is missing clock-in today`,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('staff_registered', (data) => {
    callback({
      type: 'STAFF_REGISTERED',
      message: `New staff: ${data.name} registered`,
      staffId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('intern_registered', (data) => {
    callback({
      type: 'INTERN_REGISTERED',
      message: `New intern: ${data.name} registered`,
      internId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('device_approval_pending', (data) => {
    callback({
      type: 'DEVICE_APPROVAL_PENDING',
      message: `Device approval pending: ${data.deviceName}`,
      deviceId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('device_approved', (data) => {
    callback({
      type: 'DEVICE_APPROVED',
      message: `Device approved: ${data.deviceName}`,
      deviceId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('device_registered', (data) => {
    callback({
      type: 'DEVICE_REGISTERED',
      message: `New device registered: ${data.deviceName}`,
      deviceId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('department_created', (data) => {
    callback({
      type: 'DEPARTMENT_CREATED',
      message: `Department created: ${data.name}`,
      departmentId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('department_updated', (data) => {
    callback({
      type: 'DEPARTMENT_UPDATED',
      message: `Department updated: ${data.name}`,
      departmentId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('department_deleted', (data) => {
    callback({
      type: 'DEPARTMENT_DELETED',
      message: `Department deleted: ${data.name}`,
      departmentId: data.id,
      timestamp: new Date()
    });
  });

  socket.on('leave_request', (data) => {
    callback({
      type: 'LEAVE_REQUEST',
      message: `Leave request from ${data.staffName}`,
      leaveId: data.id,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('leave_approved', (data) => {
    callback({
      type: 'LEAVE_APPROVED',
      message: `Leave approved for ${data.staffName}`,
      leaveId: data.id,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('leave_rejected', (data) => {
    callback({
      type: 'LEAVE_REJECTED',
      message: `Leave rejected for ${data.staffName}`,
      leaveId: data.id,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('correction_request', (data) => {
    callback({
      type: 'CORRECTION_REQUEST',
      message: `Attendance correction request from ${data.staffName}`,
      correctionId: data.id,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('correction_approved', (data) => {
    callback({
      type: 'CORRECTION_APPROVED',
      message: `Correction approved for ${data.staffName}`,
      correctionId: data.id,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });

  socket.on('correction_rejected', (data) => {
    callback({
      type: 'CORRECTION_REJECTED',
      message: `Correction rejected for ${data.staffName}`,
      correctionId: data.id,
      staffId: data.staffId,
      timestamp: new Date()
    });
  });
};

/**
 * Disconnect from socket
 */
export const disconnectSocket = () => {
  if (!socket) return;
  socket.off();
  socket.disconnect();
  socket = null;
};

/**
 * Get socket instance for notification emission
 */
export const getSocket = () => socket;

/**
 * Fetch notifications from the backend for a recipient
 */
export const fetchNotifications = async ({ recipientId, recipientType, limit = 50, skip = 0 }) => {
  try {
    const params = new URLSearchParams({
      limit,
      skip
    });

    if (recipientId) params.append('recipientId', recipientId);
    if (recipientType) params.append('recipientType', recipientType);

    const response = await fetch(`${API_HTTP_BASE}/notifications?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a recipient
 */
export const getUnreadCount = async ({ recipientId, recipientType }) => {
  try {
    const params = new URLSearchParams();

    if (recipientId) params.append('recipientId', recipientId);
    if (recipientType) params.append('recipientType', recipientType);

    const response = await fetch(`${API_HTTP_BASE}/notifications/unread-count?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to get unread count: ${response.status}`);
    }

    const data = await response.json();
    return data.unreadCount || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Create a new notification (admin/backend use) for a recipient
 */
export const createNotification = async (notification) => {
  try {
    const response = await fetch(`${API_HTTP_BASE}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notification)
    });

    if (!response.ok) {
      throw new Error(`Failed to create notification: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await fetch(`${API_HTTP_BASE}/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (recipientId, recipientType) => {
  try {
    const response = await fetch(`${API_HTTP_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipientId, recipientType })
    });

    if (!response.ok) {
      throw new Error(`Failed to mark all notifications as read: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await fetch(`${API_HTTP_BASE}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete notification: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all notifications
 */
export const deleteAllNotifications = async (recipientId, recipientType) => {
  try {
    const response = await fetch(`${API_HTTP_BASE}/notifications/delete-all`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipientId, recipientType })
    });

    if (!response.ok) {
      throw new Error(`Failed to delete notifications: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting notifications:', error);
    throw error;
  }
};

// Namespace for use in context
export const subscribeToNotifications = {
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  deleteNotification: deleteNotification,
  deleteAllNotifications: deleteAllNotifications
};
