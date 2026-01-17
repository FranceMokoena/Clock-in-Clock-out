/**
 * 🔔 MOBILE APP NOTIFICATION HANDLER
 * 
 * Real-time notification listener for React Native Expo app
 * Handles:
 * - WebSocket connection to backend
 * - Real-time notification delivery
 * - UI updates
 * - Local notification storage
 * - Push notification integration (Expo)
 */

import io from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class MobileNotificationHandler {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.userId = null;
    this.userType = null;
    this.listeners = [];
    this.notificationBuffer = [];
  }

  /**
   * Initialize notification system
   */
  async initialize(userId, userType, apiBaseUrl) {
    this.userId = userId;
    this.userType = userType;

    try {
      // Configure local notifications
      await this.configureLocalNotifications();

      // Connect to WebSocket
      await this.connectToWebSocket(apiBaseUrl);

      console.log('✅ Mobile notification handler initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notification handler:', error);
      return false;
    }
  }

  /**
   * Configure Expo local notifications
   */
  async configureLocalNotifications() {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('📬 Notification received:', notification);
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    // Request permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('⚠️ Notification permission not granted');
    }
  }

  /**
   * Connect to WebSocket
   */
  connectToWebSocket(apiBaseUrl) {
    return new Promise((resolve, reject) => {
      try {
        // Extract socket endpoint from API base URL
        const socketUrl = apiBaseUrl
          .replace('/api', '')
          .replace('http://', 'ws://')
          .replace('https://', 'wss://');

        console.log(`🔌 Connecting to WebSocket: ${socketUrl}`);

        this.socket = io(socketUrl, {
          auth: {
            userId: this.userId,
            userType: this.userType,
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling'],
        });

        // Connection events
        this.socket.on('connect', () => {
          this.isConnected = true;
          console.log('✅ WebSocket connected');
          this.notifyListeners('connection_status', {
            status: 'connected',
            timestamp: new Date(),
          });
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          console.log('❌ WebSocket disconnected');
          this.notifyListeners('connection_status', {
            status: 'disconnected',
            timestamp: new Date(),
          });
        });

        this.socket.on('notification', (notification) => {
          this.handleNotification(notification);
        });

        // Listen for unread count updates
        this.socket.on('notification_count', (data) => {
          try {
            const count = data && (data.count || data.unreadCount || 0);
            console.log('📊 Unread count update received:', count);
            this.notifyListeners('unread_count', count);
            // Update app badge (Expo)
            if (Platform && Platform.OS) {
              // Best-effort - don't block
              Notifications.setBadgeCountAsync && Notifications.setBadgeCountAsync(count).catch(() => {});
            }
          } catch (err) {
            console.error('❌ Error handling unread count update:', err);
          }
        });

        this.socket.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
          this.notifyListeners('connection_error', error);
        });

        // Timeout if connection doesn't happen quickly
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        console.error('❌ WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming notification
   */
  async handleNotification(notification) {
    try {
      console.log('📨 Notification received:', notification);

      // Store notification locally
      await this.storeNotification(notification);

      // Show local notification
      await this.showLocalNotification(notification);

      // Notify listeners
      this.notifyListeners('notification_received', notification);

      // Send delivery confirmation back to server
      this.confirmDelivery(notification._id);
    } catch (error) {
      console.error('❌ Error handling notification:', error);
    }
  }

  /**
   * Show local notification
   */
  async showLocalNotification(notification) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification._id,
            type: notification.type,
            priority: notification.priority,
            payload: JSON.stringify(notification.data),
          },
          badge: 1,
        },
        trigger: { seconds: 1 }, // Show immediately
      });

      console.log(`📬 Local notification scheduled: ${notificationId}`);
    } catch (error) {
      console.error('❌ Error showing local notification:', error);
    }
  }

  /**
   * Store notification locally
   */
  async storeNotification(notification) {
    try {
      const key = `notification_${notification._id}`;
      await AsyncStorage.setItem(key, JSON.stringify(notification));

      // Also keep a list of recent notification IDs
      const recentKey = 'recent_notifications';
      const recent = await AsyncStorage.getItem(recentKey);
      const recentList = recent ? JSON.parse(recent) : [];
      recentList.unshift(notification._id);
      // Keep only last 100
      if (recentList.length > 100) {
        recentList.pop();
      }
      await AsyncStorage.setItem(recentKey, JSON.stringify(recentList));
    } catch (error) {
      console.error('❌ Error storing notification:', error);
    }
  }

  /**
   * Confirm delivery to server
   */
  confirmDelivery(notificationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('notification_delivered', {
        notificationId,
        timestamp: new Date(),
        platform: 'mobile',
      });
    }
  }

  /**
   * Register a listener for notifications
   */
  addEventListener(eventType, callback) {
    this.listeners.push({ eventType, callback });
    console.log(`✅ Listener registered for: ${eventType}`);
  }

  /**
   * Remove a listener
   */
  removeEventListener(callback) {
    this.listeners = this.listeners.filter((l) => l.callback !== callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach((listener) => {
      if (listener.eventType === eventType || listener.eventType === '*') {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('❌ Error in listener callback:', error);
        }
      }
    });
  }

  /**
   * Get all stored notifications
   */
  async getStoredNotifications() {
    try {
      const recentKey = 'recent_notifications';
      const recent = await AsyncStorage.getItem(recentKey);
      const recentList = recent ? JSON.parse(recent) : [];

      const notifications = [];
      for (const id of recentList) {
        const key = `notification_${id}`;
        const notifStr = await AsyncStorage.getItem(key);
        if (notifStr) {
          notifications.push(JSON.parse(notifStr));
        }
      }

      return notifications;
    } catch (error) {
      console.error('❌ Error getting stored notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read (call backend API)
   */
  async markAsRead(notificationId) {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/' + notificationId + '/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to mark notification as read:', response.status);
      } else {
        console.log('✅ Notification marked as read:', notificationId);
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  /**
   * Clear stored notification
   */
  async clearNotification(notificationId) {
    try {
      const key = `notification_${notificationId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('❌ Error clearing notification:', error);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('✅ WebSocket disconnected');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.userId,
      userType: this.userType,
    };
  }
}

// Export singleton
export default new MobileNotificationHandler();
