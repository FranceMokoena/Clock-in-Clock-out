import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { fetchNotifications, markAllAsRead } from '../services/notificationService';

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

  const reload = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      if (Array.isArray(data)) setNotifications(data);
      else if (data && Array.isArray(data.notifications)) setNotifications(data.notifications);
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    console.log('🔔 markAllAsRead called, current unreadCount:', unreadCount);
    // Immediately mark all notifications as read in local state
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    console.log('✅ Marked all notifications as read locally');
    
    // Then call API to persist
    const success = await markAllAsRead();
    console.log('📡 API markAllAsRead result:', success);
    if (success) {
      console.log('✅ API confirmed all marked as read');
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
