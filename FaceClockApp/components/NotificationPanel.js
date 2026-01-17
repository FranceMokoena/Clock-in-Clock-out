/**
 * 🔔 NOTIFICATION PANEL COMPONENT
 * 
 * Real-time notification UI for mobile app
 * - Displays incoming notifications
 * - Toast messages for instant feedback
 * - Notification history/badge
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import notificationHandler from '../utils/notificationHandler';

export function NotificationBadge({ count, style }) {
  if (count === 0) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export function NotificationToast({ notification, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 5 seconds
    const timeout = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss && onDismiss());
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const slideStyle = {
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-100, 0],
        }),
      },
    ],
  };

  const priorityColors = {
    urgent: '#dc2626',
    high: '#ea580c',
    medium: '#3166AE',
    low: '#10b981',
  };

  const priorityIcons = {
    urgent: '🚨',
    high: '⚠️',
    medium: 'ℹ️',
    low: '✅',
  };

  return (
    <Animated.View style={[styles.toastContainer, slideStyle]}>
      <TouchableOpacity
        onPress={() => onDismiss && onDismiss()}
        style={[
          styles.toastContent,
          {
            borderLeftColor: priorityColors[notification.priority] || '#3166AE',
          },
        ]}
      >
        <Text style={styles.toastIcon}>
          {priorityIcons[notification.priority] || 'ℹ️'}
        </Text>
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle}>{notification.title}</Text>
          <Text style={styles.toastMessage}>{notification.message}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onDismiss && onDismiss()}
          style={styles.toastClose}
        >
          <Text>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function NotificationPanel({ visible, notifications, onClose, onNotificationPress }) {
  const getPriorityColor = (priority) => {
    const colors = {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#3166AE',
      low: '#10b981',
    };
    return colors[priority] || '#3166AE';
  };

  const getTypeIcon = (type) => {
    const icons = {
      attendance: '✅',
      attendance_summary: '📊',
      leave_request: '🏖️',
      leave_approved: '✅',
      leave_rejected: '❌',
      attendance_correction: '📝',
      payroll: '💰',
      system: '⚙️',
      security: '🚨',
      department: '🏢',
      staff_action: '👤',
      other: 'ℹ️',
    };
    return icons[type] || 'ℹ️';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.panelContainer}>
        {/* Header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification._id}
                onPress={() => {
                  onNotificationPress && onNotificationPress(notification);
                  onClose();
                }}
                style={[
                  styles.notificationItem,
                  {
                    borderLeftColor: getPriorityColor(notification.priority),
                  },
                ]}
              >
                <View style={styles.notificationItemHeader}>
                  <Text style={styles.notificationIcon}>
                    {getTypeIcon(notification.type)}
                  </Text>
                  <View style={styles.notificationItemContent}>
                    <Text style={styles.notificationItemTitle}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationItemMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationItemTime}>
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  {!notification.isRead && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                {notification.priority === 'high' || notification.priority === 'urgent' && (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>
                      {notification.priority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Footer with Status */}
        <View style={styles.panelFooter}>
          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: notificationHandler.isConnected
                    ? '#10b981'
                    : '#dc2626',
                },
              ]}
            />
            <Text style={styles.statusText}>
              {notificationHandler.isConnected
                ? 'Connected'
                : 'Disconnected'}
            </Text>
          </View>
          <Text style={styles.footerText}>
            {notifications.length} notification
            {notifications.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Hook to use notifications in any component
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    // Listen for incoming notifications
    const onNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount((prev) => prev + 1);

      // Show toast
      if (Platform.OS === 'android') {
        ToastAndroid.show(notification.title, ToastAndroid.SHORT);
      }
    };

    notificationHandler.addEventListener('notification_received', onNotification);

    // Listen for connection status
    const onConnection = (status) => {
      setConnectionStatus(status.status);
    };
    notificationHandler.addEventListener('connection_status', onConnection);

    // Listen for unread count updates from server
    const onUnreadCount = (count) => {
      try {
        const parsed = typeof count === 'object' && count !== null ? (count.count || count.unreadCount || 0) : count;
        setUnreadCount(Number(parsed || 0));
      } catch (err) {
        console.error('❌ Error parsing unread count:', err);
      }
    };
    notificationHandler.addEventListener('unread_count', onUnreadCount);

    // Load stored notifications
    loadStoredNotifications();

    return () => {
      // Cleanup listeners
      notificationHandler.removeEventListener(onNotification);
      notificationHandler.removeEventListener(onConnection);
      notificationHandler.removeEventListener(onUnreadCount);
    };
  }, []);

  const loadStoredNotifications = async () => {
    try {
      const stored = await notificationHandler.getStoredNotifications();
      setNotifications(stored);
      const unread = stored.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    // Update local state immediately
    setNotifications((prev) =>
      prev.map((n) =>
        n._id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Also call backend API to persist
    try {
      await notificationHandler.markAsRead(notificationId);
    } catch (error) {
      console.error('❌ Error marking notification as read on backend:', error);
    }
  };

  const clearNotification = async (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    await notificationHandler.clearNotification(notificationId);
  };

  return {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    clearNotification,
    refresh: loadStoredNotifications,
  };
}

const styles = StyleSheet.create({
  // Toast
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  toastMessage: {
    fontSize: 12,
    color: '#666',
  },
  toastClose: {
    padding: 4,
  },

  // Badge
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Panel
  panelContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  notificationItemContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  notificationItemMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationItemTime: {
    fontSize: 10,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3166AE',
    marginLeft: 8,
    marginTop: 2,
  },
  priorityBadge: {
    backgroundColor: '#fee2e2',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#dc2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  panelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
