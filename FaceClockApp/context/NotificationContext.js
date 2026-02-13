import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchNotifications, markAllAsRead } from '../services/notificationService';
import notificationHandler from '../utils/notificationHandler';

const NotificationContext = createContext({
  notifications: [],
  setNotifications: () => {},
  loading: false,
  reload: async () => {},
  unreadCount: 0,
  markAllAsRead: async () => {},
  removeNotification: () => {},
  clearNotifications: () => {},
});

export function NotificationProvider({ children }) {
  const [notifications, setNotificationsState] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const applyNotifications = (items) => {
    const normalized = Array.isArray(items) ? items : [];
    setNotificationsState(normalized);
    setUnreadCount(normalized.filter((n) => !n.isRead).length);
  };

  const setNotifications = (value) => {
    if (typeof value === 'function') {
      setNotificationsState((prev) => {
        const next = value(prev);
        const normalized = Array.isArray(next) ? next : [];
        setUnreadCount(normalized.filter((n) => !n.isRead).length);
        return normalized;
      });
      return;
    }
    applyNotifications(value);
  };

  const reload = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.notifications)) {
        items = data.notifications;
      }
      applyNotifications(items);
    } catch (err) {
      console.warn('NotificationProvider.reload error:', err);
      // don't spam users on background fetch failures
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const id = setInterval(() => {
      reload();
    }, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleRealtimeNotification = (notification) => {
      setNotificationsState((prev) => {
        const withoutDuplicate = prev.filter((item) => item._id !== notification._id);
        const updated = [notification, ...withoutDuplicate];
        return updated.slice(0, 100);
      });
      setUnreadCount((prev) => prev + 1);
    };

    const handleNotificationCount = (data) => {
      const parsed = typeof data === 'object' && data !== null
        ? (data.count ?? data.unread ?? data.unreadCount ?? 0)
        : data;
      const numeric = Number(parsed || 0);
      setUnreadCount(Number.isNaN(numeric) ? 0 : numeric);
    };

    notificationHandler.addEventListener('notification_received', handleRealtimeNotification);
    notificationHandler.addEventListener('notification_count', handleNotificationCount);

    return () => {
      notificationHandler.removeEventListener(handleRealtimeNotification);
      notificationHandler.removeEventListener(handleNotificationCount);
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    console.log('NotificationProvider markAllAsRead called, current unreadCount:', unreadCount);
    // Immediately mark all notifications as read in local state
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    applyNotifications(updated);
    setUnreadCount(0);
    console.log('NotificationProvider marked all notifications as read locally');

    // Then call API to persist
    const success = await markAllAsRead();
    console.log('NotificationProvider API markAllAsRead result:', success);
    if (success) {
      console.log('NotificationProvider API confirmed all marked as read');
    }
    return success;
  };

  const removeNotification = (notificationId) => {
    if (!notificationId) return;
    setNotificationsState((prev) => {
      const next = prev.filter((n) => n._id !== notificationId);
      setUnreadCount(next.filter((n) => !n.isRead).length);
      return next;
    });
  };

  const clearNotifications = () => {
    setNotificationsState([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      setNotifications,
      loading,
      reload,
      unreadCount,
      markAllAsRead: handleMarkAllAsRead,
      removeNotification,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export default NotificationProvider;
