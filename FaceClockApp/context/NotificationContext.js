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
});

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.isRead).length);
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
      setNotifications((prev) => {
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
    setNotifications(updated);
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

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications, loading, reload, unreadCount, markAllAsRead: handleMarkAllAsRead }}>
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
