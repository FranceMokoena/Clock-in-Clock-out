import React, { createContext, useState, useEffect, useCallback } from 'react';
import { fetchNotifications, subscribeToRealTimeNotifications, initializeSocket, disconnectSocket } from './notificationService';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from './notificationService';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children, recipientId, recipientType }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotifications({ recipientId, recipientType, limit: 100 });
      setNotifications(data);
      const unread = data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [recipientId, recipientType]);

  // Initialize Socket.IO and real-time listeners
  useEffect(() => {
    if (!recipientId || !recipientType) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Load initial notifications
    loadNotifications();

    // Initialize socket connection for real-time updates
    initializeSocket(recipientId, recipientType);

    // Subscribe to real-time notifications
    subscribeToRealTimeNotifications((payload) => {
      if (payload && payload.__notificationCount) {
        if (typeof payload.count === 'number') {
          setUnreadCount(payload.count);
        }
        return;
      }

      const newNotification = payload;
      if (!newNotification) return;

      // Add new notification to the top of the list
      setNotifications(prev => [
        {
          _id: `local_${Date.now()}`,
          ...newNotification,
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      
      // Increment unread count
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound (optional)
      playNotificationSound();
    });

    // Poll for new notifications every 30 seconds as fallback
    const pollInterval = setInterval(loadNotifications, 30000);

    return () => {
      clearInterval(pollInterval);
      disconnectSocket();
    };
  }, [recipientId, recipientType, loadNotifications]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.play().catch(() => {}); // Silently fail if audio can't play
    } catch (err) {
      // Silently fail
    }
  };

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // First update local state
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Then call API to persist
      if (!notificationId.startsWith('local_')) {
        await markNotificationAsRead(notificationId);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Reload to sync with server
      loadNotifications();
    }
  }, [loadNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      // First update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      // Then call API to persist
      await markAllNotificationsAsRead(recipientId, recipientType);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Reload to sync with server
      loadNotifications();
    }
  }, [recipientId, recipientType, loadNotifications]);

  // Delete notification
  const deleteNotificationLocal = useCallback(async (notificationId) => {
    try {
      if (!notificationId.startsWith('local_')) {
        await deleteNotification(notificationId);
      }
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationLocal
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
