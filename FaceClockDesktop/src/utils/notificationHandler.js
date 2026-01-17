/**
 * 🔔 DESKTOP APP NOTIFICATION HANDLER
 * 
 * Real-time notification listener for Electron desktop app
 * Handles:
 * - WebSocket connection to backend
 * - System notifications
 * - Notification tray integration
 * - Sound and visual alerts
 */

const io = require('socket.io-client');
const path = require('path');
const Store = require('electron-store');
const { Notification, app } = require('electron');

class DesktopNotificationHandler {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.userId = null;
    this.userType = null;
    this.listeners = [];
    this.store = new Store({
      name: 'notifications',
      fileExtension: 'json',
      cwd: app.getPath('userData')
    });
    this.settings = {
      soundEnabled: true,
      popupEnabled: true,
      trayEnabled: true
    };
  }

  /**
   * Initialize notification system
   */
  async initialize(userId, userType, apiBaseUrl, mainWindow) {
    this.userId = userId;
    this.userType = userType;
    this.mainWindow = mainWindow;

    try {
      // Load settings
      await this.loadSettings();

      // Connect to WebSocket
      await this.connectToWebSocket(apiBaseUrl);

      console.log('✅ Desktop notification handler initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize desktop notification handler:', error);
      return false;
    }
  }

  /**
   * Load notification settings from store
   */
  async loadSettings() {
    try {
      const stored = this.store.get('settings', {});
      this.settings = {
        soundEnabled: stored.soundEnabled !== false,
        popupEnabled: stored.popupEnabled !== false,
        trayEnabled: stored.trayEnabled !== false
      };
    } catch (error) {
      console.error('⚠️ Error loading settings:', error);
    }
  }

  /**
   * Save notification settings
   */
  async saveSettings(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      this.store.set('settings', this.settings);
    } catch (error) {
      console.error('⚠️ Error saving settings:', error);
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

      // Show system notification
      if (this.settings.popupEnabled) {
        this.showSystemNotification(notification);
      }

      // Play sound if enabled and high priority
      if (this.settings.soundEnabled && 
          (notification.priority === 'high' || notification.priority === 'urgent')) {
        this.playNotificationSound();
      }

      // Send to renderer process if window is open
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('notification-received', notification);
      }

      // Notify listeners
      this.notifyListeners('notification_received', notification);

      // Send delivery confirmation back to server
      this.confirmDelivery(notification._id);
    } catch (error) {
      console.error('❌ Error handling notification:', error);
    }
  }

  /**
   * Show system notification
   */
  showSystemNotification(notification) {
    try {
      const titlePrefix = {
        attendance: '✅',
        leave_request: '🏖️',
        leave_approved: '✅',
        leave_rejected: '❌',
        attendance_correction: '📝',
        payroll: '💰',
        security: '🚨',
        system: '⚙️',
      };

      const prefix = titlePrefix[notification.type] || 'ℹ️';

      new Notification({
        title: `${prefix} ${notification.title}`,
        body: notification.message,
        icon: path.join(__dirname, '../assets/icon.png'),
        urgency: notification.priority === 'urgent' ? 'critical' : 'normal',
        timeoutType: 'default',
      }).show();

      console.log(`📬 System notification shown: ${notification.title}`);
    } catch (error) {
      console.error('❌ Error showing system notification:', error);
    }
  }

  /**
   * Play notification sound
   */
  playNotificationSound() {
    try {
      // Try to play system notification sound
      if (process.platform === 'win32') {
        require('child_process').exec('powershell -c "[Console]::Beep()"');
      } else if (process.platform === 'darwin') {
        require('child_process').exec('afplay /System/Library/Sounds/Glass.aiff');
      } else {
        // Linux
        require('child_process').exec('paplay /usr/share/sounds/freedesktop/stereo/complete.oga');
      }
    } catch (error) {
      console.warn('⚠️ Could not play sound:', error.message);
    }
  }

  /**
   * Store notification locally
   */
  async storeNotification(notification) {
    try {
      const notifications = this.store.get('notifications', []);
      notifications.unshift(notification);
      // Keep only last 100
      if (notifications.length > 100) {
        notifications.pop();
      }
      this.store.set('notifications', notifications);
    } catch (error) {
      console.error('❌ Error storing notification:', error);
    }
  }

  /**
   * Get stored notifications
   */
  getStoredNotifications() {
    try {
      return this.store.get('notifications', []);
    } catch (error) {
      console.error('❌ Error getting stored notifications:', error);
      return [];
    }
  }

  /**
   * Clear notification
   */
  clearNotification(notificationId) {
    try {
      const notifications = this.store.get('notifications', []);
      const filtered = notifications.filter((n) => n._id !== notificationId);
      this.store.set('notifications', filtered);
    } catch (error) {
      console.error('❌ Error clearing notification:', error);
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
        platform: 'desktop',
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
module.exports = new DesktopNotificationHandler();
